# PR Guardrail & Automated Dependency Updates

**Date**: 2026-02-24
**Status**: Brainstorm
**Author**: Victor + Claude

---

## What We're Building

Two complementary CI/CD features that protect the site from regressions:

1. **PR Smoke Test + Visual Regression Guardrail** -- A Playwright E2E test suite that runs on every PR to verify all pages load correctly, have no console errors, and haven't visually regressed.

2. **Weekly Automated Dependency Updates** -- Renovate-powered workflow that updates dependencies automatically, using the PR guardrail to catch breaking changes before merge.

## Why This Approach

### PR Guardrail: Playwright E2E

**Gap being filled**: The existing Lighthouse CI checks scores (SEO, a11y, performance) but doesn't verify that pages actually render correctly in a browser without errors. A page could score 100 on Lighthouse but have a broken React hydration error or a missing component.

**Why Playwright over alternatives:**
- Free, open-source, maintained by Microsoft
- Built-in `toHaveScreenshot()` for visual regression (no third-party service needed)
- Snapshots committed to repo (no cloud storage costs)
- Can check console errors and uncaught exceptions natively
- Fastest E2E framework available (headless Chromium)
- Works perfectly in GitHub Actions (official Docker images)

### Dependency Updates: Renovate

**Why Renovate over Dependabot:**
- Better grouping (batch all patch updates into one PR instead of N separate PRs)
- Auto-merge support with CI gate (merge only if guardrail passes)
- More configurable scheduling and labeling
- Free for all repos (open-source, free GitHub App)
- Can pin major updates to separate PRs with labels

## Key Decisions

### 1. Test Coverage: All Pages x 4 Variants

Every discoverable page tested in 4 configurations:
- Desktop (1280x720) + Light mode
- Desktop (1280x720) + Dark mode
- Mobile (375x667) + Light mode
- Mobile (375x667) + Dark mode

**Pages to test (~40 total):**
- Homepage EN/FR (2)
- About EN/FR (2)
- Contact EN/FR (2)
- Search EN/FR (2)
- Recipe listing EN/FR (2)
- All recipe pages (9 EN + 9 FR = 18)
- Category pages with recipes (~10-12)
- 404 page (1)

**Total screenshots**: ~40 pages x 4 variants = ~160 baseline images

### 2. What Constitutes a "Failure"

Hard failures (block PR merge):
- Any page returns non-200 HTTP status
- Any `console.error()` detected during page load
- Any uncaught JavaScript exception
- Visual regression exceeds threshold (e.g., 0.2% pixel difference)

### 3. Visual Regression Threshold

Use Playwright's `toHaveScreenshot()` with a small pixel diff tolerance (0.2%) to avoid flaky failures from anti-aliasing differences across CI runs. PRs that intentionally change design update snapshots via `npx playwright test --update-snapshots`.

### 4. CI Workflow Structure

```
PR opened/updated
  -> Build site (npm run build)
  -> Start server (wrangler dev --port 8788)
  -> Run Playwright tests (parallel across pages)
  -> Run existing Lighthouse CI (already configured)
  -> Report results
```

Playwright and Lighthouse can potentially run in parallel as separate jobs sharing the same build artifact to speed up CI.

### 5. Renovate Configuration

- **Schedule**: Weekly (Sundays, matching existing weekly-seo-audit cadence)
- **Grouping**: All patch updates in one PR, all minor updates in one PR, major updates get individual PRs
- **Auto-merge**: Patch updates auto-merge when all CI passes (Playwright + Lighthouse + astro check)
- **Major updates**: Create PR but do NOT auto-merge; require manual review
- **Breaking changes**: If CI fails on a Renovate PR, the PR stays open with red CI status as a clear signal. Optionally, a lightweight GitHub Action can comment on the PR or open an issue after N days of CI failure.
- **Labels**: `dependencies`, `automerge` (for eligible PRs), `major-update` (for majors)

### 6. Snapshot Storage

Baseline screenshots stored in `tests/snapshots/` committed to git. This adds ~5-15MB to the repo but keeps everything self-contained with zero infrastructure cost. The `.gitattributes` file can mark them as binary for cleaner diffs.

## Architecture Sketch

```
.github/workflows/
  lighthouse-pr-check.yml    (existing - keep as-is)
  playwright-pr-check.yml    (new - PR guardrail)

tests/
  e2e/
    smoke.spec.ts             (page load + console error checks)
    visual-regression.spec.ts (screenshot comparisons)
    helpers/
      pages.ts                (dynamic page discovery)
  playwright.config.ts
  snapshots/                  (baseline screenshots, committed)
    desktop-light/
    desktop-dark/
    mobile-light/
    mobile-dark/

renovate.json                 (Renovate configuration)
```

## Renovate vs. the Guardrail: How They Connect

```
Renovate creates PR (weekly)
  -> PR triggers playwright-pr-check.yml (guardrail)
  -> PR triggers lighthouse-pr-check.yml (existing)
  -> All green? Auto-merge (for patch/minor)
  -> Red? PR stays open, team reviews manually
```

## Open Questions

None -- all key decisions resolved during brainstorming.

## Next Steps

1. Run `/workflows:plan` to create detailed implementation plan
2. Implement Playwright test suite and GitHub Action
3. Install Renovate GitHub App and configure `renovate.json`
4. Generate initial baseline screenshots on `main` branch
