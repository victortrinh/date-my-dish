# Migrate GitHub Actions to Claude Code Scheduled Tasks

**Date**: 2026-03-23
**Goal**: Replace `ANTHROPIC_API_KEY` usage in GitHub Actions with Claude Max scheduled remote agents, eliminating API pay-as-you-go costs.
**Approach**: Hybrid prompt + convention (file-based handoff between GH Actions and scheduled tasks).

## Architecture Overview

```
Notion --(GH Action fetches)--> notion/pending-*.json on main
                                       |
              Scheduled Task (Claude Max) picks up
                                       |
                    Generates content, creates PR
                                       |
                         You review & merge
                                       |
              GH Action posts to social --> Pinterest/Instagram
```

GH Actions handle external API calls (Notion, Pinterest, Instagram, Cloudflare KV). Scheduled tasks handle all Claude-powered content generation, SEO analysis, and internal linking.

## Workflow Migration Map

### Moves to Scheduled Tasks (Claude Max)

| Current Workflow | New Scheduled Task | Schedule | What it does |
|---|---|---|---|
| `auto-publish-recipe` (Claude part) | `publish-recipe` | Thu 3AM UTC | Reads `notion/pending-recipe.json`, generates EN/FR MDX, optimizes images, creates PR |
| `auto-publish-article` (Claude part) | `publish-article` | Mon 3AM UTC | Same pattern for articles |
| `auto-publish-review` (Claude part) | `publish-review` | Wed 3AM UTC | Same pattern for reviews |
| `weekly-seo-audit` (Claude part) | `weekly-seo-audit` | Sun 5AM UTC | Reads Lighthouse results from `data/lighthouse/`, runs `/bulk-audit`, creates PR with fixes |
| `seo-auto-optimize` | `weekly-seo-optimize` | Mon 10AM UTC | Checks `data/seo/` for new ranking data (after Mon 8AM ranking run), optimizes underperformers, creates PR |
| `reverse-internal-linking` | `daily-internal-linking` | Daily 5AM UTC | Scans for new content missing internal links, adds them, creates PR |

### Stays on GitHub Actions (slimmed, no Claude)

| Workflow | Changes |
|---|---|
| `auto-publish-recipe` (Notion fetch only) | Slimmed to: fetch Notion, write `pending-recipe.json`, commit to main |
| `auto-publish-article` (Notion fetch only) | Same pattern |
| `auto-publish-review` (Notion fetch only) | Same pattern |
| `social-post-on-deploy` | Remove Claude caption generation, read pre-generated captions from MDX frontmatter |
| `social-backfill` | Same change as social-post-on-deploy |
| `token-refresh` | No changes |
| `weekly-seo-ranking` | No changes |
| `pinterest-pin-rotation` | No changes |
| `pinterest-update-pins` | No changes |
| `seed-rating` | No changes |
| `playwright-*`, `lighthouse-*`, `auto-merge` | No changes |

### Deleted (fully replaced by scheduled tasks)

- `seo-auto-optimize.yml`
- `reverse-internal-linking.yml`

### Slimmed (keeps Lighthouse, removes Claude)

- `weekly-seo-audit.yml` - keeps Lighthouse CI run, commits results to `data/lighthouse/`, removes Claude analysis step. The scheduled task consumes the Lighthouse output.

### Post-Merge GH Action (new)

- `post-merge-kv-seed.yml` - Triggered on PR merge when recipe MDX files are added. Runs `scripts/seed-rating-to-kv.mjs` with Cloudflare secrets. KV seeding is removed from the content generation step and moved here because the remote agent has no access to CF secrets. Trigger: `on: pull_request: types: [closed]` with merge check and path filter on `src/content/recipes/en/**/*.mdx`.

## Handoff Protocol

### Pending Files

```
notion/
  pending-recipe.json     # Dropped by GH Action when Notion has a ready recipe
  pending-article.json    # Same for articles
  pending-review.json     # Same for reviews
  published.json          # Existing - tracks what's been published
```

### Lifecycle

1. GH Action (cron) fetches from Notion, finds ready content.
2. GH Action writes `notion/pending-recipe.json`, commits to main.
3. Scheduled task (cron, 2 hours later) clones repo, finds `pending-recipe.json`.
4. Scheduled task generates MDX, optimizes images, creates PR.
5. Scheduled task removes `pending-recipe.json` in the same PR.
6. You merge PR. Pending file gone, `published.json` updated.

### Pending File Schema

```json
{
  "source": "notion",
  "fetchedAt": "2026-03-24T03:00:00Z",
  "notionPageId": "abc123",
  "title": "Penne all'Arrabbiata",
  "blocks": [],
  "images": [
    {
      "localPath": "src/assets/images/recipes/penne-arrabbiata.webp",
      "caption": "Penne all'Arrabbiata in a white bowl",
      "isHero": true
    }
  ]
}
```

**Image handling**: The GH Action downloads images from Notion and commits them to `src/assets/images/` alongside the pending file. The `images` array contains committed file paths (not URLs). The scheduled task references these paths in MDX frontmatter. No image downloading needed in the scheduled task.

### No-op Behavior

- If no pending file exists, the content publishing tasks exit cleanly.
- `weekly-seo-optimize` checks git log for `data/seo/` changes in last 24h. No changes = exit.
- `daily-internal-linking` checks git log for new content in last 24h. No changes = exit.

### Stale Pending File Handling

If a pending file is older than 7 days (checked via `fetchedAt`), the scheduled task should still process it but add a note to the PR body: "Note: this content was fetched {N} days ago."

### Stale PR Cleanup

Each content-publishing scheduled task must, before creating a new PR:
1. Run `gh pr list --label auto-publish --state open` to find stale PRs.
2. Close any open PRs from previous runs with a comment: "Superseded by newer content."

## Scheduled Task Prompts

### publish-recipe (Thu 3AM UTC)

```
You are a content publishing agent for Date My Dish.

1. Check if `notion/pending-recipe.json` exists. If not, exit with message "No pending recipe."
2. Close any open PRs labeled "auto-publish" using: gh pr list --label auto-publish --state open --json number -q '.[].number' | xargs -I {} gh pr close {} --comment "Superseded by newer content."
3. Read the pending file and CLAUDE.md to understand the project.
4. Use the /new-recipe skill to scaffold EN/FR MDX files.
5. Use the Notion data to fill in all frontmatter fields.
6. Generate a socialCaption (instagram + pinterest) and include in frontmatter.
7. Use /write-prose to generate the EN blog body (800-1500 words).
8. Use /translate-recipe to create the FR version.
9. Use /optimize-image on any downloaded images.
10. Use /humanizer on all generated copy.
11. Run /seo-audit on the new recipe.
12. Remove notion/pending-recipe.json and update notion/published.json.
13. Create a PR titled "feat(recipe): add {recipe-name}" labeled "auto-publish" with all changes.
```

### publish-article (Mon 3AM UTC)

Same pattern as publish-recipe, substituting article equivalents (`/new-article`, `/translate-article`, `pending-article.json`).

### publish-review (Wed 3AM UTC)

Same pattern, substituting review equivalents (`pending-review.json`). Reviews use a different content schema with restaurant-specific fields (address, cuisine, priceRange, dateScore, dishHighlights).

### weekly-seo-audit (Sun 5AM UTC)

```
You are an SEO audit agent for Date My Dish.

1. Read CLAUDE.md for project context.
2. Check if data/lighthouse/ has recent results. If so, review them for performance issues.
3. Run /bulk-audit on all content.
4. If issues are found, fix them.
5. If any changes were made, create a PR titled "fix(seo): weekly audit fixes - {date}".
6. If no issues found, exit with message "All content passed audit."
```

### weekly-seo-optimize (Mon 10AM UTC)

Runs once per week, 2 hours after `weekly-seo-ranking` (Mon 8AM UTC) to ensure fresh data.

```
You are an SEO optimization agent for Date My Dish.

1. Read CLAUDE.md for project context.
2. Check git log for changes to data/seo/ in the last 48 hours. If none, exit.
3. Read the latest ranking data from data/seo/.
4. Identify underperforming content (declining rankings, low CTR).
5. Optimize meta descriptions, titles, and content for those pages.
6. Use /humanizer on any rewritten copy.
7. Create a PR titled "fix(seo): optimize underperforming content - {date}".
```

### daily-internal-linking (Daily 5AM UTC)

```
You are an internal linking agent for Date My Dish.

1. Read CLAUDE.md for project context.
2. Check git log for new content merged in the last 24 hours. If none, exit.
3. Scan all existing recipes, articles, and reviews for opportunities to link to the new content.
4. Add natural internal links where relevant (max 2-3 per existing page).
5. Use /humanizer on any rewritten sentences.
6. Create a PR titled "fix(seo): add internal links for new content - {date}".
```

## Slimmed GitHub Actions

### Notion Fetch Workflows (recipe/article/review)

Each runs 2 hours before its corresponding scheduled task.

| Workflow | Cron |
|---|---|
| Fetch pending recipe | Thu 1AM UTC |
| Fetch pending article | Mon 1AM UTC |
| Fetch pending review | Wed 1AM UTC |

Pattern:

```yaml
name: Fetch Pending Recipe from Notion
on:
  schedule:
    - cron: '0 1 * * 4'
  workflow_dispatch:

jobs:
  fetch:
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      - uses: actions/checkout@v6
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - name: Fetch from Notion
        run: node scripts/fetch-notion-recipe.mjs
        env:
          NOTION_TOKEN: ${{ secrets.NOTION_TOKEN }}
      - name: Commit pending file if created
        run: |
          if [ -f notion/pending-recipe.json ]; then
            git config user.name "github-actions[bot]"
            git config user.email "github-actions[bot]@users.noreply.github.com"
            git add notion/pending-recipe.json notion/published.json "src/assets/images/**"
            git commit -m "chore: fetch pending recipe from Notion"
            git push
          fi
```

### Social Post Modifications

Remove Claude caption generation from `social-post-on-deploy.yml` and `social-backfill.yml`. Instead, read pre-generated captions from MDX frontmatter `socialCaption` field.

## Schema Changes

### Add `socialCaption` to content schemas

In `src/content.config.ts`, add to recipe, article, and review schemas:

```typescript
socialCaption: z.object({
  instagram: z.string().optional(),
  pinterest: z.string().optional(),
}).optional(),
```

The scheduled task generates these captions during content creation.

**Fallback for existing content**: Recipes published before this migration won't have `socialCaption`. The social posting scripts must fall back to generating a caption from `title` + `description` if `socialCaption` is absent. No Claude API call needed for this fallback, just string templates.

## Prerequisites

### Required Before Migration

1. **Connect GitHub**: Run `/web-setup` or install the Claude GitHub App so remote agents can clone the repo and create PRs.
2. **Environment**: Use `claude-code-default` (id: `env_015N1h8xMvzHg7PAJhmo8dvb`).
3. **Verify environment capabilities**: Run a test scheduled task that confirms: Node.js available, `npm ci` works, ImageMagick/sharp available for image optimization, full git history accessible (not shallow clone).
4. **Commit `data/ratings.json` to repo**: Currently generated at build time via `scripts/fetch-ratings.mjs` (needs CF secrets). For the remote agent to run `npm run check`, this file must exist in the repo. Add a GH Action step that periodically commits an updated `data/ratings.json` to main, or ensure `npm run check` does not require it.

### Script Changes

1. Modify `scripts/fetch-notion-recipe.mjs` (and article/review variants) to strip out the Claude API call and just write `notion/pending-*.json` with raw Notion data + downloaded images.
2. Modify `scripts/social-post.mjs` to read `socialCaption` from MDX frontmatter instead of calling Claude Haiku API. Fall back to `title` + `description` template for content without `socialCaption`. Remove the `@anthropic-ai/sdk` import.
3. Add `socialCaption` to content schema.
4. Update `social-post-on-deploy.yml` and `social-backfill.yml` to remove `ANTHROPIC_API_KEY` env var (no longer needed after script change).
5. Update `weekly-seo-audit.yml` to keep Lighthouse CI steps, add a commit step for `data/lighthouse/` results, remove the Claude analysis steps.

### Secrets

**Can remove after migration verified:**
- `ANTHROPIC_API_KEY`

**Stay unchanged:**
- `NOTION_TOKEN`, `CREATE_PR_TOKEN`, `PAT_TOKEN`
- `CF_ACCOUNT_ID`, `CF_API_TOKEN`, `CF_KV_NAMESPACE_ID`
- `PINTEREST_*`, `INSTAGRAM_*`
- `GSC_SERVICE_ACCOUNT_KEY`, `SERPER_API_KEY`

## Implementation Order

1. Prerequisites (GitHub connection via `/web-setup`)
2. Verify remote agent environment (run test task: Node.js, npm ci, ImageMagick, git history depth)
3. Ensure `data/ratings.json` is committed or `npm run check` works without it
4. Add `socialCaption` to content schema in `src/content.config.ts`
5. Modify `fetch-notion-*.mjs` scripts to write `notion/pending-*.json` files (strip Claude API call)
6. Slim down the 3 auto-publish GH Actions (Notion fetch only, cron 2h before scheduled tasks)
7. Create `post-merge-kv-seed.yml` GH Action for Cloudflare KV rating seeding on recipe PR merge
8. Slim down `weekly-seo-audit.yml` (keep Lighthouse, commit results to `data/lighthouse/`, remove Claude)
9. Create 3 content publishing scheduled tasks (publish-recipe, publish-article, publish-review)
10. Create weekly-seo-audit scheduled task (Sun 5AM UTC, after Lighthouse at 3AM)
11. Create weekly-seo-optimize scheduled task (Mon 10AM UTC, after ranking data at 8AM)
12. Create daily-internal-linking scheduled task
13. Modify social posting workflows to use frontmatter captions (with template fallback for old content)
14. Delete fully replaced workflows (`seo-auto-optimize.yml`, `reverse-internal-linking.yml`)
15. Test each scheduled task with manual "Run Now"
16. Remove `ANTHROPIC_API_KEY` from GitHub secrets

## Rollback Plan

If a scheduled task produces poor results:
1. PRs act as a safety gate. Don't merge bad PRs.
2. Re-enable the original GH Action workflow (still in git history).
3. Re-add `ANTHROPIC_API_KEY` to secrets if needed.

Keep original workflow files in git history for at least 30 days after migration is verified working.
