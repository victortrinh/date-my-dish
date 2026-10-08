// Pre-build gate for every published post: each collection with its
// Companion Files merged in, validated against its content contract.
// Fails on a missing required field (naming it), a review under the
// word-count minimum, a missing image or an unresolved link. Warns, without
// failing, below the word-count and internal-link targets and when
// "A favourite" passes one in four.
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { dateSpotsSchema } from "../src/content-contracts/date-spot.mjs";
import { contributorRecipesSchema } from "../src/content-contracts/contributor-recipe.mjs";
import { extendedProfilesSchema } from "../src/content-contracts/extended-profile.mjs";
import { checkCrossReferences, editorialWarnings } from "../src/content-contracts/cross-references.mjs";
import { loadCollection } from "../src/content-contracts/load.mjs";

const editorialDir = process.env.EDITORIAL_SOURCE || "src/content/editorial";

/** Parse a merged collection, reporting each issue with its record id and field path. */
function parse(schema, label, path) {
  const records = loadCollection(path, editorialDir);
  const result = schema.safeParse(records);
  if (result.success) return result.data;
  const lines = result.error.issues.map((issue) => {
    const [index, ...field] = issue.path;
    const id = typeof index === "number" ? records[index]?.id ?? `#${index}` : "(collection)";
    return `  ${id}: ${field.join(".") || "(record)"}: ${issue.message}`;
  });
  console.error(`${label} (${path}) failed its content contract:\n${lines.join("\n")}`);
  process.exit(1);
}

const spots = parse(dateSpotsSchema, "Date Spots", process.env.DATE_SPOT_SOURCE || "src/content/date-spots.json");
const recipes = parse(contributorRecipesSchema, "Chef Recipe Cards", process.env.CONTRIBUTOR_RECIPE_SOURCE || "src/content/contributor-recipes.json");
const profiles = parse(extendedProfilesSchema, "Chef pages", process.env.EXTENDED_PROFILE_SOURCE || "src/content/extended-profiles.json");

for (const spot of spots) {
  for (const [label, src] of [["Editorial Image", spot.image.src], ...Object.entries(spot.photos ?? {}).map(([key, photo]) => [`Photo "${key}"`, photo.src])]) {
    if (!existsSync(resolve("public", `.${src}`))) throw new Error(`${spot.id}: ${label} is missing: ${src}`);
  }
}
const problems = checkCrossReferences({ spots, recipes, profiles });
if (problems.length) throw new Error(`Unresolved references:\n${problems.join("\n")}`);
for (const warning of editorialWarnings(spots)) console.warn(`[WARN] ${warning}`);
console.log(`Validated ${spots.length} Date Spot, ${recipes.length} Chef Recipe Card and ${profiles.length} Chef Locale Pairs.`);
