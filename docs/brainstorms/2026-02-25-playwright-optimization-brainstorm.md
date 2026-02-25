# Playwright E2E Test Optimization

**Date:** 2026-02-25
**Status:** Decided
**Author:** Victor + Claude

## Problem

Playwright e2e tests are timing out and getting cancelled on CI (hitting the 20-minute GitHub Actions timeout). With 272 tests currently (34 pages x 4 projects x 2 suites) and plans to grow to 30+ recipes, the test suite will only get slower -- projecting 600+ tests at scale.

## What We're Building

**Template-based visual testing** -- replace the "screenshot every page" approach with a curated set of representative pages for visual regression, while keeping smoke tests on all pages.

### Current State (272 tests)
- **Smoke tests:** 34 pages x 4 projects = 136 tests (fast, ~seconds each)
- **Visual tests:** 34 pages x 4 projects = 136 tests (slow, full-page screenshots with network idle + font loading + pixel comparison)

### Target State (~200 tests, scales flat)
- **Smoke tests:** All pages x 4 projects = grows with recipes (but lightweight)
- **Visual tests:** ~8-10 template pages x 4 projects = ~32-40 tests (fixed ceiling)

## Why This Approach

- **Visual bugs are template-level, not content-level.** A CSS regression on recipe pages shows up on any recipe, not just one specific one. Testing every recipe screenshot is redundant.
- **Smoke tests catch page-level issues.** HTTP 200 + no JS errors on every page ensures nothing is fundamentally broken.
- **Scales to 100+ recipes** with zero test growth on the visual side.
- **Simple to implement** -- curate a fixed page list instead of auto-discovering all pages.

### Approaches Considered but Rejected

1. **Selective testing (changed pages only):** Too complex to map file changes to affected pages reliably. A component change could affect every page. Risk of missing regressions.
2. **Tiered testing (PR + nightly full):** Added CI complexity for marginal benefit given that template-based coverage is sufficient.

## Key Decisions

1. **Visual tests use a fixed representative page list** (~8-10 pages covering each template type):
   - Homepage: `/en/`
   - Recipe page: `/en/recipes/cacio-e-pepe/` (or similar)
   - Recipe index: `/en/recipes/`
   - Category page: `/en/recipes/category/dinner/`
   - About: `/en/about/`
   - Contact: `/en/contact/`
   - Search: `/en/search/`
   - French equivalents for 1-2 pages to verify i18n layout

2. **Keep all 4 project variants** (desktop-light, desktop-dark, mobile-light, mobile-dark) for visual tests -- the page count is small enough.

3. **Smoke tests continue to auto-discover all pages** from `dist/` -- they're fast and catch broken pages/JS errors.

4. **No nightly full visual regression** -- template-based coverage is sufficient for a content site with shared layouts.

## Open Questions

None -- all questions resolved during brainstorming.

## Expected Outcome

- PR CI time drops from ~8.5 min (currently) / 20+ min (timeout) to ~4-5 min
- Test count goes from 272 (growing) to ~200 (visual portion fixed at ~40)
- Adding new recipes only adds ~8 lightweight smoke tests, no visual tests
