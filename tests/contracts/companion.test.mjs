import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { applyCompanion, companionSchema } from "../../src/content-contracts/companion.mjs";
import { loadCollection } from "../../src/content-contracts/load.mjs";
import { dateSpotSchema, dateSpotsSchema } from "../../src/content-contracts/date-spot.mjs";
import { dateSpotFixture, minimalReviewFixture, token } from "./date-spot-fixtures.mjs";

const companion = (overrides = {}) => companionSchema.parse({ id: "test-only", ...overrides });

test("Companion File fields override the Notion-derived record", () => {
  const record = dateSpotFixture("restaurant", "test-only");
  const title = "Test Venue, Test Quarter: From the Companion File";
  const merged = applyCompanion(record, companion({
    reviewVerdict: "pass",
    neighbourhood: "Test Quarter",
    lastChecked: "2026-01-05",
    instagram: "companion.handle",
    bookingUrl: "https://example.com/companion",
    googleReviews: [{ average: 4.2, count: 90, asOf: "2026-01-05" }],
    locales: {
      en: { metaTitle: title, verdictReason: `${token} companion reason`, imageAlt: `${token} companion alt`, goodFor: [{ occasion: "anniversary", assessment: "ideal", reason: `${token} companion` }] },
      "fr-CA": { metaTitle: title, verdictReason: `${token} raison`, imageAlt: `${token} texte alt`, goodFor: [{ occasion: "anniversary", assessment: "ideal", reason: `${token} compagnon` }] },
    },
  }));
  const spot = dateSpotSchema.parse(merged);
  assert.equal(spot.reviewVerdict, "pass");
  assert.equal(spot.freshness.lastChecked, "2026-01-05");
  assert.equal(spot.freshness.published, record.freshness.published);
  assert.equal(spot.instagram, "companion.handle");
  assert.equal(spot.bookingUrl, "https://example.com/companion");
  assert.equal(spot.googleReviews?.[0].count, 90);
  assert.equal(spot.locales.en.metaTitle, title);
  assert.equal(spot.locales.en.verdictReason, `${token} companion reason`);
  assert.equal(spot.locales["fr-CA"].imageAlt, `${token} texte alt`);
  assert.equal(spot.locales.en.goodFor?.length, 1);
  // Fields the Companion File leaves out keep the record's value.
  assert.equal(spot.locales.en.room, record.locales.en.room);
  assert.equal(spot.locales.en.opening, record.locales.en.opening);
  assert.equal(spot.name, record.name);
  // The record passed in is never mutated.
  assert.equal(record.reviewVerdict, "conditional");
});

test("the Companion File carries only fields DMD controls", () => {
  for (const field of ["opening", "room", "rating", "dateScore"]) {
    assert.equal(companionSchema.safeParse({ id: "test-only", [field]: token }).success, false, field);
    assert.equal(companionSchema.safeParse({ id: "test-only", locales: { en: { [field]: token } } }).success, false, field);
  }
  assert.equal(companionSchema.safeParse({ id: "test-only", reviewVerdict: "five-stars" }).success, false);
  assert.equal(companionSchema.safeParse({ id: "test-only", instagram: "@handle" }).success, false);
  assert.equal(companionSchema.safeParse({ id: "test-only", locales: { en: { metaDescription: "too short" } } }).success, false);
});

test("loadCollection merges each Companion File over its record by id", () => {
  const cwd = mkdtempSync(join(tmpdir(), "dmd-companion-"));
  try {
    const editorial = join(cwd, "editorial");
    mkdirSync(editorial);
    const source = join(cwd, "date-spots.json");
    writeFileSync(source, JSON.stringify([minimalReviewFixture("test-only"), minimalReviewFixture("test-only-other", "Test Other")]));
    writeFileSync(join(editorial, "test-only.json"), JSON.stringify({ id: "test-only", reviewVerdict: "favourite", lastChecked: "2026-02-01" }));
    // A Companion File for a post in another collection is simply not used here.
    writeFileSync(join(editorial, "some-chef.json"), JSON.stringify({ id: "some-chef", locales: { en: { imageAlt: token } } }));
    const spots = dateSpotsSchema.parse(loadCollection(source, editorial));
    assert.equal(spots[0].reviewVerdict, "favourite");
    assert.equal(spots[0].freshness.lastChecked, "2026-02-01");
    assert.equal(spots[1].reviewVerdict, "conditional");
    assert.equal(spots[1].freshness.lastChecked, spots[1].freshness.published);

    writeFileSync(join(editorial, "misnamed.json"), JSON.stringify({ id: "test-only" }));
    assert.throws(() => loadCollection(source, editorial), /named after its record id/);
    rmSync(join(editorial, "misnamed.json"));
    writeFileSync(join(editorial, "test-only.json"), JSON.stringify({ id: "test-only", score: 9 }));
    assert.throws(() => loadCollection(source, editorial), /test-only\.json/);
    assert.deepEqual(loadCollection(join(cwd, "missing.json"), join(cwd, "missing-dir")), []);
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});
