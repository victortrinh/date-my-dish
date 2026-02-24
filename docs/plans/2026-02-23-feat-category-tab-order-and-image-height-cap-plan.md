---
title: Reorder Category Tabs & Cap Image Heights on Recipe Pages
type: feat
status: completed
date: 2026-02-23
---

# Reorder Category Tabs & Cap Image Heights on Recipe Pages

Two UI improvements: (1) enforce a specific tab order on the recipes page so appetizer appears before dinner and desserts, and (2) limit the height of hero images and vertical step images on recipe pages while keeping them responsive.

## Acceptance Criteria

- [x] Category tabs display in this order: Appetizer, Dinner, Dessert (then any others alphabetically)
- [x] Order is consistent across EN and FR recipes pages and home pages
- [x] Hero image on recipe pages has a max height (~500px) with `object-cover` to crop gracefully
- [x] Step images (vertical/portrait) also have a max height (~400px) with `object-cover`
- [x] All images remain fully responsive on mobile
- [x] No layout shift — images maintain consistent space

## Context

### Category Tab Ordering

Currently, categories are extracted as a `Set` from recipes sorted by `publishDate` descending, so the tab order is non-deterministic:

```js
// src/pages/en/recipes/index.astro:16
const categories = [...new Set(recipes.flatMap((r) => r.data.recipeCategory))];
```

This same pattern exists in 4 files:
- `src/pages/en/recipes/index.astro:16`
- `src/pages/fr/recettes/index.astro:16`
- `src/pages/en/index.astro:15`
- `src/pages/fr/index.astro:15` (likely same pattern)

**Fix:** Define an explicit category order array and sort categories against it.

### Image Height Capping

The hero image on individual recipe pages has no height constraint:

```astro
<!-- src/pages/en/recipes/[...slug].astro:85-95 -->
<div class="no-print relative mb-8 overflow-hidden rounded-2xl">
  <Picture
    src={heroImage}
    alt={data.heroImageAlt}
    widths={[600, 900, 1200]}
    sizes="(max-width: 896px) 100vw, 896px"
    formats={["avif", "webp"]}
    class="w-full"
    loading="eager"
  />
</div>
```

Step images also have no height constraint:

```astro
<!-- src/components/RecipeContent.astro:124-131 -->
<img
  src={step.image}
  alt=""
  class="step-image mt-3 w-full rounded-lg"
  loading="lazy"
  decoding="async"
/>
```

**Fix:** Add `max-h-[500px] object-cover` to the hero image container/element, and `max-h-[400px] object-cover` to step images. This crops tall images at a reasonable height while keeping them responsive via `w-full`.

## MVP

### 1. Category Tab Ordering

Create a shared category order constant (or inline it) and use it to sort the extracted categories.

#### `src/pages/en/recipes/index.astro` (and FR mirror)

```diff
+ const CATEGORY_ORDER = ["appetizer", "dinner", "dessert"];
  const categories = [...new Set(recipes.flatMap((r) => r.data.recipeCategory))];
+ categories.sort((a, b) => {
+   const ai = CATEGORY_ORDER.indexOf(a);
+   const bi = CATEGORY_ORDER.indexOf(b);
+   if (ai !== -1 && bi !== -1) return ai - bi;
+   if (ai !== -1) return -1;
+   if (bi !== -1) return 1;
+   return a.localeCompare(b);
+ });
```

Apply the same sorting logic in all 4 files (EN/FR recipes index + EN/FR home page).

### 2. Hero Image Max Height

#### `src/pages/en/recipes/[...slug].astro` (and FR mirror)

Add `max-h-[500px]` and `object-cover` to the hero `<Picture>`:

```diff
  <Picture
    src={heroImage}
    alt={data.heroImageAlt}
    widths={[600, 900, 1200]}
    sizes="(max-width: 896px) 100vw, 896px"
    formats={["avif", "webp"]}
-   class="w-full"
+   class="w-full max-h-[500px] object-cover"
    loading="eager"
  />
```

### 3. Step Image Max Height

#### `src/components/RecipeContent.astro`

Add `max-h-[400px] object-cover` to step images:

```diff
  <img
    src={step.image}
    alt=""
-   class="step-image mt-3 w-full rounded-lg"
+   class="step-image mt-3 w-full max-h-[400px] object-cover rounded-lg"
    loading="lazy"
    decoding="async"
  />
```

## Files to Modify

| File | Change |
|------|--------|
| `src/pages/en/recipes/index.astro` | Sort categories with explicit order |
| `src/pages/fr/recettes/index.astro` | Sort categories with explicit order |
| `src/pages/en/index.astro` | Sort categories with explicit order |
| `src/pages/fr/index.astro` | Sort categories with explicit order |
| `src/pages/en/recipes/[...slug].astro` | Add `max-h-[500px] object-cover` to hero image |
| `src/pages/fr/recettes/[...slug].astro` | Add `max-h-[500px] object-cover` to hero image |
| `src/components/RecipeContent.astro` | Add `max-h-[400px] object-cover` to step images |

## Sources

- Existing image guidelines: CLAUDE.md (Hero max 1200px wide / < 200KB)
- Past learning: `docs/solutions/performance-issues/oversized-hero-images-optimization.md`
