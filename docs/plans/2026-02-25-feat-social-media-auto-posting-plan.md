---
title: "feat: Automatic Social Media Posting on Recipe Publish"
type: feat
status: active
date: 2026-02-25
origin: docs/brainstorms/2026-02-25-social-media-automation-brainstorm.md
---

# feat: Automatic Social Media Posting on Recipe Publish

## Overview

Automatically post to Instagram and Pinterest when a new recipe is published to Date My Dish. A GitHub Action triggers on push to `main`, detects new recipe MDX files, generates bilingual captions using Claude, waits for Cloudflare deploy to complete, then posts via direct API calls. Includes a staggered backfill of existing recipes and automated token refresh.

**Goal:** Drive blog traffic from social media to datemydish.com with zero manual posting effort.

## Problem Statement / Motivation

Every new recipe requires manual creation of social media posts — writing captions, selecting hashtags, formatting for each platform. This is time-consuming and easy to forget. Both Instagram (`@datemydishdotcom`) and Pinterest (`datemydish`) accounts exist but are underutilized. Pinterest is especially valuable for recipe blogs due to its search-driven, evergreen nature.

The blog already has rich structured frontmatter (title, description, keywords, tags, cuisine, occasion, dateNightTips) that can power automated caption generation — this data is human-reviewed and SEO-optimized, making it ideal input for social posts.

## Proposed Solution

Three GitHub Action workflows:

1. **`social-post-on-deploy.yml`** — Triggers on push to `main`, detects new EN recipe MDX files, generates captions, posts to Instagram + Pinterest after Cloudflare deploy completes
2. **`social-backfill.yml`** — Manual dispatch, staggers existing recipes over days (1-2/day)
3. **`token-refresh.yml`** — Scheduled every 25 days, refreshes Instagram + Pinterest tokens

Plus a Node.js script (`scripts/social-post.mjs`) that handles frontmatter parsing, caption generation, API calls, and error reporting.

## Technical Approach

### Architecture

```
┌─────────────────────────────────────────────────────┐
│                  GitHub Actions                      │
│                                                      │
│  ┌──────────────┐  ┌────────────┐  ┌──────────────┐ │
│  │ social-post- │  │  social-   │  │   token-     │ │
│  │ on-deploy    │  │  backfill  │  │   refresh    │ │
│  │ (on: push)   │  │ (manual)   │  │ (scheduled)  │ │
│  └──────┬───────┘  └─────┬──────┘  └──────┬───────┘ │
│         │                │                 │         │
│         └────────┬───────┘                 │         │
│                  ▼                         ▼         │
│      ┌───────────────────┐    ┌────────────────────┐ │
│      │ scripts/           │    │ scripts/            │ │
│      │ social-post.mjs    │    │ refresh-tokens.mjs  │ │
│      └─────────┬─────────┘    └────────────────────┘ │
│                │                                      │
└────────────────┼──────────────────────────────────────┘
                 │
    ┌────────────┼────────────┐
    ▼            ▼            ▼
┌────────┐ ┌──────────┐ ┌──────────┐
│ Claude │ │Instagram │ │Pinterest │
│  API   │ │Graph API │ │ API v5   │
└────────┘ └──────────┘ └──────────┘
```

### Implementation Phases

#### Phase 1: Foundation — Script + Pinterest Posting

Build the core script and start with Pinterest (simpler API, single POST call, no two-step publish flow).

**Tasks:**
- [x] Create `scripts/social-post.mjs` with frontmatter parser (use `gray-matter` or manual YAML parsing)
- [x] Implement Pinterest pin creation (`POST /v5/pins` with `image_url` source type)
- [x] Implement caption/description generation using Anthropic API (`@anthropic-ai/sdk`)
- [x] Create `social-post-on-deploy.yml` workflow (Pinterest only first)
- [ ] Add GitHub Secrets: `PINTEREST_ACCESS_TOKEN`, `PINTEREST_REFRESH_TOKEN`, `PINTEREST_CLIENT_ID`, `PINTEREST_CLIENT_SECRET`, `PINTEREST_BOARD_ID`
- [x] Implement deploy health check (poll recipe URL until 200)
- [x] Implement hero image URL resolution (fetch deployed page, extract from JSON-LD)

**Success criteria:** New recipe push → Pinterest pin created with correct image, title, description, and link.

**Files:**
- `scripts/social-post.mjs` (new)
- `.github/workflows/social-post-on-deploy.yml` (new)
- `package.json` (add `gray-matter` + `@anthropic-ai/sdk` dev deps)

#### Phase 2: Instagram Integration

Add Instagram Graph API posting (more complex: two-step publish, Meta Business account required).

**Tasks:**
- [ ] Set up Meta Business account + Facebook Page linked to `@datemydishdotcom`
- [ ] Generate long-lived Instagram access token
- [x] Add Instagram API logic to `scripts/social-post.mjs`:
  - Step 1: `POST /{ig-user-id}/media` (create container with image URL + caption)
  - Step 2: `POST /{ig-user-id}/media_publish` (publish container)
  - Poll container status until ready before publishing
- [x] Generate bilingual captions (EN + FR in one post) via Claude
- [ ] Add GitHub Secrets: `INSTAGRAM_ACCESS_TOKEN`, `INSTAGRAM_USER_ID`
- [x] Update workflow to post to both platforms

**Success criteria:** New recipe push → Instagram post with bilingual caption + Pinterest pin both created.

**Files:**
- `scripts/social-post.mjs` (update)
- `.github/workflows/social-post-on-deploy.yml` (update)

#### Phase 3: Token Refresh + Backfill

Automate token lifecycle and populate existing recipes.

**Tasks:**
- [x] Create `scripts/refresh-tokens.mjs` for token refresh logic
- [x] Create `.github/workflows/token-refresh.yml` (scheduled every 25 days)
  - Refresh Instagram long-lived token via `GET /oauth/access_token?grant_type=fb_exchange_token`
  - Refresh Pinterest access + refresh tokens via `POST /v5/oauth/token`
  - Update GitHub Secrets programmatically via GitHub API (`PUT /repos/{owner}/{repo}/actions/secrets/{name}`)
- [x] Create `.github/workflows/social-backfill.yml` (manual dispatch)
  - Input: `recipes_per_day` (default 2), `start_delay_hours` (default 0)
  - Lists all EN recipes, filters already-posted ones (via a tracking file or GitHub issue labels)
  - Staggers posts using `sleep` or scheduled matrix jobs
- [x] Create tracking mechanism for posted recipes (e.g., `data/social-posts-log.json` committed to repo)

**Success criteria:** Tokens auto-refresh without intervention. Backfill populates both platforms with existing recipes over 1-2 weeks.

**Files:**
- `scripts/refresh-tokens.mjs` (new)
- `.github/workflows/token-refresh.yml` (new)
- `.github/workflows/social-backfill.yml` (new)
- `data/social-posts-log.json` (new — tracks which recipes have been posted)

#### Phase 4: Error Handling + Monitoring

Harden the system for production reliability.

**Tasks:**
- [x] Implement GitHub issue creation on posting failure (via `@actions/github` or `gh` CLI)
  - Include: recipe slug, platform, error message, timestamp, image URL attempted
  - Label: `social-media-failure`
- [x] Add idempotency: check `data/social-posts-log.json` before posting (prevent duplicate posts on re-runs)
- [x] Handle edge cases:
  - Multiple recipes in one push (loop and post each)
  - Recipe update (not new) — skip, only post genuinely new files
  - Missing optional fields (no dateNightTips, no tags) — caption generator handles gracefully
  - Deploy failure detection — check HTTP status of recipe page, abort if not 200
- [ ] Add workflow summary annotations for visibility

**Success criteria:** Failures create trackable issues. No duplicate posts. Graceful handling of edge cases.

**Files:**
- `scripts/social-post.mjs` (update)
- `.github/workflows/social-post-on-deploy.yml` (update)

## Technical Specifications

### New Recipe Detection (Git Diff)

```bash
# Detect new EN recipe MDX files in the push
git diff --name-only --diff-filter=A HEAD~1 -- 'src/content/recipes/en/*.mdx'
```

- `--diff-filter=A` = only **A**dded files (not modified/deleted)
- Only checks `en/` directory (EN is the primary; FR pair shares the same image)
- If the push has multiple commits, compare against the merge base

### Frontmatter Parsing

Use `gray-matter` to parse MDX frontmatter in the Node.js script:

```javascript
import matter from "gray-matter";
import { readFileSync } from "fs";

const file = readFileSync("src/content/recipes/en/cacio-e-pepe.mdx", "utf-8");
const { data } = matter(file);
// data.title, data.description, data.keywords, etc.
```

The `heroImage` field in frontmatter is a relative import path (e.g., `"../../../assets/images/recipes/cacio-e-pepe.webp"`) — this cannot be resolved to a deployed URL from frontmatter alone.

### Hero Image URL Resolution

After the Cloudflare deploy health check passes, fetch the deployed recipe page and extract the image URL from JSON-LD:

```javascript
const response = await fetch(`https://datemydish.com/en/recipes/${slug}/`);
const html = await response.text();
const jsonLdMatch = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
const jsonLd = JSON.parse(jsonLdMatch[1]);
// For Recipe type: jsonLd.image[0] gives the full hero image URL
// (Recipe JSON-LD image is always array format per CLAUDE.md)
```

### Deploy Health Check

Poll the recipe URL until it returns 200:

```javascript
async function waitForDeploy(url, maxAttempts = 30, intervalMs = 10000) {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const res = await fetch(url, { method: "HEAD" });
      if (res.ok) return true;
    } catch {}
    await new Promise(r => setTimeout(r, intervalMs));
  }
  throw new Error(`Deploy not ready after ${maxAttempts * intervalMs / 1000}s: ${url}`);
}
```

- Max wait: 5 minutes (30 attempts x 10s)
- Cloudflare Pages typically deploys in 1-2 minutes

### Caption Generation via Claude

Use the Anthropic SDK to generate platform-specific captions:

```javascript
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic(); // Uses ANTHROPIC_API_KEY env var

async function generateCaptions(recipeData) {
  const response = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",  // Fast + cheap for caption generation
    max_tokens: 1024,
    messages: [{
      role: "user",
      content: `Generate social media captions for this recipe:
Title: ${recipeData.title}
Description: ${recipeData.description}
Cuisine: ${recipeData.recipeCuisine}
Category: ${recipeData.recipeCategory.join(", ")}
Keywords: ${recipeData.keywords.join(", ")}
Tags: ${(recipeData.tags || []).join(", ")}
Occasion: ${(recipeData.occasion || []).join(", ")}
Date Night Tips: ${JSON.stringify(recipeData.dateNightTips || {})}
URL: https://datemydish.com/en/recipes/${recipeData.slug}/

Return JSON with:
1. "instagram_caption": Bilingual (EN then FR separated by a line). Include hook, description, date night tip if available, recipe link, then French version. End with 20-30 hashtags.
2. "pinterest_title": English only, max 100 chars
3. "pinterest_description": English only, SEO-optimized, max 500 chars with keywords`
    }]
  });
  return JSON.parse(response.content[0].text);
}
```

### Instagram Graph API Flow

```javascript
// Step 1: Create media container
const containerRes = await fetch(
  `https://graph.instagram.com/v21.0/${igUserId}/media`,
  {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      image_url: heroImageUrl,
      caption: instagramCaption,
      access_token: igAccessToken,
    }),
  }
);
const { id: containerId } = await containerRes.json();

// Step 2: Wait for container to be ready (poll status)
// Status transitions: IN_PROGRESS → FINISHED (or ERROR)
let status = "IN_PROGRESS";
while (status === "IN_PROGRESS") {
  await new Promise(r => setTimeout(r, 5000));
  const statusRes = await fetch(
    `https://graph.instagram.com/v21.0/${containerId}?fields=status_code&access_token=${igAccessToken}`
  );
  const statusData = await statusRes.json();
  status = statusData.status_code;
}

// Step 3: Publish
const publishRes = await fetch(
  `https://graph.instagram.com/v21.0/${igUserId}/media_publish`,
  {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      creation_id: containerId,
      access_token: igAccessToken,
    }),
  }
);
```

### Pinterest API v5 Flow

```javascript
const pinRes = await fetch("https://api.pinterest.com/v5/pins", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${pinterestAccessToken}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    board_id: pinterestBoardId,
    title: pinterestTitle,         // max 100 chars
    description: pinterestDesc,     // max 800 chars
    link: `https://datemydish.com/en/recipes/${slug}/`,
    alt_text: recipeData.heroImageAlt,  // max 500 chars
    media_source: {
      source_type: "image_url",
      url: heroImageUrl,
    },
  }),
});
```

**Rich Pins:** Automatic — Pinterest crawls the linked recipe page and extracts JSON-LD Recipe structured data. No additional setup needed since `RecipeSchema.astro` already generates complete Recipe JSON-LD.

### Token Refresh

**Instagram** (60-day long-lived token):
```javascript
// Exchange current long-lived token for a new one
const res = await fetch(
  `https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=${currentToken}`
);
const { access_token, expires_in } = await res.json();
// expires_in ≈ 5184000 (60 days)
```

**Pinterest** (30-day access token, 60-day refresh token):
```javascript
const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
const res = await fetch("https://api.pinterest.com/v5/oauth/token", {
  method: "POST",
  headers: {
    Authorization: `Basic ${credentials}`,
    "Content-Type": "application/x-www-form-urlencoded",
  },
  body: new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: currentRefreshToken,
  }),
});
const { access_token, refresh_token } = await res.json();
// BOTH tokens rotate — must store the new refresh_token too
```

**Updating GitHub Secrets programmatically** (in the refresh workflow):
```bash
# Using gh CLI (available in GitHub Actions runners)
echo "$NEW_TOKEN" | gh secret set INSTAGRAM_ACCESS_TOKEN
echo "$NEW_ACCESS" | gh secret set PINTEREST_ACCESS_TOKEN
echo "$NEW_REFRESH" | gh secret set PINTEREST_REFRESH_TOKEN
```

### GitHub Secrets Required

| Secret | Source | Refresh Cycle |
|--------|--------|---------------|
| `ANTHROPIC_API_KEY` | Already exists | None (persistent) |
| `INSTAGRAM_ACCESS_TOKEN` | Meta Developer Portal | Every 50 days (auto) |
| `INSTAGRAM_USER_ID` | Meta Developer Portal | None (persistent) |
| `PINTEREST_ACCESS_TOKEN` | Pinterest Developer Portal | Every 25 days (auto) |
| `PINTEREST_REFRESH_TOKEN` | Pinterest Developer Portal | Every 25 days (rotates with access) |
| `PINTEREST_CLIENT_ID` | Pinterest Developer Portal | None (persistent) |
| `PINTEREST_CLIENT_SECRET` | Pinterest Developer Portal | None (persistent) |
| `PINTEREST_BOARD_ID` | Pinterest API (`GET /v5/boards`) | None (persistent) |

### Content Strategy Details

**Instagram caption template** (bilingual):
```
{Hook line — e.g., "The perfect date night pasta 🍝"}
{1-2 sentence description from frontmatter}

{Date night tip if available — wine pairing, music, plating}

👉 Recipe: https://datemydish.com/en/recipes/{slug}/

---

{French version of above}

👉 Recette : https://datemydish.com/fr/recettes/{slug}/

{20-30 hashtags — mix of:
  - Niche: #datemydish #cookingfortwo #datenight
  - Cuisine: #italianfood #romanpasta
  - General: #homecooking #foodphotography #recipeblog
  - French: #cuisinemaison #recettefacile
}
```

**Pinterest pin** (English only):
- **Title:** Recipe title, max 100 chars (e.g., "Cacio e Pepe - Classic Roman Pepper Pasta")
- **Description:** SEO keyword-rich, max 500 chars, includes key selling points
- **Link:** EN recipe URL with trailing slash
- **Alt text:** From `heroImageAlt` frontmatter field

## Alternative Approaches Considered

(see brainstorm: `docs/brainstorms/2026-02-25-social-media-automation-brainstorm.md`)

1. **Cloudflare Worker + RSS** — Rejected: adds infrastructure complexity, cron delay between publish and post, caption generation requires separate AI call
2. **CLI slash command** — Rejected: not fully automatic, requires manual invocation after each recipe
3. **Third-party tools (Buffer, Make.com, Zapier)** — Rejected: monthly cost ($10-30/mo), less control over caption generation, vendor dependency

## System-Wide Impact

### Interaction Graph

```
Push to main
  → Cloudflare auto-deploy (existing, unmodified)
  → social-post-on-deploy.yml triggers (new)
    → Reads MDX frontmatter
    → Calls Anthropic API for caption generation
    → Waits for Cloudflare deploy (health check)
    → Fetches deployed page for hero image URL
    → Calls Instagram Graph API (2-step publish)
    → Calls Pinterest API v5 (single POST)
    → Updates data/social-posts-log.json
    → On failure: creates GitHub issue
```

No existing workflows are modified. The new workflow runs independently alongside Cloudflare's auto-deploy.

### Error Propagation

| Error | Impact | Handling |
|-------|--------|----------|
| Cloudflare deploy fails | Recipe page not live | Health check times out → GH issue created |
| Instagram API 401 | Token expired | GH issue with "token-expired" label |
| Pinterest API 429 | Rate limited | GH issue (unlikely for 1-2 recipes/week) |
| Claude API error | No captions generated | GH issue, post skipped |
| Multiple recipes in one push | All must be posted | Loop with per-recipe error isolation |
| `git diff` finds no new recipes | No-op | Workflow exits cleanly |

### State Lifecycle Risks

- **Duplicate posts:** Mitigated by `data/social-posts-log.json` — checked before posting, updated after success
- **Partial failure:** If Instagram succeeds but Pinterest fails (or vice versa), the log records per-platform status. Re-running only retries the failed platform.
- **Token rotation:** Pinterest refresh rotates BOTH access and refresh tokens. If the secret update fails after refresh, the old refresh token is invalidated. Mitigation: update secrets atomically, create GH issue on any refresh failure.

### API Surface Parity

No UI changes. No new user-facing features on the blog itself. Social media posting is entirely backend automation.

## Acceptance Criteria

### Functional Requirements

- [ ] New EN recipe pushed to `main` → Instagram post created within 10 minutes
- [ ] New EN recipe pushed to `main` → Pinterest pin created within 10 minutes
- [ ] Instagram caption is bilingual (EN + FR) with hashtags
- [ ] Pinterest pin has EN title, SEO description, recipe link, and hero image
- [ ] Pinterest Rich Pin data displays correctly (from existing JSON-LD)
- [ ] Multiple recipes in one push are all posted (not just the first)
- [ ] Recipe updates (modifications, not additions) do NOT trigger a new post
- [ ] Backfill workflow posts existing recipes at 1-2 per day pace
- [ ] Token refresh runs automatically every 25 days
- [ ] Posting failures create a labeled GitHub issue

### Non-Functional Requirements

- [ ] Total workflow time < 10 minutes (health check + API calls)
- [ ] No impact on existing CI workflows (Lighthouse, Playwright, SEO audit)
- [ ] Secrets stored securely in GitHub Actions Secrets (never logged)
- [ ] Idempotent: re-running the workflow does not create duplicate posts

### Quality Gates

- [ ] All API calls use proper error handling (check response status, parse error bodies)
- [ ] Tokens are never logged or exposed in workflow output
- [ ] Health check has a reasonable timeout (5 min max) and fails gracefully
- [ ] `social-posts-log.json` is committed atomically after successful posts

## Dependencies & Prerequisites

### External Account Setup (Manual, One-Time)

| Platform | Requirement | Status |
|----------|-------------|--------|
| Instagram | Professional account (Creator or Business) | Verify — `@datemydishdotcom` |
| Instagram | Meta Business Suite account | Setup needed |
| Instagram | Facebook Page linked to IG account | Setup needed |
| Instagram | Meta App with `instagram_basic`, `instagram_content_publish` permissions | Setup needed |
| Pinterest | Business account | Verify — `datemydish` |
| Pinterest | Developer app at developers.pinterest.com | Setup needed |
| Pinterest | "Recipes" board created | Setup needed |
| Pinterest | OAuth authorization completed (get initial tokens) | Setup needed |

### New Dependencies

| Package | Purpose | Install |
|---------|---------|---------|
| `gray-matter` | Parse MDX YAML frontmatter | `npm install -D gray-matter` |
| `@anthropic-ai/sdk` | Generate captions via Claude | `npm install -D @anthropic-ai/sdk` |

No production dependencies added — both are dev-only (used in scripts/CI).

## Risk Analysis & Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Meta app review takes weeks | Medium | Blocks Instagram posting | Start Pinterest first (Phase 1); Instagram can be added later |
| Instagram token expires unnoticed | Low | Posts fail silently | Automated refresh every 25 days + GH issue on refresh failure |
| Pinterest token rotation fails | Low | Posts + future refreshes fail | Store backup tokens, create GH issue with manual recovery steps |
| Cloudflare deploy slow (>5 min) | Low | Health check timeout | Increase timeout to 10 min, or post from built HTML in `dist/` |
| Hero image URL changes between deploys | None | N/A | URL fetched fresh from live page each time |
| Caption quality inconsistent | Medium | Poor social media presence | Use structured prompt with examples, review first few posts manually |
| GitHub Actions minutes exhausted | Very Low | Workflows stop | Blog publishes ~1-2 recipes/week, well within free tier |

## Future Considerations

(see brainstorm: `docs/brainstorms/2026-02-25-social-media-automation-brainstorm.md` — Future Considerations section)

- **Pinterest vertical images (2:3):** `pinterestImage` schema field already exists. Enable when 30+ recipes published.
- **Category-specific Pinterest boards:** Split "Recipes" into "Dinner", "Desserts", etc. when recipe count justifies.
- **Instagram Stories/Reels:** Separate exploration — requires video/carousel content.
- **Facebook cross-posting:** Meta Business account (from Instagram setup) enables this with minimal extra work.
- **Articles + restaurant reviews:** Future content types will get their own Pinterest boards.
- **Analytics tracking:** Add UTM parameters to recipe links (e.g., `?utm_source=instagram&utm_medium=social`).

## Workflow File Structures

### `social-post-on-deploy.yml`

```yaml
name: Social Media Post on Deploy
on:
  push:
    branches: [main]
    paths:
      - 'src/content/recipes/en/**/*.mdx'

concurrency:
  group: social-post-${{ github.sha }}
  cancel-in-progress: false

permissions:
  contents: write
  issues: write

jobs:
  post:
    runs-on: ubuntu-latest
    timeout-minutes: 15
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 2  # Need previous commit for diff
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - name: Detect new recipes
        id: detect
        run: |
          NEW_RECIPES=$(git diff --name-only --diff-filter=A HEAD~1 -- 'src/content/recipes/en/*.mdx' || true)
          echo "recipes=$NEW_RECIPES" >> $GITHUB_OUTPUT
          echo "count=$(echo "$NEW_RECIPES" | grep -c '.mdx$' || echo 0)" >> $GITHUB_OUTPUT
      - name: Post to social media
        if: steps.detect.outputs.count > 0
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
          INSTAGRAM_ACCESS_TOKEN: ${{ secrets.INSTAGRAM_ACCESS_TOKEN }}
          INSTAGRAM_USER_ID: ${{ secrets.INSTAGRAM_USER_ID }}
          PINTEREST_ACCESS_TOKEN: ${{ secrets.PINTEREST_ACCESS_TOKEN }}
          PINTEREST_BOARD_ID: ${{ secrets.PINTEREST_BOARD_ID }}
        run: node scripts/social-post.mjs ${{ steps.detect.outputs.recipes }}
      - name: Commit post log
        if: steps.detect.outputs.count > 0
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"
          git add data/social-posts-log.json
          git diff --cached --quiet || git commit -m "chore: update social posts log"
          git push
```

### `token-refresh.yml`

```yaml
name: Refresh Social Media Tokens
on:
  schedule:
    - cron: '0 12 1,25 * *'  # 1st and 25th of each month at noon UTC
  workflow_dispatch:

permissions:
  contents: read

jobs:
  refresh:
    runs-on: ubuntu-latest
    timeout-minutes: 5
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - name: Refresh tokens
        env:
          INSTAGRAM_ACCESS_TOKEN: ${{ secrets.INSTAGRAM_ACCESS_TOKEN }}
          PINTEREST_ACCESS_TOKEN: ${{ secrets.PINTEREST_ACCESS_TOKEN }}
          PINTEREST_REFRESH_TOKEN: ${{ secrets.PINTEREST_REFRESH_TOKEN }}
          PINTEREST_CLIENT_ID: ${{ secrets.PINTEREST_CLIENT_ID }}
          PINTEREST_CLIENT_SECRET: ${{ secrets.PINTEREST_CLIENT_SECRET }}
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: node scripts/refresh-tokens.mjs
```

### `social-backfill.yml`

```yaml
name: Backfill Social Media Posts
on:
  workflow_dispatch:
    inputs:
      platform:
        description: 'Platform to backfill'
        type: choice
        options: [both, instagram, pinterest]
        default: both
      recipes_per_run:
        description: 'Number of recipes to post in this run'
        type: number
        default: 2

permissions:
  contents: write
  issues: write

jobs:
  backfill:
    runs-on: ubuntu-latest
    timeout-minutes: 30
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - name: Run backfill
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
          INSTAGRAM_ACCESS_TOKEN: ${{ secrets.INSTAGRAM_ACCESS_TOKEN }}
          INSTAGRAM_USER_ID: ${{ secrets.INSTAGRAM_USER_ID }}
          PINTEREST_ACCESS_TOKEN: ${{ secrets.PINTEREST_ACCESS_TOKEN }}
          PINTEREST_BOARD_ID: ${{ secrets.PINTEREST_BOARD_ID }}
          PLATFORM: ${{ inputs.platform }}
          RECIPES_PER_RUN: ${{ inputs.recipes_per_run }}
        run: node scripts/social-post.mjs --backfill
      - name: Commit post log
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"
          git add data/social-posts-log.json
          git diff --cached --quiet || git commit -m "chore: update social posts log (backfill)"
          git push
```

## Sources & References

### Origin

- **Brainstorm document:** [docs/brainstorms/2026-02-25-social-media-automation-brainstorm.md](docs/brainstorms/2026-02-25-social-media-automation-brainstorm.md) — Key decisions carried forward: GitHub Action trigger, direct API (no third-party), bilingual Instagram / EN-only Pinterest, staggered backfill, automated token refresh, GH issue on failure.

### Internal References

- Weekly SEO audit workflow pattern: `.github/workflows/weekly-seo-audit.yml`
- Lighthouse PR check workflow pattern: `.github/workflows/lighthouse-pr-check.yml`
- Frontmatter schema: `src/content.config.ts`
- Recipe JSON-LD generation: `src/components/RecipeSchema.astro`
- RSS feed pattern: `src/pages/en/rss.xml.ts`
- Lighthouse URL generator script: `scripts/generate-lighthouse-urls.cjs`
- SEO Head (OG meta): `src/components/SEOHead.astro`
- Deploy command: `.claude/commands/deploy.md`

### External References

- [Instagram Graph API — Content Publishing](https://developers.facebook.com/docs/instagram-platform/instagram-graph-api/content-publishing)
- [Instagram Graph API — Long-Lived Tokens](https://developers.facebook.com/docs/instagram-basic-display-api/guides/long-lived-tokens)
- [Pinterest API v5 — Create Pin](https://developers.pinterest.com/docs/api/v5/pins-create/)
- [Pinterest API v5 — OAuth Token](https://developers.pinterest.com/docs/api/v5/oauth-token/)
- [Pinterest API v5 — List Boards](https://developers.pinterest.com/docs/api/v5/boards-list/)
- [Pinterest Rich Pins](https://help.pinterest.com/en/business/article/rich-pins)
- [Pinterest API Changelog — May 2025 (token changes)](https://community.pinterest.biz/t/pinterest-monthly-developer-newsletter-may-2025/33285)
- [Anthropic SDK — npm](https://www.npmjs.com/package/@anthropic-ai/sdk)
- [gray-matter — npm](https://www.npmjs.com/package/gray-matter)
