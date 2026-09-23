#!/usr/bin/env node
/**
 * Validate metaTitle/metaDescription length for the live Date Spot,
 * Contributor Recipe, and Extended Profile Locale Pairs:
 * - metaDescription: 120-160 characters
 * - metaTitle: max 46 characters (60 minus " | Date My Dish" suffix)
 *
 * The schemas in src/content-contracts/ already enforce metaTitle<=60 and
 * metaDescription<=160 as a hard cap; this script narrows metaTitle to the
 * SEO-safe 46 and enforces the 120 floor on metaDescription that a Zod
 * `.max()` cannot express as a warning-vs-error split.
 *
 * Run: node scripts/validate-descriptions.mjs
 */
import { readFileSync, existsSync } from "fs";

const COLLECTIONS = [
  "src/content/date-spots.json",
  "src/content/contributor-recipes.json",
  "src/content/extended-profiles.json",
];

const MAX_TITLE_LENGTH = 46;
const MIN_DESC_LENGTH = 120;
const MAX_DESC_LENGTH = 160;

let errors = 0;
let warnings = 0;

for (const path of COLLECTIONS) {
  if (!existsSync(path)) continue;
  const entries = JSON.parse(readFileSync(path, "utf-8"));
  for (const entry of entries) {
    for (const locale of ["en", "fr-CA"]) {
      const copy = entry.locales?.[locale];
      if (!copy) continue;
      const label = `${path} (${entry.id}, ${locale})`;

      if (copy.metaDescription) {
        const len = copy.metaDescription.length;
        if (len > MAX_DESC_LENGTH) {
          console.error(`❌ ${label}: metaDescription is ${len} chars (max ${MAX_DESC_LENGTH})`);
          errors++;
        } else if (len < MIN_DESC_LENGTH) {
          console.warn(`⚠️  ${label}: metaDescription is ${len} chars (min ${MIN_DESC_LENGTH} recommended)`);
          warnings++;
        }
      }

      if (copy.metaTitle && copy.metaTitle.length > MAX_TITLE_LENGTH) {
        console.error(
          `❌ ${label}: metaTitle is ${copy.metaTitle.length} chars (max ${MAX_TITLE_LENGTH}, renders as "${copy.metaTitle} | Date My Dish" = ${copy.metaTitle.length + 14} chars)`
        );
        errors++;
      }
    }
  }
}

if (errors > 0) {
  console.error(`\n${errors} error(s) found.`);
  if (warnings > 0) console.warn(`${warnings} warning(s) found.`);
  process.exit(1);
} else if (warnings > 0) {
  console.warn(`\n⚠️  ${warnings} warning(s) found (no errors).`);
} else {
  console.log(`✅ All metaTitles and metaDescriptions pass SEO checks.`);
}
