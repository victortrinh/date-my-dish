# Full Growth Stack Brainstorm

**Date:** 2026-03-03
**Status:** Decided
**Approach:** Full Growth Stack — ship all growth levers in one coordinated sprint

## What We're Building

A comprehensive set of features to increase sessions and page views across all growth channels: SEO, social media, engagement, and retention. The blog currently has 10 recipes and 5 articles with excellent technical SEO but near-zero organic traffic (2 impressions, 0 clicks in GSC).

### Features

1. **Fix Pinterest token** — Broken `boards:write` scope prevents pin creation
2. **Social media backfill** — Post remaining 9 recipes to Instagram + Pinterest
3. **User star ratings** — localStorage-based ratings with AggregateRating in JSON-LD (Google Rich Results stars)
4. **Newsletter capture** — ConvertKit (Kit) free tier (10K subscribers), embed form on recipe/article pages
5. **Comments** — Disqus free tier, universal login (Google/Facebook/email), on recipe + article pages
6. **Platform-specific share buttons** — Pinterest "Pin It", Facebook, X/Twitter (replacing generic Web Share only)
7. **Cloudflare Web Analytics** — Add beacon script to BaseLayout for behavior tracking
8. **Fix dead internal links** — Articles reference 5+ non-existent recipes (pan-seared-ribeye, spicy-miso-ramen, etc.)
9. **Recipe scaling** — 1x/2x/3x multiplier for ingredient quantities
10. **Save/bookmark recipes** — localStorage-based favorites with a "My Recipes" page or section

## Why This Approach

- **Content pace stays at 1 recipe/week + 1 article/week** — can't accelerate content, so we maximize value from every piece
- **Pinterest is the #1 untapped channel** — food blogs routinely get 30-60% of traffic from Pinterest. It's currently broken.
- **User ratings → Rich Results stars** — AggregateRating markup shows star ratings in Google SERPs, which can 2-3x CTR
- **Newsletter builds owned audience** — stops complete dependency on search/social algorithms
- **Comments add UGC** — user-generated content helps SEO (fresh content signals, long-tail keywords) and engagement
- **Analytics enables data-driven decisions** — can't improve what you can't measure
- **Engagement features (scaling, bookmarks) increase time-on-site** — positive ranking signals

## Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Analytics provider | Cloudflare Web Analytics | Free, already on Cloudflare, privacy-friendly, zero setup cost |
| Newsletter provider | ConvertKit (Kit) | Free tier (10K subs), popular with food bloggers, automations available |
| Comment system | Disqus (free tier) | Universal login, no GitHub requirement for food blog audience |
| Rating storage | localStorage | No backend needed, AggregateRating still valid per Google guidelines for editorial ratings |
| Recipe scaling | Client-side JS | Parse frontmatter quantities, multiply with 1x/2x/3x buttons |
| Bookmark storage | localStorage | Simple, no auth required, "My Recipes" section on homepage or nav |
| Share buttons | Platform-specific + existing Web Share | Add Pin It, Facebook, X alongside existing generic share button |
| Dead links fix | Remove or replace with existing recipe links | Don't create placeholder content |

## Implementation Notes

### User Ratings → Rich Results
- Star rating component (1-5 stars) on each recipe page
- Store rating + count in localStorage per recipe slug
- Inject `AggregateRating` into existing `RecipeSchema.astro` JSON-LD
- Note: Google accepts editorial/site-level ratings — doesn't require authenticated users
- Dark mode styling needed for star component

### ConvertKit Newsletter
- Embed form component (HTML form posting to ConvertKit)
- Place after recipe content and in footer
- Bilingual CTA text via i18n system
- GDPR-friendly: ConvertKit handles double opt-in

### Disqus Comments
- Embed via `<script>` with shortname config
- Place below recipe/article content, above related recipes
- Dark mode: Disqus auto-detects or can be themed
- Bilingual: Disqus handles interface language
- `is:inline` script pattern to match existing JS conventions

### Pinterest Fix
- Debug token scope: needs `boards:write` permission
- May need to re-authorize the Pinterest app with correct scopes
- Once fixed, run social backfill workflow for all 10 recipes

### Recipe Scaling
- Parse ingredient `items` strings for quantities (numbers, fractions)
- Buttons: 1x / 2x / 3x (keep original as default)
- Update displayed quantities client-side
- Preserve original in frontmatter (scaling is display-only)
- Handle: whole numbers, fractions (1/2, 3/4), ranges (2-3), "to taste", "pinch of"

### Cloudflare Web Analytics
- Single beacon script in `BaseLayout.astro` `<head>`
- Get token from Cloudflare dashboard
- Privacy: no cookies, no PII, GDPR-compliant by default

### Dead Links
- Articles with broken links: truth-about-msg, why-not-wash-chicken, and potentially others
- Strategy: replace with links to existing recipes or remove the cross-reference

### Bookmark/Save Feature
- Heart/bookmark icon on recipe cards and recipe pages
- localStorage array of saved recipe slugs
- "Saved Recipes" accessible from nav or homepage section
- Works per-locale (save EN slug, show EN card)

## Open Questions

_None — all key decisions resolved during brainstorming._

## Estimated Impact

| Feature | Traffic Impact | Effort |
|---------|---------------|--------|
| Fix Pinterest + backfill | HIGH — Pinterest is #1 food blog traffic source | Low |
| User ratings (Rich Results) | HIGH — 2-3x CTR from star ratings in SERPs | Medium |
| Newsletter (ConvertKit) | MEDIUM — builds owned audience, drives return visits | Low |
| Comments (Disqus) | LOW-MEDIUM — UGC helps SEO long-term | Low |
| Share buttons | MEDIUM — Pin It drives Pinterest discovery | Low |
| Cloudflare Analytics | INDIRECT — enables data-driven optimization | Low |
| Fix dead links | LOW — removes SEO penalties | Low |
| Recipe scaling | LOW — engagement/time-on-site signal | Medium |
| Bookmarks | LOW — retention/return visits | Medium |

## Out of Scope

- Increasing content publishing pace (staying at 1 recipe/week + 1 article/week)
- Pinterest-specific tall images (deferred until 30+ recipes)
- Paid advertising
- Guest posting / link building campaigns
- Video content
- Self-hosted analytics (Umami)
- Custom comment system
