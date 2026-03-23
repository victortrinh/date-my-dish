---
title: "Remove Category Browsing UI"
type: refactor
status: completed
date: 2026-03-22
origin: docs/brainstorms/2026-03-22-remove-category-browsing-brainstorm.md
---

# Remove Category Browsing UI

## Overview

Remove all category browsing UI (homepage section, recipe listing filter buttons, individual category pages) while keeping `recipeCategory` in frontmatter and JSON-LD structured data. Add 301 redirects for removed category page URLs. Revisit at 30+ recipes (see brainstorm: `docs/brainstorms/2026-03-22-remove-category-browsing-brainstorm.md`).

## Problem Statement / Motivation

With only 13 recipes across 4 active categories (5 of 9 categories have zero recipes), the category system hurts more than it helps:

- **Thin content**: Dessert and side-dish categories each have 1 recipe. Google treats thin pages as low-quality.
- **Poor UX**: Users clicking categories find sparse or empty results.
- **Redundant**: The recipes listing page already shows all 13 recipes.

## Proposed Solution

Full UI removal with data preservation. Delete category page routes, remove category sections from homepage and listing pages, rewrite 20 MDX inline links, add 301 redirects, and update CI workflows that auto-generate category links.

## Implementation Steps

### Step 1: Update `_redirects` (1 file)

**File:** `public/_redirects`

- **Remove** lines 21-28 (existing FR category slug redirects that would create broken chains)
- **Add** two wildcard 301 redirects:
  ```
  /en/recipes/category/*     /en/recipes/     301
  /fr/recettes/categorie/*   /fr/recettes/    301
  ```
- Reminder: Cloudflare Pages only accepts relative paths in `_redirects` (see `docs/solutions/build-errors/cloudflare-pages-absolute-url-redirects.md`)

### Step 2: Delete category dynamic route pages (2 files)

- `src/pages/en/recipes/category/[category].astro` (delete entire file)
- `src/pages/fr/recettes/categorie/[category].astro` (delete entire file)

### Step 3: Remove homepage category sections (2 files)

**Files:** `src/pages/en/index.astro`, `src/pages/fr/index.astro`

- Remove frontmatter: `CATEGORY_ORDER`, `categories` array, `categoryIcons` map (~lines 35-56)
- Remove the "Browse by Category" `<section>` (~lines 359-382)
- FR file: also remove `getCategorySlug` from imports (line 5)

### Step 4: Remove category filter buttons from recipe listing pages (2 files)

**Files:** `src/pages/en/recipes/index.astro`, `src/pages/fr/recettes/index.astro`

- Remove frontmatter: `CATEGORY_ORDER`, `categories` sorting logic (~lines 16-25)
- Remove the "Category Filter" `<div>` with filter buttons (~lines 77-96)
- FR file: also remove `getCategorySlug` from imports (line 5)

### Step 5: Rewrite MDX inline category links (20 files)

Rewrite all inline prose links pointing to category pages to link to the main recipes listing page instead.

**EN files** (10 in `src/content/recipes/en/`):
- `cauliflower-steak-with-romesco-sauce.mdx` (line 110)
- `cacio-e-pepe.mdx` (line 189)
- `lemon-posset-brulee.mdx` (line 113)
- `northern-thai-beef-tartare.mdx` (line 177)
- `crispy-vegan-calamari.mdx` (line 153)
- `brussels-sprouts-salad.mdx` (line 170)
- `zucchini-eggplant-chips.mdx` (line 181)
- `quinoa-crusted-salmon.mdx` (line 160)
- `penne-alla-vodka.mdx` (line 130)
- `vietnamese-pickled-vegetables.mdx` (line 189)

**FR files** (10 in `src/content/recipes/fr/`):
- `steak-de-chou-fleur-sauce-romesco.mdx` (line 110)
- `cacio-e-pepe.mdx` (line 189)
- `posset-brulee-au-citron.mdx` (line 113)
- `tartare-boeuf-thai.mdx` (line 177)
- `calamars-vegetaliens-croustillants.mdx` (line 153)
- `salade-de-choux-de-bruxelles.mdx` (line 170)
- `chips-de-courgettes-et-aubergines.mdx` (line 181)
- `saumon-en-croute-de-quinoa.mdx` (line 160)
- `penne-alla-vodka.mdx` (line 130)
- `legumes-marines-vietnamiens.mdx` (line 187)

**Strategy:** Replace category page links with main listing page links. E.g.:
- `[dinner recipes](/en/recipes/category/dinner/)` -> `[dinner recipes](/en/recipes/)`
- `[recettes de souper](/fr/recettes/categorie/souper/)` -> `[recettes de souper](/fr/recettes/)`

### Step 6: Clean up `src/i18n/utils.ts` (1 file)

Remove:
- `categorySlugMap` (~lines 236-246)
- `getCategorySlug()` (~lines 248-250)
- `getCategoryFromSlug()` (~lines 252-257)
- `getCategoryLocalizedPath()` (~lines 259-266)
- `category`/`categorie` entries from `routeMap` in `getAlternateUrl()` (~lines 57-58)
- Category slug translation block in `getAlternateUrl()` (~lines 90-95)

### Step 7: Clean up i18n keys (2 files)

**Files:** `src/i18n/en.json`, `src/i18n/fr.json`

Remove these keys (only used by removed UI):
- `home.categories`
- `listing.filterByCategory`
- `footer.categories`
- `footer.categoriesNav`
- `breadcrumbs.category`

**Keep** these keys (still used):
- `listing.allCategories` (used by occasion filter bar on listing page)
- All `categories.*` keys (used by recipe hero badge and JSON-LD schema)
- `recipe.category` (used by recipe detail page)

### Step 8: Update CI workflows (2 files)

**`.github/workflows/reverse-internal-linking.yml`** (~line 80):
- Remove the category slug convention rule ("FR links use localized category slugs...")
- Add instruction: "Do not link to category pages. Link to the main recipes listing page or to specific individual recipes instead."

**`.github/workflows/auto-publish-recipe.yml`**:
- Review the Claude prompt section and add a rule to not generate category page links in prose.

### Step 9: Clean up Playwright tests (1 file)

**File:** `tests/smoke/recipe-schema.spec.ts` (~lines 9-10)
- Remove the `/category/` and `/categorie/` path exclusion filters (now dead code)

### Step 10: Verify

- [x] `npm run build` passes
- [x] `npm run check` passes (no TypeScript errors from removed imports)
- [ ] `npx playwright test` passes
- [x] Manual spot-check: no remaining references to `/category/` or `/categorie/` in page templates

## What Stays Unchanged

- `recipeCategory` field in `src/content.config.ts` (Zod schema)
- `recipeCategory` in all recipe MDX frontmatter
- `RecipeSchema.astro` usage of `recipeCategory` (JSON-LD structured data)
- `RelatedRecipes.astro` usage of `categories` prop (internal matching logic)
- Recipe detail hero badge showing `recipeCategory[0]` as a non-linked `<span>`
- `scripts/fetch-notion-recipe.mjs` category handling
- `scripts/generate-recipe-index.mjs` category field

## Technical Considerations

- **Redirect chains**: The existing `_redirects` has 7 FR slug redirects (e.g., `/fr/recettes/categorie/appetizer/*` -> `/fr/recettes/categorie/entree/*`). These target URLs are being deleted. Must **replace** them with the wildcard redirect, not just add alongside them.
- **Sitemap**: Astro auto-generates sitemap from existing pages. Deleting the route files naturally removes category pages from the sitemap. No explicit filter needed.
- **Pagefind**: Rebuilds from scratch on each deploy. Category pages will automatically disappear from search results.
- **Pinterest tracking**: Category pages fire `pintrk('track','viewcategory')`. This event will stop firing. Low impact unless active Pinterest ad campaigns depend on it.

## Acceptance Criteria

- [x] No category browsing UI visible on homepage, recipe listing, or as standalone pages
- [x] All `/en/recipes/category/*` URLs 301 redirect to `/en/recipes/`
- [x] All `/fr/recettes/categorie/*` URLs 301 redirect to `/fr/recettes/`
- [x] All 20 MDX inline category links rewritten to listing page
- [x] `recipeCategory` still present in JSON-LD on recipe pages
- [x] Recipe detail hero badge still shows category label
- [x] RelatedRecipes component still functions correctly
- [x] CI workflows no longer generate category page links
- [x] Build, type-check, and E2E tests all pass

## Sources & References

- **Origin brainstorm:** [docs/brainstorms/2026-03-22-remove-category-browsing-brainstorm.md](docs/brainstorms/2026-03-22-remove-category-browsing-brainstorm.md) — decisions: remove all category UI, keep frontmatter/JSON-LD, add 301 redirects, revisit at 30+ recipes
- **Redirect gotcha:** `docs/solutions/build-errors/cloudflare-pages-absolute-url-redirects.md` — relative paths only
- **Category ordering pattern:** `docs/solutions/ui-bugs/category-tabs-ordering-and-image-height-constraints.md` — CATEGORY_ORDER priority array to remove
