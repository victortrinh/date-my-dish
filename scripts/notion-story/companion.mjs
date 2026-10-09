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

/**
 * The proposals a script can make without judgement, from the author's
 * metadata block and the row's properties. The agent adds the rest (verdict
 * reason from the review's own text, category, Good-for signals).
 * @param {{ metadata: Record<string, string>, notion?: { borough?: string | null } }} source
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
