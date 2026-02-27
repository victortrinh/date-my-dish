// scripts/seo/derive-keywords.mjs
// Extracts target keywords from EN recipe and article frontmatter
// for SEO rank tracking. Deduplicates and caps at KEYWORD_LIMIT.
//
// Usage:
//   KEYWORD_LIMIT=60 node scripts/seo/derive-keywords.mjs

import { readFileSync, writeFileSync, readdirSync, mkdirSync } from "fs";
import { join, basename } from "path";
import matter from "gray-matter";

const RECIPES_DIR = "src/content/recipes/en";
const ARTICLES_DIR = "src/content/articles/en";
const OUTPUT_FILE = "data/seo/derived-keywords.json";

const { KEYWORD_LIMIT = "60" } = process.env;
const limit = parseInt(KEYWORD_LIMIT, 10);

// ---------------------------------------------------------------------------
// Frontmatter parsing
// ---------------------------------------------------------------------------
function parseFrontmatter(filePath) {
  const raw = readFileSync(filePath, "utf-8");
  const { data } = matter(raw);
  const slug = basename(filePath, ".mdx");
  return { ...data, slug };
}

function getMdxFiles(dir) {
  try {
    return readdirSync(dir)
      .filter((f) => f.endsWith(".mdx"))
      .map((f) => join(dir, f));
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Keyword extraction
// ---------------------------------------------------------------------------
function cleanTitle(title) {
  return title
    .toLowerCase()
    .replace(/[()"""'']/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function extractRecipeKeywords(data) {
  const keywords = [];
  const url = `/en/recipes/${data.slug}/`;

  // 1. Title (cleaned)
  if (data.title) {
    keywords.push({ keyword: cleanTitle(data.title), source: "title", url, lang: "en" });
  }

  // 2. Frontmatter keywords (first 3)
  if (Array.isArray(data.keywords)) {
    for (const kw of data.keywords.slice(0, 3)) {
      keywords.push({ keyword: kw.toLowerCase().trim(), source: "keywords", url, lang: "en" });
    }
  }

  // 3. Cuisine + "recipe"
  if (data.recipeCuisine) {
    keywords.push({
      keyword: `${data.recipeCuisine.toLowerCase()} recipe`,
      source: "cuisine",
      url,
      lang: "en",
    });
  }

  return keywords;
}

function extractArticleKeywords(data) {
  const keywords = [];
  const url = `/en/articles/${data.slug}/`;

  // 1. Title (cleaned)
  if (data.title) {
    keywords.push({ keyword: cleanTitle(data.title), source: "title", url, lang: "en" });
  }

  // 2. Frontmatter keywords (first 3)
  if (Array.isArray(data.keywords)) {
    for (const kw of data.keywords.slice(0, 3)) {
      keywords.push({ keyword: kw.toLowerCase().trim(), source: "keywords", url, lang: "en" });
    }
  }

  return keywords;
}

// ---------------------------------------------------------------------------
// Deduplication
// ---------------------------------------------------------------------------
function deduplicateKeywords(keywords) {
  const seen = new Map();
  for (const entry of keywords) {
    if (!seen.has(entry.keyword)) {
      seen.set(entry.keyword, entry);
    }
  }
  return Array.from(seen.values());
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  const allKeywords = [];

  // Process EN recipes
  const recipeFiles = getMdxFiles(RECIPES_DIR);
  for (const file of recipeFiles) {
    const data = parseFrontmatter(file);
    allKeywords.push(...extractRecipeKeywords(data));
  }

  // Process EN articles
  const articleFiles = getMdxFiles(ARTICLES_DIR);
  for (const file of articleFiles) {
    const data = parseFrontmatter(file);
    allKeywords.push(...extractArticleKeywords(data));
  }

  // Deduplicate and cap
  const unique = deduplicateKeywords(allKeywords);
  const capped = unique.slice(0, limit);

  // Write output
  mkdirSync("data/seo", { recursive: true });
  writeFileSync(OUTPUT_FILE, JSON.stringify(capped, null, 2) + "\n");

  console.log(`Derived ${allKeywords.length} raw keywords from ${recipeFiles.length} recipes + ${articleFiles.length} articles`);
  console.log(`After dedup: ${unique.length} unique keywords`);
  console.log(`Output: ${capped.length} keywords (limit: ${limit})`);
  console.log(`Written to ${OUTPUT_FILE}`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
