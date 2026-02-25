---
title: Automatic Social Media Posting Integration (Instagram + Pinterest)
date: 2026-02-25
module: social-media
problem_type: integration-issues
severity: medium
symptoms:
  - Manual recipe posting to Instagram and Pinterest required after each publish
  - No automated caption generation from recipe frontmatter data
  - Bilingual content (EN/FR) not automatically distributed to social platforms
  - Pinterest SEO metadata not auto-generated from recipe structured data
root_cause: >
  No automated social media distribution pipeline existed. Recipe data
  (frontmatter, JSON-LD, hero images) was already structured and SEO-optimized
  but required manual copy-paste to create social posts.
status: partial - manual API account setup pending
tags:
  - automation
  - github-actions
  - instagram-api
  - pinterest-api
  - claude-ai
  - bilingual
  - cloudflare-pages
  - token-refresh
---

# Automatic Social Media Posting (Instagram + Pinterest)

## Problem

Publishing a recipe requires manually creating social posts on Instagram and Pinterest — writing captions, selecting hashtags, formatting per platform. This is time-consuming, easy to forget, and blocks the goal of driving blog traffic from social media.

## Solution

Three GitHub Actions workflows + two Node.js scripts that automatically post to both platforms when a new recipe is pushed to `main`.

### Architecture

```
Push new recipe to main
  -> social-post-on-deploy.yml triggers
  -> git diff detects new EN recipe MDX files
  -> scripts/social-post.mjs:
     1. Parse frontmatter (gray-matter)
     2. Wait for Cloudflare deploy (poll until 200)
     3. Fetch deployed page, extract hero image URL from JSON-LD
     4. Find FR translation for bilingual caption
     5. Generate captions via Claude Haiku API
     6. POST to Instagram Graph API (2-step: container + publish)
     7. POST to Pinterest API v5 (single request)
     8. Update data/social-posts-log.json (idempotency)
     9. On failure: create GitHub issue
```

### Files

| File | Purpose |
|------|---------|
| `scripts/social-post.mjs` | Core: frontmatter parsing, caption generation, API posting, error handling |
| `scripts/refresh-tokens.mjs` | Refreshes Instagram + Pinterest tokens, updates GitHub Secrets |
| `.github/workflows/social-post-on-deploy.yml` | Triggers on push to main with new EN recipes |
| `.github/workflows/social-backfill.yml` | Manual dispatch to stagger-post existing recipes |
| `.github/workflows/token-refresh.yml` | Scheduled 1st + 25th of month for token refresh |
| `data/social-posts-log.json` | Idempotency log keyed by recipe slug |
| `docs/guides/social-media-api-setup.md` | Manual setup steps for API accounts and tokens |

### Key Implementation Details

**New recipe detection** — Only newly added EN files trigger posting:
```bash
git diff --name-only --diff-filter=A HEAD~1 -- 'src/content/recipes/en/*.mdx'
```

**Deploy health check** — Polls recipe URL every 10s for up to 5 minutes:
```javascript
async function waitForDeploy(slug) {
  const url = `${SITE_URL}/en/recipes/${slug}/`;
  for (let i = 0; i < 30; i++) {
    const res = await fetch(url, { method: "HEAD" });
    if (res.ok) return;
    await new Promise((r) => setTimeout(r, 10_000));
  }
  throw new Error(`Deploy not ready after 300s`);
}
```

**Hero image URL resolution** — Extracted from deployed page's JSON-LD (not frontmatter, since Astro content-hashes image filenames at build time):
```javascript
const html = await (await fetch(recipeUrl)).text();
const match = html.match(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/);
const jsonLd = JSON.parse(match[1]);
const imageUrl = Array.isArray(jsonLd.image) ? jsonLd.image[0] : jsonLd.image;
```

**Caption generation** — Claude Haiku generates structured JSON from recipe frontmatter:
- `instagram_caption`: Bilingual EN+FR with hashtags
- `pinterest_title`: EN only, max 100 chars
- `pinterest_description`: EN only, SEO-optimized, max 500 chars

**Instagram** — Two-step Content Publishing API:
1. `POST /{ig-user-id}/media` (create container with image URL + caption)
2. Poll container status until `FINISHED`
3. `POST /{ig-user-id}/media_publish` (publish live)

**Pinterest** — Single `POST /v5/pins` with `image_url` media source. Rich Pins are automatic since the linked page already has Recipe JSON-LD.

**Idempotency** — `data/social-posts-log.json` tracks per-recipe, per-platform status:
```json
{
  "cacio-e-pepe": {
    "instagram": { "id": "179234...", "postedAt": "2026-02-25T14:30:00Z" },
    "pinterest": { "id": "987654...", "postedAt": "2026-02-25T14:31:00Z" }
  }
}
```

**Token refresh** — Scheduled GitHub Action runs `scripts/refresh-tokens.mjs`:
- Instagram: `GET /refresh_access_token?grant_type=ig_refresh_token` (60-day tokens)
- Pinterest: `POST /v5/oauth/token` with `grant_type=refresh_token` (30-day access, 60-day refresh — both rotate)
- Secrets updated via `gh secret set`

**Failure handling** — Creates labeled GitHub issues:
```javascript
execSync(`gh issue create --title "..." --body "..." --label "social-media-failure"`);
```

## Manual Setup Still Required

All code is implemented. These manual steps must be completed before the automation runs:

### Pinterest (~30 minutes)

1. Verify `datemydish` is a Business account
2. Create "Recipes" board
3. Create developer app at developers.pinterest.com
4. Complete OAuth flow to get initial tokens
5. Get board ID via `GET /v5/boards`
6. Add 5 GitHub secrets: `PINTEREST_CLIENT_ID`, `PINTEREST_CLIENT_SECRET`, `PINTEREST_ACCESS_TOKEN`, `PINTEREST_REFRESH_TOKEN`, `PINTEREST_BOARD_ID`

### Instagram (~1 hour + 1-5 day review)

1. Convert `@datemydishdotcom` to Business account (not Creator)
2. Create Facebook Page, link to IG account
3. Set up Meta Business Suite + Meta App
4. Request `instagram_content_publish` permission (requires App Review)
5. Generate long-lived token via Graph API Explorer
6. Get Instagram User ID via `/me` endpoint
7. Add 2 GitHub secrets: `INSTAGRAM_ACCESS_TOKEN`, `INSTAGRAM_USER_ID`

### Verification

```bash
# Pinterest
curl -H "Authorization: Bearer $PINTEREST_ACCESS_TOKEN" "https://api.pinterest.com/v5/boards"

# Instagram
curl "https://graph.instagram.com/v21.0/me?fields=id,username&access_token=$INSTAGRAM_ACCESS_TOKEN"
```

### First Run

Test with backfill workflow: Actions tab -> "Backfill Social Media Posts" -> Run workflow -> `recipes_per_run: 1`

Full setup guide: `docs/guides/social-media-api-setup.md`

## Prevention Strategies

### Token Expiry
- Auto-refresh runs twice monthly (1st and 25th)
- Pinterest access tokens expire in 30 days, refresh tokens in 60 days — both rotate on refresh
- Instagram tokens expire in 60 days
- On refresh failure, a GitHub issue is created automatically
- **If tokens expire**: Re-authorize manually following setup guide, update secrets

### API Changes
- Pin Instagram Graph API version in URLs (`v21.0`) — update when Meta deprecates
- Monitor Pinterest API changelog (v5 stable since 2023, `notes` field removed Oct 2025)
- May 2025: Pinterest switched to continuous refresh tokens (60-day, rotatable)

### Image URL Resolution
- Depends on JSON-LD being present on deployed page
- If `RecipeSchema.astro` changes output format, the regex extraction will break
- Recipe JSON-LD `image` must stay as array format `[url]` (per CLAUDE.md)

### Duplicate Posts
- `social-posts-log.json` is checked before every post and updated after
- Concurrency groups prevent parallel workflow runs
- Backfill respects the log — re-running only retries failed platforms

### Deploy Timing
- Health check allows 5 minutes for Cloudflare Pages (typically 1-2 min)
- Skipped in backfill mode (assumes already deployed)
- If timeout: GitHub issue created, no partial post

## Monitoring

| Cadence | Action |
|---------|--------|
| After each deploy | Check Actions tab for green/red on social-post workflow |
| Weekly | Scan for `social-media-failure` labeled issues |
| Monthly | Verify token refresh workflow ran successfully |
| Quarterly | Review Instagram/Pinterest API changelogs |

## Cross-References

- **Origin brainstorm**: `docs/brainstorms/2026-02-25-social-media-automation-brainstorm.md`
- **Implementation plan**: `docs/plans/2026-02-25-feat-social-media-auto-posting-plan.md`
- **Setup guide**: `docs/guides/social-media-api-setup.md`
- **Workflow pattern model**: `.github/workflows/weekly-seo-audit.yml` (Claude Code GH Action, scheduled cron, concurrency groups)
- **Recipe schema**: `src/content.config.ts` (frontmatter fields used for caption generation)
- **JSON-LD generation**: `src/components/RecipeSchema.astro` (image extraction depends on this)
- **Cloudflare deploy**: `docs/solutions/build-errors/cloudflare-pages-absolute-url-redirects.md`
