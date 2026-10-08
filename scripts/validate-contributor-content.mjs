import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { contributorRecipesSchema } from "../src/content-contracts/contributor-recipe.mjs";
import { extendedProfilesSchema } from "../src/content-contracts/extended-profile.mjs";
import { loadCollection } from "../src/content-contracts/load.mjs";

const editorialDir = process.env.EDITORIAL_SOURCE || "src/content/editorial";
const recipes = contributorRecipesSchema.parse(loadCollection(process.env.CONTRIBUTOR_RECIPE_SOURCE || "src/content/contributor-recipes.json", editorialDir));
const profiles = extendedProfilesSchema.parse(loadCollection(process.env.EXTENDED_PROFILE_SOURCE || "src/content/extended-profiles.json", editorialDir));
for (const content of [...recipes, ...profiles]) {
  // Photos are optional on chef pages and recipe cards; a declared one must exist.
  if (content.image && !existsSync(resolve("public", `.${content.image.src}`))) {
    throw new Error(`${content.id}: Editorial Image is missing: ${content.image.src}`);
  }
}
console.log(`Validated ${recipes.length} Chef Recipe Card and ${profiles.length} Chef Locale Pairs.`);
