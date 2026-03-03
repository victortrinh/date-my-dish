---
title: "feat: Enhanced SEO Auto-Improvement Pipeline"
type: feat
status: completed
date: 2026-03-03
origin: docs/brainstorms/2026-03-03-data-driven-auto-improvement-brainstorm.md
---

# feat: Enhanced SEO Auto-Improvement Pipeline

## Overview

Enhance the existing SEO automation system with multi-week trend analysis, auto-optimize impact tracking, and content gap analysis. Phase 1 (GSC data flow) is already complete -- this plan covers Phase 2 improvements to make the pipeline smarter with the data it now collects.

(see brainstorm: docs/brainstorms/2026-03-03-data-driven-auto-improvement-brainstorm.md)

## Problem Statement / Motivation

The auto-improve pipeline works but is limited:
- `generate-report.mjs` only compares to the previous week's snapshot -- no multi-week trends
- No way to know if auto-optimize PRs actually improved rankings
- GSC query data (now flowing) could reveal content gaps but isn't analyzed for that
- The weekly report doesn't show momentum or trajectory

With GSC data now live (1 page/1 keyword as of 2026-03-03, growing weekly), these enhancements will become increasingly valuable.

## Proposed Solution

Three enhancements to the existing pipeline, all building on current scripts and workflows:

### 2A. Multi-Week Trend Analysis
Extend `generate-report.mjs` to load multiple historical snapshots and compute position trends, momentum indicators, and velocity metrics.

### 2B. Auto-Optimize Impact Tracking
Add a structured optimization log (`data/seo/optimization-log.json`) written by the auto-optimize workflow, then correlate with subsequent ranking data in the weekly report.

### 2C. Content Gap Analysis
Analyze GSC query data to find queries with impressions but no dedicated content, suggesting new recipe/article topics.

## Technical Considerations

### Key Files to Modify

| File | Changes |
|------|---------|
| `scripts/seo/generate-report.mjs` | Trend analysis, impact tracking report section, content gap analysis |
| `.github/workflows/seo-auto-optimize.yml` | Write optimization log after Claude makes changes |
| `data/seo/optimization-log.json` | New file -- structured log of optimization actions |

### Architecture

All changes extend the existing Monday pipeline:
```
Monday 8AM: weekly-seo-ranking.yml
  → derive-keywords.mjs (unchanged)
  → fetch-gsc-rankings.mjs (unchanged)
  → fetch-serp-rankings.mjs (unchanged)
  → generate-report.mjs (ENHANCED: trends, impact, content gaps)
  → commit snapshot + report
  → create GitHub Issue with enhanced report

Push triggers: seo-auto-optimize.yml
  → Claude optimizes MDX files (unchanged)
  → NEW: Write optimization log entry to data/seo/optimization-log.json
  → Create PR
```

### Data Sparsity Guards

Since the site is new (10 recipes, 1 GSC row), every feature needs graceful degradation:

| Feature | Minimum Data Required | Behavior When Insufficient |
|---------|----------------------|---------------------------|
| Multi-week trends | 3+ snapshots | Show single-week delta only (current behavior) |
| Impact tracking | 1+ merged auto-optimize PR + 2+ post-merge snapshots | Skip section with note |
| Content gap analysis | 20+ GSC query rows | Skip section with note: "Requires 20+ queries" |

## Implementation Tasks

### Phase 2A: Multi-Week Trend Analysis

#### `scripts/seo/generate-report.mjs`

- [x] Refactor `findPreviousSnapshot()` (line 30-40) into `loadSnapshots(n)` that returns the most recent N snapshots, excluding the current date
- [x] Add constant `TREND_WINDOW = 12` (3 months of weekly snapshots)
- [x] Use `generatedAt` timestamp (not `dateRange`) for temporal ordering -- `dateRange` is "N/A" when GSC is null
- [x] Extend `computeDeltas()` (line 101-127) to accept an array of snapshots and compute:
  - Rolling average position per page (last 4 weeks)
  - Trend direction: "improving" (3+ consecutive weeks of lower position), "declining" (3+ weeks higher), "stable", "volatile"
  - Position velocity: average weekly position change
- [x] Add report section "Multi-Week Trends" (after "Declining Pages", ~line 205):
  - Show pages with sustained improvement/decline (3+ weeks same direction)
  - Show momentum indicators (consecutive weeks improving/declining)
  - Guard behind `snapshots.length >= 3`; with fewer, show note: "Trend analysis available after 3+ weekly snapshots"
- [x] Add report section "SERP Position Trends":
  - Compare `serpResults[keyword].position` across snapshots
  - Label as "Live SERP Snapshot" (distinct from GSC averages)
- [x] Handle keyword list changes gracefully: match by `(page URL, keyword)` tuple, skip keywords that don't appear in both snapshots being compared
- [x] Bump snapshot version to `2` if adding new top-level fields; handle `version: 1` snapshots by treating new fields as undefined

### Phase 2B: Auto-Optimize Impact Tracking

#### New: `data/seo/optimization-log.json`

- [x] Create initial file as empty array `[]`
- [x] Schema per entry:
  ```json
  {
    "date": "2026-03-10",
    "runId": "22633631438",
    "prNumber": null,
    "mergedAt": null,
    "pages": [{
      "path": "/en/recipes/cacio-e-pepe/",
      "actions": ["added-keyword", "rewrote-description"],
      "keywords": ["cacio e pepe recipe"],
      "positionAtTime": { "serp": 4, "gsc": 12.5 }
    }]
  }
  ```

#### `.github/workflows/seo-auto-optimize.yml`

- [x] Add a step after the Claude Code action that writes to `optimization-log.json`:
  - Parse the Claude-created PR diff to extract modified files and change types
  - Record the current SERP/GSC positions for modified pages from the latest snapshot
  - Append entry to the log and commit alongside the PR
- [x] The `prNumber` field gets populated by reading the PR number from the `gh pr create` output
- [x] `mergedAt` starts as `null` -- populated at report generation time

#### `scripts/seo/generate-report.mjs`

- [x] Add `loadOptimizationLog()` function to read `data/seo/optimization-log.json`
- [x] For entries missing `mergedAt`, query GitHub API: `gh api repos/{owner}/{repo}/pulls/{prNumber} --jq '.merged_at'` to fill it in at report time
- [x] Add report section "Auto-Optimize Impact" showing:
  - Optimizations from 2+ weeks ago with before/after positions
  - Status: "improved" (position lower by 3+), "stable" (within ±2), "declined" (position higher by 3+), "too early" (< 2 weeks since merge)
  - Explicitly note: "Correlation, not causation -- multiple factors affect rankings"
- [x] Attribution windows: measure at week 2 ("early signal") and week 4 ("settled result")
- [x] Log both EN and FR changes; measure impact on EN pages only via GSC (FR impact not measurable with current data sources)

### Phase 2C: Content Gap Analysis

#### `scripts/seo/generate-report.mjs`

- [x] Add `analyzeContentGaps(gscData, derivedKeywords)` function:
  - Find GSC queries with 5+ impressions where the impression-receiving page is NOT a recipe/article page (i.e., it's the homepage, category page, or listing page)
  - AND no existing recipe/article has the query as a substring of its title or `keywords[]` array
- [x] Apply noise filters (constants at top of file for easy tuning):
  - Exclude branded queries containing "datemydish", "date my dish"
  - Exclude queries with < 5 impressions
  - Exclude queries shorter than 3 words (too generic)
  - Exclude French queries appearing for EN pages (detect via simple heuristics: contains "recette", "comment", etc.)
- [x] Add report section "Content Gap Opportunities":
  - List qualifying queries sorted by impressions desc
  - Suggest content type: "recipe" (if query contains "recipe", food + cooking method) or "article" (if "how to", "what is", "guide") or "needs review"
  - Guard behind `gscRowCount >= 20`; with fewer, show note: "Content gap analysis requires 20+ GSC query rows. Currently: N rows."
- [x] Include the URL where the impression was received, so the user can see which page is accidentally ranking

### Cross-Cutting Concerns

- [x] Add "GSC data expected but missing" warning: track if GSC has ever returned non-null data (check historical snapshots). If it has and current run returns null, emit prominent warning in report
- [x] Use `generatedAt` (always populated) not `dateRange` for all temporal comparisons
- [x] Handle snapshot schema version mismatches when loading historical files -- treat new fields as optional
- [x] Document the audit/optimize PR collision risk in report footer: "If both `automated-seo` and `seo-auto-optimize` PRs are open, merge the audit PR first to avoid conflicts"

## Acceptance Criteria

- [ ] `generate-report.mjs` loads up to 12 historical snapshots for trend analysis
- [ ] Report shows multi-week trends when 3+ snapshots exist (direction + velocity)
- [ ] Report gracefully degrades with < 3 snapshots (current single-week delta behavior)
- [ ] `seo-auto-optimize.yml` writes structured entries to `optimization-log.json`
- [ ] Report shows before/after positions for optimizations merged 2+ weeks ago
- [ ] Report shows content gap suggestions when GSC has 20+ query rows
- [ ] Content gaps exclude branded queries, low-impression queries, and queries already covered
- [ ] All new features handle null/sparse GSC data without crashing
- [ ] `npm run check` passes after all changes
- [ ] Existing report sections remain unchanged in format

## Success Metrics

- **Trends:** Weekly report includes trend direction for pages with 3+ weeks of data
- **Impact:** Can answer "did the auto-optimize PR for X actually help?" within 4 weeks of merge
- **Content gaps:** First actionable content suggestion surfaces once GSC has sufficient data
- **No regressions:** Existing pipeline continues to work unchanged for sparse data scenarios

## Dependencies & Risks

| Risk | Mitigation |
|------|-----------|
| GSC data too sparse for meaningful trends | Guard all features behind minimum thresholds; report explicitly says "insufficient data" |
| Snapshot format changes break old snapshot loading | Bump version, treat new fields as optional when reading v1 snapshots |
| Auto-optimize + audit PRs conflict on same file | Document merge order in report; future enhancement could check for open PRs |
| Optimization impact attribution is ambiguous | Explicitly label as "correlation, not causation" in report |
| Keyword list changes week-to-week break trend continuity | Match by `(page, keyword)` tuple; skip unmatched entries |

## Future Phases (Quarterly Review)

### Phase 3: Cloudflare Analytics API Integration
- New script `scripts/seo/fetch-cf-analytics.mjs` querying Cloudflare GraphQL API
- Requires `CF_API_TOKEN` + `CF_ZONE_ID` GitHub secrets
- Adds traffic data to weekly report: page views, unique visitors, top pages
- **Trigger:** Quarterly review, when traffic justifies programmatic access

### Phase 4: Real User Monitoring
- `web-vitals` library (~1.5KB) in `BaseLayout.astro`
- Cloudflare Workers endpoint to receive and aggregate RUM data
- Field data comparison vs Lighthouse lab data
- **Trigger:** Quarterly review, when 5K+ sessions/month

(see brainstorm: docs/brainstorms/2026-03-03-data-driven-auto-improvement-brainstorm.md — Phase 3/4 details)

## Sources & References

- **Origin brainstorm:** [docs/brainstorms/2026-03-03-data-driven-auto-improvement-brainstorm.md](docs/brainstorms/2026-03-03-data-driven-auto-improvement-brainstorm.md) — Key decisions: phased approach, no GA4, quarterly review for Phase 3/4, GSC fix completed
- Report generator: `scripts/seo/generate-report.mjs` (lines 30-40 `findPreviousSnapshot`, 101-127 `computeDeltas`, 140-321 report generation)
- Auto-optimize workflow: `.github/workflows/seo-auto-optimize.yml` (lines 59-85 heuristics, 105-106 Claude config)
- Weekly ranking workflow: `.github/workflows/weekly-seo-ranking.yml`
- Current snapshots: `data/seo/rankings-2026-02-27.json`, `data/seo/rankings-2026-03-02.json`
- Learnings: `docs/solutions/integration-issues/social-media-auto-posting-instagram-pinterest.md` (state management pattern, failure handling)
