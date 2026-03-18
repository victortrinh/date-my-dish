#!/usr/bin/env node
/**
 * Validate that all content descriptions are <= 160 characters.
 * Run: node scripts/validate-descriptions.mjs
 */
import { readFileSync, readdirSync } from "fs";
import { join } from "path";

const dirs = [
  "src/content/recipes/en",
  "src/content/recipes/fr",
  "src/content/articles/en",
  "src/content/articles/fr",
];

let errors = 0;

for (const dir of dirs) {
  const files = readdirSync(dir).filter((f) => f.endsWith(".mdx"));
  for (const file of files) {
    const content = readFileSync(join(dir, file), "utf-8");
    const match = content.match(/^description:\s*"(.+?)"/m);
    if (match) {
      const desc = match[1];
      if (desc.length > 160) {
        console.error(`❌ ${dir}/${file}: description is ${desc.length} chars (max 160)`);
        errors++;
      }
    }
  }
}

if (errors > 0) {
  console.error(`\n${errors} description(s) exceed 160 characters.`);
  process.exit(1);
} else {
  console.log(`✅ All descriptions are within 160 characters.`);
}
