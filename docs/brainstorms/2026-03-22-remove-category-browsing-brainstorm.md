# Remove Category Browsing UI

**Date:** 2026-03-22
**Status:** Ready for planning

## What We're Building

Remove all category browsing UI (homepage section, recipe listing filter buttons, individual category pages) while preserving `recipeCategory` in frontmatter and JSON-LD structured data. Add 301 redirects for removed category page URLs.

## Why This Approach

With only 13 recipes across 4 active categories (5 categories have zero recipes), the category system creates more problems than value:

- **Thin content risk**: Dessert and side-dish categories each have 1 recipe. Google treats thin pages as low-quality signals.
- **Poor UX**: 5 of 9 categories are empty. Users clicking empty categories find nothing.
- **Redundant navigation**: The recipes listing page already shows all 13 recipes. Categories add a click without adding discovery value at this scale.
- **Revisit at 30+ recipes**: When there's enough content for meaningful category distribution, reintroduce with real SEO value.

## Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Scope | Remove all category UI | Homepage section, filter buttons, category pages |
| Frontmatter | Keep `recipeCategory` | Still feeds JSON-LD schema; data ready for reintroduction |
| Content schema | Keep as-is | No changes to `content.config.ts` |
| Redirects | 301 to recipes listing | `/en/recipes/category/*` -> `/en/recipes/`, same for FR |
| Timeline | Temporary removal | Revisit when collection hits 30+ recipes |

## What Gets Removed

1. **Homepage** (`src/pages/en/index.astro`, `src/pages/fr/index.astro`): Category browse section with emoji icons
2. **Recipe listing** (`src/pages/en/recipes/index.astro`, `src/pages/fr/recettes/index.astro`): Category filter buttons
3. **Category pages** (`src/pages/en/recipes/category/[category].astro`, `src/pages/fr/recettes/categorie/[category].astro`): Entire dynamic route files
4. **i18n keys**: Category-related translation keys (if only used by removed UI)

## What Stays

- `recipeCategory` field in all recipe MDX frontmatter
- `recipeCategory` in `content.config.ts` schema
- `recipeCategory` in JSON-LD structured data (`RecipeSchema.astro`)
- Category slug mapping in `i18n/utils.ts` (needed for future reintroduction)
- `getCategoryLocalizedPath()` utility (keep for future use)

## Redirects to Add

In `_redirects`:
```
/en/recipes/category/*  /en/recipes/  301
/fr/recettes/categorie/*  /fr/recettes/  301
```

## Open Questions

None. All decisions resolved during brainstorming.
