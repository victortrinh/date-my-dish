# Playwright E2E Optimization Design

**Date:** 2026-03-23
**Problem:** Playwright E2E tests consistently exceed 15 minutes on CI, testing all 117 pages x 4 projects (468+ tests) on every PR regardless of change scope.
**Goal:** Reduce PR check time to under 5 minutes by testing only affected pages with fewer project combos, while keeping a weekly full suite as a safety net.

## Approach: Smart Change Detection with Fallback

### Change Detection Tiers

A new script `scripts/generate-playwright-pages.cjs` determines which pages to test based on git diff:

| Changed files match | Test scope | Pages to test |
|---|---|---|
| `src/content/{recipes,articles}/**` | `changed` | Only affected pages + translation pairs |
| `src/components/**`, `src/layouts/**`, `src/pages/**`, `src/i18n/**`, `src/styles/**` | `sample` | Representative sample (~10 pages): EN/FR homepage, 1 EN recipe, 1 FR recipe, 1 EN article, 1 FR article, EN/FR recipe listing, EN about, FR about |
| `package.json`, `astro.config.*`, `tailwind.config.*`, `tsconfig.*` | `full` | All pages (full discovery from `dist/`) |
| None of the above (docs, scripts, CI files only) | `none` | Skip tests entirely |

When multiple tiers match, the highest blast radius wins (none < changed < sample < full).

The script writes `.playwright-pages.json` (consumed by test discovery) and outputs `test_scope` for the CI workflow.

### PR Project Configuration

PR checks run only 2 Playwright projects instead of 4:

- **desktop-light** — most common viewport, catches layout/functionality issues
- **mobile-dark** — catches responsive breakpoints AND dark mode CSS in one pass

Rationale: Light/dark differences are CSS variables (`dark:` classes). If dark mode works on mobile, it works on desktop. The weekly full suite covers all 4 combos.

### Playwright Config Changes

**`playwright.config.ts`:**
- Use `PLAYWRIGHT_SCOPE` env var to select projects: `pr` = 2 projects (desktop-light + mobile-dark), `full` = all 4
- Default to all 4 when env var is unset (local dev, weekly suite)

### Test Infrastructure Changes

**`tests/helpers/discover-pages.ts`:**
- If `.playwright-pages.json` exists, use it as the page list
- Fall back to full `dist/` discovery when the file doesn't exist

**`tests/smoke/page-health.spec.ts`:**
- Replace `waitForLoadState("networkidle")` with `waitForLoadState("domcontentloaded")` — `networkidle` adds significant latency per test and is unnecessary for checking HTTP status + console errors

### Expected PR Test Counts

| PR type | Pages | Projects | Tests | Estimated time |
|---|---|---|---|---|
| Content-only | 2-4 | 2 | 4-8 | ~30s |
| Component/layout | 10 | 2 | 20 | ~2min |
| Infrastructure | 117 | 2 | 234 | ~8min |
| Non-runtime (docs/CI) | 0 | 0 | skip | 0 |

### CI Workflow: `playwright-pr-check.yml`

Updates to the existing workflow:
1. Add git diff step to detect change tier (mirrors Lighthouse pattern)
2. Run `scripts/generate-playwright-pages.cjs` to produce `.playwright-pages.json`
3. Skip Playwright entirely if `test_scope=none`
4. Pass `PLAYWRIGHT_SCOPE=pr` env var for 2-project mode
5. Remove retry (`retries: 1`) — fewer tests means cleaner single runs

### CI Workflow: `playwright-weekly.yml` (new)

- **Schedule:** Cron on Sunday night (aligned with weekly SEO audit)
- **Scope:** Full suite — all pages, all 4 projects
- **No git diff, no filtering**
- **Results:** Stored as artifact (no PR to comment on)
- **Timeout:** 25 minutes

### Files to Create/Modify

| File | Action |
|---|---|
| `scripts/generate-playwright-pages.cjs` | Create — change detection script |
| `tests/helpers/discover-pages.ts` | Modify — read `.playwright-pages.json` when present |
| `tests/smoke/page-health.spec.ts` | Modify — `domcontentloaded` instead of `networkidle` |
| `playwright.config.ts` | Modify — env-var-driven project selection |
| `.github/workflows/playwright-pr-check.yml` | Modify — add change detection, 2-project mode, drop retry |
| `.github/workflows/playwright-weekly.yml` | Create — full suite on cron |
| `.gitignore` | Modify — add `.playwright-pages.json` |
