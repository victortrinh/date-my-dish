// scripts/notion-story/companion.mjs
//
// Pre-filling the Companion File (src/content/editorial/{slug}.json). The
// Importer proposes values on first import; Victor approves or edits them
// in the PR; a later import only fills fields that are still missing and
// never overwrites one that is there, hand-edited or not.

import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { companionSchema } from "../../src/content-contracts/companion.mjs";
import { DEFAULT_EDITORIAL_DIR } from "../../src/content-contracts/load.mjs";
import { BOROUGHS, VERDICTS } from "../../src/content-contracts/date-spot.mjs";

const LOCALES = /** @type {const} */ (["en", "fr-CA"]);
const isSet = (value) => value !== undefined && value !== null && value !== "";
const MONTHS = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];

/**
 * The essentials card's Google line, as the author writes it after reading
 * the venue's Google Maps page: "4.6 · 312 reviews, 13 October 2026" (an ISO
 * date works too). Anything else, the "[RATING AND COUNT NEEDED, dated]"
 * placeholder included, gives null: no snapshot is ever guessed.
 * @param {string} text
 * @returns {{ average: number, count: number, asOf: string } | null}
 */
export function parseGoogleLine(text) {
  const match = String(text).trim().match(/^(\d(?:[.,]\d)?)\s*(?:·|\/|,)\s*([\d,\u202f ]+?)\s+reviews?\s*,?\s*(?:as of\s+)?(.+)$/i);
  if (!match) return null;
  const average = Number(match[1].replace(",", "."));
  const count = Number(match[2].replace(/[,\u202f ]/g, ""));
  const when = match[3].trim().replace(/\.$/, "");
  let asOf = /^\d{4}-\d{2}-\d{2}$/.test(when) ? when : null;
  const long = when.match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/);
  if (long && MONTHS.includes(long[2].toLowerCase())) {
    asOf = `${long[3]}-${String(MONTHS.indexOf(long[2].toLowerCase()) + 1).padStart(2, "0")}-${long[1].padStart(2, "0")}`;
  }
  if (!asOf || !(average >= 1 && average <= 5) || !Number.isInteger(count)) return null;
  return { average, count, asOf };
}

/** The value of the essentials table row labelled `label`, if the source has one. */
function essentialsRow(sections, label) {
  for (const section of sections ?? []) {
    for (const block of section.blocks ?? []) {
      if (block.kind !== "table") continue;
      const row = block.rows.find(([key]) => String(key).trim().toLowerCase() === label.toLowerCase());
      if (row) return String(row[1] ?? "");
    }
  }
  return undefined;
}

/**
 * The proposals a script can make without judgement, from the author's
 * metadata block and the row's properties. The agent adds the rest (verdict
 * reason from the review's own text, category, Good-for signals).
 * @param {{ metadata: Record<string, string>, notion?: { borough?: string | null }, sections?: { blocks: any[] }[] }} source
 * @param {{ slug: string, postType: string, publishDate?: string | null, heroAlt?: string }} context
 */
export function proposeCompanion(source, { slug, postType, publishDate, heroAlt }) {
  const meta = source.metadata ?? {};
  /** @type {Record<string, any>} */
  const proposal = { id: slug };
  if (postType === "review") proposal.spotType = "restaurant";
  const verdict = String(meta["Verdict state"] ?? "").trim().toLowerCase();
  if (VERDICTS.includes(/** @type {any} */ (verdict))) proposal.reviewVerdict = verdict;
  // "H1: Moccione, Villeray" -> "Villeray"; "Othym, the Village" -> "the Village" is left for Victor.
  const neighbourhood = String(meta.H1 ?? "").split(",").slice(1).join(",").trim();
  if (neighbourhood) proposal.neighbourhood = neighbourhood;
  // The row's Borough property, when it names one of the known boroughs.
  const borough = String(source.notion?.borough ?? "").trim();
  if (BOROUGHS.includes(/** @type {any} */ (borough))) proposal.borough = borough;
  if (publishDate) proposal.lastChecked = publishDate;
  const instagram = String(meta.Instagram ?? "").trim().replace(/^@/, "");
  if (/^[A-Za-z0-9._]{1,30}$/.test(instagram)) proposal.instagram = instagram;
  // "Booking link: https://..." in the metadata block, like Instagram.
  const bookingUrl = String(meta["Booking link"] ?? "").trim();
  if (/^https:\/\/\S+$/.test(bookingUrl)) proposal.bookingUrl = bookingUrl;
  const snapshot = parseGoogleLine(essentialsRow(source.sections, "Google reviews") ?? "");
  if (snapshot) proposal.googleReviews = [snapshot];
  const en = {};
  const metaTitle = String(meta["Meta title"] ?? "").trim();
  if (metaTitle && metaTitle.length <= 60) en.metaTitle = metaTitle;
  const metaDescription = String(meta["Meta desc"] ?? meta["Meta description"] ?? "").trim();
  if (metaDescription.length >= 120 && metaDescription.length <= 160) en.metaDescription = metaDescription;
  if (heroAlt) en.imageAlt = heroAlt;
  if (Object.keys(en).length) proposal.locales = { en };
  return proposal;
}

/**
 * Fill only what the existing Companion File leaves out.
 * @param {Record<string, any> | null} existing the file as it is now (hand-edited or not)
 * @param {Record<string, any>} proposed
 * @returns {{ companion: Record<string, any>, added: string[] }}
 */
export function mergeCompanion(existing, proposed) {
  const companion = structuredClone(existing ?? { id: proposed.id });
  const added = [];
  for (const [key, value] of Object.entries(proposed)) {
    if (key === "locales" || !isSet(value)) continue;
    // A newer Google snapshot is appended; earlier lines are never touched.
    if (key === "googleReviews" && Array.isArray(companion.googleReviews)) {
      const last = companion.googleReviews.at(-1)?.asOf ?? "";
      const newer = value.filter((/** @type {{ asOf: string }} */ snapshot) => snapshot.asOf > last);
      if (newer.length) {
        companion.googleReviews.push(...newer);
        added.push(key);
        // Reading Google again is a recheck: a snapshot never postdates "Checked".
        const asOf = newer.at(-1).asOf;
        if (isSet(companion.lastChecked) && companion.lastChecked < asOf) {
          companion.lastChecked = asOf;
          added.push("lastChecked");
        }
      }
      continue;
    }
    if (!isSet(companion[key])) {
      companion[key] = value;
      added.push(key);
    }
  }
  for (const locale of LOCALES) {
    const overlay = proposed.locales?.[locale];
    if (!overlay) continue;
    for (const [key, value] of Object.entries(overlay)) {
      if (!isSet(value) || isSet(companion.locales?.[locale]?.[key])) continue;
      companion.locales ??= {};
      companion.locales[locale] ??= {};
      companion.locales[locale][key] = value;
      added.push(`locales.${locale}.${key}`);
    }
  }
  return { companion, added };
}

/**
 * Read, merge and write a Companion File. The result must satisfy the
 * Companion File schema; nothing is written otherwise.
 * @param {Record<string, any>} proposed
 * @param {string} [dir]
 * @returns {{ path: string, added: string[] }}
 */
export function writeCompanion(proposed, dir = DEFAULT_EDITORIAL_DIR) {
  const path = join(dir, `${proposed.id}.json`);
  const existing = existsSync(path) ? JSON.parse(readFileSync(path, "utf8")) : null;
  const { companion, added } = mergeCompanion(existing, proposed);
  const result = companionSchema.safeParse(companion);
  if (!result.success) {
    throw new Error(`${path}: ${result.error.issues.map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`).join("; ")}`);
  }
  if (added.length > 0 || !existing) {
    mkdirSync(dir, { recursive: true });
    writeFileSync(path, `${JSON.stringify(companion, null, 2)}\n`);
  }
  return { path, added };
}
