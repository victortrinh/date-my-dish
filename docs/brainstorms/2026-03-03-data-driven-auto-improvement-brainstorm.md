---
title: Data-Driven Auto-Improvement Pipeline
type: feat
date: 2026-03-03
status: active
---

# Data-Driven Auto-Improvement Pipeline

## What We're Building

A phased system that collects real performance and ranking data, then automatically improves content and site quality based on that data. The foundation already exists -- the `seo-auto-optimize.yml` pipeline is built and ready, but runs on empty data because GSC isn't connected.

## Why This Matters

- The auto-optimize pipeline (`seo-auto-optimize.yml`) already handles striking distance keywords, low CTR fixes, and declining page recovery -- but `gsc-data.json` is `null`
- SERP tracking via Serper.dev works (60 keywords tracked), but without GSC data we're missing clicks, impressions, CTR, and real query data
- Cloudflare Web Analytics is enabled at the dashboard level but not programmatically accessible
- No real user performance data (only Lighthouse lab data from CI)

## Chosen Approach: Phased Rollout

Start with the lowest-effort, highest-impact fix (GSC data flow), then layer on capabilities as traffic grows.

### Phase 1: Fix GSC Data Flow (COMPLETED 2026-03-03)

**Goal:** Get Google Search Console data flowing into the existing auto-optimize pipeline.

**What's needed (`GSC_SERVICE_ACCOUNT_KEY` secret already exists!):**
1. Decode the existing secret to find the service account email: `echo $GSC_SERVICE_ACCOUNT_KEY | base64 -d | jq .client_email`
2. In Google Cloud Console: verify the Search Console API is enabled for the project
3. In Google Search Console: add the service account email as a user (Full access) for `sc-domain:datemydish.com`
4. Manually trigger `weekly-seo-ranking.yml` and verify `gsc-data.json` is no longer `null`

**What this unlocks:**
- `seo-auto-optimize.yml` will have real data for its heuristics:
  - Striking distance keywords (position 4-20, 10+ impressions)
  - Low CTR pages (50+ impressions, CTR < 2%)
  - Declining pages (dropped 3+ positions week-over-week)
  - Missing keyword opportunities from GSC query data
- The weekly `report.md` will include actual click/impression data

**Effort:** ~15 minutes of configuration, zero code changes.

### Phase 2: Enhanced Auto-Optimize Intelligence (When GSC data is flowing)

**Goal:** Make the auto-optimize pipeline smarter with trend analysis and impact tracking.

**Ideas to explore:**
- **Week-over-week trend analysis** -- compare snapshots in `data/seo/rankings-*.json` to detect patterns, not just point-in-time positions
- **Auto-optimize impact tracking** -- after a `seo-auto-optimize` PR merges, track whether the targeted pages actually improved in subsequent weeks
- **Content gap analysis** -- GSC shows queries where the site appears but has no dedicated content. Could suggest new recipe/article topics
- **Internal linking optimization** -- automatically add cross-links between related content based on shared keywords

**Effort:** Medium. Extends existing scripts and workflow.

### Phase 3: User Behavior Insights (When traffic justifies it, ~1K+ sessions/month)

**Goal:** Understand what visitors actually do on the site.

**Options to explore:**
- **Cloudflare Analytics API** -- pull dashboard data programmatically (page views, visits, top pages, referrers). Requires Cloudflare API token with Analytics permissions
- **Cloudflare Web Analytics JS beacon** -- add the beacon script to `BaseLayout.astro` for more granular client-side data (already mentioned in privacy policy)
- **Lightweight event tracking** -- track specific interactions (recipe prints, search usage, dark mode toggle) with custom Cloudflare Analytics events

**What this could feed into:**
- Identify most/least popular content to prioritize improvements
- Detect high bounce rate pages for content quality fixes
- Understand referral sources to optimize for them

**Effort:** Low-medium. Cloudflare API integration is straightforward.

### Phase 4: Real User Monitoring (When traffic justifies it, ~5K+ sessions/month)

**Goal:** Track actual Core Web Vitals from real users (field data vs lab data).

**Options:**
- **web-vitals library** -- lightweight (~1.5KB) JS library that reports CLS, LCP, INP to a custom endpoint
- **Cloudflare Workers endpoint** -- receive and aggregate RUM data at the edge
- **CrUX API** -- Google's Chrome User Experience Report (requires sufficient traffic volume)

**What this enables:**
- Auto-detect performance regressions from real users
- Compare field data vs Lighthouse lab data
- Prioritize performance fixes based on actual user impact

**Effort:** Medium-high. Needs a data collection endpoint and analysis pipeline.

## Key Decisions

1. **Phase 1 first** -- fixing GSC data flow is the highest ROI with zero code changes
2. **Phased approach** -- don't build capabilities before there's enough data to justify them
3. **Build on existing infrastructure** -- the auto-optimize pipeline, weekly ranking, and Lighthouse CI are already solid foundations
4. **No GA4** -- Cloudflare Web Analytics + GSC provides enough insight without the cookie consent overhead and performance impact

## Resolved Questions

1. **GSC service account status** -- `GSC_SERVICE_ACCOUNT_KEY` GitHub secret already exists! GCP project is set up. The issue is likely: (a) service account email not added as user in GSC, or (b) Search Console API not enabled in GCP. Phase 1 is mostly verification/configuration, not creation.
2. **Traffic thresholds** -- Quarterly review preferred over specific session thresholds. At 10 recipes, traffic growth is too unpredictable for hard triggers. Revisit Phase 3/4 readiness each quarter.
3. **Cloudflare API access** -- No Cloudflare API token configured yet. Will need to create one for Phase 3 when the time comes. Not blocking Phase 1.

## Success Criteria

- **Phase 1:** `gsc-data.json` contains real data, `seo-auto-optimize.yml` creates meaningful PRs
- **Phase 2:** Week-over-week trend reports, measurable impact from auto-optimizations
- **Phase 3:** Programmatic access to visitor behavior data, content prioritization insights
- **Phase 4:** Real Core Web Vitals field data, automatic performance regression detection

## Sources

- Existing pipeline: `.github/workflows/weekly-seo-ranking.yml`, `.github/workflows/seo-auto-optimize.yml`
- GSC fetch script: `scripts/seo/fetch-gsc-rankings.mjs` (expects base64-encoded `GSC_SERVICE_ACCOUNT_KEY`)
- Current data: `data/seo/gsc-data.json` (currently `null`), `data/seo/serp-data.json` (working)
- Mobile perf brainstorm: `docs/brainstorms/2026-03-02-mobile-performance-improvements-brainstorm.md` (deferred RUM)
- SEO automation brainstorm: `docs/brainstorms/2026-02-24-seo-automation-pipeline-brainstorm.md`
