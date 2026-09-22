import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { contributorRecipesSchema } from "../src/content-contracts/contributor-recipe.mjs";
import { extendedProfilesSchema } from "../src/content-contracts/extended-profile.mjs";

const recipes = contributorRecipesSchema.parse(JSON.parse(readFileSync("src/content/contributor-recipes.json", "utf8")));
const profiles = extendedProfilesSchema.parse(JSON.parse(readFileSync("src/content/extended-profiles.json", "utf8")));
for (const content of [...recipes, ...profiles]) {
  if (!existsSync(resolve("public", `.${content.image.src}`))) {
    throw new Error(`${content.id}: Editorial Image is missing: ${content.image.src}`);
  }
}
console.log(`Validated ${recipes.length} Contributor Recipe and ${profiles.length} Extended Profile Locale Pairs.`);
