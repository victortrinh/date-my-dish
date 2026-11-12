import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { OCCASIONS } from "../../src/content-contracts/date-spot.mjs";

// The night picker and the review's Good-for highlight switch in CSS, one
// selector per occasion (global.css). A new occasion needs both.
const css = readFileSync(new URL("../../src/styles/global.css", import.meta.url), "utf8");

for (const occasion of OCCASIONS) {
  test(`global.css switches the night picker panel and lights the Good-for row for ${occasion}`, () => {
    assert.ok(css.includes(`.night-picker:has(input[value="${occasion}"]:checked) .night-panel[data-night="${occasion}"]`), "night picker panel");
    assert.ok(css.includes(`:root:has(#verdict-${occasion}:target) #good-for-${occasion}`), "Good-for row highlight");
  });
}
