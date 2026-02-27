---
title: "Switch auto-publish workflow to notion-client (public page, no auth)"
date: 2026-02-27
status: complete
---

# Switch Auto-Publish Workflow to notion-client (Public Page, No Auth)

## What We're Building

A modification to the existing auto-publish article workflow (`.github/workflows/auto-publish-article.yml`) that replaces the official Notion API (which requires `NOTION_API_TOKEN`) with the `notion-client` npm package. This library uses Notion's internal API (`/api/v3/`) to fetch public pages **without any authentication**.

The Notion database is publicly shared at:
`https://congruous-eyebrow-e80.notion.site/9ce95183503543d68450194d1010824b`

## Why This Approach

- **Notion API tokens aren't working** -- the user's integration token returns "API token is invalid" errors, and troubleshooting hasn't resolved it
- **The database is already public** -- the owner published it, so no auth is needed
- **`notion-client`** (from react-notion-x, 5K+ GitHub stars) wraps Notion's internal API and can fetch public collection data + page blocks without authentication
- **Pre-step script** handles all Notion fetching before Claude runs, so Claude only does content generation (cleaner separation of concerns, no Notion calls in Claude's prompt)

## Key Decisions

1. **Library: `notion-client`** -- Add as a devDependency. Uses Notion's unofficial internal API at `https://www.notion.so/api/v3/`. Works for any publicly shared Notion page without auth tokens.

2. **Pre-step Node.js script** -- Write `scripts/fetch-notion-article.mjs` that:
   - Queries the public collection/database for all rows
   - Filters for "Ready to Publish" status + "Informative Posts" post type
   - Cross-references with `notion/published.json` to skip already-published articles
   - Selects the oldest unpublished article (lowest Recipe #)
   - Fetches the selected article's full page blocks (headings, text, images, FAQs)
   - Downloads and saves the hero image
   - Writes `notion-article-selection.json` (article metadata) and `notion-article-content.json` (full block content as structured text)

3. **No more `NOTION_API_TOKEN` or `NOTION_DATABASE_ID` secrets** -- The database ID is hardcoded in the script (it's public). No auth secrets needed for Notion.

4. **Claude's prompt simplified** -- Claude reads the pre-fetched JSON files instead of making Notion API calls. The prompt no longer needs `curl` commands for Notion or the `NOTION_API_TOKEN` environment variable.

5. **Update detection preserved** -- The script checks `last_edited_time` from the collection data against `lastSyncedDate` in `published.json` for already-published articles, same logic as before.

6. **Everything else unchanged** -- Schedule (weekly Monday), selection order (oldest first), tracking (`published.json`), PR strategy (auto-merge), image optimization (ImageMagick), Claude content generation (EN+FR MDX).

## What's NOT Included (YAGNI)

- No fallback to official Notion API (it doesn't work, that's why we're switching)
- No caching of Notion data between runs (each run fetches fresh)
- No local Notion export sync (the `notion/` folder exports are independent of this workflow)

## Resolved Questions

1. **Can we scrape the public Notion URL directly?** -- No, Notion pages are JavaScript-rendered. `curl` gets an empty HTML shell. Need the internal API.
2. **Does notion-client work without auth for public pages?** -- Yes, confirmed from source code. It calls `/api/v3/` endpoints that serve public content without auth.
3. **Where does Notion fetching happen?** -- All in a pre-step Node.js script. Claude receives pre-fetched content as JSON files.
4. **What about the existing `notion/` folder exports?** -- Independent of this workflow. The exports are useful as reference but the workflow fetches live from Notion.

## Reference

- `notion-client` source: https://github.com/NotionX/react-notion-x/tree/master/packages/notion-client
- Public database URL: https://congruous-eyebrow-e80.notion.site/9ce95183503543d68450194d1010824b
- Database ID: `9ce95183503543d68450194d1010824b`
- Existing workflow: `.github/workflows/auto-publish-article.yml`
- Previous brainstorm: `docs/brainstorms/2026-02-27-auto-publish-notion-articles-brainstorm.md`
- Published tracking: `notion/published.json` (3 articles already tracked: #30, #31, #35)
- 9 unpublished "Ready to Publish" articles remaining: #25, #28, #29, #32, #33, #34, #36, #37, #38
