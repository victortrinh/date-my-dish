import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { neighbourhoodSlug } from "../../src/content-contracts/date-spot.mjs";

// The 14 rules in public/_redirects send each pre-rework flat review URL to
// the nested URL its review renders at. When a review lands in the collection,
// its neighbourhood and slugs must produce exactly that target, or the
// redirect would point at a 404.
const rules = new Map(
  readFileSync("public/_redirects", "utf8").split("\n")
    .map((line) => line.trim().split(/\s+/))
    .filter(([from]) => /^\/(en\/reviews|fr\/critiques)\/[^/]+-montreal\/$/.test(from ?? ""))
    .map(([from, to]) => [from, to]),
);
const legacy = ["giwa-verdun", "hoogan-et-beaufort", "ile-flottante", "mckiernan", "moccione", "oncle-lee-kao", "othym"];

test("every legacy flat review URL has exactly one redirect per locale", () => {
  assert.equal(rules.size, 14);
  for (const slug of legacy) {
    assert.ok(rules.has(`/en/reviews/${slug}-montreal/`), slug);
    assert.ok(rules.has(`/fr/critiques/${slug}-montreal/`), slug);
  }
});

test("migrated legacy reviews render at their redirect targets", () => {
  const spots = JSON.parse(readFileSync("src/content/date-spots.json", "utf8"));
  for (const spot of spots.filter((s) => s.spotType === "restaurant" || s.spotType === "bar")) {
    const name = neighbourhoodSlug(spot.name);
    const key = legacy.find((slug) => slug === name || slug.startsWith(`${name}-`));
    if (!key) continue;
    const segment = neighbourhoodSlug(spot.neighbourhood);
    assert.equal(rules.get(`/en/reviews/${key}-montreal/`), `/en/reviews/${segment}/${spot.locales.en.slug}/`, spot.name);
    assert.equal(rules.get(`/fr/critiques/${key}-montreal/`), `/fr/critiques/${segment}/${spot.locales["fr-CA"].slug}/`, spot.name);
  }
});
