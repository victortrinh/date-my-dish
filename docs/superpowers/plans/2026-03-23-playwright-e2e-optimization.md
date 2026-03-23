# Playwright E2E Optimization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reduce Playwright E2E CI time from 15+ minutes to under 5 minutes for most PRs by testing only affected pages with 2 projects instead of 4.

**Architecture:** A new change detection script (`generate-playwright-pages.cjs`) runs git diff to classify PR changes into 4 tiers (none/changed/sample/full), writes a filtered page list to `.playwright-pages.json`, and the existing `discover-pages.ts` reads that file instead of walking all of `dist/`. The Playwright config uses an env var to switch between 2-project PR mode and 4-project full mode.

**Tech Stack:** Node.js (CJS script), Playwright, GitHub Actions

**Spec:** `docs/superpowers/specs/2026-03-23-playwright-e2e-optimization-design.md`

---

### Task 1: Add `.playwright-pages.json` to `.gitignore`

**Files:**
- Modify: `.gitignore:38-40`

- [ ] **Step 1: Add the entry**

Add `.playwright-pages.json` under the existing `# Playwright` section in `.gitignore`, after `playwright-report/`:

```
.playwright-pages.json
```

- [ ] **Step 2: Commit**

```bash
git add .gitignore
git commit -m "chore: gitignore .playwright-pages.json"
```

---

### Task 2: Create change detection script

**Files:**
- Create: `scripts/generate-playwright-pages.cjs`
- Reference: `scripts/generate-lighthouse-urls.cjs` (mirrors this pattern)

This script determines which pages to test based on git diff. It classifies changes into 4 tiers and outputs a filtered page list.

- [ ] **Step 1: Create the script**

```js
// scripts/generate-playwright-pages.cjs
// Determines which pages Playwright should test based on git diff.
// --base=<ref>  Git ref to diff against (default: origin/main)
//
// Outputs:
//   .playwright-pages.json  - Array of route paths (e.g., ["/en/", "/en/recipes/cacio-e-pepe/"])
//   $GITHUB_OUTPUT           - test_scope=none|changed|sample|full, page_count=N

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const args = process.argv.slice(2);
const base = args.find(a => a.startsWith('--base='))?.split('=')[1] || 'origin/main';

// --- Tier patterns ---

const CONTENT_PATTERN = /^src\/content\/(recipes|articles)\/(en|fr)\/.+\.mdx$/;
const SHARED_PATTERNS = [
  /^src\/components\//,
  /^src\/layouts\//,
  /^src\/pages\//,
  /^src\/i18n\//,
  /^src\/styles\//,
];
const INFRA_PATTERNS = [
  /^package\.json$/,
  /^astro\.config/,
  /^tailwind\.config/,
  /^tsconfig/,
];

// --- Representative sample pages for shared/component changes ---

const SAMPLE_PAGES = [
  '/en/',
  '/fr/',
  '/en/recipes/',
  '/fr/recettes/',
  '/en/articles/',
  '/fr/articles/',
  '/en/recipes/cacio-e-pepe/',
  '/fr/recettes/cacio-e-pepe/',
  '/en/articles/cooking-oils-guide/',
  '/fr/articles/cooking-oils-guide/',
  '/en/recipes/cuisine/italian/',
  '/fr/recettes/cuisine/italien/',
  '/en/about/',
  '/fr/a-propos/',
];

// --- Listing and homepage pages to add when content changes ---

const HOMEPAGE = ['/en/', '/fr/'];
const RECIPE_LISTINGS = ['/en/recipes/', '/fr/recettes/'];
const ARTICLE_LISTINGS = ['/en/articles/', '/fr/articles/'];

// --- Helpers (mirrored from generate-lighthouse-urls.cjs) ---

function contentFileToRoute(filePath) {
  const match = filePath.match(/src\/content\/(recipes|articles)\/(en|fr)\/(.+)\.mdx$/);
  if (!match) return null;
  const [, type, locale, slug] = match;
  if (type === 'recipes') {
    return locale === 'en' ? `/en/recipes/${slug}/` : `/fr/recettes/${slug}/`;
  }
  return `/${locale}/articles/${slug}/`;
}

function getTranslationSlug(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const fmMatch = content.match(/^---\n([\s\S]*?)\n---/);
    if (!fmMatch) return null;
    const slugMatch = fmMatch[1].match(/^translationSlug:\s*["']?([^"'\n]+)["']?/m);
    return slugMatch ? slugMatch[1].trim() : null;
  } catch {
    return null;
  }
}

function getTranslationFilePath(filePath, translationSlug) {
  const match = filePath.match(/src\/content\/(recipes|articles)\/(en|fr)\//);
  if (!match) return null;
  const [, type, locale] = match;
  const otherLocale = locale === 'en' ? 'fr' : 'en';
  return `src/content/${type}/${otherLocale}/${translationSlug}.mdx`;
}

// --- Tier detection ---

function detectScope(changedFiles) {
  let hasContent = false;
  let hasShared = false;
  let hasInfra = false;
  let contentTypes = new Set();

  for (const file of changedFiles) {
    if (INFRA_PATTERNS.some(p => p.test(file))) {
      hasInfra = true;
    }
    if (SHARED_PATTERNS.some(p => p.test(file))) {
      hasShared = true;
    }
    const contentMatch = file.match(CONTENT_PATTERN);
    if (contentMatch) {
      hasContent = true;
      contentTypes.add(contentMatch[1]); // 'recipes' or 'articles'
    }
  }

  // Highest blast radius wins
  if (hasInfra) return { scope: 'full', contentTypes };
  if (hasShared) return { scope: 'sample', contentTypes };
  if (hasContent) return { scope: 'changed', contentTypes };
  return { scope: 'none', contentTypes };
}

// --- Page generation per scope ---

function generateChangedPages(changedFiles, contentTypes) {
  const routes = new Set();

  // Add affected content pages + translation pairs
  const contentFiles = changedFiles.filter(f => CONTENT_PATTERN.test(f));
  for (const file of contentFiles) {
    const route = contentFileToRoute(file);
    if (route) routes.add(route);

    const absPath = path.join(__dirname, '..', file);
    const translationSlug = getTranslationSlug(absPath);
    if (translationSlug) {
      const pairPath = getTranslationFilePath(file, translationSlug);
      if (pairPath) {
        const pairAbsPath = path.join(__dirname, '..', pairPath);
        if (fs.existsSync(pairAbsPath)) {
          const pairRoute = contentFileToRoute(pairPath);
          if (pairRoute) routes.add(pairRoute);
        }
      }
    }
  }

  // Add homepage (merges recent posts from both collections)
  HOMEPAGE.forEach(r => routes.add(r));

  // Add listing pages for affected content types
  if (contentTypes.has('recipes')) {
    RECIPE_LISTINGS.forEach(r => routes.add(r));
  }
  if (contentTypes.has('articles')) {
    ARTICLE_LISTINGS.forEach(r => routes.add(r));
  }

  return [...routes].sort();
}

// --- Main ---

const diff = execSync(`git diff --name-only --diff-filter=ACMR ${base}...HEAD`, {
  encoding: 'utf8',
}).trim();

const changedFiles = diff ? diff.split('\n') : [];
const { scope, contentTypes } = detectScope(changedFiles);

let pages;
switch (scope) {
  case 'none':
    pages = [];
    break;
  case 'changed':
    pages = generateChangedPages(changedFiles, contentTypes);
    break;
  case 'sample':
    pages = SAMPLE_PAGES;
    break;
  case 'full':
    pages = []; // Empty means "use full dist/ discovery" in discover-pages.ts
    break;
}

// Write output file (empty array for 'full' signals "discover all")
const outputPath = path.join(__dirname, '..', '.playwright-pages.json');
if (scope === 'full') {
  // Delete file so discover-pages.ts falls back to full discovery
  try { fs.unlinkSync(outputPath); } catch {}
} else {
  fs.writeFileSync(outputPath, JSON.stringify(pages, null, 2));
}

console.log(`Scope: ${scope} | Pages: ${scope === 'full' ? 'all (dist/ discovery)' : pages.length}`);
if (pages.length > 0) {
  pages.forEach(p => console.log(`  ${p}`));
}

// Set GitHub Actions outputs
if (process.env.GITHUB_OUTPUT) {
  fs.appendFileSync(process.env.GITHUB_OUTPUT, `test_scope=${scope}\n`);
  fs.appendFileSync(process.env.GITHUB_OUTPUT, `page_count=${scope === 'full' ? 'all' : pages.length}\n`);
}
```

- [ ] **Step 2: Verify the script runs locally**

```bash
node scripts/generate-playwright-pages.cjs --base=origin/main
```

Expected: prints `Scope: changed | Pages: N` (or `none` if only docs changed on this branch). Check that `.playwright-pages.json` was created with the expected routes.

- [ ] **Step 3: Commit**

```bash
git add scripts/generate-playwright-pages.cjs
git commit -m "feat: add Playwright change detection script"
```

---

### Task 3: Update `discover-pages.ts` to read `.playwright-pages.json`

**Files:**
- Modify: `tests/helpers/discover-pages.ts`

- [ ] **Step 1: Update the module**

Replace the entire file with:

```ts
import { existsSync, readFileSync, readdirSync } from "fs";
import { join, relative } from "path";

const DIST_DIR = join(process.cwd(), "dist");
const PAGES_JSON = join(process.cwd(), ".playwright-pages.json");

// Routes to exclude from testing
const EXCLUDED_PATTERNS = [
  /^\/$/, // Root redirect (302)
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
      const routePath =
        "/" + relative(DIST_DIR, dir).replace(/\\/g, "/") + "/";
      results.push(routePath === "//" ? "/" : routePath);
    }
  }
  return results;
}

function toPageEntry(route: string): { path: string; name: string } {
  return {
    path: route,
    name:
      route
        .replace(/^\//, "")
        .replace(/\/$/, "")
        .replace(/\//g, "-") || "root",
  };
}

export function discoverPages(): { path: string; name: string }[] {
  // If .playwright-pages.json exists, use it (written by generate-playwright-pages.cjs)
  if (existsSync(PAGES_JSON)) {
    const pages: string[] = JSON.parse(readFileSync(PAGES_JSON, "utf8"));
    console.log(
      `[discover-pages] Using .playwright-pages.json (${pages.length} pages)`,
    );
    return pages.sort().map(toPageEntry);
  }

  // Fallback: discover all pages from dist/
  console.log("[discover-pages] Full discovery from dist/");
  return walkDir(DIST_DIR)
    .filter((route) => !EXCLUDED_PATTERNS.some((p) => p.test(route)))
    .sort()
    .map(toPageEntry);
}
```

- [ ] **Step 2: Verify tests still discover pages locally**

```bash
npx playwright test --list
```

Expected: lists all tests (since `.playwright-pages.json` shouldn't exist locally unless you ran the script). If it does exist from Task 2, delete it first: `rm -f .playwright-pages.json`

- [ ] **Step 3: Commit**

```bash
git add tests/helpers/discover-pages.ts
git commit -m "feat: discover-pages reads .playwright-pages.json when present"
```

---

### Task 4: Replace `networkidle` with `domcontentloaded`

**Files:**
- Modify: `tests/smoke/page-health.spec.ts:43`

- [ ] **Step 1: Change the wait strategy**

In `tests/smoke/page-health.spec.ts`, replace line 43:

```ts
// Before:
await page.waitForLoadState("networkidle");

// After:
await page.waitForLoadState("domcontentloaded");
```

- [ ] **Step 2: Commit**

```bash
git add tests/smoke/page-health.spec.ts
git commit -m "perf: use domcontentloaded instead of networkidle in E2E tests"
```

---

### Task 5: Add env-var-driven project selection to Playwright config

**Files:**
- Modify: `playwright.config.ts`

- [ ] **Step 1: Update the config**

Replace the entire file with:

```ts
import { defineConfig, devices } from "@playwright/test";

const PORT = 8788;
const BASE_URL = `http://localhost:${PORT}`;

const allProjects = [
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
];

// PR mode: desktop-light + mobile-dark (covers both viewport and theme dimensions)
const prProjects = allProjects.filter(
  (p) => p.name === "desktop-light" || p.name === "mobile-dark",
);

const scope = process.env.PLAYWRIGHT_SCOPE;
const projects = scope === "pr" ? prProjects : allProjects;

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,

  reporter: process.env.CI
    ? [
        ["github"],
        ["html", { open: "never" }],
        ["json", { outputFile: "playwright-report/results.json" }],
      ]
    : [["html", { open: "on-failure" }]],

  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },

  expect: {
    timeout: 10_000,
  },

  projects,

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

- [ ] **Step 2: Verify config loads**

```bash
npx playwright test --list
```

Expected: lists tests across all 4 projects (since `PLAYWRIGHT_SCOPE` is unset).

```bash
PLAYWRIGHT_SCOPE=pr npx playwright test --list
```

Expected: lists tests across only 2 projects (desktop-light, mobile-dark).

- [ ] **Step 3: Commit**

```bash
git add playwright.config.ts
git commit -m "feat: env-var-driven project selection for PR vs full suite"
```

---

### Task 6: Update `playwright-pr-check.yml`

**Files:**
- Modify: `.github/workflows/playwright-pr-check.yml`

- [ ] **Step 1: Replace the workflow**

Replace the entire file with:

```yaml
name: Playwright E2E

on:
  pull_request:
    branches: [main]
    types: [opened, synchronize, reopened]

concurrency:
  group: playwright-${{ github.event.pull_request.number || github.ref }}
  cancel-in-progress: true

permissions:
  contents: read
  pull-requests: write

env:
  FORCE_JAVASCRIPT_ACTIONS_TO_NODE24: true

jobs:
  e2e:
    runs-on: ubuntu-latest
    timeout-minutes: 15
    steps:
      - uses: actions/checkout@v6
        with:
          fetch-depth: 0

      - name: Clean stale test artifacts
        run: rm -f .playwright-pages.json

      - name: Detect test scope
        id: scope
        run: node scripts/generate-playwright-pages.cjs --base=origin/${{ github.event.pull_request.base.ref }}

      - name: Skip message
        if: steps.scope.outputs.test_scope == 'none'
        run: echo "No runtime changes detected — skipping Playwright tests"

      - uses: actions/setup-node@v4
        if: steps.scope.outputs.test_scope != 'none'
        with:
          node-version: 20
          cache: npm

      - run: npm ci
        if: steps.scope.outputs.test_scope != 'none'

      # Cache Playwright browser binaries
      - name: Get Playwright version
        if: steps.scope.outputs.test_scope != 'none'
        id: pw-version
        run: |
          VERSION=$(node -e "console.log(require('./package-lock.json').packages['node_modules/@playwright/test'].version)")
          echo "version=$VERSION" >> $GITHUB_OUTPUT

      - name: Cache Playwright browsers
        if: steps.scope.outputs.test_scope != 'none'
        id: pw-cache
        uses: actions/cache@v5
        with:
          path: ~/.cache/ms-playwright
          key: playwright-${{ runner.os }}-${{ steps.pw-version.outputs.version }}

      - name: Install Playwright (no cache)
        if: steps.scope.outputs.test_scope != 'none' && steps.pw-cache.outputs.cache-hit != 'true'
        run: npx playwright install chromium --with-deps

      - name: Install Playwright OS deps (cache hit)
        if: steps.scope.outputs.test_scope != 'none' && steps.pw-cache.outputs.cache-hit == 'true'
        run: npx playwright install-deps chromium

      # Build site (includes Pagefind via postbuild)
      - run: npm run build
        if: steps.scope.outputs.test_scope != 'none'

      - name: Run Playwright tests
        if: steps.scope.outputs.test_scope != 'none'
        run: npx playwright test
        env:
          CI: "true"
          PLAYWRIGHT_SCOPE: pr

      # Upload HTML report on failure
      - name: Upload Playwright report
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 14

      # Post PR comment with results summary
      - name: Post PR comment
        if: always() && github.event_name == 'pull_request'
        uses: actions/github-script@v7
        with:
          script: |
            const fs = require('fs');
            const scope = '${{ steps.scope.outputs.test_scope }}';
            const pageCount = '${{ steps.scope.outputs.page_count }}';

            let body = '<!-- playwright-e2e-results -->\n';
            body += '## Playwright E2E Results\n\n';

            if (scope === 'none') {
              body += '⏭️ **Skipped** — no runtime changes detected\n';
            } else {
              const scopeLabel = scope === 'full' ? 'full (all pages, 2 projects)'
                : scope === 'sample' ? `sample (${pageCount} pages, 2 projects)`
                : `changed (${pageCount} pages, 2 projects)`;
              body += `**Scope:** ${scopeLabel}\n\n`;

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
                body += `${icon} **${passed} passed**, **${failed} failed**, **${skipped} skipped**\n`;
              } else {
                body += 'No test report found.\n';
              }
            }

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

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/playwright-pr-check.yml
git commit -m "feat: smart change detection in Playwright PR workflow"
```

---

### Task 7: Create weekly full-suite workflow

**Files:**
- Create: `.github/workflows/playwright-weekly.yml`

- [ ] **Step 1: Create the workflow**

```yaml
name: Playwright Weekly Full Suite

on:
  schedule:
    # Sunday at 4 AM UTC (aligned with weekly SEO audit)
    - cron: '0 4 * * 0'
  workflow_dispatch: # Allow manual trigger

permissions:
  contents: read
  issues: write

env:
  FORCE_JAVASCRIPT_ACTIONS_TO_NODE24: true

jobs:
  full-suite:
    runs-on: ubuntu-latest
    timeout-minutes: 25
    steps:
      - uses: actions/checkout@v6

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      - run: npm ci

      - name: Get Playwright version
        id: pw-version
        run: |
          VERSION=$(node -e "console.log(require('./package-lock.json').packages['node_modules/@playwright/test'].version)")
          echo "version=$VERSION" >> $GITHUB_OUTPUT

      - name: Cache Playwright browsers
        id: pw-cache
        uses: actions/cache@v5
        with:
          path: ~/.cache/ms-playwright
          key: playwright-${{ runner.os }}-${{ steps.pw-version.outputs.version }}

      - name: Install Playwright (no cache)
        if: steps.pw-cache.outputs.cache-hit != 'true'
        run: npx playwright install chromium --with-deps

      - name: Install Playwright OS deps (cache hit)
        if: steps.pw-cache.outputs.cache-hit == 'true'
        run: npx playwright install-deps chromium

      - run: npm run build

      - name: Run Playwright full suite
        run: npx playwright test
        env:
          CI: "true"

      - name: Upload report
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-weekly-report
          path: playwright-report/
          retention-days: 30

      - name: Create issue on failure
        if: failure()
        uses: actions/github-script@v7
        with:
          script: |
            const title = `Playwright weekly full suite failed (${new Date().toISOString().split('T')[0]})`;
            const body = [
              '## Playwright Weekly Full Suite Failed',
              '',
              `**Run:** ${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`,
              '',
              'The weekly full E2E suite detected failures. Check the report artifact for details.',
            ].join('\n');

            await github.rest.issues.create({
              owner: context.repo.owner,
              repo: context.repo.repo,
              title,
              body,
              labels: ['bug', 'e2e'],
            });
```

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/playwright-weekly.yml
git commit -m "feat: add weekly Playwright full suite workflow"
```

---

### Task 8: Verify end-to-end locally

- [ ] **Step 1: Clean up any stale test artifacts**

```bash
rm -f .playwright-pages.json
```

- [ ] **Step 2: Build the site**

```bash
npm run build
```

- [ ] **Step 3: Test full discovery (no JSON file)**

```bash
npx playwright test --list 2>&1 | head -20
```

Expected: lists tests for all 4 projects across all pages.

- [ ] **Step 4: Test PR mode with sample pages**

```bash
node scripts/generate-playwright-pages.cjs --base=origin/main
cat .playwright-pages.json
PLAYWRIGHT_SCOPE=pr npx playwright test --list 2>&1 | head -20
```

Expected: the JSON file contains only the pages affected by this branch. Test list shows only 2 projects (desktop-light, mobile-dark) for those pages.

- [ ] **Step 5: Clean up**

```bash
rm -f .playwright-pages.json
```
