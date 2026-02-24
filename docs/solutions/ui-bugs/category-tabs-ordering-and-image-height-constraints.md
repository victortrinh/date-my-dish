---
title: "Fix category tab ordering and constrain image heights in recipe display"
date: "2026-02-24"
category: ui-bugs
tags: [layout, responsive-design, image-sizing, category-navigation]
severity: medium
component: [homepage, recipe-listing-pages, recipe-detail-pages, recipe-cards]
symptoms:
  - "Category tabs on recipe listing pages displayed in non-deterministic order"
  - "Homepage 'Browse by Category' section showed inconsistent tab ordering"
  - "Oversized vertical hero images dominated recipe pages"
  - "Step images in recipe cards had no size constraints"
root_cause: "Category ordering derived from Set insertion based on recipe publish dates (non-deterministic); hero and step images lacked max-height constraints and object-fit sizing"
resolution_type: fix
pr_number: 4
---

# Category Tab Ordering & Image Height Constraints

## Problem

Two UI bugs affected recipe pages across both EN and FR locales:

1. **Non-deterministic category tabs** — Category tabs on `/en/recipes/`, `/fr/recettes/`, and both homepages displayed in unpredictable order. The order came from `Set` insertion based on recipe publish dates, meaning tabs would shuffle as new recipes were added.

2. **Oversized images** — Hero images on recipe detail pages and step images in recipe instructions had no height constraints. Tall/portrait images dominated the viewport and broke visual hierarchy.

## Root Cause

### Category Tab Ordering

Categories were extracted from recipes using a `Set`, which preserves insertion order. Since recipes are sorted by `publishDate` (descending), the Set insertion order depended on which recipe was published first in each category — a non-deterministic ordering that changed as content grew.

### Oversized Images

The Astro `<Picture>` component for hero images and `<img>` tags for step images had responsive width (`w-full`) but no height constraints. Portrait-oriented images could render at 800+ pixels tall, pushing content far below the fold.

## Solution

### 1. Explicit Category Sorting (Priority Array + Alphabetical Fallback)

Applied to all four listing pages (`en/index`, `fr/index`, `en/recipes/index`, `fr/recettes/index`):

```javascript
const CATEGORY_ORDER = ["appetizer", "dinner", "dessert"];
const categories = [...new Set(recipes.flatMap((r) => r.data.recipeCategory))];
categories.sort((a, b) => {
  const ai = CATEGORY_ORDER.indexOf(a);
  const bi = CATEGORY_ORDER.indexOf(b);
  if (ai !== -1 && bi !== -1) return ai - bi;  // Both in priority list
  if (ai !== -1) return -1;                    // a is in list, b is not
  if (bi !== -1) return 1;                     // b is in list, a is not
  return a.localeCompare(b);                   // Neither in list: alphabetical
});
```

Three-tier sort: pinned categories first in defined order, then everything else alphabetically.

### 2. Hero Image Height Cap

In both `en/recipes/[...slug].astro` and `fr/recettes/[...slug].astro`:

```astro
<Picture
  src={heroImage}
  alt={data.heroImageAlt}
  widths={[600, 900, 1200]}
  sizes="(max-width: 896px) 100vw, 896px"
  formats={["avif", "webp"]}
  class="w-full max-h-[350px] object-cover"
  loading="eager"
/>
```

- `max-h-[350px]` — Hard cap at 350px height
- `object-cover` — Crops to fill without distortion
- Container has `overflow-hidden rounded-2xl`

### 3. Step & Prose Image Responsive Sizing

Step images in `RecipeContent.astro`:

```astro
<img
  src={step.image}
  alt=""
  class="step-image mt-3 max-w-full rounded-lg sm:max-w-[75%] lg:max-w-[50%]"
  loading="lazy"
  decoding="async"
/>
```

Prose images in `global.css`:

```css
@layer components {
  .prose img {
    @apply my-6 max-w-full rounded-lg sm:max-w-[75%] lg:max-w-[50%];
  }
}
```

Responsive: full width on mobile, 75% on tablet, 50% on desktop.

## Files Changed

| File | Change |
|------|--------|
| `src/pages/en/index.astro` | Category sort logic |
| `src/pages/fr/index.astro` | Category sort logic |
| `src/pages/en/recipes/index.astro` | Category sort logic |
| `src/pages/fr/recettes/index.astro` | Category sort logic |
| `src/pages/en/recipes/[...slug].astro` | Hero image `max-h-[350px]` |
| `src/pages/fr/recettes/[...slug].astro` | Hero image `max-h-[350px]` |
| `src/components/RecipeContent.astro` | Step image responsive sizing |
| `src/styles/global.css` | Prose image responsive sizing |

## Prevention

### Category/Collection Ordering

- **Always use explicit sort** when displaying user-facing collections (categories, tags, filters)
- **Define a `*_ORDER` constant** to make sort intent visible and maintainable
- **Include alphabetical fallback** for categories not in the priority list
- **Replicate the pattern** — when adding new listing pages, copy the sort logic from existing ones

### Image Sizing

- **Design height constraints upfront** as part of component creation, not as fixes later
- **Always pair `max-h-*` with `object-cover`** to prevent distortion
- **Test with portrait images** before merging — landscape-only testing misses overflow
- **Use responsive width pattern**: `max-w-full sm:max-w-[75%] lg:max-w-[50%]`

### PR Review Checklist

- [ ] Are displayed collections explicitly sorted?
- [ ] Do images have max-height constraints?
- [ ] Is `object-cover` or `object-contain` applied when height is capped?
- [ ] Does responsive sizing work across mobile/tablet/desktop?
- [ ] Are EN and FR pages consistent?

## Related

- [Plan: Category tab order and image height cap](../../plans/2026-02-23-feat-category-tab-order-and-image-height-cap-plan.md)
- [Solution: Oversized hero images optimization](../performance-issues/oversized-hero-images-optimization.md)
- [CLAUDE.md Image Guidelines](../../CLAUDE.md) — Hero max 1200px / < 200KB, Step max 900px / < 150KB
