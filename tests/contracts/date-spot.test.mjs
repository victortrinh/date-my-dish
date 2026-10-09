import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import {
  dateSpotSchema, dateSpotsSchema, countReaderWords, makeANightCards, neighbourhoodSlug, REVIEW_WORD_MINIMUM, REVIEW_WORD_TARGET,
} from "../../src/content-contracts/date-spot.mjs";
import { checkCrossReferences, editorialWarnings } from "../../src/content-contracts/cross-references.mjs";
import { contributorRecipesSchema } from "../../src/content-contracts/contributor-recipe.mjs";
import { extendedProfilesSchema } from "../../src/content-contracts/extended-profile.mjs";
import {
  dateSpotFixture as fixture, minimalReviewFixture, acceptanceCollection, acceptanceCompanions, contributorRecipeFixture, extendedProfileFixture, filler, token,
} from "./date-spot-fixtures.mjs";

const accepts = (spot) => {
  const result = dateSpotSchema.safeParse(spot);
  assert.equal(result.success, true, result.success ? "" : JSON.stringify(result.error.issues, null, 2));
  return result.data;
};
const rejects = (spot) => assert.equal(dateSpotSchema.safeParse(spot).success, false);
const issuePaths = (spot) => {
  const result = dateSpotSchema.safeParse(spot);
  assert.equal(result.success, false, "expected the record to be rejected");
  return result.error.issues.map((issue) => issue.path.join("."));
};
const bothLocales = (spot, edit) => { for (const locale of ["en", "fr-CA"]) edit(spot.locales[locale]); return spot; };
/** Delete a dotted path such as "locales.en.essentials.cost". */
const without = (spot, path) => {
  const keys = path.split(".");
  let target = spot;
  for (const key of keys.slice(0, -1)) target = target[key];
  delete target[keys.at(-1)];
  return spot;
};

for (const type of ["restaurant", "bar", "activity", "chef-led-experience"]) {
  test(`${type} accepts a complete pair and rejects missing common requirements`, () => {
    accepts(fixture(type));
    for (const key of ["locales", "freshness", "image", "reporterByline", "name", "neighbourhood", "reviewVerdict"]) {
      rejects(without(fixture(type), key));
    }
    rejects(without(fixture(type), "locales.fr-CA"));
  });
}

test("a review with only the required fields is valid", () => {
  const spot = accepts(minimalReviewFixture());
  for (const section of ["goodFor", "room", "drinks", "whatToOrder", "realCost", "reportersNote", "makeANight", "atHome", "beforeYouBook", "meetChef"]) {
    assert.equal(section in spot.locales.en, false, section);
  }
});

test("a review missing any required field is rejected, naming the field", () => {
  const required = [
    "name", "neighbourhood", "reviewVerdict", "image", "freshness.published", "reporterByline",
    ...["slug", "opening", "cuisine", "verdictReason", "imageAlt", "paymentDisclosure", "metaTitle", "metaDescription", "essentials", "essentials.address", "essentials.cost"]
      .flatMap((field) => [`locales.en.${field}`, `locales.fr-CA.${field}`]),
  ];
  for (const field of required) {
    const paths = issuePaths(without(minimalReviewFixture(), field));
    assert.ok(paths.some((path) => path === field || path.startsWith(`${field}.`)), `${field}: ${paths.join(", ")}`);
  }
});

test("the retired human-authorship attestation fields are rejected", () => {
  const spot = minimalReviewFixture();
  assert.equal("authorship" in spot, false);
  accepts(spot);
  rejects({ ...spot, authorship: { reporting: "human", translation: "human" } });
});

test("Checked defaults to the publish date and never precedes it", () => {
  assert.equal(accepts(minimalReviewFixture()).freshness.lastChecked, "2026-01-02");
  const rechecked = minimalReviewFixture(); rechecked.freshness.lastChecked = "2026-03-01";
  assert.equal(accepts(rechecked).freshness.lastChecked, "2026-03-01");
  const early = minimalReviewFixture(); early.freshness.lastChecked = "2026-01-01"; rejects(early);
});

test("an Optional Section is absent or has content, never an empty shell", () => {
  for (const [key, empty] of [["drinks", {}], ["realCost", {}], ["reportersNote", { byline: "Victor" }], ["whatToOrder", {}], ["goodFor", []], ["beforeYouBook", []], ["makeANight", []], ["room", " "]]) {
    rejects(bothLocales(minimalReviewFixture(), (copy) => { copy[key] = structuredClone(empty); }));
  }
  accepts(bothLocales(minimalReviewFixture(), (copy) => { copy.drinks = { picks: [{ moment: "not-drinking", name: token }] }; }));
  accepts(bothLocales(minimalReviewFixture(), (copy) => { copy.whatToOrder = { strategy: token }; }));
});

test("the Core Review Floor is gone: no quota of rows, dishes or drinks", () => {
  accepts(bothLocales(fixture(), (copy) => { copy.goodFor = copy.goodFor.slice(0, 1); }));
  accepts(bothLocales(fixture(), (copy) => { copy.whatToOrder.dishes = copy.whatToOrder.dishes.slice(0, 1); }));
  accepts(bothLocales(fixture(), (copy) => { copy.drinks.picks = copy.drinks.picks.filter((pick) => pick.moment === "to-start"); }));
  accepts(bothLocales(fixture(), (copy) => { delete copy.realCost.total; delete copy.realCost.lines; }));
});

test("Good for carries up to six unique rows", () => {
  const six = bothLocales(fixture(), (copy) => copy.goodFor.push(
    { occasion: "double-date", assessment: "ideal", reason: token },
    { occasion: "solo-at-the-bar", assessment: "ideal", reason: token },
  ));
  accepts(six);
  const seven = structuredClone(six); bothLocales(seven, (copy) => copy.goodFor.push(copy.goodFor[0])); rejects(seven);
  const duplicate = fixture(); duplicate.locales.en.goodFor[1] = duplicate.locales.en.goodFor[0]; rejects(duplicate);
});

test("What to order tags dishes and keeps the Locale Pair aligned", () => {
  const spot = bothLocales(fixture(), (copy) => {
    copy.whatToOrder.waitersChoice = { recommendation: token, outcome: token };
    copy.whatToOrder.setMenu = { name: token, courses: 5, pricePerPerson: "$95", note: token, advice: "take-it" };
    copy.whatToOrder.strategy = token;
  });
  accepts(spot);
  const badTag = structuredClone(spot); badTag.locales.en.whatToOrder.dishes[0].tag = "must-try"; rejects(badTag);
  const tagDrift = fixture(); tagDrift.locales["fr-CA"].whatToOrder.dishes[0].tag = "skip"; rejects(tagDrift);
  const menuDrift = structuredClone(spot); delete menuDrift.locales["fr-CA"].whatToOrder.setMenu; rejects(menuDrift);
  const sectionDrift = fixture(); delete sectionDrift.locales["fr-CA"].room; rejects(sectionDrift);
});

test("each drink moment appears once", () => {
  rejects(bothLocales(fixture(), (copy) => copy.drinks.picks.push(copy.drinks.picks[0])));
  accepts(fixture("bar"));
});

test("word count: blocks below the minimum, warns below the target, per locale", () => {
  assert.ok(countReaderWords(fixture().locales.en) >= REVIEW_WORD_TARGET);
  const short = minimalReviewFixture(); short.locales["fr-CA"].verdictReason = token; short.locales["fr-CA"].opening = token;
  const paths = issuePaths(short);
  assert.ok(paths.includes("locales.fr-CA"));
  const minimal = accepts(minimalReviewFixture());
  const words = countReaderWords(minimal.locales.en);
  assert.ok(words >= REVIEW_WORD_MINIMUM && words < REVIEW_WORD_TARGET, String(words));
  assert.ok(editorialWarnings([minimal]).some((warning) => /reader-facing words/.test(warning) && warning.includes("(en)")));
  assert.ok(!editorialWarnings([accepts(fixture())]).some((warning) => /reader-facing words/.test(warning)));
  // Editor-only notes never count.
  assert.equal(countReaderWords({ sourceNotes: "one two three", room: "one two" }), 2);
});

test("review meta titles lead with name and neighbourhood, and descriptions run 120 to 160 characters", () => {
  const title = fixture(); title.locales.en.metaTitle = "Test Venue: Restaurant Review"; rejects(title);
  const shortDescription = fixture(); shortDescription.locales.en.metaDescription = "x".repeat(110); rejects(shortDescription);
  const okDescription = fixture(); okDescription.locales.en.metaDescription = "x".repeat(130); accepts(okDescription);
});

test("the opening names the chef reported in Meet the chef", () => {
  const person = { name: "Test Cook", role: token, background: token, approach: token };
  accepts(bothLocales(fixture(), (copy) => { copy.meetChef = { ...person }; copy.opening = `Chef Test Cook ${token}`; }));
  rejects(bothLocales(fixture(), (copy) => { copy.meetChef = { ...person }; }));
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

test("update lines are dated between publication and Checked, in order", () => {
  accepts(bothLocales(fixture(), (copy) => { copy.materialUpdates = [{ date: "2026-01-02", note: token }, { date: "2026-01-03", note: token }]; }));
  rejects(bothLocales(fixture(), (copy) => { copy.materialUpdates = [{ date: "2026-01-03", note: token }, { date: "2026-01-02", note: token }]; }));
  rejects(bothLocales(fixture(), (copy) => { copy.materialUpdates = [{ date: "2026-01-05", note: token }]; }));
  const drift = fixture(); drift.locales.en.materialUpdates.push({ date: "2026-01-03", note: token }); rejects(drift);
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

test("Date Spots require category, signal reason, address and practical info; the rest is optional", () => {
  for (const type of ["activity", "chef-led-experience"]) {
    accepts(bothLocales(fixture(type), (copy) => { copy.verdictQualifier = token; }));
    for (const key of ["whatItIs", "howToDoItWell", "whenItWorks", "opening", "paymentDisclosure"]) {
      accepts(bothLocales(fixture(type), (copy) => { delete copy[key]; }));
    }
    for (const key of ["verdictReason", "season", "essentials.address", "essentials.cost", "essentials.hours", "imageAlt"]) {
      rejects(without(fixture(type), `locales.en.${key}`));
    }
    rejects(without(fixture(type), "category"));
    const reviewModule = fixture(type); reviewModule.locales.en.goodFor = fixture().locales.en.goodFor; rejects(reviewModule);
  }
  accepts(without(fixture("chef-led-experience"), "host"));
  const bar = fixture("bar"); bar.category = "social-romantic"; accepts(bar);
  const restaurant = fixture(); restaurant.category = "social-romantic"; rejects(restaurant);
});

test("rejects invalid chronology, locale drift, identifiers and reserved slugs", () => {
  for (const invalid of ["2026-02-30", "2026-01-04"]) {
    const spot = fixture(); spot.freshness.visited = invalid; rejects(spot);
  }
  const drift = fixture(); drift.locales["fr-CA"].goodFor[0].assessment = "not-for"; rejects(drift);
  const reserved = fixture("activity"); reserved.locales.en.slug = "category"; rejects(reserved);
  assert.equal(dateSpotsSchema.safeParse([fixture(), fixture()]).success, false);
  const synthetic = fixture(); synthetic.image.provenance = "synthetic"; rejects(synthetic);
});

test("the acceptance collections are valid and fully linked", () => {
  const spots = dateSpotsSchema.safeParse(acceptanceCollection());
  assert.equal(spots.success, true, spots.success ? "" : JSON.stringify(spots.error.issues, null, 2));
  const recipes = contributorRecipesSchema.parse([contributorRecipeFixture()]);
  const profiles = extendedProfilesSchema.parse([extendedProfileFixture()]);
  assert.deepEqual(checkCrossReferences({ spots: spots.data, recipes, profiles }), []);
  assert.equal(contributorRecipesSchema.safeParse([contributorRecipeFixture("real-recipe")]).success, false);
});

test("Make a night of it shows only published picks, in category order, at most five", () => {
  const [restaurant, activity, bar] = dateSpotsSchema.parse(acceptanceCollection());
  const cards = makeANightCards(restaurant.locales.en.makeANight, [restaurant, activity, bar]);
  assert.deepEqual(cards.map(({ target }) => target.id), ["test-only-activity", "test-only-bar"]);
  assert.deepEqual(cards.map(({ category }) => category), ["nature-scenic", "social-romantic"]);
  assert.deepEqual(makeANightCards(restaurant.locales.en.makeANight, [restaurant]), []);
  assert.deepEqual(makeANightCards(undefined, [activity]), []);
  const categories = ["social-romantic", "nature-scenic", "games-entertainment", "arts-culture", "activities-sports"];
  const spots = categories.map((category, index) => ({ id: `s-${index}`, category }));
  const ordered = makeANightCards([...spots, { id: "s-extra", category: "arts-culture" }].map(({ id }) => ({ spotId: id })), [...spots, { id: "s-extra", category: "arts-culture" }]);
  assert.equal(ordered.length, 5);
  assert.deepEqual(ordered.map(({ category }) => category), ["activities-sports", "arts-culture", "arts-culture", "games-entertainment", "nature-scenic"]);
});

test("Make a night of it picks that are published resolve to categorised spots, one per category, in the same city", () => {
  const [restaurant, activity, bar, minimal] = acceptanceCollection();
  // A pick naming an unpublished Date Spot is allowed; it just doesn't render.
  assert.equal(dateSpotsSchema.safeParse([restaurant, activity, bar, minimal]).success, true);
  const sameCategory = structuredClone(bar); sameCategory.category = "nature-scenic";
  assert.equal(dateSpotsSchema.safeParse([restaurant, activity, sameCategory]).success, false);
  const uncategorised = structuredClone(bar); delete uncategorised.category;
  assert.equal(dateSpotsSchema.safeParse([restaurant, activity, uncategorised]).success, false);
  const elsewhere = structuredClone(activity); elsewhere.city = "Elsewhere";
  assert.equal(dateSpotsSchema.safeParse([restaurant, elsewhere, bar]).success, false);
  const tooFar = structuredClone(restaurant); bothLocales(tooFar, (copy) => { copy.makeANight[0].walkMinutes = 25; });
  assert.equal(dateSpotsSchema.safeParse([tooFar, activity, bar]).success, false);
});

test("planning pairings resolve only to published Restaurants or Bars", () => {
  const [restaurant, activity, bar] = acceptanceCollection();
  const toActivity = structuredClone(activity);
  bothLocales(toActivity, (copy) => { copy.pairItWith = [{ spotId: "test-only-activity", walkMinutes: 1 }]; });
  assert.equal(dateSpotsSchema.safeParse([restaurant, toActivity, bar]).success, false);
  const drift = structuredClone(activity); drift.locales["fr-CA"].pairItWith[0].walkMinutes = 3;
  assert.equal(dateSpotsSchema.safeParse([restaurant, drift, bar]).success, false);
  assert.equal(dateSpotsSchema.safeParse([activity, bar]).success, true);
});

test("cross-collection references must resolve", () => {
  const spots = acceptanceCollection();
  bothLocales(spots[0], (copy) => { copy.atHome = { recipeId: "missing-recipe", intro: token }; copy.meetChef.profileId = "missing-profile"; });
  assert.equal(checkCrossReferences({ spots, recipes: [], profiles: [] }).length, 2);
});

test("editorial targets warn without blocking", () => {
  const spots = dateSpotsSchema.parse(acceptanceCollection());
  assert.ok(editorialWarnings(spots).some((warning) => /internal links/.test(warning)));
  const favourites = [0, 1, 2, 3].map((index) => ({ ...fixture("activity", `a-${index}`), reviewVerdict: "favourite" }));
  assert.ok(editorialWarnings(favourites).some((warning) => /one in four/.test(warning)));
});

test("review URLs use a neighbourhood path segment", () => {
  assert.equal(neighbourhoodSlug("Côte-des-Neiges"), "cote-des-neiges");
  assert.equal(neighbourhoodSlug("Le Plateau-Mont-Royal"), "le-plateau-mont-royal");
});

test("validate:source names a missing field, blocks short reviews, warns below the targets, and merges Companion Files", () => {
  const cwd = mkdtempSync(join(tmpdir(), "dmd-contract-"));
  try {
    mkdirSync(join(cwd, "src/content/editorial"), { recursive: true });
    mkdirSync(join(cwd, "public/images/date-spots"), { recursive: true });
    const input = join(cwd, "src/content/date-spots.json");
    const run = () => spawnSync(process.execPath, [fileURLToPath(new URL("../../scripts/validate-date-spots.mjs", import.meta.url))], { cwd, encoding: "utf8" });
    const minimal = minimalReviewFixture("test-only");
    writeFileSync(input, JSON.stringify([minimal]));
    assert.notEqual(run().status, 0, "the hero image is missing");
    // Filesystem existence sentinel, not a generated editorial photograph.
    writeFileSync(join(cwd, "public/images/date-spots/test-only.webp"), "test-only");
    const ok = run();
    assert.equal(ok.status, 0, ok.stderr);
    assert.match(ok.stderr, /\[WARN\] test-only \(en\): \d+ reader-facing words/);

    for (const field of ["opening", "cuisine", "verdictReason"]) {
      const missing = minimalReviewFixture("test-only"); delete missing.locales.en[field];
      writeFileSync(input, JSON.stringify([missing]));
      const result = run();
      assert.notEqual(result.status, 0);
      assert.match(result.stderr, new RegExp(`test-only: locales\\.en\\.${field}:`));
    }

    const short = minimalReviewFixture("test-only"); short.locales.en.opening = token; short.locales.en.verdictReason = filler("reason", 20);
    writeFileSync(input, JSON.stringify([short]));
    const blocked = run();
    assert.notEqual(blocked.status, 0);
    assert.match(blocked.stderr, /at least 300 reader-facing words/);

    // The record lacks a meta title; the Companion File supplies it and wins on the verdict.
    const bare = minimalReviewFixture("test-only"); bothLocales(bare, (copy) => { delete copy.metaTitle; });
    writeFileSync(input, JSON.stringify([bare]));
    assert.notEqual(run().status, 0);
    const title = "Test Minimal, Test Quarter: Companion Title";
    writeFileSync(join(cwd, "src/content/editorial/test-only.json"), JSON.stringify({ id: "test-only", reviewVerdict: "favourite", locales: { en: { metaTitle: title }, "fr-CA": { metaTitle: title } } }));
    const merged = run();
    assert.equal(merged.status, 0, merged.stderr);

    const partial = minimalReviewFixture("test-only"); delete partial.locales["fr-CA"];
    writeFileSync(input, JSON.stringify([partial]));
    assert.notEqual(run().status, 0);
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});

test("the acceptance Companion Files are valid", async () => {
  const { companionSchema } = await import("../../src/content-contracts/companion.mjs");
  for (const companion of acceptanceCompanions()) assert.equal(companionSchema.safeParse(companion).success, true);
});
