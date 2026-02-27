---
title: "feat: Auto-publish Notion articles via weekly GitHub Action"
type: feat
status: completed
date: 2026-02-27
origin: docs/brainstorms/2026-02-27-auto-publish-notion-articles-brainstorm.md
---

# feat: Auto-publish Notion articles via weekly GitHub Action

A weekly GitHub Actions workflow that automatically publishes or updates 1 article per week from Notion. A shell step queries the Notion API for "Ready to Publish" articles, cross-references `notion/published.json`, and either selects the oldest unpublished article (new publish) or detects an already-published article whose Notion page was edited after its `lastSyncedDate` (update). Then `claude-code-action` generates or regenerates full EN+FR MDX article pairs (rewritten prose, frontmatter, translated content), downloads and optimizes the Notion hero image, and creates a PR that auto-merges after CI passes. New articles take priority over updates. (see brainstorm: docs/brainstorms/2026-02-27-auto-publish-notion-articles-brainstorm.md)

## Acceptance Criteria

- [x] New workflow file `.github/workflows/auto-publish-article.yml`
- [x] Runs weekly on Monday 3 AM UTC via cron (`0 3 * * 1`)
- [x] Supports `workflow_dispatch` for manual triggering
- [x] Has concurrency group `auto-publish-article` with `cancel-in-progress: false`
- [x] Queries Notion API for articles with Status = "Ready to Publish" and Post Type = "Informative Posts"
- [x] Cross-references with `notion/published.json` to exclude already-published articles
- [x] Selects the oldest unpublished article (lowest Recipe # first)
- [x] When no new articles: checks published articles for Notion edits newer than `lastSyncedDate`
- [x] Selects the oldest stale article for update (lowest Recipe # first)
- [x] Exits gracefully (no PR, no error) when no new or stale articles remain
- [x] Closes stale `auto-article/` PRs before creating a new one (label: `auto-article`)
- [x] Invokes `claude-code-action` to generate (new) or regenerate (update) EN + FR MDX article pair
- [x] Claude downloads hero image from Notion, converts to WebP, resizes to max 1200px/<200KB
- [x] Claude generates EN MDX with schema-compliant frontmatter + 800-1500 word SEO prose
- [x] Claude generates FR MDX translation with Quebec French conventions
- [x] EN/FR `translationSlug` values are bidirectionally correct
- [x] Claude updates `notion/published.json` — adds new entry (publish) or updates `lastSyncedDate` (update)
- [x] Claude runs `npm run check` to validate schema compliance
- [x] Workflow runs `npm run check && npm run build` after Claude to verify the build
- [x] PR gets `auto-article` label for identification
- [x] Auto-merge applies via existing `auto-merge.yml` (squash, waits for CI)
- [x] Creates GitHub issue on workflow failure for visibility
- [x] New secrets documented: `NOTION_API_TOKEN`, `NOTION_DATABASE_ID`

## Context

### Existing patterns to follow

**`weekly-seo-audit.yml`** (`.github/workflows/weekly-seo-audit.yml`) — Primary template:
- Cron + workflow_dispatch trigger (lines 3-6)
- Concurrency group (lines 8-10)
- Permissions: contents write, pull-requests write, issues write (lines 12-15)
- Setup: checkout, node 20, npm ci, build (lines 22-33)
- Stale PR cleanup by label (lines 56-63)
- `claude-code-action` with structured prompt and restricted tools (lines 66-116)
- Post-Claude label step (lines 135-144)

**`auto-merge.yml`** — Already enables squash auto-merge on ALL PRs (no changes needed).

**`notion/published.json`** — Existing tracking file keyed by Recipe #, with fields: `notionTitle`, `slug`, `type`, `publishedDate`, `lastSyncedDate`, `status`.

**Article MDX template** — `src/content/articles/en/wok-hei-at-home.mdx` (lines 1-42 frontmatter, 44-123 prose). Required fields: title, lang, translationSlug, description (max 160), publishDate, heroImage, heroImageAlt, keywords, articleCategory, faqs (min 1).

### Key architectural decisions

1. **Two-phase approach**: Shell script handles deterministic selection (Notion API query + published.json cross-reference). Claude handles creative work (content generation, translation, images). This keeps selection logic predictable and avoids wasting Claude API tokens when no articles are available.

2. **Claude accesses Notion API via curl**: Rather than writing a full block-to-markdown converter script, Claude fetches page blocks via Notion API (curl) and handles the conversion as part of content generation. Claude is excellent at interpreting structured JSON and converting to prose.

3. **Image conversion via ImageMagick**: `ubuntu-latest` runners have ImageMagick pre-installed. Claude uses `convert` command for PNG/JPG to WebP conversion and resizing. No additional dependencies needed.

### Notion API property mapping

> **Note**: These property names must be verified against the actual Notion database. The CSV column names may differ from Notion API property names.

| CSV Column | Likely Notion Property | Type | Filter Syntax |
|------------|----------------------|------|---------------|
| Recipe # | `Recipe #` | number | `number.equals` |
| Status | `Status` | status | `status.equals` |
| Post Type | `Post Type` | select | `select.equals` |
| Post Title | `Post Title` or `Name` | title | `title.equals` |

## Implementation

### 1. Add GitHub secrets

Add two new secrets to the repository:
- `NOTION_API_TOKEN` — Notion integration token (user already has one)
- `NOTION_DATABASE_ID` — The UUID of the "Date My Dish Blog Posts" database

### 2. Create the workflow file

**`.github/workflows/auto-publish-article.yml`**

```yaml
name: Auto-Publish Article

on:
  schedule:
    - cron: '0 3 * * 1' # Monday 3 AM UTC
  workflow_dispatch:

concurrency:
  group: auto-publish-article
  cancel-in-progress: false

permissions:
  contents: write
  pull-requests: write
  issues: write

jobs:
  publish:
    runs-on: ubuntu-latest
    timeout-minutes: 60
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 1

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      - run: npm ci

      # Step 1: Query Notion and select next article
      - name: Select next article from Notion
        id: select
        env:
          NOTION_API_TOKEN: ${{ secrets.NOTION_API_TOKEN }}
          NOTION_DATABASE_ID: ${{ secrets.NOTION_DATABASE_ID }}
        run: |
          # Query Notion for Ready to Publish articles
          RESPONSE=$(curl -s "https://api.notion.com/v1/databases/${NOTION_DATABASE_ID}/query" \
            -H "Authorization: Bearer ${NOTION_API_TOKEN}" \
            -H "Notion-Version: 2022-06-28" \
            -H "Content-Type: application/json" \
            -d '{
              "filter": {
                "and": [
                  {"property": "Status", "status": {"equals": "Ready to Publish"}},
                  {"property": "Post Type", "select": {"equals": "Informative Posts"}}
                ]
              },
              "sorts": [{"property": "Recipe #", "direction": "ascending"}]
            }')

          # Check for API errors
          if echo "$RESPONSE" | jq -e '.object == "error"' > /dev/null 2>&1; then
            echo "Notion API error: $(echo "$RESPONSE" | jq -r '.message')"
            exit 1
          fi

          # Extract results with Recipe # and page IDs
          ARTICLES=$(echo "$RESPONSE" | jq '[.results[] | {
            page_id: .id,
            recipe_num: (.properties["Recipe #"].number // 0 | tostring),
            title: ([.properties["Post Title"].title[]?.plain_text // .properties.Name.title[]?.plain_text] | join(""))
          }]')

          # Read published.json and get already-published Recipe #s
          PUBLISHED=$(jq -r '.entries | keys[]' notion/published.json 2>/dev/null || echo "")

          # Filter out already-published articles
          UNPUBLISHED=$(echo "$ARTICLES" | jq --arg published "$PUBLISHED" '
            ($published | split("\n") | map(select(. != ""))) as $pub_list |
            map(select(.recipe_num as $rn | $pub_list | index($rn) | not))
          ')

          COUNT=$(echo "$UNPUBLISHED" | jq 'length')
          echo "Found $COUNT unpublished articles"

          if [ "$COUNT" -gt 0 ]; then
            # Priority 1: Publish new article (oldest by Recipe #)
            SELECTED=$(echo "$UNPUBLISHED" | jq '.[0]')
            MODE="publish"
          else
            # Priority 2: Check for updated articles (Notion edits since last sync)
            # Get all "Ready to Publish" articles that ARE in published.json
            ALL_ARTICLES=$(echo "$RESPONSE" | jq '[.results[] | {
              page_id: .id,
              recipe_num: (.properties["Recipe #"].number // 0 | tostring),
              title: ([.properties["Post Title"].title[]?.plain_text // .properties.Name.title[]?.plain_text] | join("")),
              last_edited: .last_edited_time
            }]')

            # Find articles where Notion's last_edited_time > published.json's lastSyncedDate
            STALE=$(echo "$ALL_ARTICLES" | jq --slurpfile pub notion/published.json '
              ($pub[0].entries // {}) as $entries |
              map(select(
                .recipe_num as $rn |
                $entries[$rn] != null and
                (.last_edited > ($entries[$rn].lastSyncedDate + "T23:59:59Z"))
              ))
            ')

            STALE_COUNT=$(echo "$STALE" | jq 'length')
            echo "Found $STALE_COUNT stale (updated in Notion) articles"

            if [ "$STALE_COUNT" -eq 0 ]; then
              echo "found=false" >> $GITHUB_OUTPUT
              echo "No new or updated articles found. Exiting."
              exit 0
            fi

            # Select oldest stale article
            SELECTED=$(echo "$STALE" | jq 'sort_by(.recipe_num | tonumber) | .[0]')
            MODE="update"
          fi

          PAGE_ID=$(echo "$SELECTED" | jq -r '.page_id')
          RECIPE_NUM=$(echo "$SELECTED" | jq -r '.recipe_num')
          TITLE=$(echo "$SELECTED" | jq -r '.title')

          echo "Mode: ${MODE} | Selected: #${RECIPE_NUM} - ${TITLE}"
          echo "found=true" >> $GITHUB_OUTPUT
          echo "mode=${MODE}" >> $GITHUB_OUTPUT
          echo "page_id=${PAGE_ID}" >> $GITHUB_OUTPUT
          echo "recipe_num=${RECIPE_NUM}" >> $GITHUB_OUTPUT

          # Write selection details for Claude (include mode and existing slug for updates)
          if [ "$MODE" = "update" ]; then
            EXISTING_SLUG=$(jq -r --arg rn "$RECIPE_NUM" '.entries[$rn].slug' notion/published.json)
            echo "$SELECTED" | jq --arg mode "$MODE" --arg slug "$EXISTING_SLUG" '. + {mode: $mode, existing_slug: $slug}' > notion-article-selection.json
          else
            echo "$SELECTED" | jq --arg mode "$MODE" '. + {mode: $mode}' > notion-article-selection.json
          fi

      # Step 2: Close stale auto-article PRs
      - name: Close stale auto-article PRs
        if: steps.select.outputs.found == 'true'
        run: |
          OPEN_PRS=$(gh pr list --label "auto-article" --state open --json number --jq '.[].number')
          for PR in $OPEN_PRS; do
            gh pr close "$PR" --comment "Superseded by new auto-publish run."
          done
        env:
          GH_TOKEN: ${{ github.token }}

      # Step 3: Claude generates the article
      - name: Claude Code Article Generation
        if: steps.select.outputs.found == 'true'
        uses: anthropics/claude-code-action@v1
        with:
          anthropic_api_key: ${{ secrets.ANTHROPIC_API_KEY }}
          prompt: |
            You are running the automated article publishing pipeline for Date My Dish.

            ## Input
            Read `notion-article-selection.json` for the selected article's Notion page ID, Recipe #, title, and `mode` ("publish" or "update").
            - **publish mode**: Create new EN+FR MDX files and a new published.json entry.
            - **update mode**: The article was already published but has been edited in Notion. The `existing_slug` field contains the current EN slug. Regenerate the EN+FR MDX files in-place (overwrite), keeping the same slugs and `publishDate`, but updating content and `lastSyncedDate` in published.json.

            ## Environment
            The Notion API token is available as NOTION_API_TOKEN environment variable.
            Use it with curl: `curl -H "Authorization: Bearer $NOTION_API_TOKEN" -H "Notion-Version: 2022-06-28"`

            ## Your Tasks

            ### 1. Fetch article content from Notion
            Use the Notion API to fetch the page blocks:
            ```
            curl -s "https://api.notion.com/v1/blocks/{page_id}/children?page_size=100" \
              -H "Authorization: Bearer $NOTION_API_TOKEN" \
              -H "Notion-Version: 2022-06-28"
            ```
            Parse the block JSON to extract the article's text content, section headings, FAQ entries, and image URLs.
            Handle pagination if `has_more` is true.

            ### 2. Download and optimize the hero image
            Find the first image block in the Notion page. Download it:
            ```
            curl -sL "{image_url}" -o /tmp/hero-original.png
            ```
            Convert to WebP, resize to max 1200px wide, quality 82:
            ```
            convert /tmp/hero-original.png -resize '1200x>' -quality 82 src/assets/images/articles/{slug}.webp
            ```
            If the result exceeds 200KB, reduce quality incrementally until it fits.

            ### 3. Generate the EN slug
            Derive an SEO-friendly English slug from the title:
            - Lowercase, replace spaces with hyphens
            - Remove special characters (colons, apostrophes, parentheses, ampersands)
            - Keep it concise (3-6 words max)
            - Examples from existing articles:
              - "Here's How to Get Wok Hei at Home for a Memorable Date Night" → `wok-hei-at-home`
              - "The Truth About MSG: A Flavor-Boosting Superstar for Your Date Night" → `truth-about-msg`
              - "Why You Shouldn't Wash Chicken on Date Night (and What to Do Instead)" → `why-not-wash-chicken`

            ### 4. Generate the FR slug
            Create a meaningful French translation of the slug concept:
            - Examples:
              - `wok-hei-at-home` → `wok-hei-a-la-maison`
              - `truth-about-msg` → `verite-sur-le-msg`
              - `why-not-wash-chicken` → `pourquoi-ne-pas-laver-le-poulet`

            ### 5. Generate EN MDX file
            Create `src/content/articles/en/{en-slug}.mdx` with:

            **Frontmatter** (match schema exactly — see `src/content/articles/en/wok-hei-at-home.mdx` as template):
            - `title`: Original Notion title (in quotes)
            - `lang`: `en`
            - `translationSlug`: The FR slug from step 4
            - `description`: Max 160 chars, SEO-optimized summary
            - `author`: `"Victor"`
            - `publishDate`: Today's date (YYYY-MM-DD)
            - `heroImage`: `"../../../assets/images/articles/{en-slug}.webp"`
            - `heroImageAlt`: Descriptive alt text ~125 chars based on the image
            - `keywords`: 8-12 SEO keywords as array
            - `tags`: 3-5 topic tags as array
            - `articleCategory`: One of: `cooking-techniques`, `food-science`, `guides`, `ingredients`, `kitchen-tips`, `drinks`
            - `readingTime`: Calculate as ceil(wordCount / 200)
            - `relatedRecipes`: 1-3 recipe slugs from existing recipes in `src/content/recipes/en/` (Glob for available slugs). Optional — omit if no relevant recipes exist.
            - `faqs`: At least 3 FAQ entries with expanded answers (~2-3 sentences each). Use the Notion article's FAQ section as source, but expand brief answers.

            **Body**: Write 800-1500 words of SEO-optimized prose:
            - Start with `import { Picture } from "astro:assets";` and `import heroImg from "../../../assets/images/articles/{en-slug}.webp";`
            - Opening paragraph (no heading) — engaging hook related to date night cooking
            - 5-8 H2 sections covering the article's topics
            - One `<Picture>` component after the first or second section
            - Use the Notion content as an outline but REWRITE the prose — make it more engaging, detailed, and SEO-friendly
            - Include the "date night" angle throughout (this is a date night cooking blog)
            - Internal cross-links to recipes: `/en/recipes/{slug}/` (trailing slash required)

            ### 6. Generate FR MDX file
            Create `src/content/articles/fr/{fr-slug}.mdx`:
            - Translate ALL frontmatter values to Quebec French
            - `lang`: `fr`
            - `translationSlug`: The EN slug from step 3
            - `heroImage`: Same path as EN (shared image file)
            - `heroImageAlt`: French translation of alt text
            - `keywords`: French SEO keywords
            - `tags`: French tags (e.g., `techniques-de-cuisson` not `cooking-techniques`)
            - `articleCategory`: Keep the canonical EN value (same as EN file)
            - `relatedRecipes`: Use French recipe slugs from `src/content/recipes/fr/` (Glob for available slugs)
            - `faqs`: Fully translated to Quebec French
            - Body: Full Quebec French translation of the EN prose
            - Quebec French conventions: souper (dinner), dejeuner (breakfast), diner (lunch), cuillere a soupe (tbsp), tasses (cups)
            - Cross-links use `/fr/recettes/{slug}/` (French route with trailing slash)

            ### 7. Update published.json
            Read `notion/published.json`:

            **If mode = "publish"** — add a new entry:
            ```json
            "{recipe_num}": {
              "notionTitle": "{original Notion title}",
              "slug": "{en-slug}",
              "type": "article",
              "publishedDate": "{today YYYY-MM-DD}",
              "lastSyncedDate": "{today YYYY-MM-DD}",
              "status": "published"
            }
            ```

            **If mode = "update"** — update the existing entry's `lastSyncedDate` to today:
            ```json
            "{recipe_num}": {
              ...existing fields unchanged...,
              "lastSyncedDate": "{today YYYY-MM-DD}"
            }
            ```

            ### 8. Validate
            Run `npm run check` to verify schema compliance.
            If it fails, fix the issues and re-run.

            ### 9. Verify EN/FR pair
            Confirm that:
            - EN file's `translationSlug` matches the FR file's slug (filename without .mdx)
            - FR file's `translationSlug` matches the EN file's slug
            - Both files exist

            ## Restrictions
            - ONLY create/modify files in: `src/content/articles/`, `src/assets/images/articles/`, `notion/published.json`
            - In **publish** mode: create new files only (except `notion/published.json`)
            - In **update** mode: overwrite the existing EN+FR MDX files and hero image for the article being updated
            - Do NOT modify components, layouts, pages, i18n files, or config files
            - Do NOT modify `package.json`, `astro.config.ts`, `wrangler.jsonc`, or `CLAUDE.md`

            ## Output
            Provide a summary listing:
            - Mode (publish or update)
            - Article title and Recipe #
            - EN slug and FR slug
            - Article category assigned
            - Word count of EN prose
            - Number of FAQs
            - Image optimization result (original size → final size)
            - Any issues encountered
          claude_args: |
            --model claude-sonnet-4-6
            --max-turns 25
            --allowedTools Edit,Read,Write,Glob,Grep,Bash(curl:convert:npm run check:npm run build:ls:cat:wc:du:file:identify)
          branch_prefix: "auto-article/"
        env:
          NOTION_API_TOKEN: ${{ secrets.NOTION_API_TOKEN }}

      # Step 4: Verify build after Claude's changes
      - name: Verify build
        if: steps.select.outputs.found == 'true'
        run: npm run check && npm run build
        continue-on-error: true
        id: verify

      # Step 5: Label the PR
      - name: Add label to PR
        if: steps.select.outputs.found == 'true'
        run: |
          LATEST_PR=$(gh pr list --author "app/claude" --state open --json number --jq '.[0].number')
          if [ -n "$LATEST_PR" ]; then
            gh pr edit "$LATEST_PR" --add-label "auto-article"
          fi
        env:
          GH_TOKEN: ${{ github.token }}

      # Step 6: Create issue on failure
      - name: Create issue on failure
        if: failure()
        run: |
          gh issue create \
            --title "Auto-publish article failed ($(date +%Y-%m-%d))" \
            --body "The weekly auto-publish workflow failed. [View run](${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }})" \
            --label "auto-article-failure"
        env:
          GH_TOKEN: ${{ github.token }}
```

### 3. Create the `auto-article` label

```bash
gh label create "auto-article" --color "0E8A16" --description "Automated article publishing PR"
gh label create "auto-article-failure" --color "D93F0B" --description "Auto-publish workflow failure"
```

### 4. Validate

- [ ] Add `NOTION_API_TOKEN` and `NOTION_DATABASE_ID` secrets to the repository
- [ ] Verify Notion API property names match the filter query (Status, Post Type, Recipe #)
- [ ] Manually trigger workflow via `workflow_dispatch` to test end-to-end
- [ ] Verify generated EN MDX passes `npm run check`
- [ ] Verify generated FR MDX passes `npm run check`
- [ ] Verify hero image is WebP, ≤1200px wide, <200KB
- [ ] Verify EN/FR `translationSlug` values cross-reference correctly
- [ ] Verify `published.json` is updated with new entry
- [ ] Verify PR auto-merges after CI passes
- [ ] Verify built pages render correctly at `/en/articles/{slug}/` and `/fr/articles/{slug}/`

## Dependencies & Risks

**Dependencies:**
- `NOTION_API_TOKEN` — User already has an integration token, needs to be added as GitHub secret
- `NOTION_DATABASE_ID` — Database UUID from the Notion URL, needs to be added as GitHub secret
- `ANTHROPIC_API_KEY` — Already configured as GitHub secret
- Notion API property names must match the filter query exactly

**Risks:**
| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Notion API property names don't match filter | Medium | Blocks workflow | Verify properties before first run; the selection step will surface errors immediately |
| Claude generates inconsistent EN/FR slug pair | Low | Broken language toggle | Validation step 9 in Claude prompt verifies bidirectional cross-reference |
| Notion image URLs expire during long Claude execution | Low | Missing hero image | Claude downloads image immediately before any content generation |
| Claude produces <800 or >1500 word prose | Medium | Suboptimal SEO | Claude prompt specifies word count; `npm run check` catches schema errors but not word count |
| `published.json` merge conflict from stale PR | Low | Blocks next publish | Stale PR cleanup step runs before article generation |
| All articles exhausted (~10 weeks) | Certain | Pipeline runs empty | Graceful exit with "no articles found" message; user monitors Notion backlog |

## What's NOT Included (YAGNI)

- No recipe auto-publishing (different schema)
- No Notion webhook integration (cron is sufficient)
- No content scheduling/queue management (simple FIFO)
- No social media posting for articles (follow-up: update `social-post-on-deploy.yml` paths)
- No Notion status update after publishing (follow-up: mark as "Published" in Notion via API)
- No empty-queue notification (follow-up: create issue when ≤2 articles remain)

## Sources

- **Origin brainstorm:** [docs/brainstorms/2026-02-27-auto-publish-notion-articles-brainstorm.md](docs/brainstorms/2026-02-27-auto-publish-notion-articles-brainstorm.md) — Key decisions: Notion API live sync, claude-code-action, 1 article/week, auto-merge, Notion images as-is
- Similar workflow: `.github/workflows/weekly-seo-audit.yml` (claude-code-action + cron + stale PR cleanup)
- Auto-merge: `.github/workflows/auto-merge.yml` (applies to all PRs, no changes needed)
- Article schema: `src/content.config.ts:81-103`
- Example EN article: `src/content/articles/en/wok-hei-at-home.mdx`
- Example FR article: `src/content/articles/fr/wok-hei-a-la-maison.mdx`
- Published tracking: `notion/published.json`
- Learnings: Social media automation idempotency pattern (`docs/solutions/integration-issues/social-media-auto-posting-instagram-pinterest.md`)
