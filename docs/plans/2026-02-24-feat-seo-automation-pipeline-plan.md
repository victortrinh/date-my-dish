---
title: "Automated SEO Pipeline with Lighthouse CI and Claude Code"
type: feat
status: completed
date: 2026-02-24
origin: docs/brainstorms/2026-02-24-seo-automation-pipeline-brainstorm.md
---

# Automated SEO Pipeline with Lighthouse CI and Claude Code

## Overview

Add a two-pronged GitHub Actions pipeline that continuously monitors and improves SEO quality across every page of Date My Dish. The project currently has **zero CI/CD automation** — no GitHub Actions, no tests, no automated checks. This is the first CI infrastructure.

**Workflow 1 — PR Gate**: Lighthouse CI runs on every PR to `main`, asserts minimum scores, posts a results table as a PR comment, and blocks merge if SEO or Accessibility drops below 90.

**Workflow 2 — Weekly Audit**: Cron-scheduled full-site Lighthouse scan + Claude Code CLI analysis. Claude reads Lighthouse results, validates JSON-LD, checks content quality, makes auto-fixes, and creates a PR.

(see brainstorm: `docs/brainstorms/2026-02-24-seo-automation-pipeline-brainstorm.md`)

## Problem Statement / Motivation

1. **No automated quality gates** — SEO regressions can ship to production unchecked. The only validation is manual `astro check` and Claude Code slash commands (`/seo-audit`, `/bulk-audit`).
2. **Manual audit burden** — Running `/bulk-audit` on all recipes takes significant time and must be remembered.
3. **No regression detection** — There is no way to know if a PR degrades Lighthouse scores, breaks JSON-LD, or worsens accessibility until it's live.
4. **Content quality drift** — Meta descriptions, alt text, internal links, and heading structure can degrade over time with no automated enforcement.

## Proposed Solution

### Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   GitHub Actions                         │
│                                                         │
│  ┌─────────────────────┐  ┌──────────────────────────┐  │
│  │  PR Gate Workflow    │  │  Weekly Audit Workflow    │  │
│  │  (on pull_request)   │  │  (cron: Sun 3AM UTC)     │  │
│  │                      │  │                           │  │
│  │  1. npm run build    │  │  1. npm run build         │  │
│  │  2. wrangler dev     │  │  2. wrangler dev          │  │
│  │  3. Lighthouse CI    │  │  3. Lighthouse CI (all)   │  │
│  │     (~8 URLs)        │  │  4. Claude Code CLI       │  │
│  │  4. Assert scores    │  │     - Analyze results     │  │
│  │  5. PR comment       │  │     - Fix issues          │  │
│  │                      │  │     - Create PR           │  │
│  └─────────────────────┘  └──────────────────────────┘  │
│                                                         │
│  Secrets: ANTHROPIC_API_KEY                              │
└─────────────────────────────────────────────────────────┘
```

### Implementation Phases

#### Phase 1: Foundation — PR Gate with Lighthouse CI

**Goal**: Every PR to `main` gets Lighthouse scores reported and SEO/A11y assertions enforced.

**Deliverables:**

- [x] Create `.github/workflows/lighthouse-pr-check.yml`
- [x] Create `.lighthouserc.cjs` with representative URLs and assertion thresholds
- [x] Install `@lhci/cli` as a dev dependency
- [x] Add PR comment with scores table and report links
- [ ] Test with a real PR

**`.github/workflows/lighthouse-pr-check.yml`**

```yaml
name: Lighthouse CI

on:
  pull_request:
    branches: [main]
    types: [opened, synchronize, reopened]

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

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      - run: npm ci

      - run: npm run build

      - id: lhci
        uses: treosh/lighthouse-ci-action@v12
        with:
          configPath: ./.lighthouserc.cjs
          uploadArtifacts: true
          temporaryPublicStorage: true

      - name: Post PR comment with scores
        if: always() && github.event_name == 'pull_request'
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

            // Update existing comment or create new
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

**`.lighthouserc.cjs`**

```javascript
// .lighthouserc.cjs
// Lighthouse CI configuration for Date My Dish
// Must be .cjs because package.json has "type": "module"

const BASE = 'http://localhost:8788';

// Representative subset: 1 of each page type, both locales
const urls = [
  `${BASE}/en/`,
  `${BASE}/fr/`,
  `${BASE}/en/recipes/cacio-e-pepe/`,
  `${BASE}/fr/recettes/cacio-e-pepe/`,
  `${BASE}/en/recipes/`,
  `${BASE}/fr/recettes/`,
  `${BASE}/en/about/`,
  `${BASE}/fr/contact/`,
];

module.exports = {
  ci: {
    collect: {
      startServerCommand: 'npx wrangler dev --port 8788',
      startServerReadyPattern: 'Ready on',
      startServerReadyTimeout: 30000,
      url: urls,
      numberOfRuns: 3,
      settings: {
        chromeFlags: '--no-sandbox --disable-dev-shm-usage',
        preset: 'desktop',
      },
    },
    assert: {
      preset: 'lighthouse:recommended',
      assertions: {
        // Block on deterministic categories
        'categories:seo': ['error', { minScore: 0.9 }],
        'categories:accessibility': ['error', { minScore: 0.9 }],

        // Warn on flaky categories
        'categories:performance': ['warn', { minScore: 0.9, aggregationMethod: 'median' }],
        'categories:best-practices': ['warn', { minScore: 0.9 }],

        // Disable localhost-irrelevant audits
        'is-crawlable': 'off',
        'uses-long-cache-ttl': 'off',
        'redirects-http': 'off',
        'csp-xss': 'off',

        // Core Web Vitals
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.1, aggregationMethod: 'median' }],
      },
    },
    upload: {
      target: 'temporary-public-storage',
    },
  },
};
```

**Key decisions:**
- `.cjs` extension required because `package.json` has `"type": "module"` (see brainstorm)
- `treosh/lighthouse-ci-action@v12` handles Chrome installation
- `wrangler dev` serves the built site (Cloudflare adapter produces SSR output, not static HTML)
- `numberOfRuns: 3` with median aggregation for score stability
- SEO/A11y at `error` level (blocks merge), Performance/Best Practices at `warn` (informational)
- PR comment uses HTML marker `<!-- lighthouse-ci-results -->` for update-in-place
- `concurrency` group prevents parallel runs fighting over ports
- Draft PRs excluded via `types: [opened, synchronize, reopened]`

#### Phase 2: Weekly Full Audit with Claude Code CLI

**Goal**: Every Sunday, audit all pages and create an auto-fix PR if issues are found.

**Deliverables:**

- [x] Create `.github/workflows/weekly-seo-audit.yml`
- [x] Create `scripts/generate-lighthouse-urls.cjs` for dynamic URL discovery
- [x] Create `.lighthouserc-full.cjs` for the all-pages config
- [ ] Add `ANTHROPIC_API_KEY` to GitHub repository secrets
- [ ] Test with `workflow_dispatch` trigger

**`.github/workflows/weekly-seo-audit.yml`**

```yaml
name: Weekly SEO Audit

on:
  schedule:
    - cron: '0 3 * * 0' # Sunday 3 AM UTC
  workflow_dispatch: # Manual trigger

concurrency:
  group: weekly-seo-audit
  cancel-in-progress: false

permissions:
  contents: write
  pull-requests: write
  issues: write

jobs:
  audit:
    runs-on: ubuntu-latest
    timeout-minutes: 45
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 1

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      - run: npm ci

      - run: npm run build

      # Generate dynamic URL list from content directory
      - name: Generate URL list
        id: urls
        run: node scripts/generate-lighthouse-urls.cjs

      # Run Lighthouse CI on all pages (1 run per URL for speed)
      - name: Run Lighthouse CI
        id: lhci
        uses: treosh/lighthouse-ci-action@v12
        with:
          configPath: ./.lighthouserc-full.cjs
          uploadArtifacts: true
          temporaryPublicStorage: true

      # Save Lighthouse results for Claude
      - name: Save audit results
        if: always()
        run: |
          echo '${{ steps.lhci.outputs.manifest }}' > lighthouse-manifest.json

      # Close any stale weekly SEO PR
      - name: Close stale audit PR
        run: |
          OPEN_PRS=$(gh pr list --label "automated-seo" --state open --json number --jq '.[].number')
          for PR in $OPEN_PRS; do
            gh pr close "$PR" --comment "Superseded by new weekly SEO audit run."
          done
        env:
          GH_TOKEN: ${{ github.token }}

      # Claude Code analyzes and fixes
      - name: Claude Code SEO Analysis
        uses: anthropics/claude-code-action@v1
        with:
          anthropic_api_key: ${{ secrets.ANTHROPIC_API_KEY }}
          prompt: |
            You are running the weekly automated SEO audit for Date My Dish.

            ## Input Data
            Read `lighthouse-manifest.json` in the repo root for Lighthouse scores per page.

            ## Your Tasks

            1. **Analyze Lighthouse scores**: Identify pages scoring below 90 in any category.

            2. **Validate JSON-LD**: For each recipe in `dist/`, check the generated HTML for:
               - Recipe schema with all required properties
               - Image in array format `[url]`
               - FAQPage schema present
               - BreadcrumbList schema present

            3. **Check content quality** in `src/content/recipes/`:
               - `description` <= 160 characters
               - `heroImageAlt` descriptive, ~125 chars, no "Image of" prefix
               - At least 3 FAQs per recipe
               - MDX body word count >= 800 words
               - At least 3 H2 headings in prose
               - Internal cross-links present with trailing slashes
               - EN/FR pairs properly linked via `translationSlug`

            4. **Check images**: Verify hero images < 200KB, step images < 150KB

            5. **Fix issues**: Edit files to fix problems found. Be specific and targeted.

            6. **After making changes**, run `npm run check` to verify no TypeScript/schema errors.

            ## Restrictions
            - ONLY modify files in `src/content/recipes/` (MDX frontmatter and prose)
            - Do NOT modify files in `src/components/`, `src/layouts/`, `src/pages/`, `src/i18n/`, or config files
            - Do NOT rewrite prose content wholesale — only fix specific issues (meta descriptions, alt text, cross-links, headings)
            - Do NOT modify `package.json`, `astro.config.ts`, `wrangler.jsonc`, or `CLAUDE.md`

            ## Output
            After making all fixes, provide a summary listing:
            - Pages with scores below 90 and which categories
            - Issues found and fixes applied (grouped by type)
            - Any issues that require manual attention
          claude_args: |
            --model claude-sonnet-4-6
            --max-turns 15
            --allowedTools Edit,Read,Write,Glob,Grep,Bash(npm run check)
          branch_prefix: "seo-audit/"

      # Verify Claude's changes build successfully
      - name: Verify build after fixes
        run: |
          npm run check && npm run build
        continue-on-error: true
        id: verify

      # Create PR with label (only if there are changes)
      - name: Check for changes
        id: changes
        run: |
          if [ -n "$(git status --porcelain)" ]; then
            echo "has_changes=true" >> $GITHUB_OUTPUT
          else
            echo "has_changes=false" >> $GITHUB_OUTPUT
          fi

      - name: Add label to PR
        if: steps.changes.outputs.has_changes == 'true'
        run: |
          # Find the PR created by Claude Code action
          LATEST_PR=$(gh pr list --author "app/claude" --state open --json number --jq '.[0].number')
          if [ -n "$LATEST_PR" ]; then
            gh pr edit "$LATEST_PR" --add-label "automated-seo"
          fi
        env:
          GH_TOKEN: ${{ github.token }}
```

**`scripts/generate-lighthouse-urls.cjs`**

```javascript
// scripts/generate-lighthouse-urls.cjs
// Generates URL list from content directory for Lighthouse CI full audit

const fs = require('fs');
const path = require('path');

const BASE = 'http://localhost:8788';

// Static pages (always audited)
const staticUrls = [
  `${BASE}/en/`,
  `${BASE}/fr/`,
  `${BASE}/en/recipes/`,
  `${BASE}/fr/recettes/`,
  `${BASE}/en/about/`,
  `${BASE}/fr/a-propos/`,
  `${BASE}/en/contact/`,
  `${BASE}/fr/contact/`,
];

// Discover recipe URLs from content directory
const recipesDir = path.join(__dirname, '..', 'src', 'content', 'recipes');

const enRecipes = fs.readdirSync(path.join(recipesDir, 'en'))
  .filter(f => f.endsWith('.mdx'))
  .map(f => f.replace('.mdx', ''));

const frRecipes = fs.readdirSync(path.join(recipesDir, 'fr'))
  .filter(f => f.endsWith('.mdx'))
  .map(f => f.replace('.mdx', ''));

const recipeUrls = [
  ...enRecipes.map(slug => `${BASE}/en/recipes/${slug}/`),
  ...frRecipes.map(slug => `${BASE}/fr/recettes/${slug}/`),
];

const allUrls = [...staticUrls, ...recipeUrls];

// Write to .lighthouserc-full-urls.json for the config to consume
const outputPath = path.join(__dirname, '..', '.lighthouserc-full-urls.json');
fs.writeFileSync(outputPath, JSON.stringify(allUrls, null, 2));

console.log(`Generated ${allUrls.length} URLs for Lighthouse CI:`);
allUrls.forEach(url => console.log(`  ${url}`));
```

**`.lighthouserc-full.cjs`**

```javascript
// .lighthouserc-full.cjs
// Full-site Lighthouse CI config for weekly audit
// URLs are dynamically generated by scripts/generate-lighthouse-urls.cjs

const fs = require('fs');
const path = require('path');

let urls;
try {
  urls = JSON.parse(
    fs.readFileSync(path.join(__dirname, '.lighthouserc-full-urls.json'), 'utf8')
  );
} catch {
  // Fallback to minimal set if URL generation hasn't run
  urls = ['http://localhost:8788/en/', 'http://localhost:8788/fr/'];
}

module.exports = {
  ci: {
    collect: {
      startServerCommand: 'npx wrangler dev --port 8788',
      startServerReadyPattern: 'Ready on',
      startServerReadyTimeout: 30000,
      url: urls,
      numberOfRuns: 1, // Single run for speed on 40+ URLs
      settings: {
        chromeFlags: '--no-sandbox --disable-dev-shm-usage',
        preset: 'desktop',
      },
    },
    assert: {
      assertions: {
        // Warn on everything (weekly audit is informational, not gating)
        'categories:seo': ['warn', { minScore: 0.9 }],
        'categories:accessibility': ['warn', { minScore: 0.9 }],
        'categories:performance': ['warn', { minScore: 0.85 }],
        'categories:best-practices': ['warn', { minScore: 0.85 }],

        'is-crawlable': 'off',
        'uses-long-cache-ttl': 'off',
        'redirects-http': 'off',
        'csp-xss': 'off',
      },
    },
    upload: {
      target: 'temporary-public-storage',
    },
  },
};
```

**Key decisions:**
- Dynamic URL generation from `src/content/recipes/` ensures new recipes are automatically included
- `numberOfRuns: 1` for weekly audit (speed over accuracy — Claude handles the nuanced analysis)
- Claude is **restricted to `src/content/recipes/` only** — cannot modify components, layouts, config, or pages (addresses the biggest risk from SpecFlow analysis)
- Allowed tools explicitly listed: `Edit,Read,Write,Glob,Grep,Bash(npm run check)` — no arbitrary bash
- Build verification runs after Claude's fixes
- Stale PRs are closed before new audit runs
- `workflow_dispatch` allows manual trigger for testing
- `automated-seo` label on PRs for filtering and stale detection

#### Phase 3: Setup and Configuration

**Deliverables:**

- [ ] Add `ANTHROPIC_API_KEY` to GitHub repository secrets
- [x] Add `@lhci/cli` to `package.json` devDependencies
- [x] Add `.lighthouserc-full-urls.json` to `.gitignore`
- [ ] Enable branch protection on `main` with required status checks (Lighthouse CI)
- [ ] Test both workflows end-to-end

**GitHub Secrets Setup:**

| Secret | Required By | How to Get |
|--------|-------------|------------|
| `ANTHROPIC_API_KEY` | Weekly audit only | [console.anthropic.com](https://console.anthropic.com) |

Note: `GITHUB_TOKEN` is automatically available — no additional GitHub secrets needed. Cloudflare credentials are NOT needed (`wrangler dev` works in local mode for serving built assets).

**`.gitignore` additions:**

```
.lighthouseci/
.lighthouserc-full-urls.json
lighthouse-manifest.json
```

## Technical Considerations

### Cloudflare Adapter and Local Serving

The site uses `@astrojs/cloudflare` adapter, which produces a Workers-compatible output in `dist/`. This means `staticDistDir` (Lighthouse CI's auto-discovery mode) will NOT work. We must use `startServerCommand` with `wrangler dev` to serve the built site locally in CI.

`wrangler dev` works without Cloudflare credentials for local serving of built assets. The root `/` redirect (server-side `Accept-Language` detection) will function but with a default Accept-Language header.

### Score Flakiness Mitigation

- PR gate uses `numberOfRuns: 3` with `median` aggregation — gives stable scores
- Performance/Best Practices use `warn` level (non-blocking) since they're timing-dependent
- SEO/Accessibility use `error` level (blocking) since they're deterministic
- `desktop` preset disables mobile throttling, reducing variance in CI
- Localhost-irrelevant audits disabled (`is-crawlable`, `uses-long-cache-ttl`, `redirects-http`, `csp-xss`)

### Claude Code Guardrails

Biggest risk: Claude making breaking changes. Mitigations:

1. **File restriction**: Prompt explicitly restricts modifications to `src/content/recipes/**/*.mdx` only
2. **Tool restriction**: `--allowedTools` limits Claude to `Edit,Read,Write,Glob,Grep,Bash(npm run check)` — no arbitrary shell commands
3. **Post-fix verification**: `npm run check && npm run build` runs after Claude's changes
4. **Model choice**: Sonnet 4.6 for cost-effective routine analysis
5. **Turn limit**: `--max-turns 15` prevents runaway iterations
6. **Human review**: All changes go through a PR — nothing is auto-merged

### Performance Budget

| Workflow | Estimated Duration | CI Minutes/Month |
|----------|-------------------|-----------------|
| PR gate (8 URLs x 3 runs) | ~5-8 min | ~40 min (assuming 5 PRs/week) |
| Weekly audit (40 URLs x 1 run + Claude) | ~15-25 min | ~100 min |
| **Total** | | **~140 min/month** |

GitHub Actions free tier: 2,000 min/month. This uses ~7% of the budget.

### Cost Estimate

| Component | Per Run | Monthly (4 runs) | Annual |
|-----------|---------|-------------------|--------|
| Lighthouse CI | Free | Free | Free |
| Claude Code (Sonnet 4.6) | ~$0.50-1.00 | ~$2-4 | ~$24-48 |
| GitHub Actions minutes | Free (public) | Free | Free |
| **Total** | | **~$2-4/month** | **~$24-48/year** |

### Scaling Strategy (from SpecFlow analysis)

When recipe count exceeds 30 (~60+ recipe URLs):
- Switch weekly audit to URL sampling (random 50% of recipes + all static pages)
- Or use GitHub Actions matrix strategy to parallelize across multiple runners
- PR gate remains at ~8 representative URLs regardless of recipe count

## System-Wide Impact

### Interaction Graph

- `npm run build` triggers `postbuild` (Pagefind indexing) — both run before Lighthouse
- `wrangler dev` starts a local server that serves `dist/` — Lighthouse connects to it
- Claude Code reads `CLAUDE.md` and `.claude/commands/` automatically during CI runs
- PR comment updates use the GitHub API via `actions/github-script`
- Weekly PR creation uses Claude Code action's built-in branch/commit support

### Error Propagation

| Error | Impact | Handling |
|-------|--------|----------|
| Build failure (`npm run build`) | No Lighthouse data | Workflow fails early, visible in PR checks |
| `wrangler dev` timeout | No Lighthouse data | `startServerReadyTimeout: 30000` → workflow fails |
| Lighthouse score below threshold | PR gate blocks merge | Scores shown in PR comment with report links |
| Claude Code API error | No auto-fixes | Weekly workflow fails, retry on next run |
| Claude's fixes break build | Build verification fails | PR notes the failure; manual review needed |
| No issues found (weekly) | No PR created | Workflow succeeds silently; audit artifacts uploaded |

### State Lifecycle Risks

- **Stale weekly PRs**: Handled by closing previous open PRs with `automated-seo` label before creating new ones
- **Branch conflicts**: Each weekly run creates a fresh branch (`seo-audit/YYYY-MM-DD-*`), no reuse
- **Lighthouse temporary storage**: Reports auto-delete after 7 days — acceptable for PR review timeline

## Acceptance Criteria

### Functional Requirements

- [ ] PR gate runs on every PR to `main` (not drafts)
- [ ] PR gate posts a Lighthouse scores table as a PR comment
- [ ] PR comment is updated in-place on new pushes (not duplicated)
- [ ] PR comment includes links to full Lighthouse reports
- [ ] SEO or Accessibility score below 90 fails the PR check
- [ ] Performance or Best Practices below 90 shows a warning (non-blocking)
- [ ] Weekly audit runs on schedule (Sunday 3 AM UTC)
- [ ] Weekly audit can be triggered manually via `workflow_dispatch`
- [ ] Weekly audit dynamically discovers all recipe URLs from content directory
- [ ] Claude Code analyzes Lighthouse results and content quality
- [ ] Claude Code only modifies files in `src/content/recipes/`
- [ ] Claude Code's changes are verified with `npm run check` before PR creation
- [ ] Weekly PR has `automated-seo` label
- [ ] Previous stale weekly PRs are closed when new audit runs
- [ ] No PR is created if no issues are found

### Non-Functional Requirements

- [ ] PR gate completes in under 10 minutes
- [ ] Weekly audit completes in under 45 minutes
- [ ] Monthly CI usage stays under 200 minutes
- [ ] Monthly API cost stays under $5
- [ ] No secrets exposed in workflow logs

### Quality Gates

- [ ] Both workflows tested end-to-end before merging
- [ ] `wrangler dev` confirmed working in GitHub Actions without Cloudflare credentials
- [ ] Lighthouse reports accessible via temporary public storage links

## Dependencies & Prerequisites

1. **GitHub repository settings**: Enable GitHub Actions (should be enabled by default)
2. **Anthropic API key**: Obtain from [console.anthropic.com](https://console.anthropic.com) and add to GitHub Secrets as `ANTHROPIC_API_KEY`
3. **Branch protection** (optional): Add "Lighthouse CI" as a required status check on `main`
4. **npm dependency**: `@lhci/cli` added as devDependency

## Risk Analysis & Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| `wrangler dev` needs Cloudflare creds in CI | Medium | High (blocks both workflows) | Test in minimal workflow first; fallback to `npx serve dist` for static pages |
| Lighthouse scores too flaky for PR gate | Medium | Medium (developer frustration) | 3 runs + median + warn-only for Performance; can relax thresholds |
| Claude makes breaking changes | Low | High (broken PR) | File + tool restrictions, build verification, human review |
| Weekly PR noise (too many changes) | Medium | Medium (review fatigue) | Scope restriction to MDX content only; `max-turns 15` |
| API cost exceeds budget | Low | Low | Sonnet model, turn limits, weekly-only schedule |
| GitHub Actions minutes exhausted | Low | Medium | ~7% of free tier; monitor usage |

## Alternative Approaches Considered

(see brainstorm: `docs/brainstorms/2026-02-24-seo-automation-pipeline-brainstorm.md`)

- **Unlighthouse**: Simpler site-wide scanning but less CI maturity and no assertion framework
- **PageSpeed Insights API**: Simplest setup but can only test deployed pages (not PR previews)
- **Anthropic API directly**: Cheaper per token but requires custom scripting for file editing and PR creation
- **Report-only (no auto-fixes)**: Safer but defeats the goal of continuous improvement

## File Inventory

### New Files

| File | Purpose |
|------|---------|
| `.github/workflows/lighthouse-pr-check.yml` | PR gate workflow |
| `.github/workflows/weekly-seo-audit.yml` | Weekly audit + Claude Code workflow |
| `.lighthouserc.cjs` | Lighthouse CI config for PR gate (8 representative URLs) |
| `.lighthouserc-full.cjs` | Lighthouse CI config for weekly audit (all URLs) |
| `scripts/generate-lighthouse-urls.cjs` | Dynamic URL list generator |

### Modified Files

| File | Change |
|------|--------|
| `package.json` | Add `@lhci/cli` devDependency |
| `.gitignore` | Add `.lighthouseci/`, `.lighthouserc-full-urls.json`, `lighthouse-manifest.json` |

### No Changes To

- `src/components/` — SEO components remain unchanged
- `src/layouts/` — Layout hierarchy unchanged
- `astro.config.ts` — Build config unchanged
- `wrangler.jsonc` — Deploy config unchanged
- `CLAUDE.md` — Project docs updated separately if needed

## Future Considerations

1. **Historical trend tracking**: Set up an LHCI server for comparing scores over time (currently using ephemeral temporary storage)
2. **Category page auditing**: Add category URLs to the dynamic URL generator when category count grows
3. **Dark mode testing**: Run Lighthouse with `emulatedFormFactor` settings to test dark mode accessibility
4. **Pre-commit hooks**: Add Husky + lint-staged for image size validation before commit
5. **Slack/email notifications**: Notify on weekly audit completion or score drops
6. **Content parity checks**: Extend Claude's weekly analysis to check EN/FR translation parity (ingredient counts, step counts, FAQ counts)

## Sources & References

### Origin

- **Brainstorm document:** [docs/brainstorms/2026-02-24-seo-automation-pipeline-brainstorm.md](docs/brainstorms/2026-02-24-seo-automation-pipeline-brainstorm.md) — Key decisions carried forward: Lighthouse CI + Claude Code CLI approach, two-pronged trigger model, aggressive auto-fixes with human review, 90+ score thresholds

### Internal References

- Existing SEO audit logic: `.claude/commands/seo-audit.md`, `.claude/commands/bulk-audit.md`
- Content schema: `src/content.config.ts`
- SEO components: `src/components/SEOHead.astro`, `src/components/RecipeSchema.astro`
- Past SEO audit findings: `docs/solutions/performance-issues/seo-performance-accessibility-audit-and-implementation.md`
- Image optimization lessons: `docs/solutions/performance-issues/oversized-hero-images-optimization.md`
- Accessibility audit: `docs/solutions/ui-bugs/wcag-2-2-aa-accessibility-remediation.md`

### External References

- [Lighthouse CI documentation](https://github.com/GoogleChrome/lighthouse-ci/blob/main/docs/configuration.md)
- [treosh/lighthouse-ci-action@v12](https://github.com/treosh/lighthouse-ci-action)
- [Claude Code GitHub Action](https://github.com/anthropics/claude-code-action)
- [Claude Code in GitHub Actions docs](https://code.claude.com/docs/en/github-actions)

### Institutional Learnings Applied

- JSON-LD image must be array format — validated in Claude's weekly audit prompt
- Image sizes enforced: hero < 200KB, step < 150KB — from `docs/solutions/performance-issues/oversized-hero-images-optimization.md`
- Google Fonts via `<link>` not `@import` — not directly tested by this pipeline but documented for reference
- WCAG color contrast issues were systemic (25 files) — Lighthouse A11y score catches these automatically
