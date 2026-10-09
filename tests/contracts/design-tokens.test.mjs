import { test } from "node:test";
import assert from "node:assert/strict";
import { findDesignViolations } from "../../scripts/design-tokens-guard.mjs";

const check = (source) => findDesignViolations(source, "x.astro");

test("raw hex colours fail, in classes, styles and scripts", () => {
  assert.equal(check('<p style="color:#786A68">').length, 1);
  assert.equal(check("<style>.a { background: #fff; }</style>").length, 1);
  assert.equal(check("el.style.color = '#1b1c1eaa';").length, 1);
});

test("anchors, ids, entities and theme-color metas pass", () => {
  assert.deepEqual(check('<a href="#main-content">Skip</a>'), []);
  assert.deepEqual(check("document.querySelector('#nav-search-btn')"), []);
  assert.deepEqual(check("It&#39;s"), []);
  assert.deepEqual(check('<meta name="theme-color" content="#e7e5e1" />'), []);
});

test("arbitrary shadow, radius and colour utilities fail", () => {
  assert.equal(check('<nav class="shadow-[0_1px_3px_rgba(0,0,0,0.3)]">').length, 1);
  assert.equal(check('<div class="dark:shadow-[0_0_0_red]">').length, 1);
  assert.equal(check('<img class="rounded-[2rem]">').length, 1);
  assert.equal(check('<img class="rounded-t-[2rem]">').length, 1);
  assert.equal(check('<p class="hover:text-[#123456]">').length, 2);
});

test("token utilities and non-colour arbitrary values pass", () => {
  assert.deepEqual(check('<div class="bg-surface text-ink rounded-arch shadow-none max-h-[80vh] border-[1.5px]">'), []);
});

test("retired legacy aliases fail, with any variant prefix", () => {
  assert.equal(check('<p class="text-warm-700 dark:text-warm-300">').length, 2);
  assert.equal(check('<div class="border-l-brand-wine bg-brand-rose/10">').length, 2);
  assert.equal(check('<a class="text-brand-wine-text hover:text-brand-wine-dark">').length, 2);
  assert.equal(check('<div class="divide-warm-200 aria-pressed:bg-warm-800">').length, 2);
  assert.equal(check('<h1 class="font-heading text-4xl">').length, 1);
  assert.equal(check('<p class="font-caveat normal-case">').length, 1);
  assert.equal(check("<style>h1 { font-family: var(--font-heading); color: var(--color-warm-900); }</style>").length, 2);
});

test("words that only look like aliases pass", () => {
  assert.deepEqual(check("The warm-water soak sounds unnecessary."), []);
  assert.deepEqual(check('<h1 class="font-display text-heading-1 text-ink">'), []);
  assert.deepEqual(check('<p class="text-heading-2">heading-2</p>'), []);
});
