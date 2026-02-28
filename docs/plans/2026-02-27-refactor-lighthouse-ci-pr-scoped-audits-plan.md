---
title: "refactor: Scope Lighthouse PR checks to changed content pages only"
type: refactor
status: completed
date: 2026-02-27
origin: docs/brainstorms/2026-02-27-lighthouse-ci-optimization-brainstorm.md
---

# refactor: Scope Lighthouse PR checks to changed content pages only

## Overview

The Lighthouse CI PR check currently audits **26+ URLs on every PR** regardless of what changed — 8 static pages + all EN/FR recipes (no articles). This is slow, wasteful, and gets worse with every new recipe/article.

Refactor the pipeline so PR checks only audit pages directly affected by the PR (changed content files + their translation pairs). The existing weekly full-site audit continues to catch regressions site-wide.

## Problem Statement

1. **Every PR pays the full cost** — even a README change runs Lighthouse against 26 URLs
2. **Articles are missing** — `.lighthouserc.cjs` was never updated when articles were added
3. **Duplicated URL logic** — `.lighthouserc.cjs` (inline discovery) and `generate-lighthouse-urls.cjs` (script) diverged
4. **Linear scaling** — each new recipe adds 2 URLs to every PR check

## Proposed Solution

Refactor `scripts/generate-lighthouse-urls.cjs` into a dual-mode script:
- `--mode=all` — generates all URLs (weekly audit, unchanged behavior)
- `--mode=changed` — generates only URLs for content changed in the PR + translation pairs

Both `.lighthouserc.cjs` and `.lighthouserc-full.cjs` read from the generated JSON file. The PR workflow adds a `paths:` filter and a URL generation step, skipping Lighthouse when no content pages are affected.

(see brainstorm: `docs/brainstorms/2026-02-27-lighthouse-ci-optimization-brainstorm.md`)

## Acceptance Criteria

- [x] PR Lighthouse only triggers when files in `src/content/recipes/**` or `src/content/articles/**` change
- [x] Changed content files are detected via git diff against base branch
- [x] Translation pairs are resolved via `translationSlug` frontmatter and included in audit
- [x] URLs are deduplicated when both sides of a pair are changed
- [x] Deleted files are skipped gracefully (no crash, no 404 URLs)
- [x] Missing translation pair files produce a warning, not a crash
- [x] `.lighthouserc.cjs` reads from generated JSON (no more inline URL discovery)
- [x] `--mode=all` produces identical output to the current `generate-lighthouse-urls.cjs`
- [x] Lighthouse job is skipped (with no PR comment) when zero URLs are generated
- [x] Weekly audit workflow is unaffected
- [x] Auto-publish recipe/article PRs trigger the scoped Lighthouse check correctly

## MVP

### 1. `scripts/generate-lighthouse-urls.cjs`

Refactor to support dual modes. The `--mode=changed` path:
1. Runs `git diff --name-only --diff-filter=ACMR origin/main...HEAD` to find changed/added/modified/renamed content files
2. Filters to `src/content/recipes/**/*.mdx` and `src/content/articles/**/*.mdx`
3. For each file: parses frontmatter to extract `translationSlug`, resolves the paired file in the opposite locale
4. Maps all files to URLs using the correct locale-specific patterns
5. Deduplicates via `Set`
6. Writes to `.lighthouse-urls.json`
7. Outputs `url_count` for the workflow to consume

```js
// scripts/generate-lighthouse-urls.cjs
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const BASE = 'http://localhost:8788';
const args = process.argv.slice(2);
const mode = args.find(a => a.startsWith('--mode='))?.split('=')[1] || 'all';
const base = args.find(a => a.startsWith('--base='))?.split('=')[1] || 'origin/main';

// URL mapping: file path -> audit URL
function fileToUrl(filePath) {
  // src/content/recipes/en/slug.mdx -> /en/recipes/slug/
  // src/content/recipes/fr/slug.mdx -> /fr/recettes/slug/
  // src/content/articles/en/slug.mdx -> /en/articles/slug/
  // src/content/articles/fr/slug.mdx -> /fr/articles/slug/
  const match = filePath.match(/src\/content\/(recipes|articles)\/(en|fr)\/(.+)\.mdx$/);
  if (!match) return null;
  const [, type, locale, slug] = match;
  if (type === 'recipes') {
    return locale === 'en'
      ? `${BASE}/en/recipes/${slug}/`
      : `${BASE}/fr/recettes/${slug}/`;
  }
  return `${BASE}/${locale}/articles/${slug}/`;
}

// Parse translationSlug from MDX frontmatter
function getTranslationSlug(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const fmMatch = content.match(/^---\n([\s\S]*?)\n---/);
    if (!fmMatch) return null;
    const slugMatch = fmMatch[1].match(/^translationSlug:\s*["']?([^"'\n]+)["']?/m);
    return slugMatch ? slugMatch[1].trim() : null;
  } catch {
    return null; // File may not exist (deleted in PR)
  }
}

// Resolve translation pair file path
function getTranslationPath(filePath, translationSlug) {
  const match = filePath.match(/src\/content\/(recipes|articles)\/(en|fr)\//);
  if (!match) return null;
  const [, type, locale] = match;
  const otherLocale = locale === 'en' ? 'fr' : 'en';
  return `src/content/${type}/${otherLocale}/${translationSlug}.mdx`;
}

function generateChangedUrls() {
  // Get changed content files from git diff
  const diff = execSync(`git diff --name-only --diff-filter=ACMR ${base}...HEAD`, {
    encoding: 'utf8',
  }).trim();

  if (!diff) return [];

  const contentFiles = diff
    .split('\n')
    .filter(f => /^src\/content\/(recipes|articles)\/(en|fr)\/.+\.mdx$/.test(f));

  if (contentFiles.length === 0) return [];

  const urls = new Set();

  for (const file of contentFiles) {
    // Add the changed file's URL
    const url = fileToUrl(file);
    if (url) urls.add(url);

    // Resolve and add translation pair
    const absPath = path.join(__dirname, '..', file);
    const translationSlug = getTranslationSlug(absPath);
    if (translationSlug) {
      const pairPath = getTranslationPath(file, translationSlug);
      if (pairPath) {
        const pairAbsPath = path.join(__dirname, '..', pairPath);
        if (fs.existsSync(pairAbsPath)) {
          const pairUrl = fileToUrl(pairPath);
          if (pairUrl) urls.add(pairUrl);
        } else {
          console.warn(`Warning: Translation pair not found: ${pairPath}`);
        }
      }
    }
  }

  return [...urls];
}

function generateAllUrls() {
  // Static pages
  const staticUrls = [
    `${BASE}/en/`, `${BASE}/fr/`,
    `${BASE}/en/recipes/`, `${BASE}/fr/recettes/`,
    `${BASE}/en/articles/`, `${BASE}/fr/articles/`,
    `${BASE}/en/about/`, `${BASE}/fr/a-propos/`,
    `${BASE}/en/contact/`, `${BASE}/fr/contact/`,
  ];

  // Discover all content URLs
  const contentDirs = [
    { dir: 'src/content/recipes/en', prefix: '/en/recipes/' },
    { dir: 'src/content/recipes/fr', prefix: '/fr/recettes/' },
    { dir: 'src/content/articles/en', prefix: '/en/articles/' },
    { dir: 'src/content/articles/fr', prefix: '/fr/articles/' },
  ];

  const contentUrls = contentDirs.flatMap(({ dir, prefix }) => {
    const fullDir = path.join(__dirname, '..', dir);
    if (!fs.existsSync(fullDir)) return [];
    return fs.readdirSync(fullDir)
      .filter(f => f.endsWith('.mdx'))
      .map(f => `${BASE}${prefix}${f.replace('.mdx', '')}/`);
  });

  return [...staticUrls, ...contentUrls];
}

// Main
const urls = mode === 'changed' ? generateChangedUrls() : generateAllUrls();
const outputPath = path.join(__dirname, '..', '.lighthouse-urls.json');
fs.writeFileSync(outputPath, JSON.stringify(urls, null, 2));

console.log(`Mode: ${mode} | Generated ${urls.length} URLs:`);
urls.forEach(url => console.log(`  ${url}`));

// Output for GitHub Actions
if (process.env.GITHUB_OUTPUT) {
  fs.appendFileSync(process.env.GITHUB_OUTPUT, `url_count=${urls.length}\n`);
}
```

### 2. `.lighthouserc.cjs`

Replace inline URL discovery with JSON file reading (matching `.lighthouserc-full.cjs` pattern).

```js
// .lighthouserc.cjs
const fs = require('fs');
const path = require('path');

let urls;
try {
  urls = JSON.parse(
    fs.readFileSync(path.join(__dirname, '.lighthouse-urls.json'), 'utf8')
  );
} catch {
  urls = ['http://localhost:8788/en/', 'http://localhost:8788/fr/'];
}

module.exports = {
  ci: {
    collect: {
      startServerCommand: 'npx wrangler dev --port 8788',
      startServerReadyPattern: 'Ready on',
      startServerReadyTimeout: 30000,
      url: urls,
      numberOfRuns: 1,
      settings: {
        chromeFlags: '--no-sandbox --disable-dev-shm-usage',
        preset: 'desktop',
      },
    },
    assert: {
      assertions: {
        'categories:seo': ['error', { minScore: 0.9 }],
        'categories:accessibility': ['error', { minScore: 0.9 }],
        'categories:performance': ['warn', { minScore: 0.9, aggregationMethod: 'median' }],
        'categories:best-practices': ['warn', { minScore: 0.9 }],
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.1, aggregationMethod: 'median' }],
      },
    },
    upload: {
      target: 'temporary-public-storage',
    },
  },
};
```

### 3. `.lighthouserc-full.cjs`

Update to read from the shared `.lighthouse-urls.json` (instead of `.lighthouserc-full-urls.json`).

```js
// Change line 11 from:
fs.readFileSync(path.join(__dirname, '.lighthouserc-full-urls.json'), 'utf8')
// To:
fs.readFileSync(path.join(__dirname, '.lighthouse-urls.json'), 'utf8')
```

### 4. `.github/workflows/lighthouse-pr-check.yml`

Add `paths:` filter, URL generation step, and conditional Lighthouse execution.

```yaml
name: Lighthouse CI

on:
  pull_request:
    branches: [main]
    types: [opened, synchronize, reopened]
    paths:
      - "src/content/recipes/**"
      - "src/content/articles/**"

concurrency:
  group: lighthouse-${{ github.event.pull_request.number }}
  cancel-in-progress: true

permissions:
  contents: read
  pull-requests: write

jobs:
  lighthouse:
    runs-on: ubuntu-latest
    timeout-minutes: 15
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      - run: npm ci

      - run: npm run build

      - name: Generate changed page URLs
        id: urls
        run: node scripts/generate-lighthouse-urls.cjs --mode=changed --base=origin/${{ github.event.pull_request.base.ref }}

      - name: Run Lighthouse CI
        if: steps.urls.outputs.url_count > 0
        id: lhci
        uses: treosh/lighthouse-ci-action@v12
        with:
          configPath: ./.lighthouserc.cjs
          uploadArtifacts: true
          temporaryPublicStorage: true

      - name: Post PR comment with scores
        if: always() && steps.lhci.outcome == 'success'
        uses: actions/github-script@v7
        with:
          script: |
            const manifest = JSON.parse('${{ steps.lhci.outputs.manifest }}');
            const links = JSON.parse('${{ steps.lhci.outputs.links }}');

            let body = '<!-- lighthouse-ci-results -->\n';
            body += '## Lighthouse CI Results\n\n';
            body += '| URL | Perf | A11y | Best Practices | SEO | Report |\n';
            body += '|-----|------|------|----------------|-----|--------|\n';

            for (const entry of manifest) {
              const path = new URL(entry.url).pathname;
              const s = {
                perf: Math.round(entry.summary.performance * 100),
                a11y: Math.round(entry.summary.accessibility * 100),
                bp: Math.round(entry.summary['best-practices'] * 100),
                seo: Math.round(entry.summary.seo * 100),
              };
              const icon = (v) => v >= 90 ? '🟢' : v >= 50 ? '🟠' : '🔴';
              const link = links[entry.url] ? `[View](${links[entry.url]})` : '--';
              body += `| \`${path}\` | ${icon(s.perf)} ${s.perf} | ${icon(s.a11y)} ${s.a11y} | ${icon(s.bp)} ${s.bp} | ${icon(s.seo)} ${s.seo} | ${link} |\n`;
            }

            const { data: comments } = await github.rest.issues.listComments({
              owner: context.repo.owner,
              repo: context.repo.repo,
              issue_number: context.issue.number,
            });
            const existing = comments.find(c =>
              c.body.includes('<!-- lighthouse-ci-results -->')
            );

            const params = {
              owner: context.repo.owner,
              repo: context.repo.repo,
              body,
            };

            if (existing) {
              await github.rest.issues.updateComment({
                ...params,
                comment_id: existing.id,
              });
            } else {
              await github.rest.issues.createComment({
                ...params,
                issue_number: context.issue.number,
              });
            }
```

### 5. `.github/workflows/weekly-seo-audit.yml`

Update the URL generation step to use the new mode flag and output filename.

```yaml
      # Change:
      - name: Generate URL list
        id: urls
        run: node scripts/generate-lighthouse-urls.cjs
      # To:
      - name: Generate URL list
        id: urls
        run: node scripts/generate-lighthouse-urls.cjs --mode=all
```

### 6. Cleanup

- Delete `.lighthouserc-full-urls.json` from `.gitignore` references (replaced by `.lighthouse-urls.json`)
- Add `.lighthouse-urls.json` to `.gitignore` if not already present
- Verify `.lighthouserc-full-urls.json` is cleaned up

## Edge Cases Handled

| Scenario | Behavior |
|----------|----------|
| Both EN + FR of pair changed | Deduplicated — same 2 URLs, not 4 |
| Deleted content files | Skipped — can't read frontmatter, no URL to audit |
| Missing translation pair file | Warning logged, only changed file audited |
| Renamed files | `ACMR` diff filter catches renames as additions |
| No content files changed | `paths:` filter prevents workflow from running |
| Content changed but all deletions | URL count = 0, Lighthouse step skipped |
| Auto-publish PR (bot-created) | Works — `paths:` filter matches, content detected |
| Non-content PR (components/CSS) | Workflow doesn't trigger — caught by weekly audit |

## Sources

- **Origin brainstorm:** [docs/brainstorms/2026-02-27-lighthouse-ci-optimization-brainstorm.md](docs/brainstorms/2026-02-27-lighthouse-ci-optimization-brainstorm.md) — key decisions: content-only PR scope, changed + translation pairs, Node script approach
- Existing pattern: `.github/workflows/social-post-on-deploy.yml` git diff content detection
- Current PR config: `.lighthouserc.cjs` (inline URL discovery, missing articles)
- Current URL generator: `scripts/generate-lighthouse-urls.cjs` (all-mode only)
- Weekly audit: `.github/workflows/weekly-seo-audit.yml` (unchanged)
