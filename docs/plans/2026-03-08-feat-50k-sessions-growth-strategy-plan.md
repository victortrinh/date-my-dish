---
title: "feat: 50K Sessions Growth Strategy — Pinterest Engine + SEO Landing Pages + Brand Voice"
type: feat
status: completed
date: 2026-03-08
origin: docs/brainstorms/2026-03-08-50k-sessions-growth-strategy-brainstorm.md
---

# 50K Sessions Growth Strategy

## Overview

Implement the remaining growth levers to take Date My Dish from near-zero to 50k sessions/month within 12-18 months. Research revealed that **4 of 6 brainstorm priorities are already built** (Cloudflare Analytics, Star Ratings, Newsletter, Share Buttons). The actual remaining work is:

1. **Multi-Pin Pinterest Automation** — 3x Pinterest surface area per recipe
2. **Occasion & Tag Landing Pages** — capture search intent with SEO-optimized listing pages
3. **Brand Voice Refresh** — rewrite content with "cheeky & confident" personality
4. **Pinterest Backfill** — get 9 unpinned recipes into the system

## Problem Statement / Motivation

The site has 16 content pieces, near-zero organic traffic, and only 2 of 11 recipes pinned to Pinterest. Pinterest is the #1 free traffic driver for food blogs (pins have months-long shelf life), and the brand's date-night niche is underserved in search. The technical SEO infrastructure is strong — what's missing is **distribution** (Pinterest), **discoverability** (landing pages), and **differentiation** (brand voice).

(see brainstorm: docs/brainstorms/2026-03-08-50k-sessions-growth-strategy-brainstorm.md)

## Proposed Solution

Three sequential phases, each independently deployable:

### Phase 1: Pinterest Growth Engine (Highest Impact, Do First)

**Goal:** 3 pins per recipe on a staggered schedule, with cheeky auto-generated title variants.

#### 1a. Extend Social Posts Log Schema

**File:** `data/social-posts-log.json`

Current structure (single pin per recipe):
```json
{
  "beef-ragu-pappardelle": {
    "pinterest": { "id": "pin123", "postedAt": "2026-03-04T..." },
    "instagram": { ... }
  }
}
```

New structure (multi-pin with variants):
```json
{
  "beef-ragu-pappardelle": {
    "pinterest": {
      "pins": [
        {
          "variant": 1,
          "id": "pin123",
          "title": "Beef Ragu Pappardelle",
          "description": "...",
          "postedAt": "2026-03-04T...",
          "status": "posted"
        },
        {
          "variant": 2,
          "title": "The Pasta That Says 'I Made This For You'",
          "description": "...",
          "scheduledFor": "2026-03-08T...",
          "status": "pending"
        },
        {
          "variant": 3,
          "title": "Slow-Cooked Date Night: Beef Ragu Worth the Wait",
          "description": "...",
          "scheduledFor": "2026-03-14T...",
          "status": "pending"
        }
      ]
    },
    "instagram": { ... }
  }
}
```

**Migration:** Write a one-time script to migrate existing 2 log entries to the new format.

#### 1b. Pre-Generate Pin Variants at Publish Time

**File:** `scripts/social-post.mjs` — extend `generateCaptions()` (~line 131)

When a recipe is first posted (pin 1), also generate titles + descriptions for pins 2 and 3 using Claude Haiku. Store all 3 variants in the log with scheduled dates:
- Pin 1: immediate (current behavior)
- Pin 2: `postedAt + 5 days` (middle of 3-7 day window)
- Pin 3: `postedAt + 12 days` (middle of 7-14 day window)

**Prompt strategy for variants:**
- Pin 2: Alternate angle — focus on occasion/dateNightTips (e.g., "The Pasta That Says 'I Made This For You'")
- Pin 3: Seasonal/lifestyle angle — focus on cuisine/difficulty/time (e.g., "20-Minute Italian That Impresses Every Time")

Use frontmatter fields: `title`, `description`, `occasion`, `dateNightTips`, `recipeCuisine`, `keywords`, `difficulty`, `totalTime`, `impressFactor`.

#### 1c. Update Idempotency Logic

**File:** `scripts/social-post.mjs` — `processRecipe()` (~line 379)

Current: skips if `existing.pinterest?.id` exists (any pin = done).
New: skip only if all 3 variants have `status: "posted"`. Pin 1 logic unchanged; pins 2-3 handled by scheduler.

#### 1d. Build Scheduled Pin Rotation Workflow

**New file:** `.github/workflows/pinterest-pin-rotation.yml`

```yaml
# Runs daily at 10 AM UTC (good Pinterest posting time)
on:
  schedule:
    - cron: '0 10 * * *'
```

Logic:
1. Read `data/social-posts-log.json`
2. Find all variants where `status === "pending"` and `scheduledFor <= now`
3. Post each via Pinterest API (reuse posting logic from `social-post.mjs`)
4. Update log entry: set `status: "posted"`, add `id` and `postedAt`
5. Commit updated log back to main
6. Rate limit: 10-second delay between posts, max 5 pins per run

**New file:** `scripts/pinterest-rotate.mjs` (or extend `social-post.mjs` with a `--rotate` flag)

#### 1e. Run Pinterest Backfill

After 1a-1d are deployed:
1. Run `social-post.mjs --backfill` to post pin 1 for 9 unpinned recipes
2. The updated script auto-generates and stores variants 2-3 for each
3. The daily cron picks up pending variants over the next 2 weeks

**Acceptance criteria:**
- [x]Log schema supports multiple pin variants per recipe with status tracking
- [x]Existing 2 log entries migrated to new format without data loss
- [x]Pin variants 2-3 auto-generated at publish time with cheeky titles
- [x]Daily cron workflow posts pending pins on schedule
- [x]Backfill completes: all 11 recipes have pin 1 posted + variants 2-3 scheduled
- [x]Idempotency: re-running backfill or cron is safe (no duplicate pins)
- [x]Rate limiting: max 5 pins per cron run, 10s delay between posts

---

### Phase 2: SEO Landing Pages (Occasion + Curated Tags)

**Goal:** Create listing pages that capture search intent for "date night recipes", "quick vegetarian pasta", etc.

#### 2a. Occasion Landing Pages

**Key decision:** Follow the category pattern — localized slugs with a mapping table.

**Occasion Slug Map** (add to `src/i18n/utils.ts`):

| Canonical (EN key) | EN slug | FR slug |
|---|---|---|
| date-night | date-night | soiree-en-amoureux |
| weeknight | weeknight | soir-de-semaine |
| entertaining | entertaining | recevoir |
| comfort | comfort | reconfort |
| celebration | celebration | celebration |
| quick-meal | quick-meal | repas-rapide |

**Route mapping** (add to `routeMap` in `src/i18n/utils.ts`):
- EN: `/en/recipes/occasion/{slug}/`
- FR: `/fr/recettes/occasion/{slug}/`

**New files:**
- `src/pages/en/recipes/occasion/[occasion].astro` — mirrors `[category].astro` pattern
- `src/pages/fr/recettes/occasion/[occasion].astro` — FR equivalent

**Page features** (mirror category pages):
- Occasion filter chip navigation showing all occasions
- Recipe cards filtered by `occasion` field containing the current occasion
- `ItemList` JSON-LD schema
- Pinterest `viewcategory` tracking event
- Hreflang alternates via `getAlternateUrl()`
- Meta title: "Date Night Recipes | Date My Dish" / "Recettes pour soiree en amoureux | Date My Dish"
- Unique meta descriptions per occasion

**New i18n functions:**
- `getOccasionLocalizedPath(locale, occasion)` — build occasion URL
- Add occasion routes to `getAlternateUrl()` in `routeMap`

#### 2b. Curated Tag Landing Pages

**Key decision:** Only generate tag pages for tags with **2+ recipes** to avoid thin content.

**Tag audit** (current tags across 11 recipes — generate pages only for those with 2+):

Tags likely qualifying: `italian`, `pasta`, `vegetarian`, `quick`, `date-night`, `comfort-food`, `vegan`, `healthy` (audit needed at implementation time since tag counts will grow with new weekly recipes).

**Curated Tag Slug Map** (add to `src/i18n/utils.ts`):

| Canonical | EN slug | FR slug |
|---|---|---|
| italian | italian | italien |
| pasta | pasta | pates |
| vegetarian | vegetarian | vegetarien |
| quick | quick | rapide |
| date-night | date-night | soiree-en-amoureux |
| comfort-food | comfort-food | cuisine-reconfort |
| ... | ... | ... |

*Full map built at implementation time based on actual tag counts.*

**New files:**
- `src/pages/en/recipes/tag/[tag].astro`
- `src/pages/fr/recettes/etiquette/[tag].astro`

**Page features:**
- Same as occasion pages: recipe cards, ItemList JSON-LD, hreflang, filter chips
- `getStaticPaths()` only generates pages for tags with 2+ recipes
- As new recipes are published, tag pages auto-expand (Astro rebuilds on deploy)

#### 2c. Internal Linking

- **Recipe pages:** Make `tags` in frontmatter render as clickable pills linking to `/en/recipes/tag/{tag}/` (currently displayed but not linked)
- **Recipe pages:** Make `occasion` pills clickable → `/en/recipes/occasion/{occasion}/`
- **Recipe listing page:** Add "Browse by Occasion" section with links to occasion pages
- **Footer:** Add occasion links alongside existing category links
- **Sitemap:** Verify new pages are included (Astro should handle automatically)

**Acceptance criteria:**
- [x]Occasion pages generated for all 6 occasions (EN + FR)
- [x]Tag pages generated only for tags with 2+ recipes (EN + FR)
- [x]Language toggle works correctly on all new pages
- [x]Hreflang tags are bidirectional and correct
- [x]ItemList JSON-LD schema on all listing pages
- [x]Tags and occasions are clickable links on recipe pages
- [x]"Browse by Occasion" section on recipe listing page
- [x]All new pages appear in sitemap
- [x]Empty state: if a tag drops below 2 recipes, page is not generated
- [x]`occasionSlugMap` and `tagSlugMap` added to i18n utils

---

### Phase 3: Brand Voice Refresh (Phased Rollout)

**Goal:** Rewrite existing content with "cheeky & confident" PG-13 voice. Food is the star, personality is the seasoning.

(see brainstorm: docs/brainstorms/2026-03-08-50k-sessions-growth-strategy-brainstorm.md — Decision #1)

#### 3a. Create Brand Voice Style Guide

**New file:** `docs/brand-voice-guide.md`

Contents:
- Voice definition: "Confident home cook impressing a date. Witty without trying too hard."
- 3 before/after examples for EN recipe prose
- 3 before/after examples for FR recipe prose (Quebec French register)
- Explicit boundaries: cheeky tone for prose/descriptions/FAQs, **not** for cooking instructions (keep those clear and authoritative)
- Tone calibration for articles: authoritative-with-personality for technique/science articles, warmer for lifestyle articles

#### 3b. Phased Content Refresh (3-4 pieces per week)

**Week 1-3:** EN recipes (11 pieces)
- Rewrite MDX prose body with cheeky voice
- Refresh `description` (meta description) — max 160 chars, personality-infused
- Refresh FAQ `answer` fields — witty but helpful
- Update `heroImageAlt` if too generic
- Set `updatedDate` to refresh date
- Do NOT change titles or slugs (URL stability)

**Week 4:** EN articles (5 pieces)
- Lighter touch: authoritative-with-personality, not full cheeky
- Technical articles (MSG, wok hei, velveting) stay informative; add voice in intros/conclusions
- Lifestyle articles (steak date night) get fuller cheeky treatment

**Week 5-7:** FR translations
- Translate refreshed EN content using Quebec French conventions
- Adapt humor to Quebec French register (per style guide examples)

**Why phased:** Bulk meta description changes can trigger Google quality re-evaluation. 3-4 per week is safe and lets you monitor impact via Cloudflare Analytics and GSC.

**Acceptance criteria:**
- [x]Brand voice style guide created with EN + FR examples
- [x]All 11 EN recipes refreshed with new voice
- [x]All 5 EN articles refreshed (calibrated tone per article type)
- [x]All 16 FR translations updated to match
- [x]`updatedDate` set on every refreshed piece
- [x]No title or slug changes (URL stability)
- [x]Cooking instructions remain clear and authoritative (not cheeky)

---

## Technical Considerations

### Architecture
- Occasion/tag pages follow the exact same pattern as existing category pages — no new patterns introduced
- Multi-pin log schema is backward-compatible (migration script handles existing entries)
- Pin rotation workflow is a new GitHub Actions cron job, independent of deploy workflow

### Performance
- No runtime performance impact — all new pages are static (Astro SSG)
- Pin rotation cron capped at 5 pins/run to respect Pinterest rate limits

### SEO Risks
- **Tag page thin content:** Mitigated by 2+ recipe threshold and `getStaticPaths()` filtering
- **Bulk description changes:** Mitigated by phased rollout (3-4/week)
- **Occasion page cannibalization:** Low risk — occasion intent is distinct from category intent ("date night dinner" vs "dinner recipes")

### i18n
- Occasion and tag slug maps follow established `categorySlugMap` pattern
- All new page types need entries in `routeMap` for `getAlternateUrl()` to work
- FR occasion/tag slugs must be SEO-friendly in French (not English canonical keys in FR URLs)

## System-Wide Impact

- **Interaction graph:** Pin rotation workflow reads/writes `social-posts-log.json` and calls Pinterest API. Deploy workflow also writes this file — ensure no race condition (cron and deploy unlikely to overlap, but add file locking or sequential job constraint if needed).
- **API surface parity:** Occasion pages must support same features as category pages: filter chips, language toggle, breadcrumbs, JSON-LD, Pinterest tracking events.
- **State lifecycle:** Pin variant `status` transitions: `pending` → `posted` (or `failed`). Failed pins should be retried on next cron run, not stuck forever.

## Dependencies & Risks

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| Pinterest API rate limits at scale | Medium | Cap at 5 pins/run, 10s delay, daily cron spreads load |
| Tag pages with <2 recipes after content changes | Low | `getStaticPaths()` re-evaluates on every build |
| Brand voice inconsistency across 32 pieces | Medium | Style guide with examples created before any rewriting |
| Pinterest algorithm changes | Medium | Diversified strategy (Pinterest + SEO + newsletter) |
| Log file race condition (deploy + cron) | Low | Cron runs at 10 AM UTC, deploys are manual/on-push — unlikely overlap |

## Success Metrics

| Metric | Baseline | 3-Month Target | 12-Month Target |
|--------|----------|----------------|-----------------|
| Monthly sessions | ~0 | 500-2,000 | 15,000-35,000 |
| Pinterest impressions | ~0 | 5,000+ | 50,000+ |
| Pins posted | 2 | 33 (11 recipes x 3) | 100+ |
| Google indexed pages | ~20 | 40+ (with occasion/tag pages) | 80+ |
| Newsletter subscribers | 0 | 50+ | 500+ |
| Recipe pages with rich snippets | 11 | 11 (already done) | All |

## Implementation Sequence

```
Phase 1: Pinterest Growth Engine (~1 week dev)
├── 1a. Extend log schema + migration script
├── 1b. Pre-generate pin variants in social-post.mjs
├── 1c. Update idempotency logic
├── 1d. Build pinterest-pin-rotation.yml + rotate script
└── 1e. Run backfill (all 11 recipes get 3 pins)

Phase 2: SEO Landing Pages (~1 week dev)
├── 2a. Occasion pages (EN + FR) + slug map + i18n routing
├── 2b. Tag pages (EN + FR) + curated tag map + threshold filtering
└── 2c. Internal linking (clickable tags/occasions, footer, listing page)

Phase 3: Brand Voice Refresh (~5-7 weeks content)
├── 3a. Create style guide with EN + FR examples
├── 3b. Refresh EN recipes (weeks 1-3, 3-4/week)
├── 3c. Refresh EN articles (week 4)
└── 3d. Update FR translations (weeks 5-7)
```

Phases 1 and 2 can run in parallel (no dependencies). Phase 3 is content work that runs after dev is done.

## What's NOT in Scope

- Paid ads (revisit when data shows which recipes convert)
- Video/Reels content
- Guest posting / backlink outreach
- Increasing content publishing pace
- Pinterest-optimized vertical images (`pinterestImage` field — revisit when content library grows)
- Multiple Pinterest boards (single board for v1)
- Recipe scaling / bookmarks (UX features, don't drive traffic)

## Sources & References

### Origin
- **Brainstorm document:** [docs/brainstorms/2026-03-08-50k-sessions-growth-strategy-brainstorm.md](../brainstorms/2026-03-08-50k-sessions-growth-strategy-brainstorm.md) — Key decisions: hybrid Pinterest+SEO strategy, cheeky brand voice, 3-pin automation, free tools only, phased rollout
- **Prior growth brainstorm:** [docs/brainstorms/2026-03-03-full-growth-stack-brainstorm.md](../brainstorms/2026-03-03-full-growth-stack-brainstorm.md) — 4 of 10 items already implemented

### Internal References
- Social post workflow: `.github/workflows/social-post-on-deploy.yml`
- Social post script: `scripts/social-post.mjs` (Pinterest API at line 282, caption generation at line 131)
- Social posts log: `data/social-posts-log.json`
- Category page pattern: `src/pages/en/recipes/category/[category].astro`
- i18n utilities: `src/i18n/utils.ts` (routeMap, categorySlugMap, getAlternateUrl)
- Recipe schema: `src/components/RecipeSchema.astro`
- Recipe page: `src/pages/en/recipes/[...slug].astro`
- Content config: `src/content.config.ts`
