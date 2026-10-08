// scripts/notion-story/gate.mjs
//
// The publish gate for imported posts. It runs every collection, with its
// Companion Files merged in, through the real content contracts (required
// fields, EN and FR parity), resolves links across collections, and adds the
// checks a schema can't express: Google snapshots and update lines are
// append-only, a changed recommendation carries a new dated update line, no
// author placeholder or em-dash reaches the page, and no venue is published
// twice. The same gate runs in the Importer routine and in CI.

import { dateSpotsSchema } from "../../src/content-contracts/date-spot.mjs";
import { contributorRecipesSchema } from "../../src/content-contracts/contributor-recipe.mjs";
import { extendedProfilesSchema } from "../../src/content-contracts/extended-profile.mjs";
import { checkCrossReferences } from "../../src/content-contracts/cross-references.mjs";
import { slugify } from "./fields.mjs";

export const COLLECTIONS = /** @type {const} */ ({
  spots: { label: "Date Spots and Reviews", schema: dateSpotsSchema },
  recipes: { label: "Chef Recipe Cards", schema: contributorRecipesSchema },
  profiles: { label: "Chef pages", schema: extendedProfilesSchema },
});

/**
 * @typedef {{ spots: Record<string, any>[], recipes: Record<string, any>[], profiles: Record<string, any>[] }} Collections
 */

// Key order differs between a raw record and its parsed form, so compare
// with sorted keys.
const stable = (value) => Array.isArray(value)
  ? value.map(stable)
  : value && typeof value === "object"
    ? Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]))
    : value;
const same = (a, b) => JSON.stringify(stable(a)) === JSON.stringify(stable(b));

function recommendation(record) {
  return {
    verdict: record.reviewVerdict ?? null,
    goodFor: record.locales?.en?.goodFor ?? null,
    whenItWorks: record.locales?.en?.whenItWorks ?? null,
  };
}

/**
 * A published post cannot silently change its recommendation: a changed
 * verdict or signal needs a new dated update line in both locales, dated
 * after the previous Checked date.
 * @param {Record<string, any>} record merged record as it will publish
 * @param {Record<string, any> | null | undefined} previous merged record as it is live now
 * @returns {string[]}
 */
export function checkDatedUpdate(record, previous) {
  if (!previous || record.postType !== "date-spot") return [];
  if (same(recommendation(record), recommendation(previous))) return [];
  const previousChecked = previous.freshness?.lastChecked ?? previous.freshness?.published;
  return ["en", "fr-CA"]
    .filter((locale) => !(record.locales?.[locale]?.materialUpdates ?? []).some((update) => update.date > previousChecked))
    .map((locale) => `${record.id}: the verdict or a signal changed but ${locale} has no update line dated after ${previousChecked} (the previous Checked date). Add one saying what changed.`);
}

/**
 * Google snapshots are dated and append-only: a recheck adds a line and
 * never edits or drops one already printed.
 * @param {Record<string, any>} record
 * @param {Record<string, any> | null | undefined} previous
 */
export function checkGoogleReviewsAppendOnly(record, previous) {
  const before = previous?.googleReviews ?? [];
  const after = record.googleReviews ?? [];
  const kept = before.every((snapshot, index) => same(snapshot, after[index]));
  return kept ? [] : [`${record.id}: a Google snapshot was edited or dropped. Keep every earlier line as it was and append the new one.`];
}

/**
 * Update lines are append-only too.
 * @param {Record<string, any>} record
 * @param {Record<string, any> | null | undefined} previous
 */
export function checkUpdateLinesAppendOnly(record, previous) {
  const problems = [];
  for (const locale of ["en", "fr-CA"]) {
    const before = previous?.locales?.[locale]?.materialUpdates ?? [];
    const after = record.locales?.[locale]?.materialUpdates ?? [];
    if (!before.every((line, index) => same(line, after[index]))) {
      problems.push(`${record.id}: an update line in ${locale} was edited or dropped. Update lines are only ever appended.`);
    }
  }
  return problems;
}

// "[DATE]", "[X] visits", "[ANSWER NEEDED.]", "[SPOT NEEDED]": author
// placeholders for missing reporting. An empty slot is left out; it never
// ships as a placeholder.
const PLACEHOLDER = /\[(?:[A-Z0-9][A-Z0-9 .,:;'’/&-]*|[^\]]*\b(?:NEEDED|TBD|TODO|CONFIRM)\b[^\]]*)\](?!\()/;

/**
 * @param {unknown} value
 * @param {string} path
 * @returns {{ path: string, text: string }[]}
 */
function strings(value, path) {
  if (typeof value === "string") return [{ path, text: value }];
  if (Array.isArray(value)) return value.flatMap((item, index) => strings(item, `${path}[${index}]`));
  if (value && typeof value === "object") return Object.entries(value).flatMap(([key, item]) => strings(item, `${path}.${key}`));
  return [];
}

/**
 * No author placeholder, internal note marker or em-dash reaches the page.
 * @param {Record<string, any>} record
 */
export function checkLeftovers(record) {
  const problems = [];
  for (const { path, text } of strings(record, record.id)) {
    if (PLACEHOLDER.test(text)) problems.push(`${path}: author placeholder left in: "${text.match(PLACEHOLDER)?.[0]}"`);
    if (text.includes("\u2014")) problems.push(`${path}: em-dash left in (replace it with a comma, colon or period)`);
    if (/^INTERNAL\b/.test(text)) problems.push(`${path}: an INTERNAL note was copied into the page`);
  }
  return problems;
}

/**
 * Two records about the same venue (same name and city) are one venue
 * published twice.
 * @param {Record<string, any>[]} spots
 */
export function checkDuplicateVenues(spots) {
  const seen = new Map();
  const problems = [];
  for (const spot of spots) {
    const key = `${slugify(spot.name ?? "")}|${slugify(spot.city ?? "Montréal")}`;
    if (seen.has(key)) problems.push(`${spot.id}: same venue as ${seen.get(key)} (${spot.name}). Flag the duplicate Notion rows instead of publishing twice.`);
    else seen.set(key, spot.id);
  }
  return problems;
}

/**
 * @param {Collections} collections merged collections as they will publish (Companion Files applied)
 * @param {Partial<Collections>} [previous] merged collections as they are live now (the PR's base)
 * @returns {{ ok: boolean, problems: string[], parsed: Collections | null }}
 */
export function publishGate(collections, previous = {}) {
  const problems = [];
  /** @type {Record<string, any[]>} */
  const parsed = {};
  for (const [key, { label, schema }] of Object.entries(COLLECTIONS)) {
    const records = collections[key] ?? [];
    const result = schema.safeParse(records);
    if (!result.success) {
      for (const issue of result.error.issues) {
        const [index, ...field] = issue.path;
        const id = typeof index === "number" ? records[index]?.id ?? `#${index}` : "(collection)";
        problems.push(`${label}: ${id}: ${field.join(".") || "(record)"}: ${issue.message}`);
      }
      continue;
    }
    parsed[key] = result.data;
    const before = new Map((previous[key] ?? []).map((record) => [record.id, record]));
    for (const record of records) {
      problems.push(...checkLeftovers(record));
      const old = before.get(record.id);
      problems.push(...checkGoogleReviewsAppendOnly(record, old), ...checkUpdateLinesAppendOnly(record, old));
    }
    for (const record of result.data) problems.push(...checkDatedUpdate(record, before.get(record.id)));
  }
  problems.push(...checkDuplicateVenues(collections.spots ?? []));
  if (problems.length === 0) {
    problems.push(...checkCrossReferences(/** @type {Collections} */ (parsed)));
  }
  return { ok: problems.length === 0, problems, parsed: problems.length === 0 ? /** @type {Collections} */ (parsed) : null };
}
