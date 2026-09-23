import { test } from "node:test";
import assert from "node:assert/strict";
import { dateSpotSchema, dateSpotsSchema, countReaderWords, neighbourhoodSlug, REVIEW_WORD_FLOOR } from "../../src/content-contracts/date-spot.mjs";
import { checkCrossReferences, editorialWarnings } from "../../src/content-contracts/cross-references.mjs";
import { contributorRecipesSchema } from "../../src/content-contracts/contributor-recipe.mjs";
import { extendedProfilesSchema } from "../../src/content-contracts/extended-profile.mjs";
import { dateSpotFixture as fixture, acceptanceCollection, contributorRecipeFixture, extendedProfileFixture, token } from "./date-spot-fixtures.mjs";

const accepts = (spot) => {
  const result = dateSpotSchema.safeParse(spot);
  assert.equal(result.success, true, result.success ? "" : JSON.stringify(result.error.issues, null, 2));
};
const rejects = (spot) => assert.equal(dateSpotSchema.safeParse(spot).success, false);
const bothLocales = (spot, edit) => { for (const locale of ["en", "fr-CA"]) edit(spot.locales[locale]); return spot; };

for (const type of ["restaurant", "bar", "activity", "chef-led-experience"]) {
  test(`${type} accepts a complete pair and rejects missing common requirements`, () => {
    accepts(fixture(type));
    for (const key of ["locales", "freshness", "image", "reporterByline", "authorship", "payment", "city", "neighbourhood", "priceRange", "reviewVerdict"]) {
      const spot = fixture(type); delete spot[key]; rejects(spot);
    }
    const spot = fixture(type); delete spot.locales["fr-CA"]; rejects(spot);
  });
}

test("the byline is Victor", () => {
  const spot = fixture(); spot.reporterByline = "Victor Vu"; rejects(spot);
  const note = bothLocales(fixture(), (copy) => { copy.reportersNote.byline = "Victor Vu"; }); rejects(note);
});

test("venue variants enforce the Core Review Floor in both languages", () => {
  for (const type of ["restaurant", "bar"]) for (const locale of ["en", "fr-CA"]) {
    for (const key of ["verdictHeadline", "verdictReason", "goodFor", "essentials", "paymentDisclosure", "reportersNote", "realCost", "room", "drinks", "beforeYouBook"]) {
      const spot = fixture(type); delete spot.locales[locale][key]; rejects(spot);
    }
    const spot = fixture(type); spot.locales[locale].goodFor[0].reason = "  "; rejects(spot);
  }
  const restaurant = fixture(); delete restaurant.locales.en.whatToOrder; rejects(restaurant);
});

test("reviews carry four to six Good-for rows", () => {
  const few = bothLocales(fixture(), (copy) => copy.goodFor.pop()); rejects(few);
  const six = bothLocales(fixture(), (copy) => copy.goodFor.push(
    { occasion: "double-date", assessment: "ideal", reason: token },
    { occasion: "solo-at-the-bar", assessment: "ideal", reason: token },
  ));
  accepts(six);
  const seven = structuredClone(six); bothLocales(seven, (copy) => copy.goodFor.push(copy.goodFor[0])); rejects(seven);
});

test("What to order is four to seven tagged dish cards with optional waiter's choice and set menu", () => {
  const spot = fixture();
  bothLocales(spot, (copy) => {
    copy.whatToOrder.waitersChoice = { recommendation: token, outcome: token };
    copy.whatToOrder.setMenu = { name: token, courses: 5, pricePerPerson: "$95", note: token, advice: "take-it" };
    copy.whatToOrder.strategy = token;
  });
  accepts(spot);
  const badTag = structuredClone(spot); badTag.locales.en.whatToOrder.dishes[0].tag = "must-try"; rejects(badTag);
  const tooFew = bothLocales(fixture(), (copy) => { copy.whatToOrder.dishes = copy.whatToOrder.dishes.slice(0, 3); }); rejects(tooFew);
  const tagDrift = fixture(); tagDrift.locales["fr-CA"].whatToOrder.dishes[0].tag = "skip"; rejects(tagDrift);
  const menuDrift = structuredClone(spot); delete menuDrift.locales["fr-CA"].whatToOrder.setMenu; rejects(menuDrift);
});

test("The drinks need a first drink and an honest non-alcohol pick", () => {
  const noZero = bothLocales(fixture(), (copy) => { copy.drinks.picks = copy.drinks.picks.filter((pick) => pick.moment !== "not-drinking"); copy.drinks.picks.push({ moment: "second-round", name: token, note: token }); });
  rejects(noZero);
  const restaurantNoMeal = bothLocales(fixture(), (copy) => { copy.drinks.picks = copy.drinks.picks.filter((pick) => pick.moment !== "with-the-meal"); });
  rejects(restaurantNoMeal);
  const duplicate = bothLocales(fixture(), (copy) => copy.drinks.picks.push(copy.drinks.picks[0])); rejects(duplicate);
  accepts(fixture("bar"));
});

test("reviews must clear the word floor in each language", () => {
  assert.ok(countReaderWords(fixture().locales.en) >= REVIEW_WORD_FLOOR);
  const short = fixture(); short.locales["fr-CA"].room = token; rejects(short);
  // Editor-only notes never count.
  assert.equal(countReaderWords({ sourceNotes: "one two three", room: "one two" }), 2);
});

test("review meta titles lead with name and neighbourhood, and descriptions run 150 to 160 characters", () => {
  const title = fixture(); title.locales.en.metaTitle = "Test Venue: Restaurant Review"; rejects(title);
  const shortDescription = fixture(); shortDescription.locales.en.metaDescription = "x".repeat(130); rejects(shortDescription);
  const planning = fixture("activity"); planning.locales.en.metaDescription = "x".repeat(130); accepts(planning);
});

test("the opening names the chef reported in Meet the chef", () => {
  const person = { name: "Test Cook", role: token, background: token, approach: token };
  const named = bothLocales(fixture(), (copy) => { copy.meetChef = { ...person }; copy.opening = `Chef Test Cook ${token}`; });
  accepts(named);
  const unnamed = bothLocales(fixture(), (copy) => { copy.meetChef = { ...person }; }); rejects(unnamed);
  const bar = fixture("bar"); bar.locales.en.meetChef = { ...person }; rejects(bar);
});

test("photos are declared once and referenced by key", () => {
  const spot = bothLocales(fixture(), (copy) => { copy.roomPhoto = { photo: "room", alt: token }; });
  rejects(spot);
  spot.photos = { room: { src: "/images/date-spots/test-only-room.webp", width: 1200, height: 800, provenance: "dmd-held-photograph", credit: token } };
  accepts(spot);
  const generic = structuredClone(spot); generic.photos.room.src = "/images/og-default.jpg"; rejects(generic);
});

test("the Google rating is a dated, append-only snapshot of their number", () => {
  const spot = fixture();
  spot.googleReviews = [{ average: 4.6, count: 312, asOf: "2026-01-02" }, { average: 4.5, count: 340, asOf: "2026-01-03" }];
  spot.instagram = "venue.handle";
  accepts(spot);
  const outOfOrder = structuredClone(spot); outOfOrder.googleReviews.reverse(); rejects(outOfOrder);
  const future = fixture(); future.googleReviews = [{ average: 4.6, count: 1, asOf: "2026-02-01" }]; rejects(future);
  const handle = fixture(); handle.instagram = "@venue"; rejects(handle);
});

test("scores cannot be silently stripped at any structured level", () => {
  for (const field of ["dateScore", "stars", "rating", "reviewRating", "dateTypeFit", "score"]) {
    for (const path of [[], ["locales", "en"], ["locales", "en", "goodFor", 0], ["locales", "en", "whatToOrder", "dishes", 0]]) {
      const spot = fixture(); let target = spot;
      for (const key of path) target = target[key];
      target[field] = 5; rejects(spot);
    }
  }
});

test("planning variants use When it works, a category, and the shared verdict", () => {
  for (const type of ["activity", "chef-led-experience"]) {
    accepts(bothLocales(fixture(type), (copy) => { copy.verdictQualifier = token; }));
    for (const key of ["whatItIs", "howToDoItWell", "whenItWorks"]) {
      const spot = fixture(type); delete spot.locales.en[key]; rejects(spot);
    }
    const noCategory = fixture(type); delete noCategory.category; rejects(noCategory);
    const reviewModule = fixture(type); reviewModule.locales.en.goodFor = fixture().locales.en.goodFor; rejects(reviewModule);
  }
  const spot = fixture("chef-led-experience"); delete spot.host; rejects(spot);
  const bar = fixture("bar"); bar.category = "social-romantic"; accepts(bar);
  const restaurant = fixture(); restaurant.category = "social-romantic"; rejects(restaurant);
});

test("rejects invalid chronology, locale drift, duplicate occasions, identifiers and reserved slugs", () => {
  for (const invalid of ["2026-02-30", "2026-01-04"]) {
    const spot = fixture(); spot.freshness.visited = invalid; rejects(spot);
  }
  const drift = fixture(); drift.locales["fr-CA"].goodFor[0].assessment = "not-for"; rejects(drift);
  const duplicate = fixture(); duplicate.locales.en.goodFor[1] = duplicate.locales.en.goodFor[0]; rejects(duplicate);
  const update = fixture(); update.locales.en.materialUpdates.push({ date: "2026-01-03", note: token }); rejects(update);
  const reserved = fixture("activity"); reserved.locales.en.slug = "category"; rejects(reserved);
  assert.equal(dateSpotsSchema.safeParse([fixture(), fixture()]).success, false);
});

test("requires human authorship and documentary photographs", () => {
  const spot = fixture(); spot.authorship.translation = "ai"; rejects(spot);
  const synthetic = fixture(); synthetic.image.provenance = "synthetic"; rejects(synthetic);
});

test("the acceptance collections are valid and fully linked", () => {
  const spots = dateSpotsSchema.safeParse(acceptanceCollection());
  assert.equal(spots.success, true, spots.success ? "" : JSON.stringify(spots.error.issues, null, 2));
  const recipes = contributorRecipesSchema.parse([contributorRecipeFixture()]);
  const profiles = extendedProfilesSchema.parse([extendedProfileFixture()]);
  assert.deepEqual(checkCrossReferences({ spots: spots.data, recipes, profiles }), []);
  const publicRecipe = contributorRecipeFixture("real-recipe");
  assert.equal(contributorRecipesSchema.safeParse([publicRecipe]).success, false);
});

test("Make a night of it picks resolve to categorised spots, one per category, in the same city", () => {
  const [restaurant, activity, bar] = acceptanceCollection();
  const missing = structuredClone(restaurant);
  bothLocales(missing, (copy) => copy.makeANight.push({ spotId: "missing", timing: "after", walkMinutes: 3, blurb: token }));
  assert.equal(dateSpotsSchema.safeParse([missing, activity, bar]).success, false);
  const sameCategory = structuredClone(bar); sameCategory.category = "nature-scenic";
  assert.equal(dateSpotsSchema.safeParse([restaurant, activity, sameCategory]).success, false);
  const uncategorised = structuredClone(bar); delete uncategorised.category;
  assert.equal(dateSpotsSchema.safeParse([restaurant, activity, uncategorised]).success, false);
  const elsewhere = structuredClone(activity); elsewhere.city = "Elsewhere";
  assert.equal(dateSpotsSchema.safeParse([restaurant, elsewhere, bar]).success, false);
  const tooFar = structuredClone(restaurant); bothLocales(tooFar, (copy) => { copy.makeANight[0].walkMinutes = 25; });
  assert.equal(dateSpotsSchema.safeParse([tooFar, activity, bar]).success, false);
});

test("planning pairings resolve only to reported Restaurants or Bars", () => {
  const [restaurant, activity, bar] = acceptanceCollection();
  const toActivity = structuredClone(activity);
  bothLocales(toActivity, (copy) => { copy.pairItWith = [{ spotId: "test-only-activity", walkMinutes: 1 }]; });
  assert.equal(dateSpotsSchema.safeParse([restaurant, toActivity, bar]).success, false);
  const drift = structuredClone(activity); drift.locales["fr-CA"].pairItWith[0].walkMinutes = 3;
  assert.equal(dateSpotsSchema.safeParse([restaurant, drift, bar]).success, false);
});

test("cross-collection references must resolve", () => {
  const spots = acceptanceCollection();
  bothLocales(spots[0], (copy) => { copy.atHome = { recipeId: "missing-recipe", intro: token }; copy.meetChef.profileId = "missing-profile"; });
  const problems = checkCrossReferences({ spots, recipes: [], profiles: [] });
  assert.equal(problems.length, 2);
});

test("editorial targets warn without blocking", () => {
  const spots = acceptanceCollection();
  assert.ok(editorialWarnings(spots).some((warning) => /internal links/.test(warning)));
  const favourites = [0, 1, 2, 3].map((index) => ({ ...fixture("activity", `a-${index}`), reviewVerdict: "favourite" }));
  assert.ok(editorialWarnings(favourites).some((warning) => /one in four/.test(warning)));
});

test("review URLs use a neighbourhood path segment", () => {
  assert.equal(neighbourhoodSlug("Côte-des-Neiges"), "cote-des-neiges");
  assert.equal(neighbourhoodSlug("Le Plateau-Mont-Royal"), "le-plateau-mont-royal");
});

test("build validator accepts complete records and exits nonzero for incomplete pairs or missing images", async () => {
  const { mkdtempSync, mkdirSync, writeFileSync, rmSync } = await import("node:fs");
  const { tmpdir } = await import("node:os");
  const { join } = await import("node:path");
  const { fileURLToPath } = await import("node:url");
  const { spawnSync } = await import("node:child_process");
  const cwd = mkdtempSync(join(tmpdir(), "dmd-contract-"));
  try {
    mkdirSync(join(cwd, "src/content"), { recursive: true });
    mkdirSync(join(cwd, "public/images/date-spots"), { recursive: true });
    const input = join(cwd, "src/content/date-spots.json");
    const image = join(cwd, "public/images/date-spots/test-only.webp");
    const run = () => spawnSync(process.execPath, [fileURLToPath(new URL("../../scripts/validate-date-spots.mjs", import.meta.url))], { cwd, encoding: "utf8" });
    writeFileSync(input, JSON.stringify([fixture()]));
    assert.notEqual(run().status, 0);
    // Filesystem existence sentinel, not a generated editorial photograph.
    writeFileSync(image, "test-only");
    const ok = run();
    assert.equal(ok.status, 0, ok.stderr);
    const photo = fixture();
    photo.photos = { room: { src: "/images/date-spots/test-only-room.webp", width: 1, height: 1, provenance: "dmd-held-photograph" } };
    bothLocales(photo, (copy) => { copy.roomPhoto = { photo: "room", alt: token }; });
    writeFileSync(input, JSON.stringify([photo]));
    assert.notEqual(run().status, 0);
    const partial = fixture(); delete partial.locales["fr-CA"];
    writeFileSync(input, JSON.stringify([partial]));
    assert.notEqual(run().status, 0);
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});
