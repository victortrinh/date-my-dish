import { test } from "node:test";
import assert from "node:assert/strict";
import { contributorRecipeSchema, contributorRecipesSchema } from "../../src/content-contracts/contributor-recipe.mjs";
import { extendedProfileSchema, extendedProfilesSchema } from "../../src/content-contracts/extended-profile.mjs";

// Mechanical test values, never loaded into a public collection or published.
const token = "[TEST ONLY]";
const recipeCopy = () => ({
  title: token, slug: "test-recipe", metaTitle: token, metaDescription: token,
  originalContext: token, sourceNotes: token, factNotes: token, imageAlt: token, imageCredit: token,
  serves: token, activeTime: "PT20M", totalTime: "PT45M", difficulty: "medium", equipment: [token], dietaryNotes: [token],
  ingredientGroups: [{ items: [token] }], methodGroups: [{ steps: [token] }], contributorNotes: [token],
});
const contributorRecipe = () => ({
  id: "test-recipe", postType: "contributor-recipe", recipeOrigin: "contributor-supplied",
  contributor: { name: token, role: "chef", venueOrContext: token },
  suppliedSource: { description: token, receivedOn: "2026-01-01" },
  authorship: { recipe: "human-supplied", translation: "human" }, published: "2026-01-02",
  image: { src: "/images/contributor-recipes/test-recipe.webp", width: 1200, height: 800, provenance: "dmd-held-photograph" },
  locales: { en: recipeCopy(), "fr-CA": recipeCopy() },
});
const profileCopy = () => ({
  title: token, slug: "test-profile", metaTitle: token, metaDescription: token,
  shortScene: token, venueReporting: token, dinnerAndDate: [{ question: token, answer: token }], shortVersion: token,
  sourceNotes: token, factNotes: token, imageAlt: token, imageCredit: token,
});
const extendedProfile = () => ({
  id: "test-profile", postType: "extended-profile",
  subject: { name: token, role: "bartender", venue: token, neighbourhood: token }, companionDateSpot: "test-date-spot",
  originalInterview: { conductedOn: "2026-01-01", source: token, quoteVerification: "facts-and-quotes-only" },
  authorship: { reporting: "human", translation: "human" }, published: "2026-01-02",
  image: { src: "/images/profiles/test-profile.webp", width: 1200, height: 800, provenance: "dmd-held-photograph" },
  locales: { en: profileCopy(), "fr-CA": profileCopy() },
});
const rejects = (schema, value) => assert.equal(schema.safeParse(value).success, false);

test("Contributor Recipes require human-supplied, named and sourced bilingual recipes", () => {
  assert.equal(contributorRecipeSchema.safeParse(contributorRecipe()).success, true);
  for (const key of ["contributor", "suppliedSource", "authorship", "published", "image", "locales"]) {
    const recipe = contributorRecipe(); delete recipe[key]; rejects(contributorRecipeSchema, recipe);
  }
  for (const field of ["recipeOrigin", "adaptation", "inspiredBy", "dateScore"]) {
    const recipe = contributorRecipe();
    if (field === "recipeOrigin") recipe[field] = "adapted";
    else recipe[field] = token;
    rejects(contributorRecipeSchema, recipe);
  }
  const unnamed = contributorRecipe(); unnamed.contributor.name = " "; rejects(contributorRecipeSchema, unnamed);
  const partial = contributorRecipe(); delete partial.locales["fr-CA"]; rejects(contributorRecipeSchema, partial);
  const unsupplied = contributorRecipe(); unsupplied.authorship.recipe = "ai"; rejects(contributorRecipeSchema, unsupplied);
});

test("Contributor Recipes keep DMD testing notes separate from contributor instructions", () => {
  const recipe = contributorRecipe(); recipe.locales.en.dmdTestingNote = token;
  assert.equal(contributorRecipeSchema.safeParse(recipe).success, true);
  const mismatchedLinks = contributorRecipe();
  mismatchedLinks.locales.en.pairItWith = ["test-date-spot"];
  rejects(contributorRecipeSchema, mismatchedLinks);
  const sourceAfterPublication = contributorRecipe(); sourceAfterPublication.suppliedSource.receivedOn = "2026-01-03";
  rejects(contributorRecipeSchema, sourceAfterPublication);
});

test("Extended Profiles are bilingual companion reporting, never a replacement for a Date Spot module", () => {
  assert.equal(extendedProfileSchema.safeParse(extendedProfile()).success, true);
  for (const key of ["subject", "companionDateSpot", "originalInterview", "authorship", "published", "image", "locales"]) {
    const profile = extendedProfile(); delete profile[key]; rejects(extendedProfileSchema, profile);
  }
  const generated = extendedProfile(); generated.authorship.reporting = "ai"; rejects(extendedProfileSchema, generated);
  const partial = extendedProfile(); delete partial.locales["fr-CA"]; rejects(extendedProfileSchema, partial);
  const noInterview = extendedProfile(); noInterview.originalInterview.source = " "; rejects(extendedProfileSchema, noInterview);
  const lateInterview = extendedProfile(); lateInterview.originalInterview.conductedOn = "2026-01-03"; rejects(extendedProfileSchema, lateInterview);
});

test("Extended Profile recipe links are optional but require parallel at-home reporting", () => {
  const profile = extendedProfile();
  for (const locale of ["en", "fr-CA"]) {
    profile.locales[locale].atHome = token;
    profile.locales[locale].contributorRecipe = "test-recipe";
  }
  assert.equal(extendedProfileSchema.safeParse(profile).success, true);
  const dangling = extendedProfile(); dangling.locales.en.contributorRecipe = "test-recipe";
  rejects(extendedProfileSchema, dangling);
  const mismatch = extendedProfile();
  for (const locale of ["en", "fr-CA"]) mismatch.locales[locale].atHome = token;
  mismatch.locales.en.contributorRecipe = "test-recipe";
  rejects(extendedProfileSchema, mismatch);
});

test("Contributor and profile collections reject duplicate locale slugs and IDs", () => {
  assert.equal(contributorRecipesSchema.safeParse([contributorRecipe(), contributorRecipe()]).success, false);
  assert.equal(extendedProfilesSchema.safeParse([extendedProfile(), extendedProfile()]).success, false);
});
