import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { requiredProperties, SHARED_PROPERTIES, POST_TYPE_PROPERTIES, SPOT_TYPE_PROPERTIES, POST_TYPES, SPOT_TYPES } from "../../scripts/notion-story/fields.mjs";
import { parseLocalePair } from "../../scripts/notion-story/parse.mjs";
import { storyToRecord, normalizePostType, normalizeSpotType, MappingError } from "../../scripts/notion-story/map.mjs";
import { publishGate, checkForbiddenProperties, checkAttestations, checkDatedUpdate } from "../../scripts/notion-story/gate.mjs";
import { dueForRecheck } from "../../scripts/notion-story/maintenance.mjs";

// Mechanical test values, never loaded into a public collection or published.
const token = "[TEST ONLY]";
const image = { src: "/images/date-spots/test-only.webp", width: 1200, height: 800 };

function codeBlock(text) {
  return { type: "code", text };
}

function restaurantEnCopy() {
  return {
    title: token, slug: "test-only-restaurant", metaTitle: token, metaDescription: token,
    opening: token, verdictReason: token,
    goodFor: [{ occasion: "first-date", assessment: "ideal", reason: token }],
    room: token, whatToDrink: token, cuisine: token, whatToOrder: token, realCost: token,
    reportersNote: { byline: "Victor Vu", text: token }, beforeYouGo: token,
    essentials: { address: token, booking: token, access: token, duration: token, cost: token, timing: token },
    paymentDisclosure: token, sourceNotes: token, factNotes: token, imageAlt: token, imageCredit: token,
    materialUpdates: [],
  };
}

function restaurantProps(overrides = {}) {
  return {
    "Spot Type": "Restaurant", Name: token, City: token, Neighbourhood: token,
    Visited: "2026-01-01", Published: "2026-01-02", "Last checked": "2026-01-03",
    Payment: "Paid", "Map URL": "https://example.com", Verdict: "A Favourite",
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
  assert.ok(!activity.includes("Verdict"));
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
  assert.equal(record.reporterByline, "Victor Vu");
  assert.equal(record.image.provenance, "dmd-held-photograph");
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
    for (const prop of [...POST_TYPE_PROPERTIES["date-spot"], ...SPOT_TYPE_PROPERTIES[spotType]]) {
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
