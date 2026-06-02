#!/usr/bin/env node
/**
 * Pre-build SEO guard. Runs against `src/` (no build needed) and fails
 * (exit 1) on source-level mistakes that caused the Jun 2026 Ahrefs issues:
 *
 *   1. <Picture> without fallbackFormat  -> Astro emits a huge PNG <img> fallback
 *   2. Recipe tag missing a translation  -> renders raw "tags.<x>" + breaks hreflang
 *   3. EN/FR recipe tag drift            -> tag pages don't pair across locales
 *
 * Cuisine completeness is enforced at build time by validate-build.mjs
 * (untranslated keys and broken hreflang surface in the rendered output).
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

// ---- recipe frontmatter helpers --------------------------------------------

function field(content, name) {
  const m = content.match(new RegExp(`^${name}:\\s*"?([^"\\n]+?)"?\\s*$`, "m"));
  return m ? m[1].trim() : null;
}

function tagsOf(content) {
  const lines = content.split("\n");
  const tags = [];
  let inTags = false;
  for (const line of lines) {
    if (/^tags:\s*$/.test(line)) { inTags = true; continue; }
    if (inTags) {
      const m = line.match(/^\s+-\s+(.+?)\s*$/);
      if (m) tags.push(m[1].replace(/^["']|["']$/g, ""));
      else if (/^\S/.test(line)) break;
    }
  }
  return tags;
}

function loadRecipes(lang) {
  const dir = `src/content/recipes/${lang}`;
  const map = new Map();
  for (const f of readdirSync(dir).filter((f) => f.endsWith(".mdx"))) {
    const content = readFileSync(join(dir, f), "utf-8");
    map.set(f.replace(/\.mdx$/, ""), {
      tags: tagsOf(content),
      translationSlug: field(content, "translationSlug"),
    });
  }
  return map;
}

const en = loadRecipes("en");
const fr = loadRecipes("fr");

// ---- 2. every tag that GENERATES a page must be translated in both locales -
// Tag pages/chips only appear at >= MIN_TAG recipes in a locale (mirrors the
// MIN_RECIPES_FOR_TAG_PAGE threshold in the tag page templates). Single-use
// tags never render a label, so they don't need a translation.

const MIN_TAG = 2;
const enJson = JSON.parse(readFileSync("src/i18n/en.json", "utf-8"));
const frJson = JSON.parse(readFileSync("src/i18n/fr.json", "utf-8"));
const count = (recipes) => {
  const c = new Map();
  for (const { tags } of recipes.values()) for (const t of tags) c.set(t, (c.get(t) || 0) + 1);
  return c;
};
const enCounts = count(en);
const frCounts = count(fr);
const renderedTags = new Set();
for (const [tag, n] of enCounts) if (n >= MIN_TAG) renderedTags.add(tag);
for (const [tag, n] of frCounts) if (n >= MIN_TAG) renderedTags.add(tag);
for (const tag of renderedTags) {
  if (!(tag in (enJson.tags || {}))) err(`[tag-i18n] tag "${tag}" generates a page but is missing from en.json "tags"`);
  if (!(tag in (frJson.tags || {}))) err(`[tag-i18n] tag "${tag}" generates a page but is missing from fr.json "tags"`);
}

// ---- 3. EN/FR recipe pairs must use the same tag set -----------------------

for (const [frSlug, frData] of fr) {
  const enSlug = frData.translationSlug;
  if (!enSlug || !en.has(enSlug)) continue; // unpaired; not this check's concern
  const enTags = [...en.get(enSlug).tags].sort();
  const frTags = [...frData.tags].sort();
  if (enTags.join(",") !== frTags.join(",")) {
    err(
      `[tag-parity] tag mismatch between en/${enSlug} and fr/${frSlug}\n` +
        `      en: ${enTags.join(", ") || "(none)"}\n` +
        `      fr: ${frTags.join(", ") || "(none)"}`
    );
  }
}

// ---- report ----------------------------------------------------------------

if (errors.length) {
  console.error(`\n❌ validate-source: ${errors.length} issue(s) found:\n`);
  for (const e of errors.sort()) console.error("  " + e);
  console.error("\nFix these before building (see CLAUDE.md SEO lessons).");
  process.exit(1);
}
console.log("✅ validate-source: Picture fallbacks, tag translations, and EN/FR tag parity all pass.");
