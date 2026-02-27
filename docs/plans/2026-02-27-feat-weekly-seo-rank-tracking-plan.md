---
title: "feat: Weekly SEO Rank Tracking via GSC + Serper.dev"
type: feat
status: completed
date: 2026-02-27
origin: docs/brainstorms/2026-02-27-seo-rank-tracking-brainstorm.md
---

# feat: Weekly SEO Rank Tracking via GSC + Serper.dev

## Overview

Add a weekly GitHub Action that tracks SEO keyword rankings per page using Google Search Console API (own data) and Serper.dev (competitor SERP snapshots). Results are archived as JSON snapshots and surfaced as a weekly GitHub Issue report with week-over-week deltas.

(see brainstorm: `docs/brainstorms/2026-02-27-seo-rank-tracking-brainstorm.md`)

## Problem Statement / Motivation

The site has strong SEO infrastructure (Lighthouse CI, JSON-LD, hreflang, weekly audits) but **zero visibility into actual search rankings**. No way to know which keywords are improving, which pages are declining, or where competitors rank. GSC is set up but has no automated data extraction. GSC also deletes data after 16 months — without archival, historical trends are lost.

## Proposed Solution

A 4-script pipeline orchestrated by a weekly GitHub Action:

1. **Derive keywords** from recipe/article frontmatter (no manual list)
2. **Fetch GSC data** — own rankings, clicks, impressions, CTR per page/keyword
3. **Fetch SERP data** — actual Google results for target keywords via Serper.dev
4. **Generate report** — merge data, compare with previous week, create GitHub Issue

### Data Sources (from brainstorm)

| Source | Cost | Data | Freshness |
|--------|------|------|-----------|
| Google Search Console API | Free | Own rankings, clicks, impressions, CTR | 2-3 day delay |
| Serper.dev API | Free (2,500/mo) | Actual SERP positions, competitors | Real-time |

## Technical Considerations

### Keyword Budget Management

Raw keyword count from frontmatter could reach 100-200 across EN+FR content. Serper.dev free tier allows ~577 searches/month (~133/week). Strategy:

- **EN-only SERP tracking** — FR keywords double the budget with minimal ROI at this stage
- **Deduplication** — merge identical keywords across recipes
- **Cap at 60 keywords/week** for Serper.dev (leaves buffer for growth + manual triggers)
- **Prioritization**: recipe title keywords first, then frontmatter `keywords[]`, then cuisine
- GSC has no budget concern — it returns all data for free

### Authentication

- **GSC**: Google Cloud service account with JSON key, base64-encoded as `GSC_SERVICE_ACCOUNT_KEY` secret. Property: `sc-domain:datemydish.com`
- **Serper.dev**: API key stored as `SERPER_API_KEY` secret. No refresh mechanism needed (static key)
- **Git push**: `PAT_TOKEN` for checkout (matches `social-backfill.yml` pattern for bypassing branch protection)

### First-Run Bootstrap

On the first run, no previous snapshot exists. The report script must:
- Skip all delta calculations (no "top movers" or "declining pages")
- Generate a baseline-only report with a "Data Maturity" banner
- GSC may also return sparse data for a newer site — handle gracefully

### Partial Failure Handling

Following the `social-post.mjs` pattern (per-platform independence):
- GSC failure → produce SERP-only report, mark GSC as `null` in snapshot
- Serper.dev failure → produce GSC-only report, mark SERP as `null` in snapshot
- Both fail → create a failure GitHub Issue (label: `seo-ranking-failure`), skip snapshot commit
- Never commit an empty/malformed snapshot

### Serper.dev Rate Limiting

Sequential requests with 200ms delay between each to avoid 429 errors on free tier. ~60 keywords × 200ms = ~12 seconds total — well within workflow timeout.

### URL Matching

GSC returns full URLs (`https://datemydish.com/en/recipes/cacio-e-pepe/`). Scripts use URL paths for matching. Normalize: strip protocol/domain, ensure trailing slash, lowercase.

## Snapshot JSON Schema

```json
{
  "version": 1,
  "generatedAt": "2026-02-27T08:00:00.000Z",
  "dateRange": {
    "start": "2026-02-17",
    "end": "2026-02-24"
  },
  "config": {
    "serpLocale": "en",
    "serpCountry": "ca",
    "keywordLimit": 60
  },
  "derivedKeywords": [
    {
      "keyword": "cacio e pepe recipe",
      "source": "title",
      "url": "/en/recipes/cacio-e-pepe/",
      "lang": "en"
    }
  ],
  "pages": {
    "/en/recipes/cacio-e-pepe/": {
      "gsc": {
        "queries": [
          {
            "keyword": "cacio e pepe recipe",
            "avgPosition": 12.3,
            "clicks": 5,
            "impressions": 120,
            "ctr": 0.042
          }
        ],
        "totalClicks": 8,
        "totalImpressions": 200
      },
      "serp": null
    }
  },
  "serpResults": {
    "cacio e pepe recipe": {
      "position": 14,
      "featured": false,
      "topCompetitors": [
        { "domain": "bonappetit.com", "position": 1 },
        { "domain": "seriouseats.com", "position": 2 }
      ]
    }
  },
  "errors": []
}
```

## New Files

### Scripts (`scripts/seo/`)

All scripts use ESM (`.mjs`), `gray-matter` for frontmatter, `async main()` pattern with `.catch()`.

#### `scripts/seo/derive-keywords.mjs`

Reads recipe + article MDX frontmatter, extracts keywords, deduplicates, and outputs a keyword-to-URL map.

```
Input: src/content/recipes/en/*.mdx, src/content/articles/en/*.mdx
Output: JSON array of { keyword, source, url, lang }

Extraction priority:
1. Recipe/article title (cleaned: lowercase, remove special chars)
2. Frontmatter keywords[] (first 3 per recipe)
3. recipeCuisine + " recipe" (e.g., "italian recipe")

Dedup: merge same keyword across recipes, keep first URL
Cap: configurable limit (default 60)
```

#### `scripts/seo/fetch-gsc-rankings.mjs`

Queries GSC Search Analytics API for the trailing 7-day window ending 3 days ago. Dimensions: `["page", "query"]`.

```
Input: GSC_SERVICE_ACCOUNT_KEY env var, site URL
Output: JSON object keyed by URL path → array of { keyword, avgPosition, clicks, impressions, ctr }

Auth: google-auth-library JWT with service account
Rate limit: 1,200 queries/min (no concern at this scale — single API call)
Error: returns null + logs error (does not throw)
```

#### `scripts/seo/fetch-serp-rankings.mjs`

Queries Serper.dev for each derived keyword. Sequential with 200ms delay.

```
Input: derived keywords array, SERPER_API_KEY env var
Output: JSON object keyed by keyword → { position, featured, topCompetitors[] }

Params: gl=ca, hl=en, num=10
Rate: sequential, 200ms between requests
Budget guard: skip if keyword count > limit
Error: per-keyword error capture (one failure doesn't block others)
```

#### `scripts/seo/generate-report.mjs`

Merges GSC + SERP data, loads previous snapshot for delta comparison, generates GitHub Issue markdown body.

```
Input: GSC data, SERP data, previous snapshot (if exists), derived keywords
Output: { snapshot: JSON object, report: markdown string }

First run: baseline report with "Data Maturity" banner, no deltas
Partial data: clearly labeled sections for available data only
```

**Report sections:**

| Section | Description |
|---------|-------------|
| Data Maturity | Week number, data sources available |
| Top Movers | Pages with biggest position improvement (GSC avgPosition delta) |
| Declining Pages | Pages with biggest position drops |
| New Keywords | Keywords appearing for the first time this week |
| Per-Page Summary | Table: URL, top keyword, avg position, clicks, impressions, CTR, delta |
| Striking Distance | Pages with GSC position 4-20 and ≥10 impressions (page 1 candidates) |
| Competitor Snapshot | Top 10 most frequent competitor domains across all SERP results |
| Errors | Any API failures or warnings |

### Workflow (`.github/workflows/weekly-seo-ranking.yml`)

```yaml
name: Weekly SEO Rank Tracking

on:
  schedule:
    - cron: '0 8 * * 1'  # Monday 8 AM UTC
  workflow_dispatch:
    inputs:
      keyword_limit:
        description: 'Max keywords for Serper.dev (default: 60)'
        required: false
        default: '60'

concurrency:
  group: weekly-seo-ranking
  cancel-in-progress: false

permissions:
  contents: write
  issues: write

jobs:
  track-rankings:
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      - uses: actions/checkout@v4
        with:
          token: ${{ secrets.PAT_TOKEN }}

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      - run: npm ci

      - name: Derive keywords from frontmatter
        run: node scripts/seo/derive-keywords.mjs
        env:
          KEYWORD_LIMIT: ${{ inputs.keyword_limit || '60' }}

      - name: Fetch GSC rankings
        run: node scripts/seo/fetch-gsc-rankings.mjs
        env:
          GSC_SERVICE_ACCOUNT_KEY: ${{ secrets.GSC_SERVICE_ACCOUNT_KEY }}
          SITE_URL: 'sc-domain:datemydish.com'

      - name: Fetch SERP rankings
        run: node scripts/seo/fetch-serp-rankings.mjs
        env:
          SERPER_API_KEY: ${{ secrets.SERPER_API_KEY }}

      - name: Generate report and snapshot
        run: node scripts/seo/generate-report.mjs

      - name: Commit snapshot
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"
          git add data/seo/
          git diff --cached --quiet || git commit -m "chore(seo): weekly ranking snapshot $(date +%Y-%m-%d)"
          git push

      - name: Close previous ranking issue
        run: |
          PREV_ISSUE=$(gh issue list --label "seo-ranking" --state open --limit 1 --json number -q '.[0].number')
          if [ -n "$PREV_ISSUE" ]; then
            gh issue close "$PREV_ISSUE" --comment "Superseded by new weekly report"
          fi
        env:
          GH_TOKEN: ${{ github.token }}

      - name: Create ranking report issue
        run: |
          gh issue create \
            --title "SEO Ranking Report — $(date +%Y-%m-%d)" \
            --body-file data/seo/report.md \
            --label "seo-ranking"
        env:
          GH_TOKEN: ${{ github.token }}
```

### Data Directory

```
data/seo/
  .gitkeep                          # Created in implementation PR
  rankings-2026-02-27.json          # Weekly snapshots (committed)
  report.md                         # Latest report (transient, used for Issue body)
```

**Retention**: Keep all snapshots indefinitely. At ~50-100KB each, 52 files/year is ~5MB — negligible. Revisit if the site grows past 200 pages.

### New Dependencies

Add to `devDependencies` in `package.json`:

```json
{
  "googleapis": "^146.0.0"
}
```

Note: `googleapis` includes `google-auth-library`. `gray-matter` is already installed. Serper.dev uses native `fetch` (Node 20).

## Phase 2: Auto-Optimize Pipeline

After the ranking workflow commits its snapshot and creates the report issue, a **separate workflow** triggers Claude Code to analyze underperforming pages and create a PR with targeted content improvements.

### Trigger

The auto-optimize workflow triggers on push to `main` when `data/seo/rankings-*.json` files change (i.e., after the ranking snapshot is committed). This naturally chains Phase 1 → Phase 2.

```yaml
on:
  push:
    branches: [main]
    paths: ['data/seo/rankings-*.json']
  workflow_dispatch:
```

### What Claude Analyzes

From the latest ranking snapshot, Claude identifies optimization targets:

| Signal | Action |
|--------|--------|
| **Striking distance** (position 4-20, ≥10 impressions) | Add/improve H2 targeting that keyword, strengthen keyword in prose |
| **Low CTR** (≥50 impressions but CTR <2%) | Rewrite frontmatter `description` to be more compelling |
| **Declining pages** (position dropped ≥3 vs last week) | Add internal links from other pages, strengthen keyword usage |
| **Missing keywords** (GSC shows ranking for keywords not in frontmatter) | Add to `keywords[]` in frontmatter |
| **Competitor FAQ gap** (SERP shows competitors with FAQ snippets) | Add relevant FAQs to frontmatter |

### New File: `.github/workflows/seo-auto-optimize.yml`

```yaml
name: SEO Auto-Optimize

on:
  push:
    branches: [main]
    paths: ['data/seo/rankings-*.json']
  workflow_dispatch:

concurrency:
  group: seo-auto-optimize
  cancel-in-progress: false

permissions:
  contents: write
  pull-requests: write
  issues: write

jobs:
  optimize:
    runs-on: ubuntu-latest
    timeout-minutes: 30
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 1

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      - run: npm ci

      - name: Close stale optimize PR
        run: |
          OPEN_PRS=$(gh pr list --label "seo-auto-optimize" --state open --json number --jq '.[].number')
          for PR in $OPEN_PRS; do
            gh pr close "$PR" --comment "Superseded by new ranking data."
          done
        env:
          GH_TOKEN: ${{ github.token }}

      - name: Claude Code SEO Optimization
        uses: anthropics/claude-code-action@v1
        with:
          anthropic_api_key: ${{ secrets.ANTHROPIC_API_KEY }}
          prompt: |
            You are running the weekly SEO auto-optimization for Date My Dish based on fresh ranking data.

            ## Input Data

            1. Read the MOST RECENT `data/seo/rankings-*.json` file (highest date in filename).
            2. If a previous week's snapshot exists, read that too for delta comparison.

            ## Optimization Targets

            Analyze the ranking data and prioritize fixes in this order:

            ### 1. Striking Distance Keywords (HIGH PRIORITY)
            Pages with GSC avgPosition 4-20 AND ≥10 impressions.
            These are close to page 1 — small improvements can yield big traffic gains.
            - Ensure the target keyword appears in an H2 heading in the MDX prose
            - Ensure the keyword is in the frontmatter `keywords[]` array
            - Check that the meta `description` includes the keyword naturally
            - Add 1-2 sentences in the prose strengthening relevance for that keyword

            ### 2. Low CTR Pages (MEDIUM PRIORITY)
            Pages with ≥50 impressions but CTR <2%.
            The page ranks but nobody clicks — the meta description needs work.
            - Rewrite the frontmatter `description` (max 160 chars) to be more compelling
            - Include the primary keyword, a benefit, and a call to action
            - Make it specific and enticing (not generic)

            ### 3. Declining Pages (MEDIUM PRIORITY)
            Pages where avgPosition dropped ≥3 positions vs. the previous week.
            - Add 1-2 internal cross-links FROM other relevant recipe pages TO this page
            - Cross-links use format: `/en/recipes/{slug}/` (with trailing slash)
            - Ensure the declining keyword still appears in H2s and prose

            ### 4. Missing Keywords (LOW PRIORITY)
            Keywords GSC shows we rank for but are NOT in the recipe's frontmatter `keywords[]`.
            - Add them to the `keywords[]` array (max 10 keywords per recipe)

            ## Restrictions
            - ONLY modify files in `src/content/recipes/` and `src/content/articles/` (MDX frontmatter and prose)
            - Do NOT modify components, layouts, pages, i18n files, or config files
            - Do NOT rewrite prose wholesale — make targeted, surgical additions
            - Do NOT add more than 3 internal links per page per run
            - Do NOT modify a recipe if it already ranks position 1-3 (don't fix what isn't broken)
            - Keep all changes bilingual — if you modify an EN recipe, make the equivalent FR change
            - Preserve all existing frontmatter fields exactly as-is (only add/modify specific fields)

            ## After Changes
            Run `npm run check` to verify no TypeScript/schema errors.

            ## Output
            Provide a summary:
            - Pages optimized and what was changed
            - Keywords targeted and current positions
            - Expected impact (which keywords should improve)
            - Any issues requiring manual attention
          claude_args: |
            --model claude-sonnet-4-6
            --max-turns 20
            --allowedTools Edit,Read,Write,Glob,Grep,Bash(npm run check)
          branch_prefix: "seo-optimize/"

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
          LATEST_PR=$(gh pr list --author "app/claude" --state open --json number --jq '.[0].number')
          if [ -n "$LATEST_PR" ]; then
            gh pr edit "$LATEST_PR" --add-label "seo-auto-optimize"
          fi
        env:
          GH_TOKEN: ${{ github.token }}
```

### Weekly Flow (Phase 1 + Phase 2 Combined)

```
Sunday 3 AM  → weekly-seo-audit.yml (Lighthouse + Claude fixes) → PR
Monday 8 AM  → weekly-seo-ranking.yml (GSC + SERP data) → Snapshot + Issue
Monday ~8:05 → seo-auto-optimize.yml (triggered by snapshot commit) → PR
```

Three complementary workflows, each with a focused responsibility:
- **Sunday audit**: Technical SEO (Lighthouse scores, JSON-LD, image sizes)
- **Monday ranking**: Data collection (positions, clicks, competitors)
- **Monday optimize**: Content SEO (keywords, meta descriptions, internal links)

## Acceptance Criteria

### Phase 1: Rank Tracking
- [x] `derive-keywords.mjs` extracts keywords from recipe + article frontmatter, deduplicates, caps at limit
- [x] `fetch-gsc-rankings.mjs` authenticates with service account and returns per-page/per-keyword data
- [x] `fetch-serp-rankings.mjs` queries Serper.dev with rate limiting, returns positions + competitors
- [x] `generate-report.mjs` produces valid snapshot JSON (schema v1) and markdown report
- [x] First run (no previous snapshot) produces a baseline report without errors
- [x] Partial API failure (one source down) produces a partial report, not a crash
- [x] Both APIs failing creates a failure issue with `seo-ranking-failure` label
- [x] Workflow commits snapshot to `data/seo/`, closes previous issue, creates new issue
- [x] Manual `workflow_dispatch` trigger works with optional `keyword_limit` input
- [x] `npm run check` passes after adding new dependencies

### Phase 2: Auto-Optimize
- [x] `seo-auto-optimize.yml` triggers on push to main when ranking snapshots change
- [x] Claude reads the latest snapshot and identifies optimization targets
- [x] Striking distance keywords (position 4-20) get content improvements
- [x] Low CTR pages (≥50 impressions, <2% CTR) get meta description rewrites
- [x] Changes are bilingual (EN change → matching FR change)
- [x] PR created with `seo-auto-optimize` label, stale PRs closed
- [x] `npm run check` passes after Claude's changes
- [x] Claude does NOT modify pages already ranking position 1-3

## Success Metrics

- Weekly ranking reports appearing as GitHub Issues every Monday
- Historical JSON snapshots accumulating in `data/seo/`
- Ability to identify "striking distance" keywords (position 4-20) for optimization
- Competitor visibility for top keywords
- No workflow failures due to auth or rate limiting
- Auto-optimize PRs created weekly with targeted content improvements
- Measurable position improvements for striking-distance keywords over 4-8 weeks

## Dependencies & Prerequisites

### One-Time Setup (manual, before first workflow run)

1. **Google Cloud Console**: Create project → Enable "Search Console API" → Create service account → Download JSON key
2. **Google Search Console**: Add service account email as Owner of `sc-domain:datemydish.com` property
3. **Serper.dev**: Sign up at serper.dev → Get API key from dashboard (free tier)
4. **GitHub Secrets**: Add `GSC_SERVICE_ACCOUNT_KEY` (base64-encoded JSON key), `SERPER_API_KEY`, verify `PAT_TOKEN` exists
5. **GitHub Labels**: Create `seo-ranking`, `seo-ranking-failure`, and `seo-auto-optimize` labels in the repo

### Implementation Order

Scripts can be developed and tested locally before the workflow. The workflow is the final integration step.

```
Phase 1: Rank Tracking
  1. Add googleapis dependency
  2. Create data/seo/.gitkeep
  3. derive-keywords.mjs (test locally: node scripts/seo/derive-keywords.mjs)
  4. fetch-gsc-rankings.mjs (test locally with real credentials)
  5. fetch-serp-rankings.mjs (test locally with real API key)
  6. generate-report.mjs (test with mock data first, then real data)
  7. weekly-seo-ranking.yml (wire up scripts, test with workflow_dispatch)

Phase 2: Auto-Optimize
  8. seo-auto-optimize.yml (Claude Code workflow, test with workflow_dispatch)
  9. Create GitHub labels (seo-ranking, seo-ranking-failure, seo-auto-optimize)
```

## Sources & References

### Origin

- **Brainstorm document**: [docs/brainstorms/2026-02-27-seo-rank-tracking-brainstorm.md](docs/brainstorms/2026-02-27-seo-rank-tracking-brainstorm.md) — Key decisions: GSC + Serper.dev as data sources, auto-derived keywords, JSON snapshots + GitHub Issues, Monday cron schedule

### Internal References

- Workflow pattern: `.github/workflows/weekly-seo-audit.yml` (cron + concurrency + timeout)
- Script pattern: `scripts/social-post.mjs` (ESM, gray-matter, async main, error handling)
- Data commit pattern: `scripts/social-post.mjs` (git config + add + diff --cached + commit + push)
- Frontmatter parsing: `scripts/social-post.mjs:52-57` (gray-matter)
- Recipe discovery: `scripts/generate-lighthouse-urls.cjs:22-35` (readdirSync + filter)

### External References

- [Google Search Console API: Search Analytics Query](https://developers.google.com/webmaster-tools/v1/searchanalytics/query)
- [GSC API Getting Started](https://developers.google.com/webmaster-tools/v1/getting-started)
- [Serper.dev API Documentation](https://serper.dev/api)
- [googleapis npm package](https://www.npmjs.com/package/googleapis)
