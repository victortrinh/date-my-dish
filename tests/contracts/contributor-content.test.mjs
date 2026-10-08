import { test } from "node:test";
import assert from "node:assert/strict";
import { contributorRecipeSchema, contributorRecipesSchema } from "../../src/content-contracts/contributor-recipe.mjs";
import { extendedProfileSchema, extendedProfilesSchema, DINNER_AND_DATE_QUESTIONS } from "../../src/content-contracts/extended-profile.mjs";

// Mechanical test values, never loaded into a public collection or published.
const token = "[TEST ONLY]";
const description = `${token} mechanical fixture for checking a contributor page route, its visible modules, metadata and schema output.`.padEnd(130, ".");
const recipeCopy = () => ({
  title: token, slug: "test-recipe", metaTitle: token, metaDescription: description,
  originalContext: token, sourceNotes: token, factNotes: token, imageAlt: token, imageCredit: token,
  serves: token, activeTime: "PT20M", totalTime: "PT45M", difficulty: "medium", equipment: [token], dietaryNotes: [token],
  ingredientGroups: [{ items: [token] }], methodGroups: [{ steps: [token] }], contributorNotes: [token],
});
const contributorRecipe = () => ({
  id: "test-recipe", postType: "contributor-recipe", recipeOrigin: "contributor-supplied",
  contributor: { name: token, role: "chef", venueOrContext: token },
  suppliedSource: { description: token, receivedOn: "2026-01-01" },
  published: "2026-01-02",
  image: { src: "/images/contributor-recipes/test-recipe.webp", width: 1200, height: 800, provenance: "dmd-held-photograph" },
  locales: { en: recipeCopy(), "fr-CA": recipeCopy() },
});
const profileCopy = () => ({
  title: token, slug: "test-profile", metaTitle: token, metaDescription: description,
  standfirst: token, shortScene: token, theVenue: [{ question: token, answer: token }], pullQuote: token,
  dinnerAndDate: DINNER_AND_DATE_QUESTIONS.map((key) => ({ key, question: token, answer: token })),
  shortVersion: { cuisine: token, from: token, inKitchensSince: 2005 },
  sourceNotes: token, factNotes: token, imageAlt: token, imageCredit: token,
});
const extendedProfile = () => ({
  id: "test-profile", postType: "extended-profile",
  subject: { name: token, role: "bartender", venue: token, neighbourhood: token }, companionDateSpot: "test-date-spot", interviewer: "Victor",
  originalInterview: { conductedOn: "2026-01-01", source: token },
  published: "2026-01-02",
  image: { src: "/images/profiles/test-profile.webp", width: 1200, height: 800, provenance: "dmd-held-photograph" },
  locales: { en: profileCopy(), "fr-CA": profileCopy() },
});
const rejects = (schema, value) => assert.equal(schema.safeParse(value).success, false);

test("Chef Recipe Cards require a title, the chef and source, ingredients, steps, servings, EN and FR", () => {
  assert.equal(contributorRecipeSchema.safeParse(contributorRecipe()).success, true);
  for (const key of ["contributor", "suppliedSource", "published", "locales"]) {
    const recipe = contributorRecipe(); delete recipe[key]; rejects(contributorRecipeSchema, recipe);
  }
  for (const key of ["title", "serves", "ingredientGroups", "methodGroups"]) {
    const recipe = contributorRecipe(); delete recipe.locales.en[key]; rejects(contributorRecipeSchema, recipe);
  }
  for (const field of ["recipeOrigin", "adaptation", "inspiredBy", "dateScore"]) {
    const recipe = contributorRecipe();
    if (field === "recipeOrigin") recipe[field] = "adapted";
    else recipe[field] = token;
    rejects(contributorRecipeSchema, recipe);
  }
  const unnamed = contributorRecipe(); unnamed.contributor.name = " "; rejects(contributorRecipeSchema, unnamed);
  const unsourced = contributorRecipe(); delete unsourced.suppliedSource.description; rejects(contributorRecipeSchema, unsourced);
  const partial = contributorRecipe(); delete partial.locales["fr-CA"]; rejects(contributorRecipeSchema, partial);
});

test("Chef Recipe Card photo, times, equipment, notes and testing notes are optional", () => {
  const recipe = contributorRecipe(); delete recipe.image;
  for (const locale of ["en", "fr-CA"]) {
    for (const key of ["originalContext", "sourceNotes", "factNotes", "imageAlt", "imageCredit", "activeTime", "totalTime", "difficulty", "equipment", "dietaryNotes", "contributorNotes"]) delete recipe.locales[locale][key];
  }
  delete recipe.suppliedSource.receivedOn; delete recipe.contributor.venueOrContext;
  assert.equal(contributorRecipeSchema.safeParse(recipe).success, true);
  const photoWithoutAlt = contributorRecipe(); delete photoWithoutAlt.locales.en.imageAlt; rejects(contributorRecipeSchema, photoWithoutAlt);
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

test("Chef pages require the chef, their restaurant, one answer, EN and FR", () => {
  assert.equal(extendedProfileSchema.safeParse(extendedProfile()).success, true);
  for (const key of ["subject", "published", "locales"]) {
    const profile = extendedProfile(); delete profile[key]; rejects(extendedProfileSchema, profile);
  }
  for (const key of ["name", "venue"]) {
    const profile = extendedProfile(); delete profile.subject[key]; rejects(extendedProfileSchema, profile);
  }
  const partial = extendedProfile(); delete partial.locales["fr-CA"]; rejects(extendedProfileSchema, partial);
  const silent = extendedProfile();
  for (const locale of ["en", "fr-CA"]) { delete silent.locales[locale].theVenue; delete silent.locales[locale].dinnerAndDate; delete silent.locales[locale].pullQuote; }
  rejects(extendedProfileSchema, silent);
  const lateInterview = extendedProfile(); lateInterview.originalInterview.conductedOn = "2026-01-03"; rejects(extendedProfileSchema, lateInterview);
});

test("a chef page with only one answer and no portrait is valid", () => {
  const profile = extendedProfile();
  delete profile.image; delete profile.companionDateSpot; delete profile.originalInterview; delete profile.subject.neighbourhood;
  for (const locale of ["en", "fr-CA"]) {
    const copy = profile.locales[locale];
    for (const key of ["title", "standfirst", "shortScene", "theVenue", "pullQuote", "shortVersion", "sourceNotes", "factNotes", "imageAlt", "imageCredit"]) delete copy[key];
    copy.dinnerAndDate = copy.dinnerAndDate.slice(0, 1);
  }
  assert.equal(extendedProfileSchema.safeParse(profile).success, true, JSON.stringify(extendedProfileSchema.safeParse(profile).error?.issues));
  const portraitWithoutAlt = extendedProfile(); delete portraitWithoutAlt.locales.en.imageAlt; rejects(extendedProfileSchema, portraitWithoutAlt);
});

test("Dinner and a date asks from the same eight questions, once each, in order", () => {
  const seven = extendedProfile(); for (const locale of ["en", "fr-CA"]) seven.locales[locale].dinnerAndDate.pop();
  assert.equal(extendedProfileSchema.safeParse(seven).success, true);
  const drift = extendedProfile(); drift.locales.en.dinnerAndDate.pop(); rejects(extendedProfileSchema, drift);
  const reordered = extendedProfile(); for (const locale of ["en", "fr-CA"]) reordered.locales[locale].dinnerAndDate.reverse(); rejects(extendedProfileSchema, reordered);
  const repeated = extendedProfile(); for (const locale of ["en", "fr-CA"]) repeated.locales[locale].dinnerAndDate[1] = repeated.locales[locale].dinnerAndDate[0]; rejects(extendedProfileSchema, repeated);
  const invented = extendedProfile(); invented.locales.en.dinnerAndDate[0].key = "favourite-colour"; rejects(extendedProfileSchema, invented);
});

test("Round one, the pull quote and the short version agree across the Locale Pair", () => {
  const extraQuestion = extendedProfile(); extraQuestion.locales.en.theVenue.push({ question: token, answer: token }); rejects(extendedProfileSchema, extraQuestion);
  const noQuote = extendedProfile(); delete noQuote.locales["fr-CA"].pullQuote; rejects(extendedProfileSchema, noQuote);
  const year = extendedProfile(); year.locales["fr-CA"].shortVersion.inKitchensSince = 2006; rejects(extendedProfileSchema, year);
  const byline = extendedProfile(); byline.interviewer = "Someone"; rejects(extendedProfileSchema, byline);
});

test("Chef page recipe links sit under the at-home answer, which may stand alone", () => {
  const profile = extendedProfile();
  for (const locale of ["en", "fr-CA"]) {
    profile.locales[locale].atHome = token;
    profile.locales[locale].contributorRecipe = "test-recipe";
  }
  assert.equal(extendedProfileSchema.safeParse(profile).success, true);
  const answerOnly = extendedProfile();
  for (const locale of ["en", "fr-CA"]) answerOnly.locales[locale].atHome = token;
  assert.equal(extendedProfileSchema.safeParse(answerOnly).success, true);
  const dangling = extendedProfile();
  for (const locale of ["en", "fr-CA"]) dangling.locales[locale].contributorRecipe = "test-recipe";
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
