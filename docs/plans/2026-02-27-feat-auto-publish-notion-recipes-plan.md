---
title: "feat: Auto-Publish Recipes from Notion"
type: feat
status: completed
date: 2026-02-27
origin: docs/brainstorms/2026-02-27-auto-publish-notion-recipes-brainstorm.md
---

# feat: Auto-Publish Recipes from Notion

## Overview

A GitHub Actions workflow that automatically publishes recipes from the public Notion database to Date My Dish — mirroring the proven article auto-publish pipeline but adapted for the much richer recipe content schema (17+ required fields, structured ingredients/instructions, multiple images, cooking times, nutrition).

Two deliverables:
1. **`scripts/fetch-notion-recipe.mjs`** — Node.js script that fetches recipe data from Notion, extracts database columns + page content, downloads images, outputs structured JSON.
2. **`.github/workflows/auto-publish-recipe.yml`** — GitHub Actions workflow orchestrating the script, Claude Code generation, and PR creation.

## Problem Statement / Motivation

17 recipes are already manually published. The Notion database has 23 total recipes, with Recipe #3 (Vietnamese Pickled Vegetables) ready to publish. Manual publishing requires: creating EN+FR MDX files with 17+ frontmatter fields, optimizing images, writing SEO prose, updating published.json — a 2+ hour process per recipe. Automating this mirrors the article pipeline and enables weekly content cadence.

## Proposed Solution

Mirror the article auto-publish architecture (see brainstorm: `docs/brainstorms/2026-02-27-auto-publish-notion-recipes-brainstorm.md`) with recipe-specific adaptations:

- **Separate workflow + script** — independent from articles, different schedule (Thursday vs Monday)
- **Script extracts, Claude structures** — script handles Notion API + image downloads; Claude handles semantic structuring (ingredients → `ingredientGroups`, times → ISO 8601, generating missing fields)
- **Two-token CI strategy** — `PAT_TOKEN` for push, `github.token` for PR creation
- **Selective git add** — exclude temp JSON artifacts from PR

## Technical Considerations

### Key Design Decisions (from brainstorm)

1. **Step images in MDX body only, NOT in frontmatter** — All 9 existing recipes use `<Picture>` in prose; none use `instructionGroups[].steps[].image`. Follow established pattern to reduce complexity.
2. **Database columns extracted by script** — Cook Time, Prep Time, Total Time, Difficulty, Servings, Category passed as top-level JSON fields so Claude has structured access.
3. **No hero image = skip recipe** — `heroImage` is required (`image()`, non-optional). If no hero image found, script sets `found=false` and logs a warning rather than creating an MDX that will fail validation.
4. **ISO 8601 regex**: Must match `/^PT\d+[HM](\d+[MS])?$/` — Claude strips qualifiers ("about", "plus resting time") and converts only the numeric portion. For truly non-numeric values ("overnight"), Claude estimates (e.g., `PT8H`).
5. **`recipeYield` format**: `"{n} servings"` (EN) / `"{n} portions"` (FR) by default, with flexibility for specific units (e.g., "4 steaks").
6. **Difficulty lowercasing**: Script lowercases the Notion value ("Easy" → "easy") before passing to JSON.
7. **`recipeCategory` canonical keys only**: Must be one of `appetizer`, `dinner`, `dessert`, `breakfast`, `lunch`, `snack`, `side-dish`, `drink`, `sauce`. Claude prompt must include this enum.
8. **Remove `continue-on-error` on build verification** — Unlike articles, recipe schema is complex enough that build failures should block PR creation.
9. **`max-turns: 30`** for Claude (vs 25 for articles) — more fields, more images, more structuring work.
10. **Recursive block traversal (depth 3)** — Handle toggle blocks and nested content in Notion pages.

### Files to Create

| File | Purpose |
|------|---------|
| `scripts/fetch-notion-recipe.mjs` | Fetch recipe from Notion, download images, output JSON |
| `.github/workflows/auto-publish-recipe.yml` | GitHub Actions workflow |

### Files to Modify

| File | Change |
|------|--------|
| `notion/published.json` | New entries added by workflow (type: "recipe") |

### Reference Files

| File | Why |
|------|-----|
| `scripts/fetch-notion-article.mjs` | Template for the recipe fetch script |
| `.github/workflows/auto-publish-article.yml` | Template for the workflow YAML |
| `src/content.config.ts:37-78` | Recipe Zod schema (source of truth) |
| `src/content/recipes/en/cacio-e-pepe.mdx` | Template for EN recipe MDX |
| `src/content/recipes/fr/cacio-e-pepe.mdx` | Template for FR recipe MDX |

## Implementation Phases

### Phase 1: Fetch Script (`scripts/fetch-notion-recipe.mjs`)

Fork `scripts/fetch-notion-article.mjs` and adapt for recipes.

- [x] Copy `fetch-notion-article.mjs` → `fetch-notion-recipe.mjs`
- [x] Change filter: `Post Type === "Recipes"` instead of `"Informative Posts"`
- [x] Extract additional database columns via `getRowProperty`:
  - `Cook Time` (text) → `cookTime`
  - `Prep Time` (text) → `prepTime`
  - `Total Time` (text) → `totalTime`
  - `Difficulty` (select) → `difficulty` (lowercased)
  - `Servings` (number) → `servings`
  - `Category` (select) → `category`
- [x] Include extracted columns as top-level fields in `notion-recipe-content.json`
- [x] Add hero image validation: if no images found in page blocks, set `found=false` and exit gracefully
- [x] Add recursive block traversal (depth-limited to 3) for toggle blocks and nested content
- [x] Change output filenames: `notion-recipe-selection.json` and `notion-recipe-content.json`
- [x] Update `SELECTION_FILE` and `CONTENT_FILE` constants
- [x] Update console log messages ("article" → "recipe")
- [ ] Test locally: `node scripts/fetch-notion-recipe.mjs`

**selection.json output format:**
```json
{
  "pageId": "...",
  "recipeNum": 3,
  "title": "Vietnamese Pickled Vegetables (Do Chua)",
  "mode": "publish",
  "existingSlug": null
}
```

**content.json output format:**
```json
{
  "pageId": "...",
  "title": "Vietnamese Pickled Vegetables (Do Chua)",
  "recipeNum": 3,
  "lastEditedTime": "2026-...",
  "cookTime": "30 minutes",
  "prepTime": "15 minutes",
  "totalTime": "45 minutes",
  "difficulty": "easy",
  "servings": 4,
  "category": "Others",
  "heroImage": { "localPath": "/tmp/notion-images/hero.jpg", "caption": "..." },
  "blocks": [ ... ],
  "faqs": [ ... ]
}
```

### Phase 2: Workflow YAML (`.github/workflows/auto-publish-recipe.yml`)

Fork `auto-publish-article.yml` and adapt for recipes.

- [x] Create workflow file with recipe-specific settings:
  - Name: `Auto-Publish Recipe`
  - Cron: `0 3 * * 4` (Thursday 3 AM UTC)
  - Concurrency group: `auto-publish-recipe`
  - Permissions: `contents: write`, `pull-requests: write`, `issues: write`, `id-token: write`
- [x] Step 1: Checkout, setup Node 20, npm ci
- [x] Step 2: Run `node scripts/fetch-notion-recipe.mjs` with `id: select`
- [x] Step 3: Close stale PRs with label `auto-recipe`
- [x] Step 4: Claude Code Action with recipe-specific prompt (see Phase 3)
  - Model: `claude-sonnet-4-6`
  - Max turns: 30
  - Branch prefix: `auto-recipe/`
  - allowedTools: `"Edit,Read,Write,Glob,Grep,Bash(convert:*),Bash(node:*),Bash(npm run:*),Bash(ls:*),Bash(cat:*),Bash(wc:*),Bash(du:*),Bash(file:*),Bash(identify:*),Bash(mkdir:*),Bash(which:*),Bash(cp:*)"`
- [x] Step 5: Check for changes (`git status --porcelain`)
- [x] Step 6: Verify build (`npm run check && npm run build`) — NO `continue-on-error`
- [x] Step 7: Create branch and push (PAT_TOKEN)
  - Branch: `auto-recipe/$(date +%Y-%m-%d)-${{ github.run_id }}`
  - **Selective git add**: `git add src/content/recipes/ src/assets/images/recipes/ notion/published.json`
  - Commit: `feat(recipe): auto-publish recipe from Notion`
- [x] Step 8: Create PR (github.token)
  - Label: `auto-recipe`
  - Title: `Auto-publish: {recipe title}`
- [x] Step 9: Create issue on failure with label `auto-recipe-failure`

### Phase 3: Claude Prompt (embedded in workflow YAML)

Write the detailed Claude prompt for recipe generation. Must cover:

- [x] Read both JSON files (`notion-recipe-selection.json` + `notion-recipe-content.json`)
- [x] **Image optimization**:
  - Hero: `convert {path} -resize '1200x>' -quality 82 src/assets/images/recipes/{slug}.webp` (< 200KB)
  - Step/inline images: `convert {path} -resize '900x>' -quality 80 src/assets/images/recipes/{slug}-{descriptor}.webp` (< 150KB)
  - Reduce quality incrementally if over size limit
- [x] **Slug generation**:
  - Publish mode: derive SEO-friendly EN slug (3-6 words, lowercase, hyphens)
  - Update mode: use `existingSlug` from selection JSON
  - FR slug: meaningful Quebec French translation
- [x] **EN MDX frontmatter** — all 17+ fields with exact format specs:
  - Template reference: `src/content/recipes/en/cacio-e-pepe.mdx`
  - `prepTime`/`cookTime`/`totalTime`: Convert from Notion text → ISO 8601 matching `/^PT\d+[HM](\d+[MS])?$/`
  - `recipeYield`: `"{servings} servings"` (or more specific unit)
  - `difficulty`: Use lowercase value from JSON
  - `recipeCategory`: Map from Notion Category → canonical EN keys (`appetizer`, `dinner`, `dessert`, `breakfast`, `lunch`, `snack`, `side-dish`, `drink`, `sauce`). If "Others" or missing, infer from content.
  - `recipeCuisine`: Infer from content (examples: "Italian", "Vietnamese", "Mediterranean")
  - `ingredientGroups`: Structure from Notion blocks. Look for headings containing "Ingredient" to identify sections. Group items under sub-headings.
  - `instructionGroups`: Structure from Notion blocks. Look for headings containing "Instruction", "Method", "Steps", or "Directions". Steps contain `text` only (no images in frontmatter).
  - `keywords`: 8-12 SEO keywords
  - `tags`: 3-5 topic tags
  - `nutrition`: Approximate nutritional info
  - `occasion`: From `date-night`, `weeknight`, `entertaining`, `comfort`, `celebration`, `quick-meal`
  - `impressFactor`: 1-5 rating
  - `dateNightTips`: `{ wine?, music?, platingTip? }`
  - `description`: Max 160 chars, SEO-optimized
  - `heroImageAlt`: Descriptive ~125 chars
  - `faqs`: Min 1 (ideally 3+). Use Notion FAQs if extracted, otherwise generate.
- [x] **EN MDX body**: 800-1500 words SEO prose with `<Picture>` components, 5-8 H2 sections, internal cross-links `/en/recipes/{slug}/`
- [x] **FR MDX**: Full Quebec French translation. `lang: fr`, `translationSlug` → EN slug, French keywords/tags/faqs, cross-links `/fr/recettes/{slug}/`
- [x] **Update mode differences**: Keep original `publishDate`, add `updatedDate`, read existing EN MDX for FR slug via `translationSlug`
- [x] **published.json update**: Entry with `"type": "recipe"`, `publishedDate`, `lastSyncedDate`
- [x] **Validation**: Run `npm run check`, fix issues if fails
- [x] **Restrictions**: Only modify `src/content/recipes/`, `src/assets/images/recipes/`, `notion/published.json`

### Phase 4: Test and Validate

- [x] Create `auto-recipe` label in GitHub repository
- [ ] Test fetch script locally: `node scripts/fetch-notion-recipe.mjs`
- [ ] Trigger workflow manually via `workflow_dispatch`
- [ ] Verify PR content:
  - All frontmatter fields pass Zod validation (`npm run check`)
  - ISO 8601 times match the regex
  - EN/FR `translationSlug` cross-references correct
  - Images optimized and correctly referenced
  - Build succeeds
  - No temp JSON files in PR
- [ ] If first recipe works, close auto-recipe-failure issue #29 if still open

## Acceptance Criteria

- [ ] `scripts/fetch-notion-recipe.mjs` fetches recipe data from Notion, extracts all database columns, downloads images, outputs structured JSON
- [ ] Script filters for `Post Type === "Recipes"` AND `Status === "Ready to Publish"`
- [ ] Script skips recipes with no hero image (sets `found=false`)
- [ ] Script handles publish and update modes correctly
- [ ] Workflow runs on Thursday 3 AM UTC cron and manual trigger
- [ ] Claude generates valid EN+FR MDX recipe pairs with all required frontmatter fields
- [ ] Images optimized (hero < 200KB, step < 150KB) and saved as WebP
- [ ] `published.json` updated with `"type": "recipe"` entry
- [ ] PR created with `auto-recipe` label, no temp JSON artifacts
- [ ] Build passes (`npm run check && npm run build`)
- [ ] Failure creates GitHub issue with `auto-recipe-failure` label

## Dependencies & Risks

| Risk | Mitigation |
|------|-----------|
| Notion API structure changes (`.value.value` nesting) | Defensive coding: `record?.value?.value \|\| record?.value` |
| Recipe schema complexity causes Claude errors | 30 max turns, detailed prompt with exact format specs, `npm run check` validation loop |
| Notion image URLs expire before download | Script downloads eagerly in step 2, before Claude runs |
| `published.json` merge conflict (article + recipe PRs) | Different schedule days (Mon vs Thu); rare edge case for manual triggers |
| Recipe has unusual Notion structure (columns, deep nesting) | Recursive block traversal (depth 3), Claude interprets remaining ambiguity |

## Sources & References

### Origin

- **Brainstorm document:** [docs/brainstorms/2026-02-27-auto-publish-notion-recipes-brainstorm.md](docs/brainstorms/2026-02-27-auto-publish-notion-recipes-brainstorm.md) — Key decisions: separate workflow, script-extracts-Claude-structures split, Thursday schedule, step images in prose only

### Internal References

- Article fetch script template: `scripts/fetch-notion-article.mjs`
- Article workflow template: `.github/workflows/auto-publish-article.yml`
- Recipe Zod schema: `src/content.config.ts:37-78`
- Recipe MDX template: `src/content/recipes/en/cacio-e-pepe.mdx`
- Published tracking: `notion/published.json`
- Image guidelines: CLAUDE.md (hero < 200KB, step < 150KB)
- CI lessons learned: brainstorm "Lessons from Article Pipeline" section
