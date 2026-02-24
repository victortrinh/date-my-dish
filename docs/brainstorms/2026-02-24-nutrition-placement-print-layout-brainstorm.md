# Nutrition Placement & Print Layout Optimization

**Date:** 2026-02-24
**Status:** Ready for planning

## What We're Building

Two related improvements to recipe pages:

1. **Remove duplicate nutrition section** — Currently `NutritionCard` renders twice on desktop: full-size after instructions (main column) and compact in the sidebar (under ingredients). Keep sidebar-only placement; remove the full-size duplicate from `RecipeContent`.

2. **Optimize print layout for 1-page fit** — Aggressively reduce heading sizes, step number sizing, spacing, and remove non-essential content so the core recipe (title, meta, ingredients, instructions) fits on a single printed page for most recipes.

## Why This Approach

- **Sidebar nutrition** pairs naturally with ingredients (both are reference data you glance at while cooking)
- **Removing the main-column nutrition** eliminates scroll redundancy on desktop without losing information
- **1-page print** is the #1 user expectation for printed recipes — nobody wants to flip pages while cooking
- **Ingredients-first print order** matches the natural cooking flow (gather, then cook)

## Key Decisions

### Nutrition Placement
| Decision | Choice |
|----------|--------|
| Desktop | Compact `NutritionCard` in sidebar only (under ingredients) |
| Mobile/Tablet | Show nutrition inline after ingredients (existing `lg:hidden` block) |
| Print | Hide nutrition entirely (save space for ingredients + instructions) |
| JSON-LD | No change — `RecipeSchema.astro` still includes nutrition in structured data |

### Print Layout
| Decision | Choice |
|----------|--------|
| Target | Core recipe fits 1 page for most recipes |
| Content order | Title/Meta → Ingredients → Instructions → Source URL |
| Hidden in print | AuthorBioCard, NutritionCard, hero image, blog prose, nav, footer, FAQ, related recipes, date night tips, ToC, share/jump buttons (already hidden) |
| Heading sizes | Override to ~12pt for h2, ~11pt for h3 in `@media print` |
| Step numbers | Shrink from 32x32px circles to ~20x20px or inline numbers |
| Step spacing | Reduce from `space-y-6` (1.5rem) to tighter spacing in print |
| Page margins | Keep 1.5cm (already set) |
| Body font | Keep 11pt (already set) |

## Scope of Changes

### Files to Modify

1. **`src/components/RecipeContent.astro`**
   - Remove the `NutritionCard` render (lines 80-85)
   - Remove `NutritionCard` import
   - Remove `nutrition` from Props interface and destructuring
   - Add print styles for compact headings, step numbers, spacing

2. **`src/pages/en/recipes/[...slug].astro`** (and FR equivalent)
   - Remove `nutrition` prop from `RecipeContent` usage
   - Add `no-print` to `AuthorBioCard` wrapper
   - Add nutrition to the inline mobile ingredient block (so mobile users still see it)
   - Add print CSS to reorder ingredients before instructions

3. **`src/pages/fr/recettes/[...slug].astro`**
   - Same changes as EN page

4. **`src/styles/global.css`**
   - Add print heading size overrides (h2 → 12pt, h3 → 11pt)
   - Add print step-number size reduction
   - Add print spacing compression
   - Add `.recipe-sidebar` display override for print (show sidebar ingredients, or use CSS `order` to move inline ingredients above instructions)

5. **`src/components/NutritionCard.astro`**
   - No changes needed (compact mode stays for sidebar use)

6. **`src/components/InstructionSteps.astro`**
   - Possibly add print-specific classes for step number sizing

## Open Questions

None — all decisions resolved.
