// scripts/notion-story/fields.mjs
//
// The Notion Source as it is. DMD never writes to Notion and cannot change
// its schema, so this file names the properties and values the authors
// already use and nothing else. See docs/editorial-publishing-system.md
// ("Where content comes from").

export const DATABASE_PAGE_ID = "9ce95183503543d68450194d1010824b";

// Existing database properties the importer reads.
export const PROPERTIES = {
  title: "Post Title",
  postType: "Post Type",
  status: "Status",
  borough: "Borough",
  number: "Recipe #",
  publishDate: "Publish Date",
};

// Post Type -> the DMD post type and the collection it publishes into.
// Every other Post Type (Recipes, Informative Posts, Affiliate Links, empty)
// is Retired Legacy Content and ignored here.
export const ELIGIBLE_POST_TYPES = {
  "Restaurant Reviews": { postType: "review", collection: "src/content/date-spots.json" },
  "Date Spots": { postType: "date-spot", collection: "src/content/date-spots.json" },
  "Chef Interviews": { postType: "chef", collection: "src/content/extended-profiles.json" },
};

export const ELIGIBLE_STATUSES = ["Ready to Publish", "Published"];

/**
 * @param {{ postType: string, status: string }} row
 * @returns {boolean}
 */
export function isEligible(row) {
  return Object.hasOwn(ELIGIBLE_POST_TYPES, row.postType) && ELIGIBLE_STATUSES.includes(row.status);
}

/** "Côte-des-Neiges" -> "cote-des-neiges"; "Cabaret l'Enfer" -> "cabaret-lenfer". */
export function slugify(value) {
  return String(value)
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * The venue a row is about, from its title alone, so duplicates can be
 * flagged before any page is fetched:
 *   "Giwa Review: Modern Korean Cooking in Verdun"   -> "giwa"
 *   "Ratafia, Little Italy: Dessert Wine Bar Review" -> "ratafia"
 *   "TOHU, Saint-Michel: Arts and Culture Date Idea" -> "tohu"
 * @param {string} title
 */
export function venueKey(title) {
  const head = String(title).split(":")[0];
  const name = head
    .replace(/\s+\(.*?\)/g, "")
    .replace(/\s+(?:(?:restaurant|brunch|bar)\s+)?review\b.*$/i, "")
    .split(",")[0];
  return slugify(name);
}
