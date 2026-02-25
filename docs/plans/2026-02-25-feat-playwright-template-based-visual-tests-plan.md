---
title: "feat: Template-based visual regression tests"
type: feat
status: completed
date: 2026-02-25
origin: docs/brainstorms/2026-02-25-playwright-optimization-brainstorm.md
---

# Template-Based Visual Regression Tests

## Overview

Replace the "screenshot every page" visual regression strategy with a curated set of ~14 representative template pages. Smoke tests remain unchanged and continue testing all pages. This fixes CI timeout failures (hitting the 20-minute GitHub Actions limit) and ensures tests scale as recipes grow to 30+.

## Problem Statement

- **272 tests** currently run per PR (34 pages x 4 projects x 2 suites)
- Visual tests are the bottleneck: full-page screenshot with `networkidle` + font loading + pixel comparison per page
- CI has **hit the 20-minute timeout** and gets cancelled
- Every new recipe adds **16 tests** (EN + FR x 4 projects x 2 suites) -- linear growth
- At 30+ recipes: **600+ tests**, completely unsustainable

## Proposed Solution

Visual bugs are template-level, not content-level -- a CSS regression on recipe pages shows up on any recipe, not just one specific one (see brainstorm: `docs/brainstorms/2026-02-25-playwright-optimization-brainstorm.md`).

**Changes:**
1. Create `tests/helpers/representative-pages.ts` with a fixed list of 14 pages (one per template type per locale)
2. Rename `tests/visual/all-pages.spec.ts` → `tests/visual/visual-regression.spec.ts` (clearer name; baseline regeneration makes this free)
3. Delete all existing snapshots and regenerate only the needed ~56 baselines
4. Smoke tests (`page-health.spec.ts`) stay exactly as-is -- still auto-discover all pages

**Result:** 136 visual tests → 56 visual tests. Total: 272 → 192. Visual test count is now **fixed** regardless of recipe growth.

## Technical Considerations

### Representative Page Selection

14 pages covering every distinct template type, both locales:

| # | Path | Template | Name |
|---|------|----------|------|
| 1 | `/en/` | Homepage | `en` |
| 2 | `/fr/` | Homepage | `fr` |
| 3 | `/en/recipes/` | Recipe listing | `en-recipes` |
| 4 | `/fr/recettes/` | Recipe listing | `fr-recettes` |
| 5 | `/en/recipes/cacio-e-pepe/` | Individual recipe | `en-recipes-cacio-e-pepe` |
| 6 | `/fr/recettes/cacio-e-pepe/` | Individual recipe | `fr-recettes-cacio-e-pepe` |
| 7 | `/en/recipes/category/dinner/` | Category page | `en-recipes-category-dinner` |
| 8 | `/fr/recettes/categorie/souper/` | Category page | `fr-recettes-categorie-souper` |
| 9 | `/en/about/` | About | `en-about` |
| 10 | `/fr/a-propos/` | About | `fr-a-propos` |
| 11 | `/en/contact/` | Contact | `en-contact` |
| 12 | `/fr/contact/` | Contact | `fr-contact` |
| 13 | `/en/search/` | Search | `en-search` |
| 14 | `/fr/recherche/` | Search | `fr-recherche` |

**Why `dinner`/`souper`:** Likely has the most recipes, exercising the grid layout most thoroughly.
**Why `cacio-e-pepe`:** All recipes have the same optional fields populated (nutrition, dateNightTips), so any recipe works. Using the same slug for both locales simplifies the list.

### File Rename: `all-pages.spec.ts` → `visual-regression.spec.ts`

The snapshot path template uses `{testFileName}`, so renaming changes the snapshot directory from `all-pages.spec.ts-snapshots/` to `visual-regression.spec.ts-snapshots/`. Since we're deleting all baselines and regenerating anyway, this is free. The new name accurately describes what the file does.

### Name Convention

The `name` field in `representative-pages.ts` must follow the same convention as `discoverPages()`: strip leading/trailing slashes, replace `/` with `-`. This keeps snapshot filenames consistent and readable.

### Files Unchanged

- `tests/helpers/discover-pages.ts` -- still used by smoke tests, must be retained
- `tests/smoke/page-health.spec.ts` -- no changes
- `tests/fixtures.ts` -- no changes
- `tests/screenshot.css` -- no changes
- `playwright.config.ts` -- no changes
- `.github/workflows/playwright-pr-check.yml` -- no changes (glob `tests/snapshots/**/*.png` covers the new directory)

## Acceptance Criteria

- [x] New file `tests/helpers/representative-pages.ts` exports 14 representative pages
- [x] `tests/visual/visual-regression.spec.ts` uses the curated list (renamed from `all-pages.spec.ts`)
- [x] Old snapshot directory `tests/snapshots/visual/all-pages.spec.ts-snapshots/` is deleted
- [x] New baselines generated at `tests/snapshots/visual/visual-regression.spec.ts-snapshots/` (~56 PNGs)
- [x] Smoke tests still discover and test all pages (verify with `npx playwright test tests/smoke/`)
- [x] Visual tests only run 56 tests (14 pages x 4 projects): verify with `npx playwright test tests/visual/ --list`
- [ ] CI PR check passes within 20-minute timeout

## Implementation Steps

### Step 1: Create `tests/helpers/representative-pages.ts`

```typescript
// tests/helpers/representative-pages.ts

/**
 * Curated list of representative pages for visual regression testing.
 * One page per template type per locale.
 *
 * Update this list when adding new page templates to the site.
 * Smoke tests (page-health.spec.ts) still test ALL pages via discoverPages().
 *
 * Template types covered:
 * - Homepage, Recipe listing, Individual recipe, Category page,
 *   About, Contact, Search
 */
export const REPRESENTATIVE_PAGES: { path: string; name: string }[] = [
  // Homepages
  { path: "/en/", name: "en" },
  { path: "/fr/", name: "fr" },
  // Recipe listings
  { path: "/en/recipes/", name: "en-recipes" },
  { path: "/fr/recettes/", name: "fr-recettes" },
  // Individual recipe (same slug both locales)
  { path: "/en/recipes/cacio-e-pepe/", name: "en-recipes-cacio-e-pepe" },
  { path: "/fr/recettes/cacio-e-pepe/", name: "fr-recettes-cacio-e-pepe" },
  // Category pages
  { path: "/en/recipes/category/dinner/", name: "en-recipes-category-dinner" },
  { path: "/fr/recettes/categorie/souper/", name: "fr-recettes-categorie-souper" },
  // About
  { path: "/en/about/", name: "en-about" },
  { path: "/fr/a-propos/", name: "fr-a-propos" },
  // Contact
  { path: "/en/contact/", name: "en-contact" },
  { path: "/fr/contact/", name: "fr-contact" },
  // Search
  { path: "/en/search/", name: "en-search" },
  { path: "/fr/recherche/", name: "fr-recherche" },
];
```

### Step 2: Rename and update visual test spec

Rename `tests/visual/all-pages.spec.ts` → `tests/visual/visual-regression.spec.ts` and swap the import:

```typescript
// tests/visual/visual-regression.spec.ts
import { test, expect } from "../fixtures";
import { REPRESENTATIVE_PAGES } from "../helpers/representative-pages";

for (const { path, name } of REPRESENTATIVE_PAGES) {
  test(`${name} visual snapshot`, async ({ page }) => {
    await page.goto(path);
    await page.waitForLoadState("networkidle");
    await page.evaluate(() => document.fonts.ready);
    await expect(page).toHaveScreenshot(`${name}.png`, {
      fullPage: true,
      stylePath: "./tests/screenshot.css",
    });
  });
}
```

### Step 3: Clean up old snapshots

```bash
rm -rf tests/snapshots/visual/all-pages.spec.ts-snapshots/
```

### Step 4: Generate new baselines

```bash
npm run build && npx playwright test tests/visual/ --update-snapshots
```

This creates `tests/snapshots/visual/visual-regression.spec.ts-snapshots/` with ~56 PNGs.

### Step 5: Verify

```bash
# List visual tests -- should show exactly 56
npx playwright test tests/visual/ --list

# Run smoke tests -- should still discover all pages
npx playwright test tests/smoke/ --list

# Full run
npx playwright test
```

## Sources

- **Origin brainstorm:** [docs/brainstorms/2026-02-25-playwright-optimization-brainstorm.md](docs/brainstorms/2026-02-25-playwright-optimization-brainstorm.md) -- Key decisions: template-based visual tests, keep all 4 projects, smoke tests unchanged
- Playwright config: `playwright.config.ts`
- Visual test spec: `tests/visual/all-pages.spec.ts`
- Smoke test spec: `tests/smoke/page-health.spec.ts`
- Page discovery helper: `tests/helpers/discover-pages.ts`
- CI workflow: `.github/workflows/playwright-pr-check.yml`
