# Social Media Automation for Recipe Publishing

**Date:** 2026-02-25
**Status:** Brainstorm
**Author:** Victor + Claude

## What We're Building

Fully automatic social media posting to Instagram and Pinterest when a new recipe is published to Date My Dish. A GitHub Action triggers on push to `main`, detects new recipe MDX files, generates captions with hashtags using Claude, and posts to both platforms via their APIs. Includes a one-time staggered backfill of existing ~9 recipes.

## Why This Approach

**GitHub Action on deploy** was chosen over Cloudflare Worker (added infra complexity, cron delay) and CLI slash command (not fully automatic). Key reasons:

- Fits existing CI patterns — the repo already uses Claude Code GitHub Actions for weekly SEO audits
- Truly automatic — no manual step between publishing a recipe and social posting
- Free — uses GitHub Actions minutes (well within free tier for a blog)
- Full control over caption generation, hashtags, and posting logic

## Key Decisions

1. **Platforms:** Instagram + Pinterest (both accounts already exist: `@datemydishdotcom` on IG, `datemydish` on Pinterest)
2. **Trigger:** GitHub Action on push to `main` — diffs recipe MDX files to detect new additions
3. **Caption generation:** Claude generates captions from recipe frontmatter (title, description, keywords, tags, cuisine, occasion, dateNightTips)
4. **Language strategy:**
   - **Instagram:** Bilingual caption (English + French in one post) — common for Canadian food creators, maximizes reach
   - **Pinterest:** English-only — search-driven platform, English has far more recipe search volume
5. **Backfill:** Stagger existing recipes over ~1-2 weeks (1-2 per day) via a manually-dispatched workflow
6. **Images:** Use hero images from recipe frontmatter. Pinterest-specific vertical images deferred (already in schema as `pinterestImage` but not needed until 30+ recipes)
7. **Automation level:** Fully automatic — no review step. Captions are generated from structured frontmatter data which is already human-reviewed
8. **Direct API:** No third-party tools (Buffer, Make.com) — use Instagram Graph API and Pinterest API directly to avoid monthly costs

## Platform API Requirements

### Instagram Graph API
- Requires Meta Business account + Facebook Page linked to Instagram Professional account
- Content Publishing API: `POST /{ig-user-id}/media` + `POST /{ig-user-id}/media_publish`
- Token: Long-lived token (60-day expiry) — needs automated refresh or manual renewal
- Image: Must be publicly accessible URL (not local file) — use the deployed hero image URL from datemydish.com
- Rate limits: 25 posts per 24 hours (more than enough)

### Pinterest API v5
- Requires Pinterest Business account + API app
- Create Pin: `POST /pins`
- Token: OAuth 2.0 with refresh tokens (longer-lived)
- Image: Can be URL — use deployed hero image
- Board: Need to create/select a target board (e.g., "Date My Dish Recipes")

## Content Strategy

### Instagram Post Template
- **Image:** Recipe hero image (landscape, from deployed site URL)
- **Caption structure:**
  - Hook line (from recipe title + cuisine)
  - Brief description (from frontmatter `description`)
  - Date night tip if available (from `dateNightTips`)
  - Link to recipe (EN version)
  - French translation separator (`---` or emoji)
  - French version of above
  - Hashtag block (generated from `keywords`, `tags`, `recipeCuisine`, `recipeCategory`)
- **Target:** 20-30 hashtags mixing niche + broad

### Pinterest Pin Template
- **Image:** Recipe hero image
- **Title:** Recipe title (max 100 chars)
- **Description:** SEO-optimized description with keywords (from frontmatter `description` + `keywords`)
- **Link:** Recipe URL on datemydish.com (EN version)
- **Board:** "Date My Dish Recipes" (or category-specific boards later)

## Data Flow

```
Push to main
  → GitHub Action triggers
  → Diff MDX files against previous commit
  → For each new recipe:
    → Read frontmatter (title, description, heroImage, keywords, tags, etc.)
    → Generate Instagram caption (bilingual) via Claude
    → Generate Pinterest description via Claude
    → Resolve hero image URL (https://datemydish.com/_astro/{processed-image})
    → POST to Instagram Graph API
    → POST to Pinterest API v5
    → Log success/failure
```

## Resolved Questions

1. **Instagram image URL timing:** Add a health check — poll the deployed site URL until the recipe page is live before posting to social media. Ensures hero images are publicly accessible.

2. **Token storage and refresh:** Automated refresh via a scheduled GitHub Action that refreshes the Instagram long-lived token every ~50 days. Tokens stored as GitHub Secrets.

3. **Failure handling:** On failure, create a GitHub issue with error details for manual retry/investigation. No automatic retry.

4. **Pinterest boards:** Start with a single "Recipes" board. Future content types (articles, restaurant reviews) will get their own boards. Category sub-boards (Dinner, Desserts, etc.) can be added later when recipe count justifies it.

## Future Considerations (Out of Scope)

- Pinterest-specific vertical images (2:3) — deferred until 30+ recipes, `pinterestImage` schema field already exists
- Category-specific Pinterest boards — revisit at 30+ recipes
- Articles and restaurant reviews boards — when those content types are added
- Instagram Stories/Reels automation — separate exploration needed
- Facebook cross-posting — could be added since Meta Business account is already required
