// scripts/notion-story/gate.mjs
//
// Runs a mapped Notion Story record through the real content-contract
// schemas (the same ones astro:content and validate-*.mjs enforce), plus
// the checks a Zod schema can't express: sign-off attestations, no
// leftover numeric-rating property on the Notion row, and the dated-update
// rule for republishing an already-published Date Spot, the append-only
// Google rating snapshots, and references into the other collections.

import { dateSpotsSchema } from "../../src/content-contracts/date-spot.mjs";
import { contributorRecipesSchema } from "../../src/content-contracts/contributor-recipe.mjs";
import { extendedProfilesSchema } from "../../src/content-contracts/extended-profile.mjs";
import { checkCrossReferences } from "../../src/content-contracts/cross-references.mjs";

const COLLECTION_SCHEMAS = {
  "date-spot": dateSpotsSchema,
  "contributor-recipe": contributorRecipesSchema,
  "extended-profile": extendedProfilesSchema,
};

const REQUIRED_ATTESTATIONS = ["Human reporting", "Human translation", "DMD-held photograph"];

// Any Notion property carrying this kind of name is a pre-pivot numeric
// score/rating leaking into a Story. "Verdict" is the one qualitative
// property this pattern must not flag.
const FORBIDDEN_PROPERTY_PATTERN = /\b(score|rating|stars?)\b/i;

/**
 * @param {string[]} schemaPropertyNames every property name defined on the Notion database
 * @returns {string[]} problems, empty when clean
 */
export function checkForbiddenProperties(schemaPropertyNames) {
  return schemaPropertyNames
    .filter((name) => FORBIDDEN_PROPERTY_PATTERN.test(name))
    .map((name) => `The Notion database still has a "${name}" property. Remove any numeric score or rating field.`);
}

/**
 * @param {(name: string) => string} getProp
 * @returns {string[]} problems, empty when every attestation is checked
 */
export function checkAttestations(getProp) {
  return REQUIRED_ATTESTATIONS.filter((name) => String(getProp(name)).trim().toLowerCase() !== "true" && getProp(name) !== true).map(
    (name) => `"${name}" is not checked. A Story cannot publish until Victor attests to it.`
  );
}

function coreRecommendationSignature(record) {
  if (record.postType !== "date-spot") return null;
  return JSON.stringify({
    verdict: record.reviewVerdict ?? null,
    goodFor: record.locales?.en?.goodFor ?? record.locales?.en?.whenItWorks ?? null,
    essentials: record.locales?.en?.essentials ?? null,
  });
}

/**
 * The dated-update rule: an already-published Date Spot cannot silently
 * change its recommendation. If the verdict, Good-for Signals, or
 * Essentials changed since the previous publish, both locales need a new
 * Material update dated after the previous Last checked date.
 *
 * @param {object} record the newly mapped record
 * @param {object|null} previousRecord the record currently in the collection, if any
 * @returns {string[]} problems, empty when the update is either unchanged or properly dated
 */
export function checkDatedUpdate(record, previousRecord) {
  if (!previousRecord || record.postType !== "date-spot") return [];
  if (coreRecommendationSignature(record) === coreRecommendationSignature(previousRecord)) return [];

  const previousLastChecked = previousRecord.freshness.lastChecked;
  const problems = [];
  for (const locale of ["en", "fr-CA"]) {
    const updates = record.locales[locale].materialUpdates ?? [];
    const hasNewDatedUpdate = updates.some((update) => update.date > previousLastChecked);
    if (!hasNewDatedUpdate) {
      problems.push(
        `The recommendation changed but ${locale} has no Material update dated after ${previousLastChecked} (the previous Last checked date). Add one explaining what changed.`
      );
    }
  }
  return problems;
}

/**
 * The venue's Google rating is a dated snapshot. A republish may add a new
 * line but never edits or drops one that was already printed.
 *
 * @param {object} record the newly mapped record
 * @param {object|null} previousRecord the record currently in the collection, if any
 * @returns {string[]} problems
 */
export function checkGoogleReviewsAppendOnly(record, previousRecord) {
  const previous = previousRecord?.googleReviews ?? [];
  const next = record.googleReviews ?? [];
  const kept = previous.every((snapshot, index) => JSON.stringify(snapshot) === JSON.stringify(next[index]));
  return kept ? [] : ["The Google reviews property changed or dropped an earlier snapshot. Keep every earlier line as it was and add the new snapshot on a new line."];
}

/**
 * @param {object} record the mapped, unvalidated record
 * @param {object[]} existingCollection the current contents of the collection JSON file
 * @param {(name: string) => string} getProp
 * @param {string[]} schemaPropertyNames every property name on the Notion database
 * @param {{ spots?: object[], recipes?: object[], profiles?: object[] }} [related] the published
 *   collections, so links into them can be checked; omitted in unit tests of a single collection
 * @returns {{ ok: true, collection: object[] } | { ok: false, problems: string[] }}
 */
export function publishGate(record, existingCollection, getProp, schemaPropertyNames, related) {
  const problems = [
    ...checkForbiddenProperties(schemaPropertyNames),
    ...checkAttestations(getProp),
  ];

  const previousRecord = existingCollection.find((entry) => entry.id === record.id) ?? null;
  problems.push(...checkDatedUpdate(record, previousRecord));
  problems.push(...checkGoogleReviewsAppendOnly(record, previousRecord));

  if (problems.length > 0) return { ok: false, problems };

  const collection = previousRecord
    ? existingCollection.map((entry) => (entry.id === record.id ? record : entry))
    : [...existingCollection, record];

  const schema = COLLECTION_SCHEMAS[record.postType];
  const result = schema.safeParse(collection);
  if (!result.success) {
    return {
      ok: false,
      problems: result.error.issues.map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`),
    };
  }

  if (related) {
    const key = { "date-spot": "spots", "contributor-recipe": "recipes", "extended-profile": "profiles" }[record.postType];
    const referenceProblems = checkCrossReferences({ spots: [], recipes: [], profiles: [], ...related, [key]: result.data });
    if (referenceProblems.length > 0) return { ok: false, problems: referenceProblems };
  }

  return { ok: true, collection: result.data, mode: previousRecord ? "update" : "publish" };
}
