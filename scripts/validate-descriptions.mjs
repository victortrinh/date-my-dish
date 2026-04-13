#!/usr/bin/env node
/**
 * Validate content frontmatter for SEO compliance:
 * - Descriptions: 120-160 characters
 * - Titles: max 46 characters (60 minus " | Date My Dish" suffix)
 * Run: node scripts/validate-descriptions.mjs
 */
import { readFileSync, readdirSync } from "fs";
import { join } from "path";

const dirs = [
  "src/content/recipes/en",
  "src/content/recipes/fr",
  "src/content/articles/en",
  "src/content/articles/fr",
  "src/content/reviews/en",
  "src/content/reviews/fr",
];

const MAX_TITLE_LENGTH = 46;
const MIN_DESC_LENGTH = 120;
const MAX_DESC_LENGTH = 160;

let errors = 0;
let warnings = 0;

for (const dir of dirs) {
  const files = readdirSync(dir).filter((f) => f.endsWith(".mdx"));
  for (const file of files) {
    const content = readFileSync(join(dir, file), "utf-8");

    // Validate description
    const descMatch = content.match(/^description:\s*"(.+?)"/m);
    if (descMatch) {
      const desc = descMatch[1];
      if (desc.length > MAX_DESC_LENGTH) {
        console.error(`❌ ${dir}/${file}: description is ${desc.length} chars (max ${MAX_DESC_LENGTH})`);
        errors++;
      } else if (desc.length < MIN_DESC_LENGTH) {
        console.warn(`⚠️  ${dir}/${file}: description is ${desc.length} chars (min ${MIN_DESC_LENGTH} recommended)`);
        warnings++;
      }
    }

    // Validate title
    const titleMatch = content.match(/^title:\s*"(.+?)"/m);
    if (titleMatch) {
      const title = titleMatch[1];
      if (title.length > MAX_TITLE_LENGTH) {
        console.error(`❌ ${dir}/${file}: title is ${title.length} chars (max ${MAX_TITLE_LENGTH}, renders as "${title} | Date My Dish" = ${title.length + 14} chars)`);
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
  console.log(`✅ All titles and descriptions pass SEO checks.`);
}
