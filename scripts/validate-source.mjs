#!/usr/bin/env node
/**
 * Pre-build SEO guard. Runs against `src/` (no build needed) and fails
 * (exit 1) on source-level mistakes:
 *
 *   1. <Picture> without fallbackFormat  -> Astro emits a huge PNG <img> fallback
 *
 * Recipe/article tag-translation and EN/FR tag-parity checks were removed
 * when recipes and articles were retired from public generation (#498):
 * `src/content/recipes/{en,fr}` stays in Git as Retired Legacy Content but
 * is never built, so validating its tag frontmatter no longer protects
 * anything reader-facing. Cuisine/tag completeness for the live Date Spot,
 * Contributor Recipe, and Extended Profile collections is enforced by
 * scripts/validate-date-spots.mjs and scripts/validate-contributor-content.mjs
 * (schema-level) and validate-build.mjs (untranslated keys and broken
 * hreflang surface in the rendered output).
 *
 * Run: node scripts/validate-source.mjs   (also runs automatically via `prebuild`)
 */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const errors = [];
const err = (msg) => errors.push(msg);

function walk(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

// ---- 1. <Picture> must declare fallbackFormat ------------------------------
// Astro's default fallback for webp/avif sources is PNG, which balloons to
// 1-3 MB for photos. fallbackFormat="webp" keeps the <img> fallback small.

for (const file of walk("src").filter((f) => /\.(astro|mdx)$/.test(f))) {
  const content = readFileSync(file, "utf-8");
  const segments = content.split("<Picture");
  for (let i = 1; i < segments.length; i++) {
    const end = segments[i].indexOf("/>");
    const tag = end >= 0 ? segments[i].slice(0, end) : segments[i].slice(0, 600);
    if (!/fallbackFormat/.test(tag)) {
      err(`[picture] ${file}: a <Picture> is missing fallbackFormat (use fallbackFormat="webp")`);
    }
  }
}

// ---- report ----------------------------------------------------------------

if (errors.length) {
  console.error(`\n❌ validate-source: ${errors.length} issue(s) found:\n`);
  for (const e of errors.sort()) console.error("  " + e);
  console.error("\nFix these before building (see CLAUDE.md SEO lessons).");
  process.exit(1);
}
console.log("✅ validate-source: Picture fallbacks all pass.");
