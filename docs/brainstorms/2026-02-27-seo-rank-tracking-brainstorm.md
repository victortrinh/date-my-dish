# SEO Rank Tracking & Weekly Monitoring

**Date**: 2026-02-27
**Status**: Brainstorm
**Complexity**: Medium

## What We're Building

A weekly automated GitHub Action workflow that tracks SEO keyword rankings per page using two data sources:

1. **Google Search Console API** (free) — pulls your own ranking data: average position, clicks, impressions, and CTR per page/keyword pair
2. **Serper.dev API** (free tier: 2,500 searches/month) — scrapes actual Google SERPs to see where you and competitors rank for target keywords

The system auto-derives target keywords from recipe frontmatter (`title`, `keywords[]`, `recipeCuisine`) and runs weekly via cron. Results are archived as JSON snapshots in the repo and surfaced as a weekly GitHub Issue with a readable ranking report.

## Why This Approach

- **GSC is the authoritative source** — ranking data comes directly from Google, not estimated
- **Serper.dev supplements with competitor visibility** — see who else ranks for your keywords
- **Zero cost** — both services are free at this scale (~32 pages, ~54 keywords/week)
- **Historical archival solves GSC's 16-month retention limit** — JSON snapshots in the repo give unlimited history
- **GitHub Issues as reports** — readable, commentable, closable weekly summaries
- **Auto-derived keywords** — no manual keyword list to maintain; grows with content

## Key Decisions

1. **Data sources**: GSC API (own rankings) + Serper.dev (competitor SERP tracking)
2. **Keyword strategy**: Auto-derive from recipe frontmatter (title, keywords, cuisine). ~2-3 keywords per recipe, ~54 total keywords/week. Well within Serper.dev's 2,500/month free tier.
3. **Output format**: JSON snapshots committed to `data/seo/rankings-YYYY-MM-DD.json` + weekly GitHub Issue with formatted report
4. **Schedule**: Weekly (Monday morning), aligning with the existing weekly SEO audit cadence (Sunday night Lighthouse)
5. **Authentication**: Google Cloud service account with JSON key stored as GitHub Actions secret; Serper.dev API key as secret

## Architecture

### New Files

```
.github/workflows/weekly-seo-ranking.yml    # GitHub Action workflow
scripts/seo/fetch-gsc-rankings.js           # Fetch data from GSC API
scripts/seo/fetch-serp-rankings.js          # Fetch SERP data from Serper.dev
scripts/seo/generate-report.js              # Compare with previous week, generate Issue body
scripts/seo/derive-keywords.js              # Extract target keywords from recipe frontmatter
data/seo/rankings-YYYY-MM-DD.json           # Weekly JSON snapshots (committed)
```

### Data Flow

```
Cron (Monday 8 AM UTC)
  → derive-keywords.js: Read recipe MDX frontmatter → extract keywords per page
  → fetch-gsc-rankings.js: Query GSC API with ["page", "query"] dimensions
  → fetch-serp-rankings.js: Query Serper.dev for each derived keyword
  → generate-report.js: Merge data, compare with last week's snapshot, compute deltas
  → Commit JSON snapshot to data/seo/
  → Create GitHub Issue with formatted markdown report
```

### Report Contents

The weekly GitHub Issue should include:

- **Top movers** (biggest position improvements this week)
- **Declining pages** (biggest position drops)
- **New keywords** (keywords that appeared this week for the first time)
- **Per-page summary table**: page URL, top keyword, avg position, clicks, impressions, CTR, week-over-week change
- **Competitor snapshot**: for top 10 target keywords, who ranks in positions 1-10
- **Action items**: pages with position 5-20 that could move to page 1 with optimization ("striking distance")

### Secrets Required

| Secret | Source |
|--------|--------|
| `GSC_SERVICE_ACCOUNT_KEY` | Base64-encoded Google Cloud service account JSON key |
| `SERPER_API_KEY` | API key from serper.dev dashboard |

### Setup Steps (one-time)

1. Create Google Cloud project, enable Search Console API
2. Create service account, download JSON key
3. Add service account email as Owner in GSC property settings
4. Sign up for Serper.dev free tier, get API key
5. Add both secrets to GitHub repo settings

## Scope Boundaries

### In Scope
- Weekly GSC data fetch (position, clicks, impressions, CTR per page/keyword)
- Weekly SERP scraping via Serper.dev for auto-derived keywords
- JSON archival in repo
- GitHub Issue report with week-over-week comparison
- Auto-derived keywords from recipe frontmatter

### Out of Scope (for now)
- Manual keyword override file (can add later)
- Dashboard UI or visualization (GitHub Issues are sufficient at this scale)
- Real-time rank monitoring (weekly cadence is appropriate for a blog)
- Automated SEO fixes based on ranking data (that's the existing weekly-seo-audit.yml's job)
- Google Analytics / traffic data integration
- Core Web Vitals field data (CrUX) — Lighthouse lab data already covers this

## Open Questions

None — all key decisions resolved during brainstorming.

## Technical Notes

- GSC API has a 2-3 day data delay; the script should query for the 7-day window ending 3 days ago
- GSC reports *average* position across all impressions (varies by location, device, personalization)
- Serper.dev gives a point-in-time SERP snapshot from one location — treat as directional, not absolute
- GSC rate limits are generous (1,200 queries/min per site) — no concern at this scale
- The `googleapis` and `google-auth-library` npm packages handle GSC auth; may want them as devDependencies or in a local scripts package.json
