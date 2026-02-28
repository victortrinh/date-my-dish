---
topic: Auto-Publish Recipes from Notion
type: feature
date: 2026-02-27
status: complete
related:
  - docs/brainstorms/2026-02-27-notion-client-public-page-brainstorm.md
  - docs/brainstorms/2026-02-27-auto-publish-notion-articles-brainstorm.md
---

# Auto-Publish Recipes from Notion

## What We're Building

A GitHub Actions workflow that automatically publishes recipes from the public Notion database to the Date My Dish blog — mirroring the existing auto-publish article pipeline but adapted for the much richer recipe content schema.

The workflow will:
1. Run weekly on a different day than articles (articles = Monday)
2. Fetch the next "Ready to Publish" recipe from the public Notion database via `notion-client`
3. Download all images from the Notion page (hero + inline/step images)
4. Have Claude generate complete bilingual EN+FR MDX files with full structured frontmatter
5. Create a PR for review

## Why This Approach

### Separate Workflow + Script (Approach A)

We chose to create a **separate** `auto-publish-recipe.yml` and `fetch-notion-recipe.mjs` rather than unifying with the article pipeline because:

- **Proven pattern**: The article pipeline works. Mirror it, don't merge.
- **Different content schemas**: Recipes have 17+ required fields, structured ingredients/instructions, multiple images, cooking times, nutrition — fundamentally different from articles.
- **Independent debugging**: If the recipe workflow breaks, it doesn't affect article publishing.
- **YAGNI**: Extracting shared utilities makes sense when there are 3+ content types, not 2.

### Script Extracts, Claude Structures

The Node.js script handles deterministic work (Notion API, image downloads, block-to-JSON conversion). Claude handles semantic work (structuring ingredients into `ingredientGroups`, generating missing fields like `keywords`, `tags`, `dateNightTips`, writing SEO prose).

This matches the article pipeline: script fetches and structures raw data, Claude generates the final MDX.

## Key Decisions

1. **Approach**: Separate workflow + script (mirrors article pipeline)
2. **Schedule**: Weekly on a different day (e.g., Thursday 3 AM UTC) to spread content
3. **Images**: Download ALL images from Notion pages (hero + inline/step) and optimize them
4. **AI generation scope**: Claude generates everything missing from Notion — `recipeCuisine`, `keywords`, `tags`, `occasion`, `impressFactor`, `dateNightTips`, `nutrition`, full SEO prose, and the structured `ingredientGroups`/`instructionGroups` from Notion's block content
5. **Parsing split**: Script converts Notion blocks to structured JSON (same as articles); Claude interprets the content and builds the recipe frontmatter
6. **Time conversion**: Notion has human-readable times ("30 minutes"); Claude converts to ISO 8601 (`PT30M`) since it handles edge cases like "3 hours 30 minutes (plus overnight pickling)" better than regex
7. **Post type filter**: Script filters for `Post Type === "Recipes"` AND `Status === "Ready to Publish"`

## Lessons from Article Pipeline (Must Apply)

These were discovered during the article auto-publish implementation and must be carried into the recipe pipeline:

1. **Two-token CI strategy**: `PAT_TOKEN` for `git push` (bypasses branch protection) and `github.token` for `gh pr create` (has PR GraphQL permissions). Using PAT_TOKEN for PR creation fails with `Resource not accessible by personal access token`. These must be **separate workflow steps** with branch name passed via `$GITHUB_ENV`.

2. **Exclude temp CI artifacts**: `git add -A` will commit `notion-recipe-selection.json` and `notion-recipe-content.json` to the PR branch. Use selective `git add` targeting only `src/content/recipes/`, `src/assets/images/recipes/`, and `notion/published.json` instead.

3. **allowedTools prefix matching**: Claude Code Action's `allowedTools` must use `:*` suffix for prefix matching (e.g., `Bash(convert:*)`, `Bash(npm run:*)`). Without the suffix, only exact command matches are allowed and all Bash commands get denied.

4. **notion-client double-nesting**: The internal API returns data at `.value.value` (double-nested). Must handle both `.value.value` and `.value` patterns for forward-compatibility: `const block = record?.value?.value || record?.value;`

5. **Step images as Astro `image()` imports**: Per `src/content.config.ts`, `instructionGroups.steps[].image` uses Astro's `image()` schema. Claude must save step images as optimized WebP to `src/assets/images/recipes/{slug}-step-{n}.webp` and reference them as relative import paths (`"../../../assets/images/recipes/{slug}-step-{n}.webp"`), not URLs.

6. **published.json `type` field**: Recipe entries must use `"type": "recipe"` (existing article entries use `"type": "article"`) for future filtering between content types.

## Notion Recipe Data Available

### From Database Columns
| Column | Type | Example |
|--------|------|---------|
| Recipe # | number | 3 |
| Post Title | title | "Vietnamese Pickled Vegetables (Do Chua)" |
| Category | select | "Others", "Main", "Appetizers", "Desserts" |
| Status | status | "Ready to Publish" |
| Post Type | select | "Recipes" |
| Cook Time | text | "30 minutes", "3 hours 30 minutes" |
| Prep Time | text | "15 minutes" |
| Total Time | text | "45 minutes" |
| Difficulty | select | "Easy", "Medium" |
| Servings | number | 2, 4, 6 |

### From Page Content (blocks)
- Ingredients (lists, possibly grouped by section headings)
- Instructions (numbered steps, possibly with inline images)
- Hero image and step/process photos
- Descriptive text, tips, notes
- Possibly FAQ section

### NOT in Notion (Claude must generate)
- `recipeCuisine` — inferred from recipe content
- `keywords` — SEO keywords (8-12)
- `tags` — topic tags (3-5)
- `occasion` — date-night, weeknight, etc.
- `impressFactor` — 1-5 rating
- `dateNightTips` — wine/music/plating suggestions
- `nutrition` — approximate nutritional info
- `description` — max 160 char SEO meta description
- `heroImageAlt` — descriptive alt text
- `faqs` — at least 1, ideally 3+
- MDX body — 800-1500 word SEO blog prose

## Category Mapping

Notion categories need mapping to canonical recipe categories:

| Notion Category | Canonical `recipeCategory` |
|----------------|---------------------------|
| Main | `["dinner"]` |
| Appetizers | `["appetizer"]` |
| Desserts | `["dessert"]` |
| Others | Claude infers from content |
| (missing) | Claude infers from content |

## Architecture Overview

```
┌──────────────────────────────────────────────────┐
│  GitHub Actions: auto-publish-recipe.yml          │
│                                                   │
│  1. npm ci                                        │
│  2. node scripts/fetch-notion-recipe.mjs          │
│     ├── Query public Notion DB (notion-client)    │
│     ├── Filter: Recipes + Ready to Publish        │
│     ├── Check notion/published.json               │
│     ├── Fetch page blocks → structured JSON       │
│     ├── Download all images to /tmp/              │
│     └── Output: selection.json + content.json     │
│  3. Close stale auto-recipe PRs                   │
│  4. Claude Code Action (sonnet-4-6, agent mode)   │
│     ├── Read JSON files                           │
│     ├── Optimize images (hero + step → WebP)      │
│     ├── Generate EN slug + FR slug                │
│     ├── Structure ingredients/instructions        │
│     ├── Generate all missing fields               │
│     ├── Write EN + FR MDX                         │
│     ├── Update published.json (type: "recipe")    │
│     └── npm run check                             │
│  5. Check for changes (git status --porcelain)    │
│  6. Verify build (npm run check && npm run build) │
│  7. Create branch + push (PAT_TOKEN)              │
│     └── Selective git add (no temp JSON files)    │
│  8. Create PR (github.token) + label "auto-recipe"│
│  9. Create issue on failure                       │
└──────────────────────────────────────────────────┘
```

## Current State

- 23 recipes in Notion database (Recipe # 1-23)
- Only 1 is "Ready to Publish": Recipe #3 (Vietnamese Pickled Vegetables)
- 1 is "Draft": Recipe #23 (Pan-Seared Ribeye)
- Rest are "In Progress"
- 17 recipes already manually published on the blog

## Resolved Questions

1. **Which day of the week?** — Different from Monday (articles). Thursday is a good midweek option for content diversity.
2. **What if no recipes are "Ready to Publish"?** — Same pattern as articles: script sets `found=false`, workflow skips Claude step gracefully.
3. **Publish vs Update mode?** — Same as articles: if the recipe is already in `published.json` but Notion's `last_edited_time` is newer than `lastSyncedDate`, run in "update" mode (regenerate MDX in-place, keep same slugs and publishDate).
