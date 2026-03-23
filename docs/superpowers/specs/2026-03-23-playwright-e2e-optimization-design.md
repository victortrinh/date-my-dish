# Playwright E2E Optimization Design

**Date:** 2026-03-23
**Problem:** Playwright E2E tests consistently exceed 15 minutes on CI, testing all 117 pages x 4 projects (468+ tests) on every PR regardless of change scope.
**Goal:** Reduce PR check time to under 5 minutes by testing only affected pages with fewer project combos, while keeping a weekly full suite as a safety net.

## Approach: Smart Change Detection with Fallback

### Change Detection Tiers

A new script `scripts/generate-playwright-pages.cjs` determines which pages to test based on git diff. Accepts `--base=<ref>` argument for the diff base (defaults to `origin/main`).

| Changed files match | Test scope | Pages to test |
|---|---|---|
| `src/content/{recipes,articles}/**` | `changed` | Affected pages + translation pairs + EN/FR listing pages for that content type (e.g., recipe addition also tests `/en/recipes/` and `/fr/recettes/`) |
| `src/components/**`, `src/layouts/**`, `src/pages/**`, `src/i18n/**`, `src/styles/**` | `sample` | Representative sample (~14 pages): EN/FR homepage, 1 EN recipe, 1 FR recipe, 1 EN article, 1 FR article, EN/FR recipe listing, EN/FR article listing, 1 EN category page, 1 FR category page, EN about, FR about |
| `package.json`, `astro.config.*`, `tailwind.config.*`, `tsconfig.*` | `full` | All pages (full discovery from `dist/`) |
| None of the above (docs, scripts, CI files only) | `none` | Skip tests entirely |

**Note:** Individual page file edits (e.g., `src/pages/en/about.astro`) are intentionally covered by the `sample` tier since page templates are shared infrastructure.

When multiple tiers match, the highest blast radius wins (none < changed < sample < full).

The script writes `.playwright-pages.json` (consumed by test discovery) and outputs `test_scope` for the CI workflow via `$GITHUB_OUTPUT`.

### PR Project Configuration

PR checks run only 2 Playwright projects instead of 4:

- **desktop-light** — most common viewport, catches layout/functionality issues
- **mobile-dark** — catches responsive breakpoints AND dark mode CSS in one pass

Rationale: Light/dark differences are CSS variables (`dark:` classes). If dark mode works on mobile, it works on desktop. The weekly full suite covers all 4 combos.

### Playwright Config Changes

**`playwright.config.ts`:**
- Use `PLAYWRIGHT_SCOPE` env var to select projects: `pr` = 2 projects (desktop-light + mobile-dark), `full` = all 4
- Default to all 4 when env var is unset (local dev, weekly suite)
- Keep `retries: process.env.CI ? 1 : 0` (CI flakiness from wrangler startup timing is independent of test count)

### Test Infrastructure Changes

**`tests/helpers/discover-pages.ts`:**
- If `.playwright-pages.json` exists, use it as the page list
- Fall back to full `dist/` discovery when the file doesn't exist
- Note: `.playwright-pages.json` is ephemeral and gitignored. Developers running the generation script locally should be aware that a stale file will override full discovery. The file is deleted at the start of each CI run.

**`tests/smoke/page-health.spec.ts`:**
- Replace `waitForLoadState("networkidle")` with `waitForLoadState("domcontentloaded")` — `networkidle` adds significant latency per test and is unnecessary for checking HTTP status + console errors

### Expected PR Test Counts

| PR type | Pages | Projects | Tests | Estimated time |
|---|---|---|---|---|
| Content-only | 4-8 | 2 | 8-16 | ~1min |
| Component/layout | 14 | 2 | 28 | ~2min |
| Infrastructure | 117 | 2 | 234 | ~10min |
| Non-runtime (docs/CI) | 0 | 0 | skip | 0 |

### CI Workflow: `playwright-pr-check.yml`

Updates to the existing workflow:
1. Add `fetch-depth: 0` to `actions/checkout` (required for `git diff` against base branch)
2. Add git diff step to detect change tier (mirrors Lighthouse pattern)
3. Run `scripts/generate-playwright-pages.cjs` to produce `.playwright-pages.json`
4. Clean up any stale `.playwright-pages.json` before running the generation script
5. Skip Playwright entirely if `test_scope=none` (via `if:` condition on subsequent steps)
6. Pass `PLAYWRIGHT_SCOPE=pr` env var for 2-project mode
7. Include detected test scope in the PR comment (e.g., "Scope: sample (14 pages, 2 projects)")

### CI Workflow: `playwright-weekly.yml` (new)

- **Schedule:** Cron on Sunday night (aligned with weekly SEO audit)
- **Scope:** Full suite — all pages, all 4 projects
- **No git diff, no filtering**
- **Results:** Stored as artifact + creates a GitHub issue on failure for visibility
- **Timeout:** 25 minutes

### Files to Create/Modify

| File | Action |
|---|---|
| `scripts/generate-playwright-pages.cjs` | Create — change detection script (with `--base` arg support) |
| `tests/helpers/discover-pages.ts` | Modify — read `.playwright-pages.json` when present |
| `tests/smoke/page-health.spec.ts` | Modify — `domcontentloaded` instead of `networkidle` |
| `playwright.config.ts` | Modify — env-var-driven project selection |
| `.github/workflows/playwright-pr-check.yml` | Modify — add change detection, fetch-depth, 2-project mode, scope in PR comment |
| `.github/workflows/playwright-weekly.yml` | Create — full suite on cron with failure issue creation |
| `.gitignore` | Modify — add `.playwright-pages.json` |
