---
title: "feat: Add Playwright PR guardrail and Renovate dependency updates"
type: feat
status: completed
date: 2026-02-24
origin: docs/brainstorms/2026-02-24-pr-guardrail-dependency-updates-brainstorm.md
---

# feat: Add Playwright PR Guardrail and Renovate Dependency Updates

## Overview

Add two complementary CI/CD features: (1) a Playwright E2E test suite that runs on every PR to verify all pages load correctly with no console errors and no visual regressions across 4 viewport/theme variants, and (2) Renovate-powered weekly dependency updates that auto-merge safe patches when all CI gates pass.

## Problem Statement

The existing Lighthouse CI PR gate checks scores (SEO, a11y, performance) but does not verify that pages actually render correctly in a browser. A page could score 100 on Lighthouse but have a broken component, a console error, or a layout regression. There is also zero automated dependency management — all 12 dependencies are manually tracked.

## Proposed Solution

**Part 1: Playwright E2E + Visual Regression** (see brainstorm: `docs/brainstorms/2026-02-24-pr-guardrail-dependency-updates-brainstorm.md`)

A Playwright test suite that:
- Dynamically discovers all pages from the built `dist/` directory
- Asserts HTTP 200, zero `console.error`, zero uncaught JS exceptions on every page
- Takes full-page screenshots across 4 variants (desktop-light, desktop-dark, mobile-light, mobile-dark)
- Compares against committed baselines via `toHaveScreenshot()`

**Part 2: Renovate Dependency Management** (see brainstorm)

Renovate GitHub App configured to:
- Group patch/minor updates into a single weekly PR
- Auto-merge when all CI passes (Lighthouse + Playwright + astro check)
- Create separate PRs for major bumps (no auto-merge)
- Run on Mondays (avoids Sunday SEO audit collision)

## Technical Approach

### Architecture

```
.github/workflows/
  lighthouse-pr-check.yml        (existing — no changes)
  playwright-pr-check.yml        (NEW — PR guardrail)

tests/
  fixtures.ts                     (dark mode injection fixture)
  screenshot.css                  (animation/flicker suppression for screenshots)
  helpers/
    discover-pages.ts             (reads dist/ for all HTML pages)
  smoke/
    page-health.spec.ts           (HTTP 200 + console errors + JS exceptions)
  visual/
    all-pages.spec.ts             (full-page screenshots, all 4 variants)
  snapshots/                      (committed baseline PNGs)

scripts/
  generate-lighthouse-urls.cjs    (existing — no changes)

playwright.config.ts              (Playwright configuration)
renovate.json                     (Renovate configuration)
.gitattributes                    (NEW — mark PNGs as binary)
```

### Implementation Phases

#### Phase 1: Playwright Test Infrastructure

Install Playwright and create the configuration + test structure.

**1.1 Install dependencies**

```bash
npm install -D @playwright/test
```

Add to `package.json` scripts:
```json
"test": "npx playwright test",
"test:update-snapshots": "npx playwright test --update-snapshots"
```

**1.2 Create `playwright.config.ts`**

Key design decisions:
- **Port 8788**: Same as existing Lighthouse CI (established convention)
- **webServer**: `npx wrangler dev --port 8788` with `Ready on` ready pattern (matches `.lighthouserc.cjs:44`)
- **4 Chromium projects**: desktop-light, desktop-dark, mobile-light, mobile-dark
- **Desktop viewport**: 1280x900 (standard, matches Lighthouse `preset: 'desktop'`)
- **Mobile viewport**: Playwright's built-in `Pixel 5` device (393x851)
- **Snapshot path template**: Organized by test file, suffixed with project name
- **Retries**: 1 on CI (handles server startup timing), 0 locally
- **Workers**: 2 on CI, auto locally

```typescript
// playwright.config.ts
import { defineConfig, devices } from "@playwright/test";

const PORT = 8788;
const BASE_URL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,

  reporter: process.env.CI
    ? [["github"], ["html", { open: "never" }]]
    : [["html", { open: "on-failure" }]],

  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },

  expect: {
    timeout: 10_000,
    toHaveScreenshot: {
      threshold: 0.2,
      maxDiffPixelRatio: 0.005,
      animations: "disabled",
    },
  },

  snapshotPathTemplate:
    "tests/snapshots/{testFileDir}/{testFileName}-snapshots/{arg}-{projectName}{ext}",

  projects: [
    {
      name: "desktop-light",
      use: {
        ...devices["Desktop Chrome"],
        colorScheme: "light",
        viewport: { width: 1280, height: 900 },
      },
    },
    {
      name: "desktop-dark",
      use: {
        ...devices["Desktop Chrome"],
        colorScheme: "dark",
        viewport: { width: 1280, height: 900 },
      },
    },
    {
      name: "mobile-light",
      use: {
        ...devices["Pixel 5"],
        colorScheme: "light",
      },
    },
    {
      name: "mobile-dark",
      use: {
        ...devices["Pixel 5"],
        colorScheme: "dark",
      },
    },
  ],

  webServer: {
    command: `npx wrangler dev --port ${PORT}`,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
    stdout: "pipe",
    stderr: "pipe",
  },
});
```

**1.3 Create `tests/fixtures.ts`** — Dark mode injection

The site uses `class`-based dark mode with `localStorage.theme`. Playwright starts with empty localStorage. The flash-prevention `<script>` in `<head>` reads localStorage before first paint. We must inject the theme value **before** navigation via `addInitScript` so the `<head>` script reads it correctly.

```typescript
// tests/fixtures.ts
import { test as base, expect } from "@playwright/test";

export const test = base.extend({
  page: async ({ page, context }, use, testInfo) => {
    const isDark = testInfo.project.name.includes("dark");

    await context.addInitScript((theme) => {
      localStorage.setItem("theme", theme);
    }, isDark ? "dark" : "light");

    await use(page);
  },
});

export { expect };
```

**1.4 Create `tests/screenshot.css`** — Animation suppression

```css
/* Injected during screenshots to eliminate flicker sources */
* {
  animation-duration: 0s !important;
  animation-delay: 0s !important;
  transition-duration: 0s !important;
  caret-color: transparent !important;
}
```

**1.5 Create `tests/helpers/discover-pages.ts`** — Dynamic page discovery

Reads the built `dist/` directory for all `.html` files. This is the most robust approach — it automatically includes new recipes, category pages, and static pages without maintaining a separate URL list.

```typescript
// tests/helpers/discover-pages.ts
import { readdirSync, statSync } from "fs";
import { join, relative } from "path";

const DIST_DIR = join(process.cwd(), "dist");

// Routes to exclude from testing
const EXCLUDED_PATTERNS = [
  /^\/$/, // Root redirect (302)
  /\/rss\.xml$/, // RSS feeds (not visual)
  /\/llms\.txt$/, // LLM endpoint (not visual)
  /\/_worker\.js/, // Cloudflare worker internals
  /\/_astro\//, // Hashed assets
  /\/pagefind\//, // Pagefind assets
];

function walkDir(dir: string): string[] {
  const results: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walkDir(fullPath));
    } else if (entry.name === "index.html") {
      // Convert dist/en/recipes/cacio-e-pepe/index.html -> /en/recipes/cacio-e-pepe/
      const routePath = "/" + relative(DIST_DIR, dir).replace(/\\/g, "/") + "/";
      results.push(routePath === "//" ? "/" : routePath);
    }
  }
  return results;
}

export function discoverPages(): { path: string; name: string }[] {
  return walkDir(DIST_DIR)
    .filter((route) => !EXCLUDED_PATTERNS.some((p) => p.test(route)))
    .sort()
    .map((route) => ({
      path: route,
      name: route
        .replace(/^\//, "")
        .replace(/\/$/, "")
        .replace(/\//g, "-") || "root",
    }));
}
```

#### Phase 2: Test Specs

**2.1 Create `tests/smoke/page-health.spec.ts`** — Core smoke tests

Runs on ALL 4 projects. For each discovered page: assert HTTP 200, zero console errors, zero JS exceptions.

```typescript
// tests/smoke/page-health.spec.ts
import { test, expect } from "../fixtures";
import { discoverPages } from "../helpers/discover-pages";

const pages = discoverPages();

// Known noise to filter out (third-party scripts, non-critical warnings)
const IGNORED_ERRORS = [
  "favicon", // Browser-generated favicon 404
];

for (const { path, name } of pages) {
  test(`${name} loads without errors`, async ({ page }) => {
    const consoleErrors: string[] = [];
    const pageErrors: Error[] = [];

    page.on("console", (msg) => {
      if (msg.type() === "error") {
        const text = msg.text();
        if (!IGNORED_ERRORS.some((i) => text.includes(i))) {
          consoleErrors.push(text);
        }
      }
    });

    page.on("pageerror", (error) => {
      pageErrors.push(error);
    });

    const response = await page.goto(path);
    await page.waitForLoadState("networkidle");

    // Assert HTTP 200
    expect(response?.status(), `${path} returned ${response?.status()}`).toBe(200);

    // Assert no console errors
    expect(
      consoleErrors,
      `Console errors on ${path}:\n${consoleErrors.join("\n")}`
    ).toHaveLength(0);

    // Assert no uncaught JS exceptions
    expect(
      pageErrors,
      `JS exceptions on ${path}:\n${pageErrors.map((e) => e.message).join("\n")}`
    ).toHaveLength(0);
  });
}
```

**2.2 Create `tests/visual/all-pages.spec.ts`** — Visual regression

Runs on ALL 4 projects. Takes full-page screenshots and compares against baselines.

```typescript
// tests/visual/all-pages.spec.ts
import { test, expect } from "../fixtures";
import { discoverPages } from "../helpers/discover-pages";

const pages = discoverPages();

for (const { path, name } of pages) {
  test(`${name} visual snapshot`, async ({ page }) => {
    await page.goto(path);
    await page.waitForLoadState("networkidle");

    // Wait for web fonts to finish loading
    await page.evaluate(() => document.fonts.ready);

    await expect(page).toHaveScreenshot(`${name}.png`, {
      fullPage: true,
      stylePath: "./tests/screenshot.css",
    });
  });
}
```

#### Phase 3: GitHub Actions Workflow

**3.1 Create `.github/workflows/playwright-pr-check.yml`**

Follows the same patterns as the existing `lighthouse-pr-check.yml`: same Node version, same npm cache strategy, same concurrency model, same PR comment upsert pattern.

```yaml
# .github/workflows/playwright-pr-check.yml
name: Playwright E2E

on:
  pull_request:
    branches: [main]
    types: [opened, synchronize, reopened]
  workflow_dispatch:
    inputs:
      update_snapshots:
        description: "Update baseline screenshots"
        type: boolean
        default: false

concurrency:
  group: playwright-${{ github.event.pull_request.number || github.ref }}
  cancel-in-progress: true

permissions:
  contents: write
  pull-requests: write

jobs:
  e2e:
    runs-on: ubuntu-latest
    timeout-minutes: 20
    steps:
      - uses: actions/checkout@v4
        with:
          ref: ${{ github.head_ref || github.ref }}

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      - run: npm ci

      # Cache Playwright browser binaries
      - name: Get Playwright version
        id: pw-version
        run: |
          VERSION=$(node -e "console.log(require('./package-lock.json').packages['node_modules/@playwright/test'].version)")
          echo "version=$VERSION" >> $GITHUB_OUTPUT

      - name: Cache Playwright browsers
        id: pw-cache
        uses: actions/cache@v4
        with:
          path: ~/.cache/ms-playwright
          key: playwright-${{ runner.os }}-${{ steps.pw-version.outputs.version }}

      - name: Install Playwright (no cache)
        if: steps.pw-cache.outputs.cache-hit != 'true'
        run: npx playwright install chromium --with-deps

      - name: Install Playwright OS deps (cache hit)
        if: steps.pw-cache.outputs.cache-hit == 'true'
        run: npx playwright install-deps chromium

      # Build site (includes Pagefind via postbuild)
      - run: npm run build

      # Run tests — normal mode (fail on mismatch)
      - name: Run Playwright tests
        if: ${{ !inputs.update_snapshots }}
        run: npx playwright test
        env:
          CI: "true"

      # Run tests — update snapshot mode
      - name: Update snapshots
        if: ${{ inputs.update_snapshots }}
        run: npx playwright test --update-snapshots
        env:
          CI: "true"

      # Commit updated snapshots back to branch
      - name: Commit updated snapshots
        if: ${{ inputs.update_snapshots }}
        uses: stefanzweifel/git-auto-commit-action@v5
        with:
          commit_message: "test: update visual regression baselines [skip ci]"
          file_pattern: "tests/snapshots/**/*.png"

      # Upload HTML report and diffs on failure
      - name: Upload Playwright report
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 14

      - name: Upload diff artifacts on failure
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-diffs
          path: test-results/
          retention-days: 7

      # Post PR comment with results summary
      - name: Post PR comment
        if: always() && github.event_name == 'pull_request'
        uses: actions/github-script@v7
        with:
          script: |
            const fs = require('fs');
            const path = require('path');

            let body = '<!-- playwright-e2e-results -->\n';
            body += '## Playwright E2E Results\n\n';

            // Check if test results exist
            const reportPath = 'playwright-report/results.json';
            if (fs.existsSync(reportPath)) {
              const report = JSON.parse(fs.readFileSync(reportPath, 'utf-8'));
              const suites = report.suites || [];
              let passed = 0, failed = 0, skipped = 0;

              function countSpecs(suite) {
                for (const spec of suite.specs || []) {
                  for (const test of spec.tests || []) {
                    if (test.status === 'expected') passed++;
                    else if (test.status === 'unexpected') failed++;
                    else if (test.status === 'skipped') skipped++;
                  }
                }
                for (const child of suite.suites || []) {
                  countSpecs(child);
                }
              }
              suites.forEach(countSpecs);

              const icon = failed > 0 ? '🔴' : '🟢';
              body += `${icon} **${passed} passed**, **${failed} failed**, **${skipped} skipped**\n\n`;

              if (failed > 0) {
                body += '⚠️ Download the `playwright-diffs` artifact to see visual diff images.\n';
              }
            } else {
              body += '⚠️ No test report found.\n';
            }

            // Upsert comment (same pattern as lighthouse-pr-check.yml)
            const { data: comments } = await github.rest.issues.listComments({
              owner: context.repo.owner,
              repo: context.repo.repo,
              issue_number: context.issue.number,
            });
            const existing = comments.find(c =>
              c.body.includes('<!-- playwright-e2e-results -->')
            );

            const params = {
              owner: context.repo.owner,
              repo: context.repo.repo,
              body,
            };

            if (existing) {
              await github.rest.issues.updateComment({ ...params, comment_id: existing.id });
            } else {
              await github.rest.issues.createComment({ ...params, issue_number: context.issue.number });
            }
```

**Note on JSON reporter**: Add `["json", { outputFile: "playwright-report/results.json" }]` to the `reporter` array in `playwright.config.ts` for the PR comment to parse.

#### Phase 4: Baseline Generation

**4.1 Generate initial baselines on Linux (CI)**

Baselines MUST be generated on Linux (Ubuntu) because that's where CI runs. macOS and Linux render fonts differently — baselines generated locally on macOS will fail on CI due to anti-aliasing differences.

**Workflow:**
1. Push the Playwright config + tests (no snapshots yet) to a branch
2. Trigger the workflow manually via `workflow_dispatch` with `update_snapshots: true`
3. The workflow runs tests with `--update-snapshots`, creates all baselines, and commits them back
4. Merge the branch with the committed baselines

**4.2 Ongoing baseline updates**

When a design change intentionally affects visuals:
1. Push the design change to the PR branch
2. Go to Actions > "Playwright E2E" > Run workflow > select the PR branch > check "Update baseline screenshots"
3. The workflow regenerates baselines and commits them to the branch
4. The next CI run uses the new baselines and passes

Or use the npm script locally (but be aware baselines generated on macOS may differ from CI):
```bash
npm run test:update-snapshots
```

**4.3 New recipe pages**

When a new recipe is added:
- `discoverPages()` automatically picks up the new pages from `dist/`
- `toHaveScreenshot()` fails on the first run because no baselines exist for the new pages (this is Playwright's designed behavior)
- Developer triggers `workflow_dispatch` with `update_snapshots: true` on their branch to generate the new baselines
- Alternatively: The developer can run `npm run test:update-snapshots` locally and commit

#### Phase 5: Git Configuration

**5.1 Create `.gitattributes`**

```gitattributes
# Playwright snapshot PNGs — binary to avoid CRLF issues and useless diffs
tests/snapshots/**/*.png binary
tests/snapshots/**/*.png -diff
```

**5.2 Add to `.gitignore`**

```
# Playwright
test-results/
playwright-report/
```

#### Phase 6: Renovate Configuration

**6.1 Install Renovate GitHub App**

1. Go to https://github.com/apps/renovate and install on the `date-my-dish` repository
2. Grant it write access to the repo

**6.2 Create `renovate.json`**

```json
{
  "$schema": "https://docs.renovatebot.com/renovate-schema.json",
  "extends": [
    "config:recommended",
    ":dependencyDashboard",
    ":semanticCommits",
    ":separateMajorReleases",
    ":combinePatchMinorReleases"
  ],
  "timezone": "America/Toronto",
  "schedule": ["before 9am on Monday"],
  "labels": ["dependencies"],
  "prConcurrentLimit": 3,
  "rebaseWhen": "conflicted",
  "packageRules": [
    {
      "description": "Group all patch and minor updates — auto-merge if CI passes",
      "matchUpdateTypes": ["patch", "minor"],
      "groupName": "All non-major dependencies",
      "groupSlug": "all-non-major",
      "automerge": true,
      "automergeType": "pr",
      "automergeStrategy": "squash",
      "minimumReleaseAge": "3 days",
      "labels": ["dependencies", "automerge"]
    },
    {
      "description": "Major version bumps — require manual review",
      "matchUpdateTypes": ["major"],
      "automerge": false,
      "labels": ["dependencies", "major-update"]
    },
    {
      "description": "Astro ecosystem — major needs care (breaking changes common)",
      "matchPackageNames": ["astro", "@astrojs/**"],
      "matchUpdateTypes": ["major"],
      "automerge": false,
      "labels": ["dependencies", "major-update", "astro"]
    },
    {
      "description": "Cloudflare/Wrangler — infrastructure, always manual review",
      "matchPackageNames": ["wrangler", "@cloudflare/**", "@astrojs/cloudflare"],
      "matchUpdateTypes": ["major", "minor"],
      "automerge": false,
      "labels": ["dependencies", "infrastructure"]
    },
    {
      "description": "Lock file maintenance — automerge silently",
      "matchUpdateTypes": ["lockFileMaintenance"],
      "automerge": true,
      "automergeType": "branch"
    },
    {
      "description": "Security patches — apply immediately regardless of schedule",
      "matchCategories": ["security"],
      "schedule": ["at any time"],
      "automerge": true,
      "minimumReleaseAge": "0 days",
      "labels": ["dependencies", "security"]
    }
  ],
  "vulnerabilityAlerts": {
    "labels": ["security"],
    "automerge": true,
    "schedule": ["at any time"]
  },
  "platformAutomerge": true
}
```

**Key decisions:**
- **Monday schedule** (not Sunday) to avoid collision with the weekly SEO audit (`weekly-seo-audit.yml` runs Sunday 3 AM UTC)
- **`minimumReleaseAge: "3 days"`** for patch/minor — avoids auto-merging packages that get yanked
- **`automergeStrategy: "squash"`** — keeps git history clean
- **Wrangler carved out** — infrastructure changes always need manual review
- **Security patches bypass schedule** — applied immediately via `vulnerabilityAlerts`
- **`platformAutomerge: true`** — delegates to GitHub's native automerge (more reliable with branch protection)

**6.3 Configure branch protection (manual step)**

For Renovate auto-merge to work safely, branch protection on `main` must require these status checks:
- `lighthouse` (from `lighthouse-pr-check.yml`)
- `e2e` (from `playwright-pr-check.yml`)

Steps:
1. GitHub repo Settings > Branches > Branch protection rules for `main`
2. Enable "Require status checks to pass before merging"
3. Search and add: `lighthouse`, `e2e`
4. Enable "Require branches to be up to date before merging"

Without this, Renovate auto-merges immediately without waiting for CI.

## Acceptance Criteria

### Functional Requirements

- [x] **`playwright.config.ts`** exists with 4 projects (desktop-light, desktop-dark, mobile-light, mobile-dark)
- [x] **`tests/smoke/page-health.spec.ts`** dynamically discovers all pages and asserts HTTP 200, no console errors, no JS exceptions
- [x] **`tests/visual/all-pages.spec.ts`** takes full-page screenshots for all discovered pages across 4 variants
- [x] **`tests/fixtures.ts`** correctly injects dark/light theme via `addInitScript` before page load
- [x] **`tests/helpers/discover-pages.ts`** reads `dist/` and discovers all HTML pages, excluding non-visual routes (RSS, llms.txt, root redirect)
- [x] **`.github/workflows/playwright-pr-check.yml`** runs on every PR targeting main
- [x] **Workflow `workflow_dispatch`** allows manual baseline updates with auto-commit
- [x] **PR comment** posts a summary of passed/failed/skipped tests (upsert pattern)
- [x] **`renovate.json`** groups patch/minor, separates major, auto-merges safe updates
- [ ] **Branch protection** requires both `lighthouse` and `e2e` status checks (manual step — configure after first CI run)
- [x] **`.gitattributes`** marks snapshot PNGs as binary
- [x] **`.gitignore`** excludes `test-results/` and `playwright-report/`
- [x] **`package.json`** has `test` and `test:update-snapshots` scripts

### Quality Gates

- [x] All smoke tests pass on a clean build of the current `main` branch (34/34 passed)
- [ ] Visual regression baselines are generated on Linux CI (not macOS) — trigger via `workflow_dispatch` after merge
- [x] Dark mode screenshots actually render in dark mode (verify `.dark` class on `<html>`)
- [x] No false failures from Pagefind console noise
- [x] `npm run check` still passes (no TypeScript regressions)
- [ ] Workflow completes in under 15 minutes — verify after first CI run

## Files to Create/Modify

### New Files

| File | Purpose |
|------|---------|
| `playwright.config.ts` | Playwright configuration with 4 projects + webServer |
| `tests/fixtures.ts` | Custom test fixture for dark mode injection |
| `tests/screenshot.css` | Animation suppression for stable screenshots |
| `tests/helpers/discover-pages.ts` | Dynamic page discovery from `dist/` |
| `tests/smoke/page-health.spec.ts` | HTTP 200 + console error + JS exception checks |
| `tests/visual/all-pages.spec.ts` | Full-page visual regression screenshots |
| `.github/workflows/playwright-pr-check.yml` | GitHub Actions workflow |
| `renovate.json` | Renovate configuration |
| `.gitattributes` | Binary treatment for snapshot PNGs |

### Modified Files

| File | Change |
|------|--------|
| `package.json` | Add `@playwright/test` devDep, `test` and `test:update-snapshots` scripts |
| `.gitignore` | Add `test-results/`, `playwright-report/` |

### No Changes

| File | Reason |
|------|--------|
| `.github/workflows/lighthouse-pr-check.yml` | Remains independent — Playwright does not replace Lighthouse |
| `.lighthouserc.cjs` | No changes needed |
| `scripts/generate-lighthouse-urls.cjs` | Lighthouse keeps its own URL generation |

## Dependencies & Prerequisites

- **Playwright**: `@playwright/test` (devDependency) + Chromium browser binary
- **Renovate GitHub App**: Must be installed manually from https://github.com/apps/renovate
- **Branch protection**: Must be configured manually in GitHub Settings after the first successful CI run (need the check names to exist first)
- **`stefanzweifel/git-auto-commit-action@v5`**: Used for auto-committing updated baselines

## Risk Analysis & Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Flaky screenshots from font rendering | Medium | High (blocks PRs) | `maxDiffPixelRatio: 0.005`, generate baselines on Linux CI only, `document.fonts.ready` wait |
| `wrangler dev` slow startup | Low | Medium (timeout) | 60s timeout in Playwright, 1 retry on CI |
| Pagefind console errors | Medium | Medium (false failures) | Filter known Pagefind noise in `IGNORED_ERRORS` |
| Snapshot storage growth | Low (now) | Medium (future) | `.gitattributes binary`, plan for Git LFS at 30+ recipes |
| Renovate auto-merge without CI | High (if misconfigured) | High | Document branch protection setup as manual step |
| macOS vs Linux baseline mismatch | High (if local) | High | Always generate baselines via `workflow_dispatch` on CI |

## Sources & References

### Origin

- **Brainstorm document:** [docs/brainstorms/2026-02-24-pr-guardrail-dependency-updates-brainstorm.md](docs/brainstorms/2026-02-24-pr-guardrail-dependency-updates-brainstorm.md) — Key decisions: Playwright for E2E, Renovate for deps, 4 variants, snapshots in git

### Internal References

- Existing Lighthouse PR gate: `.github/workflows/lighthouse-pr-check.yml`
- Lighthouse config with URL discovery: `.lighthouserc.cjs:22-36`
- Dark mode toggle mechanism: `src/components/DarkModeToggle.astro:28-45`
- Flash prevention script: `src/layouts/BaseLayout.astro:62-64`
- Weekly SEO audit (schedule collision avoidance): `.github/workflows/weekly-seo-audit.yml`

### External References

- [Playwright Visual Comparisons docs](https://playwright.dev/docs/test-snapshots)
- [Playwright GitHub Actions caching](https://playwright.dev/docs/ci#github-actions)
- [Renovate configuration options](https://docs.renovatebot.com/configuration-options/)
- [Renovate automerge key concepts](https://docs.renovatebot.com/key-concepts/automerge/)
