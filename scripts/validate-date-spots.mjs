import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { dateSpotsSchema } from "../src/content-contracts/date-spot.mjs";
import { contributorRecipesSchema } from "../src/content-contracts/contributor-recipe.mjs";
import { extendedProfilesSchema } from "../src/content-contracts/extended-profile.mjs";
import { checkCrossReferences, editorialWarnings } from "../src/content-contracts/cross-references.mjs";

const read = (path) => (existsSync(path) ? JSON.parse(readFileSync(path, "utf8")) : []);
const spots = dateSpotsSchema.parse(read("src/content/date-spots.json"));
for (const spot of spots) {
  for (const [label, src] of [["Editorial Image", spot.image.src], ...Object.entries(spot.photos ?? {}).map(([key, photo]) => [`Photo "${key}"`, photo.src])]) {
    if (!existsSync(resolve("public", `.${src}`))) throw new Error(`${spot.id}: ${label} is missing: ${src}`);
  }
}
const problems = checkCrossReferences({
  spots,
  recipes: contributorRecipesSchema.parse(read("src/content/contributor-recipes.json")),
  profiles: extendedProfilesSchema.parse(read("src/content/extended-profiles.json")),
});
if (problems.length) throw new Error(`Unresolved references:\n${problems.join("\n")}`);
for (const warning of editorialWarnings(spots)) console.warn(`[WARN] ${warning}`);
console.log(`Validated ${spots.length} complete Date Spot Locale Pairs.`);
