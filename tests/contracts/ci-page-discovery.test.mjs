// CI page discovery: the Playwright PR scope and the Date Spot routes that
// both Playwright and Lighthouse use must follow what the site builds.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { dateSpotDetailPath } from "../../src/content-contracts/date-spot-paths.mjs";

const require = createRequire(import.meta.url);
const { detectScope, planPages } = require("../../scripts/generate-playwright-pages.cjs");
const { allDetailRoutes, listingRoutes } = require("../../scripts/lib/date-spot-routes.cjs");

const fixture = JSON.parse(readFileSync("tests/fixtures/date-spots.json", "utf8"));

test("Venue Reviews nest under the neighbourhood; Planning Spots do not", () => {
  const routes = allDetailRoutes(fixture);
  for (const spot of fixture) {
    const en = dateSpotDetailPath(spot, "en");
    const fr = dateSpotDetailPath(spot, "fr");
    assert.ok(routes.includes(en) && routes.includes(fr));
    if (spot.spotType === "restaurant" || spot.spotType === "bar") {
      assert.match(en, /^\/en\/reviews\/[a-z0-9-]+\/[a-z0-9-]+\/$/);
      assert.match(fr, /^\/fr\/critiques\/[a-z0-9-]+\/[a-z0-9-]+\/$/);
    } else {
      assert.match(en, /^\/en\/date-spots\/[a-z0-9-]+\/$/);
      assert.match(fr, /^\/fr\/lieux\/[a-z0-9-]+\/$/);
    }
  }
  assert.deepEqual(listingRoutes(fixture), ["/en/date-spots/", "/fr/lieux/", "/en/reviews/", "/fr/critiques/"]);
});

test("neighbourhood segment drops accents and punctuation", () => {
  const spot = { spotType: "restaurant", neighbourhood: "Côte-des-Neiges / NDG", locales: { en: { slug: "a" }, "fr-CA": { slug: "b" } } };
  assert.equal(dateSpotDetailPath(spot, "en"), "/en/reviews/cote-des-neiges-ndg/a/");
  assert.equal(dateSpotDetailPath(spot, "fr"), "/fr/critiques/cote-des-neiges-ndg/b/");
});

test("Cloudflare runtime and test-suite changes run browser tests", () => {
  for (const file of [
    "src/worker.ts",
    "public/_redirects",
    "public/_headers",
    "wrangler.jsonc",
    "tests/smoke/date-spot.spec.ts",
    "tests/fixtures.ts",
    "tests/helpers/discover-pages.ts",
    "src/utils/date-spots.ts",
    "src/content-contracts/date-spot.mjs",
  ]) {
    assert.equal(detectScope([file]).scope, "sample", file);
  }
  assert.equal(detectScope(["docs/editorial-publishing-system.md"]).scope, "none");
  assert.equal(detectScope(["package.json"]).scope, "full");
});

test("a fixture change in a sample run covers the Date Spot pages", () => {
  const { scope, pages } = planPages(["tests/fixtures/date-spots.json"]);
  assert.equal(scope, "sample");
  assert.ok(pages.includes("/en/"));
  for (const route of allDetailRoutes()) assert.ok(pages.includes(route), route);
});
