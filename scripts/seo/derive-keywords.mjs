// scripts/seo/derive-keywords.mjs
// Derives target keywords for SEO rank tracking from the published
// collections: Reviews and Date Spots (src/content/date-spots.json), Chefs
// (src/content/extended-profiles.json) and Recipe Cards
// (src/content/contributor-recipes.json). Retired recipes and articles are
// never read. Newest posts come first, then the list is deduplicated and
// capped at KEYWORD_LIMIT.
//
// Usage:
//   KEYWORD_LIMIT=60 node scripts/seo/derive-keywords.mjs

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { neighbourhoodSlug } from "../../src/content-contracts/date-spot.mjs";

// Same overrides as src/content.config.ts, so the fixtures can stand in.
const SOURCES = {
  spots: process.env.DATE_SPOT_SOURCE || "src/content/date-spots.json",
  profiles: process.env.EXTENDED_PROFILE_SOURCE || "src/content/extended-profiles.json",
  recipes: process.env.CONTRIBUTOR_RECIPE_SOURCE || "src/content/contributor-recipes.json",
};
const OUTPUT_FILE = "data/seo/derived-keywords.json";

const limit = parseInt(process.env.KEYWORD_LIMIT ?? "60", 10);

function load(file) {
  if (!existsSync(file)) return [];
  return JSON.parse(readFileSync(file, "utf-8"));
}

function clean(text) {
  return text
    .toLowerCase()
    .replace(/[()"“”'‘’]/g, "")
    .replace(/[,:|]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// URL builders mirror src/utils/date-spots.ts (the routes the site renders).
const isVenueReview = (spot) => spot.spotType === "restaurant" || spot.spotType === "bar";
const spotUrl = (spot) =>
  isVenueReview(spot)
    ? `/en/reviews/${neighbourhoodSlug(spot.neighbourhood)}/${spot.locales.en.slug}/`
    : `/en/date-spots/${spot.locales.en.slug}/`;
const profileUrl = (profile) => `/en/chefs/${profile.locales.en.slug}/`;
const recipeUrl = (recipe) => `/en/recipe-cards/${recipe.locales.en.slug}/`;

function spotKeywords(spot) {
  const copy = spot.locales.en;
  const url = spotUrl(spot);
  const source = isVenueReview(spot) ? "review" : "date-spot";
  const keywords = [
    `${spot.name} ${spot.neighbourhood}`,
    `${spot.name} ${spot.city}`,
    copy.title,
  ];
  if (copy.cuisine) keywords.push(`${copy.cuisine} restaurant ${spot.neighbourhood}`);
  return keywords.map((keyword) => ({ keyword: clean(keyword), source, url, lang: "en" }));
}

function profileKeywords(profile) {
  const url = profileUrl(profile);
  return [
    `${profile.subject.name} ${profile.subject.role}`,
    `${profile.subject.name} ${profile.subject.venue}`,
    profile.locales.en.title,
  ].map((keyword) => ({ keyword: clean(keyword), source: "chef", url, lang: "en" }));
}

function recipeKeywords(recipe) {
  const url = recipeUrl(recipe);
  return [
    recipe.locales.en.title,
    `${recipe.contributor.name} recipe`,
  ].map((keyword) => ({ keyword: clean(keyword), source: "recipe-card", url, lang: "en" }));
}

function deduplicate(keywords) {
  const seen = new Map();
  for (const entry of keywords) {
    if (entry.keyword && !seen.has(entry.keyword)) seen.set(entry.keyword, entry);
  }
  return [...seen.values()];
}

function main() {
  const spots = load(SOURCES.spots);
  const profiles = load(SOURCES.profiles);
  const recipes = load(SOURCES.recipes);

  const posts = [
    ...spots.map((spot) => ({ published: spot.freshness.published, keywords: spotKeywords(spot) })),
    ...profiles.map((profile) => ({ published: profile.published, keywords: profileKeywords(profile) })),
    ...recipes.map((recipe) => ({ published: recipe.published, keywords: recipeKeywords(recipe) })),
  ].sort((a, b) => b.published.localeCompare(a.published));

  const all = posts.flatMap((post) => post.keywords);
  const unique = deduplicate(all);
  const capped = unique.slice(0, limit);

  mkdirSync("data/seo", { recursive: true });
  writeFileSync(OUTPUT_FILE, JSON.stringify(capped, null, 2) + "\n");

  console.log(`Derived ${all.length} raw keywords from ${spots.length} Date Spots, ${profiles.length} Chefs and ${recipes.length} Recipe Cards`);
  console.log(`After dedup: ${unique.length} unique keywords`);
  console.log(`Output: ${capped.length} keywords (limit: ${limit})`);
  console.log(`Written to ${OUTPUT_FILE}`);
}

main();
