# Notion-to-Blog Publishing Pipeline

**Date:** 2026-02-27
**Status:** Brainstorm
**Author:** Victor + Claude

## What We're Building

A workflow for publishing articles from Notion exports to the Date My Dish blog. Victor manually exports Notion pages (markdown + CSV) into the `notion/` folder periodically. Claude then processes "Ready to Publish" articles — converting them to SEO-optimized MDX with proper frontmatter, optimizing images, generating French translations, and publishing 1-3 posts per week.

This starts with **articles only** (informative cooking guides). Restaurant reviews will be added later as a separate content type when enough content is ready.

### Scope

- **In scope:** Articles content collection, article layouts/pages, Notion-to-MDX conversion, image processing, EN+FR pairs, SEO optimization, tracking manifest, navigation updates
- **Out of scope:** Restaurant reviews (later), automated Notion API sync, CMS integration, scheduled publishing

## Why This Approach

**Dedicated Article Content Collection** — a new Astro content collection separate from recipes, with its own schema, layouts, and pages.

Reasons:
1. Articles have fundamentally different frontmatter from recipes (no ingredients, cook times, instructions)
2. Follows the same pattern already established with recipes — clean, validated, scalable
3. Makes adding restaurant reviews later trivial (just another collection)
4. No conditional rendering pollution in existing recipe components
5. Content collections give us Zod schema validation, `getCollection()`, and type safety

Alternatives considered:
- **Extend recipes schema:** Would pollute recipe-specific fields and require conditionals everywhere
- **Static markdown pages:** No schema validation, doesn't scale, manual everything

## Key Decisions

### 1. Content Type: Articles First
- Start with the 12 "Ready to Publish" informative articles
- Restaurant reviews deferred until more content is available
- All 12 articles have images included in the Notion export

### 2. URL Structure: `/en/articles/{slug}/`
- EN: `/en/articles/{slug}/`
- FR: `/fr/articles/{slug}/`
- Listing pages: `/en/articles/` and `/fr/articles/`
- Clear separation from recipes in URL hierarchy

### 3. Tracking: JSON Manifest
- `notion/published.json` maps Notion post titles to:
  - Published slug
  - Content hash (to detect updates)
  - Last published date
  - Post type (article, recipe, review)
- Each session: Claude reads CSV + manifest, identifies new/updated "Ready to Publish" entries

### 4. Translations: Full EN+FR Pairs
- Same bilingual pattern as recipes
- Every article gets a French translation via `/translate-recipe` (adapted for articles)
- Linked via `translationSlug` field

### 5. Content Style: Full SEO Rewrite
- Notion content rewritten to match existing blog style
- 800-1500 words, SEO-optimized H2 structure
- Internal cross-links to related recipes
- Keyword-rich, meta descriptions, proper heading hierarchy
- `<Picture>` components for optimized images

### 6. Structured Data: Article + FAQPage JSON-LD
- Google Article schema on every article page
- FAQPage schema (same pattern as recipes — great for featured snippets)
- BreadcrumbList (already exists site-wide)

### 7. Navigation: Main Nav Link
- Add "Articles" link to main navigation alongside "Recipes"
- Both EN and FR navigation updated

### 8. Article Schema (Simplified vs. Recipes)
Required fields:
- `title`, `lang`, `translationSlug`, `description` (max 160), `author`
- `publishDate`, `heroImage`, `heroImageAlt`
- `keywords`, `faqs` (min 1)
- `articleCategory` (e.g., "cooking-techniques", "food-science", "guides")

Optional fields:
- `updatedDate`, `tags`
- `relatedRecipes` (slugs of related recipes for cross-linking)
- `readingTime` (estimated minutes)

NOT needed (recipe-specific): `prepTime`, `cookTime`, `totalTime`, `recipeYield`, `difficulty`, `ingredientGroups`, `instructionGroups`, `nutrition`, `occasion`, `impressFactor`, `dateNightTips`, `recipeCategory`, `recipeCuisine`

### 9. Publishing Cadence
- 1-3 articles per week
- Victor exports Notion -> Claude identifies ready articles -> processes incrementally
- Each session handles a manageable batch (not all 12 at once)

## The 12 Ready Articles

| # | Title | Images |
|---|-------|--------|
| 25 | Why You Shouldn't Order a Well-Done Steak on a Date | 3 |
| 28 | Mastering the Art of Velveting (Tender Stir-Fries) | 3 |
| 29 | Unlock Restaurant-Quality Meals with Sous Vide | 2 |
| 30 | How to Get Wok Hei at Home | 1 |
| 31 | The Truth About MSG | 1 |
| 32 | The Essential Guide to Cooking Oils | 1 |
| 33 | Demystifying Clarified Butter and Ghee | 1 |
| 34 | The Ultimate Guide to Cooking a Perfect Steak | 2 |
| 35 | Why You Shouldn't Wash Chicken on Date Night | 1 |
| 36 | How to Choose Fresh Seafood | 1 |
| 37 | The Ultimate Guide to Crafting the Perfect Cocktail | 2 |
| 38 | The Foolproof Egg Formula | 5 |

## Publishing Workflow (Per Session)

1. Victor exports Notion pages to `notion/` folder
2. Claude reads `notion/published.json` manifest + Notion CSV
3. Identifies new "Ready to Publish" articles (or updated ones via content hash)
4. For each article (1-3 per session):
   a. Read Notion markdown source
   b. Copy and optimize images (`/optimize-image`)
   c. Rewrite content as SEO-optimized MDX with proper frontmatter
   d. Generate French translation
   e. Run `/seo-audit` (adapted for articles)
   f. Update `notion/published.json` manifest
5. Validate collection integrity
6. Deploy

## Open Questions

_None — all questions resolved during brainstorming._
