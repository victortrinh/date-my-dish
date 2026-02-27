---
title: "feat: Switch auto-publish to notion-client (no auth)"
type: feat
status: active
date: 2026-02-27
origin: docs/brainstorms/2026-02-27-notion-client-public-page-brainstorm.md
---

# feat: Switch auto-publish to notion-client (no auth)

## Overview

Replace the official Notion API calls in the auto-publish article workflow with `notion-client` (from react-notion-x), which uses Notion's internal `/api/v3/` API to fetch public pages **without any authentication**. This eliminates the broken `NOTION_API_TOKEN` dependency entirely.

The Notion database is already publicly shared at:
`https://congruous-eyebrow-e80.notion.site/9ce95183503543d68450194d1010824b`

## Problem Statement / Motivation

The official Notion API token returns "API token is invalid" errors despite troubleshooting. Since the database owner has already published the page publicly, we can bypass the official API entirely using `notion-client`, which wraps Notion's internal API and works for any public page without authentication (see brainstorm: `docs/brainstorms/2026-02-27-notion-client-public-page-brainstorm.md`).

## Proposed Solution

Three-part change:

1. **New Node.js script** (`scripts/fetch-notion-article.mjs`) -- handles ALL Notion fetching using `notion-client`. Queries the public collection, selects the next article, fetches page blocks, downloads images, and writes structured JSON files.

2. **Workflow update** (`.github/workflows/auto-publish-article.yml`) -- replace the inline shell script with `node scripts/fetch-notion-article.mjs`. Remove all `NOTION_API_TOKEN` / `NOTION_DATABASE_ID` references.

3. **Claude prompt simplification** -- Claude reads pre-fetched JSON files instead of making Notion API calls. No Notion environment variables needed.

## Technical Approach

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│ GitHub Actions Workflow                                      │
│                                                              │
│  Step 1: node scripts/fetch-notion-article.mjs               │
│    ├── NotionAPI.getPage(databaseId) → recordMap             │
│    ├── Extract collectionId + viewId from recordMap          │
│    ├── Parse collection rows via schema lookup               │
│    ├── Filter: Status="Ready to Publish" + PostType="Informative Posts" │
│    ├── Cross-ref published.json → find unpublished/stale     │
│    ├── NotionAPI.getPage(selectedPageId) → page blocks       │
│    ├── Convert blocks → structured Markdown-ish JSON         │
│    ├── Download hero image (signed URLs expire in 1h!)       │
│    ├── Write notion-article-selection.json                   │
│    ├── Write notion-article-content.json                     │
│    └── Write found/mode to $GITHUB_OUTPUT                    │
│                                                              │
│  Step 2: Claude Code Action                                  │
│    ├── Read JSON files (no Notion calls)                     │
│    ├── Generate EN MDX + FR MDX                              │
│    ├── Optimize hero image (ImageMagick)                     │
│    ├── Update published.json                                 │
│    └── Run npm run check                                     │
│                                                              │
│  Step 3-5: Build verify, label PR, failure handling          │
└─────────────────────────────────────────────────────────────┘
```

### Phase 1: Add notion-client + write fetch script

#### 1a. Install dependencies

```bash
npm install --save-dev notion-client notion-types notion-utils
```

Add to `package.json` devDependencies (only used in CI scripts, not the site build).

#### 1b. Create `scripts/fetch-notion-article.mjs`

The script handles:

**Collection query flow:**
1. Call `new NotionAPI().getPage('9ce95183503543d68450194d1010824b')` to get the database page's `recordMap`
2. Extract the `collectionId` and first `collectionViewId` from `recordMap.collection_view`
3. Iterate `recordMap.collection_query[collectionId][viewId].blockIds` to get row block IDs
4. For each row, use `getPageProperty(propertyName, block, recordMap)` from `notion-utils` to extract:
   - `Status` → string (e.g., "Ready to Publish")
   - `Post Type` → string (e.g., "Informative Posts")
   - `Recipe #` → string (parse to number)
   - `Post Title` / `Name` → string
   - `last_edited_time` → number (Unix ms timestamp from block metadata)
5. Filter rows: `Status === "Ready to Publish"` AND `Post Type === "Informative Posts"`
6. Cross-reference with `notion/published.json` entries
7. Priority: unpublished first (lowest Recipe #), then stale articles (last_edited_time > lastSyncedDate)
8. If nothing found, write `found=false` to `$GITHUB_OUTPUT` and exit 0

**Page content fetch flow:**
1. Call `api.getPage(selectedPageId)` to get the article's full block tree
2. Walk the block tree and convert to structured JSON:
   - `text` → paragraph with Markdown inline formatting
   - `header`/`sub_header`/`sub_sub_header` → heading with level
   - `bulleted_list`/`numbered_list` → list items
   - `image` → download immediately via signed URL, save to `/tmp/notion-images/`
   - `callout` → callout block
   - `divider` → divider marker
   - `quote` → blockquote
   - Unknown types → log warning, include as raw text
3. Extract FAQs: detect heading containing "FAQ" or "Frequently Asked Questions", parse subsequent Q/A blocks
4. Rich text: convert Notion annotations to Markdown (`**bold**`, `*italic*`, `[link](url)`)

**Image download:**
- Signed URLs expire in ~1 hour — download ALL images immediately during fetch
- Save hero image to `/tmp/notion-images/hero.{ext}`
- Save additional images to `/tmp/notion-images/img-{n}.{ext}`

**Output files:**

`notion-article-selection.json`:
```json
{
  "pageId": "abc-123",
  "recipeNum": 25,
  "title": "Why You Shouldn't Order a Well-Done Steak...",
  "mode": "publish",
  "existingSlug": null
}
```

`notion-article-content.json`:
```json
{
  "pageId": "abc-123",
  "title": "Why You Shouldn't Order a Well-Done Steak...",
  "recipeNum": 25,
  "lastEditedTime": "2026-02-20T10:30:00.000Z",
  "heroImage": {
    "localPath": "/tmp/notion-images/hero.png",
    "caption": null
  },
  "blocks": [
    { "type": "heading", "level": 2, "text": "Section Title" },
    { "type": "paragraph", "text": "Markdown text with **bold** and [links](url)..." },
    { "type": "list", "style": "unordered", "items": ["Item 1", "Item 2"] },
    { "type": "image", "localPath": "/tmp/notion-images/img-1.png", "caption": "..." },
    { "type": "callout", "icon": "📖", "text": "Callout content..." },
    { "type": "divider" }
  ],
  "faqs": [
    { "question": "What about...?", "answer": "The answer is..." }
  ]
}
```

`$GITHUB_OUTPUT`:
```
found=true
mode=publish
recipe_num=25
```

**Error handling:**
- Retry API calls 3 times with exponential backoff (1s, 2s, 4s)
- Validate output JSON before exiting (non-empty title, non-empty blocks, hero image exists)
- If the page is no longer public: log clear error message and exit 1
- If collection schema doesn't contain expected properties: log error listing available properties

### Phase 2: Update the workflow file

Modify `.github/workflows/auto-publish-article.yml`:

- [x] Replace the "Select next article from Notion" shell step with:
  ```yaml
  - name: Fetch and select article from Notion
    id: select
    run: node scripts/fetch-notion-article.mjs
  ```
- [x] Remove `NOTION_API_TOKEN` and `NOTION_DATABASE_ID` from `env` blocks (two occurrences)
- [x] Remove `NOTION_API_TOKEN` from the Claude Code Action `env` block
- [x] Keep the "Close stale auto-article PRs" step unchanged
- [x] Keep `steps.select.outputs.found == 'true'` conditionals unchanged

### Phase 3: Simplify Claude's prompt

Rewrite the Claude Code Action prompt to:

- [x] Remove Task 1 (Fetch article content from Notion) — pre-fetched by script
- [x] Replace with: "Read `notion-article-selection.json` and `notion-article-content.json`"
- [x] Update Task 2 (hero image): Claude reads the pre-downloaded image from `/tmp/notion-images/hero.*` and optimizes it (resize/convert to webp)
- [x] Keep Tasks 3-9 largely unchanged (slug generation, MDX generation, published.json update, validation)
- [x] Remove `curl` from `allowedTools` for Notion (keep it if needed for other purposes, or replace with more specific allowed tools)
- [x] Add instructions for Claude to use the `blocks` array and `faqs` array from the JSON as content source
- [x] Remove the `env: NOTION_API_TOKEN` from the claude-code-action step

## Acceptance Criteria

- [x] `notion-client`, `notion-types`, `notion-utils` added as devDependencies in `package.json`
- [x] `scripts/fetch-notion-article.mjs` created and functional
- [x] Script queries the public Notion database without any auth tokens
- [x] Script correctly parses Status, Post Type, Recipe #, Post Title from internal API format
- [x] Script filters for "Ready to Publish" + "Informative Posts" articles
- [x] Script cross-references `notion/published.json` to skip already-published articles
- [x] Script detects stale articles (last_edited_time > lastSyncedDate) for update mode
- [x] Script downloads hero image to disk before signed URL expires
- [x] Script converts Notion blocks to structured JSON with Markdown formatting
- [x] Script extracts FAQs from article content
- [x] Script writes `found`/`mode`/`recipe_num` to `$GITHUB_OUTPUT`
- [x] Script exits cleanly with `found=false` when nothing to publish
- [x] Script has retry logic (3 attempts with backoff) for API calls
- [x] Script validates its own output before exiting
- [x] Workflow file updated: shell step replaced with `node scripts/fetch-notion-article.mjs`
- [x] All `NOTION_API_TOKEN` and `NOTION_DATABASE_ID` references removed from workflow
- [x] Claude prompt updated to read pre-fetched JSON files
- [ ] Manual `workflow_dispatch` test succeeds end-to-end

## Dependencies & Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Notion changes internal API (`/api/v3/`) | Medium | High (workflow breaks) | Pin `notion-client` to exact version; fallback to local `notion/` exports |
| Signed image URLs expire before download | Low | Medium (no hero image) | Download immediately in script, before writing JSON |
| Public page becomes private | Low | High (workflow fails) | Script detects and logs clear error; create GitHub issue |
| Rate limiting on internal API | Low | Medium (transient failure) | Retry with backoff; small delay between API calls |
| Collection has 40+ rows, pagination needed | Low | Medium | `getPage()` on database page should return all rows for small collections; test to confirm |
| `getPageProperty` doesn't handle all property types | Medium | Medium | Test with actual database; fallback to manual schema parsing |

## Sources & References

- **Origin brainstorm:** [docs/brainstorms/2026-02-27-notion-client-public-page-brainstorm.md](docs/brainstorms/2026-02-27-notion-client-public-page-brainstorm.md) — Key decisions: use notion-client (no auth), pre-step Node.js script, remove NOTION_API_TOKEN
- **Original auto-publish brainstorm:** [docs/brainstorms/2026-02-27-auto-publish-notion-articles-brainstorm.md](docs/brainstorms/2026-02-27-auto-publish-notion-articles-brainstorm.md)
- **Previous plan:** [docs/plans/2026-02-27-feat-auto-publish-notion-articles-plan.md](docs/plans/2026-02-27-feat-auto-publish-notion-articles-plan.md)
- **Current workflow:** `.github/workflows/auto-publish-article.yml`
- **Script pattern:** `scripts/social-post.mjs` (ESM, fetch, JSON tracking, error handling)
- **Script pattern:** `scripts/generate-lighthouse-urls.cjs` (pre-step data generation for Claude)
- **Article schema:** `src/content.config.ts:81-105`
- **Article template:** `src/content/articles/en/wok-hei-at-home.mdx`
- **Published tracking:** `notion/published.json` (3 entries: #30, #31, #35)
- **notion-client source:** https://github.com/NotionX/react-notion-x/tree/master/packages/notion-client
- **notion-utils getPageProperty:** https://github.com/NotionX/react-notion-x/blob/master/packages/notion-utils
- **Public database URL:** https://congruous-eyebrow-e80.notion.site/9ce95183503543d68450194d1010824b
- **PR #18:** https://github.com/victortrinh/date-my-dish/pull/18 (existing workflow PR)
