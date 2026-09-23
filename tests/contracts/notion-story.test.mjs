import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { requiredProperties, SHARED_PROPERTIES, POST_TYPE_PROPERTIES, SPOT_TYPE_PROPERTIES, OPTIONAL_PROPERTIES, POST_TYPES, SPOT_TYPES } from "../../scripts/notion-story/fields.mjs";
import { parseLocalePair, photoBlocks } from "../../scripts/notion-story/parse.mjs";
import { storyToRecord, normalizePostType, normalizeSpotType, parseGoogleReviews, MappingError } from "../../scripts/notion-story/map.mjs";
import { publishGate, checkForbiddenProperties, checkAttestations, checkDatedUpdate, checkGoogleReviewsAppendOnly } from "../../scripts/notion-story/gate.mjs";
import { dateSpotFixture } from "./date-spot-fixtures.mjs";
import { dueForRecheck } from "../../scripts/notion-story/maintenance.mjs";

// Mechanical test values, never loaded into a public collection or published.
const token = "[TEST ONLY]";
const image = { src: "/images/date-spots/test-only.webp", width: 1200, height: 800 };

function codeBlock(text) {
  return { type: "code", text };
}

// The Locale Pair copy of a valid Restaurant Date Spot.
function restaurantEnCopy() {
  return dateSpotFixture("restaurant", "test-only-restaurant").locales.en;
}

function restaurantProps(overrides = {}) {
  return {
    "Spot Type": "Restaurant", Name: "Test Venue", City: "Test City", Neighbourhood: "Test Quarter",
    Visited: "2026-01-01", Published: "2026-01-02", "Last checked": "2026-01-03",
    Payment: "Paid", "Map URL": "https://example.com", Verdict: "A Favourite", "Price range": "$$$",
    ID: "test-only-restaurant",
    ...overrides,
  };
}

function getPropFrom(props) {
  return (name) => (name in props ? props[name] : "");
}

test("requiredProperties lists shared, Post Type, and Spot Type properties", () => {
  const restaurant = requiredProperties("date-spot", "restaurant");
  assert.ok(restaurant.includes("Status"));
  assert.ok(restaurant.includes("Spot Type"));
  assert.ok(restaurant.includes("Verdict"));
  const activity = requiredProperties("date-spot", "activity");
  assert.ok(activity.includes("Verdict"));
  assert.ok(activity.includes("Category"));
  assert.ok(!requiredProperties("date-spot", "bar").includes("Category"));
  const chefLed = requiredProperties("date-spot", "chef-led-experience");
  assert.ok(chefLed.includes("Host name"));
});

test("normalizePostType and normalizeSpotType accept the Notion display labels", () => {
  assert.equal(normalizePostType("Date Spot"), "date-spot");
  assert.equal(normalizePostType("Contributor Recipe"), "contributor-recipe");
  assert.equal(normalizeSpotType("Chef-led Experience"), "chef-led-experience");
  assert.throws(() => normalizePostType("Recipe"), MappingError);
});

test("parseLocalePair reads exactly two JSON code blocks, English then French", () => {
  const en = restaurantEnCopy();
  const fr = { ...restaurantEnCopy(), slug: "test-only-restaurant-fr" };
  const { locales, problems } = parseLocalePair([codeBlock(JSON.stringify(en)), codeBlock(JSON.stringify(fr))]);
  assert.deepEqual(problems, []);
  assert.equal(locales.en.slug, "test-only-restaurant");
  assert.equal(locales["fr-CA"].slug, "test-only-restaurant-fr");
});

test("parseLocalePair reports a missing locale block", () => {
  const { locales, problems } = parseLocalePair([codeBlock(JSON.stringify(restaurantEnCopy()))]);
  assert.equal(locales, null);
  assert.ok(problems.some((p) => /two JSON code blocks/.test(p)));
});

test("parseLocalePair reports invalid JSON", () => {
  const { locales, problems } = parseLocalePair([codeBlock("{ not json"), codeBlock(JSON.stringify(restaurantEnCopy()))]);
  assert.equal(locales, null);
  assert.ok(problems.some((p) => /not valid JSON/.test(p)));
});

test("storyToRecord maps a Restaurant Story onto the Date Spot contract shape", () => {
  const props = restaurantProps();
  const en = restaurantEnCopy();
  const fr = restaurantEnCopy();
  const record = storyToRecord(getPropFrom(props), "date-spot", { en, "fr-CA": fr }, image);
  assert.equal(record.spotType, "restaurant");
  assert.equal(record.reviewVerdict, "favourite");
  assert.equal(record.reporterByline, "Victor");
  assert.equal(record.priceRange, "$$$");
  assert.equal(record.image.provenance, "dmd-held-photograph");
  assert.equal("category" in record, false);
  assert.equal("googleReviews" in record, false);
});

test("storyToRecord maps the optional venue facts and keyed photos", () => {
  const props = restaurantProps({ Instagram: "@venue.handle", "Booking URL": "https://example.com/book", "Google reviews": "4.6 | 312 | 2026-01-02\n4.5 · 340 · 2026-01-03" });
  const record = storyToRecord(getPropFrom(props), "date-spot", { en: restaurantEnCopy(), "fr-CA": restaurantEnCopy() }, image, { room: { src: "/images/date-spots/test-only-restaurant-room.webp", width: 900, height: 600, credit: "Jane Doe" } });
  assert.equal(record.instagram, "venue.handle");
  assert.equal(record.bookingUrl, "https://example.com/book");
  assert.deepEqual(record.googleReviews, [{ average: 4.6, count: 312, asOf: "2026-01-02" }, { average: 4.5, count: 340, asOf: "2026-01-03" }]);
  assert.equal(record.photos.room.provenance, "dmd-held-photograph");
  assert.equal(record.photos.room.credit, "Jane Doe");
  assert.throws(() => parseGoogleReviews("4.6 stars"), MappingError);
});

test("storyToRecord maps Category for planning spots and optionally for Bars", () => {
  const activityProps = restaurantProps({ "Spot Type": "Activity", Category: "Nature and Scenic" });
  const activity = storyToRecord(getPropFrom(activityProps), "date-spot", { en: {}, "fr-CA": {} }, image);
  assert.equal(activity.category, "nature-scenic");
  assert.equal(activity.reviewVerdict, "favourite");
  assert.throws(() => storyToRecord(getPropFrom({ ...activityProps, Category: "Sports" }), "date-spot", { en: {}, "fr-CA": {} }, image), MappingError);
  const bar = storyToRecord(getPropFrom(restaurantProps({ "Spot Type": "Bar" })), "date-spot", { en: {}, "fr-CA": {} }, image);
  assert.equal("category" in bar, false);
  const categorisedBar = storyToRecord(getPropFrom(restaurantProps({ "Spot Type": "Bar", Category: "Social and Romantic" })), "date-spot", { en: {}, "fr-CA": {} }, image);
  assert.equal(categorisedBar.category, "social-romantic");
});

test("photoBlocks reads keyed photos and credits from image captions", () => {
  const blocks = [
    { type: "image", url: "https://example.com/hero", caption: "" },
    { type: "image", url: "https://example.com/room", caption: "photo:room" },
    { type: "image", url: "https://example.com/chef", caption: "Photo: chef-portrait | credit: Jane Doe" },
  ];
  assert.deepEqual(photoBlocks(blocks), [
    { url: "https://example.com/room", key: "room", credit: undefined },
    { url: "https://example.com/chef", key: "chef-portrait", credit: "Jane Doe" },
  ]);
});

test("storyToRecord rejects an unrecognized Verdict", () => {
  const props = restaurantProps({ Verdict: "Five Stars" });
  assert.throws(() => storyToRecord(getPropFrom(props), "date-spot", { en: restaurantEnCopy(), "fr-CA": restaurantEnCopy() }, image), MappingError);
});

function buildGateInputs({ propOverrides = {}, schemaExtra = [] } = {}) {
  const props = {
    Status: "Ready to Publish", "Story #": "1", "Post Type": "Date Spot",
    "Human reporting": "true", "Human translation": "true", "DMD-held photograph": "true",
    ...restaurantProps(),
    ...propOverrides,
  };
  const record = storyToRecord(getPropFrom(props), "date-spot", { en: restaurantEnCopy(), "fr-CA": restaurantEnCopy() }, image);
  const schemaPropertyNames = [...Object.keys(props), ...schemaExtra];
  return { record, getProp: getPropFrom(props), schemaPropertyNames };
}

test("publishGate accepts a complete first-time Restaurant Date Spot Story", () => {
  const { record, getProp, schemaPropertyNames } = buildGateInputs();
  const result = publishGate(record, [], getProp, schemaPropertyNames);
  assert.equal(result.ok, true);
  assert.equal(result.mode, "publish");
  assert.equal(result.collection.length, 1);
});

test("checkForbiddenProperties flags a leftover numeric score/rating property", () => {
  assert.deepEqual(checkForbiddenProperties(["Status", "Verdict"]), []);
  const problems = checkForbiddenProperties(["Status", "Date Score", "Star Rating"]);
  assert.equal(problems.length, 2);
});

test("publishGate rejects a Story with a leftover Date Score property", () => {
  const { record, getProp, schemaPropertyNames } = buildGateInputs({ schemaExtra: ["Date Score"] });
  const result = publishGate(record, [], getProp, schemaPropertyNames);
  assert.equal(result.ok, false);
  assert.ok(result.problems.some((p) => /Date Score/.test(p)));
});

test("checkAttestations requires all three sign-offs", () => {
  assert.deepEqual(checkAttestations(getPropFrom({ "Human reporting": "true", "Human translation": "true", "DMD-held photograph": "true" })), []);
  const problems = checkAttestations(getPropFrom({ "Human reporting": "false", "Human translation": "true", "DMD-held photograph": "true" }));
  assert.equal(problems.length, 1);
});

test("publishGate rejects a Story with an unchecked attestation", () => {
  const { record, getProp, schemaPropertyNames } = buildGateInputs({ propOverrides: { "DMD-held photograph": "false" } });
  const result = publishGate(record, [], getProp, schemaPropertyNames);
  assert.equal(result.ok, false);
  assert.ok(result.problems.some((p) => /DMD-held photograph/.test(p)));
});

test("publishGate rejects an incomplete Core Review Floor via the underlying schema", () => {
  const props = { ...restaurantProps(), Status: "Ready to Publish", "Story #": "1", "Post Type": "Date Spot", "Human reporting": "true", "Human translation": "true", "DMD-held photograph": "true" };
  const copy = restaurantEnCopy();
  delete copy.reportersNote;
  const record = storyToRecord(getPropFrom(props), "date-spot", { en: copy, "fr-CA": restaurantEnCopy() }, image);
  const result = publishGate(record, [], getPropFrom(props), Object.keys(props));
  assert.equal(result.ok, false);
});

test("Google review snapshots are append-only across republishes", () => {
  const previous = { googleReviews: [{ average: 4.6, count: 312, asOf: "2026-01-02" }] };
  assert.deepEqual(checkGoogleReviewsAppendOnly({ googleReviews: [...previous.googleReviews, { average: 4.5, count: 340, asOf: "2026-02-01" }] }, previous), []);
  assert.equal(checkGoogleReviewsAppendOnly({ googleReviews: [{ average: 4.7, count: 312, asOf: "2026-01-02" }] }, previous).length, 1);
  assert.equal(checkGoogleReviewsAppendOnly({}, previous).length, 1);
  assert.deepEqual(checkGoogleReviewsAppendOnly({ googleReviews: previous.googleReviews }, null), []);
});

test("publishGate checks links into the other published collections when given them", () => {
  const props = { ...restaurantProps(), Status: "Ready to Publish", "Story #": "1", "Post Type": "Date Spot", "Human reporting": "true", "Human translation": "true", "DMD-held photograph": "true" };
  const withRecipe = (copy) => ({ ...copy, atHome: { recipeId: "missing-recipe", intro: token } });
  const record = storyToRecord(getPropFrom(props), "date-spot", { en: withRecipe(restaurantEnCopy()), "fr-CA": withRecipe(restaurantEnCopy()) }, image);
  assert.equal(publishGate(record, [], getPropFrom(props), Object.keys(props)).ok, true);
  const result = publishGate(record, [], getPropFrom(props), Object.keys(props), { recipes: [], profiles: [] });
  assert.equal(result.ok, false);
  assert.ok(result.problems.some((p) => /missing-recipe/.test(p)));
});

test("checkDatedUpdate requires a new dated update in both locales when the recommendation changes", () => {
  const previous = { postType: "date-spot", reviewVerdict: "conditional", freshness: { lastChecked: "2026-01-01" }, locales: { en: { goodFor: [], essentials: {} }, "fr-CA": { goodFor: [], essentials: {} } } };
  const changedNoUpdate = { ...previous, reviewVerdict: "favourite", locales: { en: { ...previous.locales.en, materialUpdates: [] }, "fr-CA": { ...previous.locales["fr-CA"], materialUpdates: [] } } };
  assert.equal(checkDatedUpdate(changedNoUpdate, previous).length, 2);

  const changedWithUpdate = {
    ...previous, reviewVerdict: "favourite",
    locales: {
      en: { ...previous.locales.en, materialUpdates: [{ date: "2026-02-01", note: token }] },
      "fr-CA": { ...previous.locales["fr-CA"], materialUpdates: [{ date: "2026-02-01", note: token }] },
    },
  };
  assert.deepEqual(checkDatedUpdate(changedWithUpdate, previous), []);

  assert.deepEqual(checkDatedUpdate(previous, previous), []);
});

test("publishGate update mode: unchanged recommendation republishes without a new update", () => {
  const first = buildGateInputs();
  const published = publishGate(first.record, [], first.getProp, first.schemaPropertyNames);
  assert.equal(published.ok, true);

  const second = buildGateInputs({ propOverrides: { "Last checked": "2026-01-10" } });
  const result = publishGate(second.record, published.collection, second.getProp, second.schemaPropertyNames);
  assert.equal(result.ok, true);
  assert.equal(result.mode, "update");
});

test("publishGate update mode: a changed Verdict without a new dated update is rejected", () => {
  const first = buildGateInputs();
  const published = publishGate(first.record, [], first.getProp, first.schemaPropertyNames);

  const second = buildGateInputs({ propOverrides: { Verdict: "Not Our First Pick" } });
  const result = publishGate(second.record, published.collection, second.getProp, second.schemaPropertyNames);
  assert.equal(result.ok, false);
  assert.ok(result.problems.some((p) => /Material update/.test(p)));
});

test("dueForRecheck flags Date Spots last checked over six months ago", () => {
  const spots = [{ id: "old", name: "Old Spot", spotType: "restaurant", freshness: { lastChecked: "2025-01-01" }, locales: { en: {} } }];
  const due = dueForRecheck(spots, "2026-09-23");
  assert.equal(due.length, 1);
  assert.match(due[0].reason, /six months/);
});

test("dueForRecheck does not flag a recently checked Date Spot", () => {
  const spots = [{ id: "fresh", name: "Fresh Spot", spotType: "restaurant", freshness: { lastChecked: "2026-09-01" }, locales: { en: {} } }];
  assert.deepEqual(dueForRecheck(spots, "2026-09-23"), []);
});

test("dueForRecheck flags a seasonal Activity Date Spot regardless of recheck age", () => {
  const spots = [{ id: "seasonal", name: "Seasonal Spot", spotType: "activity", freshness: { lastChecked: "2026-09-01" }, locales: { en: { season: "winter" } } }];
  const due = dueForRecheck(spots, "2026-09-23");
  assert.equal(due.length, 1);
  assert.match(due[0].reason, /Seasonal/);
});

test("README documents every shared property", () => {
  const readme = readFileSync(new URL("../../notion/templates/README.md", import.meta.url), "utf-8");
  for (const prop of SHARED_PROPERTIES) {
    assert.ok(readme.includes(prop), `README.md is missing "${prop}"`);
  }
});

test("every Post Type/Spot Type-specific property in fields.mjs appears in its Notion template", () => {
  const templateFiles = {
    restaurant: "restaurant-date-spot.md",
    bar: "bar-date-spot.md",
    activity: "activity-date-spot.md",
    "chef-led-experience": "chef-led-experience-date-spot.md",
  };
  for (const spotType of SPOT_TYPES) {
    const template = readFileSync(new URL(`../../notion/templates/${templateFiles[spotType]}`, import.meta.url), "utf-8");
    for (const prop of [...POST_TYPE_PROPERTIES["date-spot"], ...SPOT_TYPE_PROPERTIES[spotType], ...OPTIONAL_PROPERTIES["date-spot"], ...(OPTIONAL_PROPERTIES[spotType] ?? [])]) {
      assert.ok(template.includes(prop), `${templateFiles[spotType]} is missing "${prop}"`);
    }
  }
  const contributorTemplate = readFileSync(new URL("../../notion/templates/contributor-recipe.md", import.meta.url), "utf-8");
  for (const prop of POST_TYPE_PROPERTIES["contributor-recipe"]) {
    assert.ok(contributorTemplate.includes(prop), `contributor-recipe.md is missing "${prop}"`);
  }
  const profileTemplate = readFileSync(new URL("../../notion/templates/extended-profile.md", import.meta.url), "utf-8");
  for (const prop of POST_TYPE_PROPERTIES["extended-profile"]) {
    assert.ok(profileTemplate.includes(prop), `extended-profile.md is missing "${prop}"`);
  }
});

test("POST_TYPES covers every content contract this pipeline publishes", () => {
  assert.deepEqual(POST_TYPES.sort(), ["contributor-recipe", "date-spot", "extended-profile"]);
});
