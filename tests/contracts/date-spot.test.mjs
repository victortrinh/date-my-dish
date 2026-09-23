import { test } from "node:test";
import assert from "node:assert/strict";
import { dateSpotSchema, dateSpotsSchema } from "../../src/content-contracts/date-spot.mjs";

// Mechanical test values, not reporting or translations. Never loaded as content.
const token = "[TEST ONLY]";
function fixture(spotType = "restaurant") {
  const copy = {
    title: token, slug: "test-only", metaTitle: token, metaDescription: token,
    opening: token, sourceNotes: token, factNotes: token, imageAlt: token, imageCredit: token,
    essentials: { address: token, booking: token, access: token, duration: token, cost: token, timing: token },
    paymentDisclosure: token, materialUpdates: [],
    goodFor: [{ occasion: "first-date", assessment: "caveat", reason: token }],
  };
  const venue = spotType === "restaurant" || spotType === "bar";
  if (venue) Object.assign(copy, {
    verdictReason: token, room: token, whatToDrink: token, realCost: token,
    reportersNote: { byline: "Victor Vu", text: token }, beforeYouGo: token,
    ...(spotType === "restaurant" ? { cuisine: token, whatToOrder: token } : {}),
  });
  else Object.assign(copy, { whatItIs: token, howToDoItWell: token });
  return {
    id: "test-only", postType: "date-spot", spotType, name: token, city: token, neighbourhood: token,
    reporterByline: "Victor Vu", authorship: { reporting: "human", translation: "human" },
    freshness: { visited: "2026-01-01", published: "2026-01-02", lastChecked: "2026-01-03" },
    image: { src: "/images/date-spots/test-only.webp", width: 1200, height: 800, provenance: "dmd-held-photograph" },
    mapUrl: "https://example.com", payment: "paid",
    ...(venue ? { reviewVerdict: "conditional" } : {}),
    ...(spotType === "chef-led-experience" ? { host: { name: token, role: "chef" } } : {}),
    locales: { en: structuredClone(copy), "fr-CA": structuredClone(copy) },
  };
}
const rejects = (spot) => assert.equal(dateSpotSchema.safeParse(spot).success, false);
for (const type of ["restaurant", "bar", "activity", "chef-led-experience"]) {
  test(`${type} accepts a complete pair and rejects missing common requirements`, () => {
    assert.equal(dateSpotSchema.safeParse(fixture(type)).success, true);
    for (const key of ["locales", "freshness", "image", "reporterByline", "authorship", "payment", "city", "neighbourhood"]) {
      const spot = fixture(type); delete spot[key]; rejects(spot);
    }
    const spot = fixture(type); delete spot.locales["fr-CA"]; rejects(spot);
  });
}
test("venue variants enforce the Core Review Floor in both languages", () => {
  for (const type of ["restaurant", "bar"]) for (const locale of ["en", "fr-CA"]) {
    for (const key of ["verdictReason", "goodFor", "essentials", "paymentDisclosure", "reportersNote", "realCost", "room", "whatToDrink"]) {
      const spot = fixture(type); delete spot.locales[locale][key]; rejects(spot);
    }
    const spot = fixture(type); spot.locales[locale].goodFor[0].reason = "  "; rejects(spot);
  }
});
test("bar-only editorial modules are optional, attributed, and unavailable to other variants", () => {
  const bar = fixture("bar");
  bar.locales.en.meetTheBartender = { name: token, role: "bartender", note: token };
  bar.locales.en.nearbyDateSpots = [{ id: "nearby-spot", label: token, note: token }];
  bar.locales.en.contributorRecipe = { title: token, slug: "supplied-drink", contributor: token, source: token };
  bar.locales["fr-CA"].meetTheBartender = structuredClone(bar.locales.en.meetTheBartender);
  bar.locales["fr-CA"].nearbyDateSpots = structuredClone(bar.locales.en.nearbyDateSpots);
  bar.locales["fr-CA"].contributorRecipe = structuredClone(bar.locales.en.contributorRecipe);
  assert.equal(dateSpotSchema.safeParse(bar).success, true);
  const missingSource = structuredClone(bar); delete missingSource.locales.en.contributorRecipe.source; rejects(missingSource);
  const partialModule = fixture("bar"); partialModule.locales.en.whatToEat = token; rejects(partialModule);
  const restaurant = fixture(); restaurant.locales.en.meetTheBartender = bar.locales.en.meetTheBartender; rejects(restaurant);
});
test("restaurant-only reporting modules are optional, complete, and locale-paired", () => {
  const spot = fixture();
  for (const locale of ["en", "fr-CA"]) Object.assign(spot.locales[locale], {
    meetChef: { name: token, role: token, reporting: token },
    nearbyPlans: [{ name: token, detail: token, mapUrl: "https://example.com/nearby" }],
    contributorRecipe: { title: token, slug: "supplied-dish", contributor: token, source: token },
  });
  assert.equal(dateSpotSchema.safeParse(spot).success, true);
  delete spot.locales.en.contributorRecipe.source;
  rejects(spot);
  const bar = fixture("bar");
  bar.locales.en.meetChef = { name: token, role: token, reporting: token };
  rejects(bar);
});
test("scores cannot be silently stripped at any structured level", () => {
  for (const field of ["dateScore", "stars", "rating", "reviewRating", "dateTypeFit", "score"]) {
    for (const path of [[], ["locales", "en"], ["locales", "en", "goodFor", 0]]) {
      const spot = fixture(); let target = spot;
      for (const key of path) target = target[key];
      target[field] = 5; rejects(spot);
    }
  }
});
test("planning variants reject review fields and require planning and named hosts", () => {
  for (const type of ["activity", "chef-led-experience"]) {
    const spot = fixture(type); spot.reviewVerdict = "favourite"; rejects(spot);
    for (const key of ["whatItIs", "howToDoItWell"]) {
      const spot = fixture(type); delete spot.locales.en[key]; rejects(spot);
    }
  }
  const spot = fixture("chef-led-experience"); delete spot.host; rejects(spot);
});
test("rejects invalid chronology, locale drift, duplicate occasions and identifiers", () => {
  for (const invalid of ["2026-02-30", "2026-01-04"]) {
    const spot = fixture(); spot.freshness.visited = invalid; rejects(spot);
  }
  const drift = fixture(); drift.locales["fr-CA"].goodFor[0].assessment = "ideal"; rejects(drift);
  const duplicate = fixture(); duplicate.locales.en.goodFor.push(duplicate.locales.en.goodFor[0]); rejects(duplicate);
  const update = fixture(); update.locales.en.materialUpdates.push({ date: "2026-01-03", note: token }); rejects(update);
  assert.equal(dateSpotsSchema.safeParse([fixture(), fixture()]).success, false);
});
test("requires human authorship and documentary photographs", () => {
  const spot = fixture(); spot.authorship.translation = "ai"; rejects(spot);
  const synthetic = fixture(); synthetic.image.provenance = "synthetic"; rejects(synthetic);
});

test("planning pairings resolve only to independently reported venue Date Spots", () => {
  const activity = fixture("activity");
  activity.locales.en.pairItWith = ["restaurant-test-only"];
  activity.locales["fr-CA"].pairItWith = ["restaurant-test-only"];
  const restaurant = fixture("restaurant");
  restaurant.id = "restaurant-test-only";
  restaurant.locales.en.slug = "restaurant-test-only";
  restaurant.locales["fr-CA"].slug = "restaurant-test-only";
  assert.equal(dateSpotsSchema.safeParse([activity, restaurant]).success, true);

  const missing = fixture("activity");
  missing.locales.en.pairItWith = ["missing-venue"];
  assert.equal(dateSpotsSchema.safeParse([missing]).success, false);

  const activityTarget = fixture("activity");
  activityTarget.id = "another-activity";
  activityTarget.locales.en.slug = "another-activity";
  activityTarget.locales["fr-CA"].slug = "another-activity";
  const invalidTarget = fixture("activity");
  invalidTarget.locales.en.pairItWith = ["another-activity"];
  assert.equal(dateSpotsSchema.safeParse([invalidTarget, activityTarget]).success, false);
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
    assert.equal(run().status, 0);
    const partial = fixture(); delete partial.locales["fr-CA"];
    writeFileSync(input, JSON.stringify([partial]));
    assert.notEqual(run().status, 0);
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});
