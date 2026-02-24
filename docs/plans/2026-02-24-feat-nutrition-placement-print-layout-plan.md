---
title: "feat: Deduplicate nutrition section and optimize print layout for 1-page fit"
type: feat
status: completed
date: 2026-02-24
origin: docs/brainstorms/2026-02-24-nutrition-placement-print-layout-brainstorm.md
---

# Deduplicate Nutrition Section & Optimize Print Layout

## Overview

Two related improvements to recipe pages:
1. **Remove duplicate NutritionCard** — keep sidebar-only (desktop) and inline (mobile), remove full-size from RecipeContent
2. **Optimize print layout** — fit core recipe on one page by shrinking headings/spacing, reordering ingredients before instructions, and hiding non-essential content

## Problem Statement / Motivation

- **Nutrition duplication**: On desktop, users see NutritionCard twice — full-size after instructions (RecipeContent) and compact in sidebar. Redundant and adds scroll.
- **Print layout**: Recipes often spill to 2 pages because headings are too large (`text-heading-2` = 30px, `text-heading-3` = 24px), step numbers are 32x32px circles, spacing is generous (`space-y-6`), and non-essential content (AuthorBioCard, NutritionCard) prints. Ingredients also appear AFTER instructions due to DOM order.

## Proposed Solution

### Part 1: Nutrition Consolidation

| Context | Before | After |
|---------|--------|-------|
| Desktop (>= lg) | Full-size in main column + compact in sidebar | Compact in sidebar only |
| Mobile (< lg) | Full-size in main column | Compact in inline ingredients block |
| Print | Full-size in main column | Hidden entirely |
| JSON-LD | In RecipeSchema | No change |

### Part 2: Print Layout Optimization

| Aspect | Before | After |
|--------|--------|-------|
| Content order | Instructions → Nutrition → Ingredients | **Ingredients → Instructions** |
| Sidebar in print | Hidden (`display: none` from `hidden` class) | Forced visible via `display: block !important` |
| Inline mobile block | Visible in print | Hidden in print (avoid duplicate ingredients) |
| Headings | 30px/24px (Tailwind sizes) | ~12pt h2, ~11pt h3 |
| Step numbers | 32x32px terracotta circles | Small inline numbers, no background circle |
| Step spacing | `space-y-6` (1.5rem) | `space-y-2` equivalent |
| AuthorBioCard | Prints | Hidden (`no-print`) |
| NutritionCard | Prints (full-size) | Hidden (`no-print`) |
| Sidebar decorative styles | Borders, bg, padding, rounded | Stripped for ink/space savings |
| Grid gap | `gap-8` (2rem) | Reduced in print |

**Acceptance criteria for "1 page"**: Optimize for typical recipes (~10 ingredients, ~6 steps). Longer recipes may overflow to 2 pages — that's acceptable.

## Technical Considerations

### CSS Print Mechanics

The key challenge is forcing the sidebar visible and reordering it before the main column:

1. `.recipe-sidebar` has `hidden lg:block` → `display: none` at base. Print doesn't trigger `lg:`, so sidebar stays hidden. Must add `display: block !important` in print.
2. `.recipe-two-col` is forced to `display: block !important` in print. For reordering with `order`, need `display: flex !important; flex-direction: column !important` instead.
3. `.recipe-sidebar` gets `order: -1 !important` to appear before main column.
4. Inline mobile ingredients block (`.lg\:hidden` outside grid) must be hidden in print to avoid duplicate ingredients.
5. Sidebar inner container has `rounded-xl border border-gray-200 bg-white p-5` + inline `max-height` — all waste space/ink in print. Strip them.
6. Step number circles use `bg-brand-primary-dark` (#A85D3D) — not overridden in existing print CSS. Replace with plain inline numbers.
7. `gap-8` on `.recipe-two-col` adds 2rem between sidebar and main in flex — reduce to 0 or minimal.

### EN/FR File Synchronization

Both `src/pages/en/recipes/[...slug].astro` and `src/pages/fr/recettes/[...slug].astro` are near-identical. All template changes must be mirrored exactly in both files.

## Acceptance Criteria

### Nutrition Placement
- [x] Desktop: NutritionCard appears only in sidebar (compact)
- [x] Mobile: NutritionCard appears in inline ingredients block (compact)
- [x] Print: NutritionCard does not appear anywhere
- [x] Recipes without nutrition data: no NutritionCard renders in any context (conditional preserved)
- [x] EN and FR pages have identical behavior

### Print Layout
- [x] Print order: Title/Meta → Ingredients → Instructions → Source URL
- [x] AuthorBioCard hidden in print
- [x] NutritionCard hidden in print (both sidebar and inline)
- [x] Sidebar forced visible in print with decorative styles stripped
- [x] Inline mobile ingredients block hidden in print
- [x] Headings reduced to ~12pt (h2) and ~11pt (h3)
- [x] Step numbers rendered as small inline text, no background circles
- [x] Step spacing tightened
- [ ] Typical recipe (~10 ingredients, ~6 steps) fits on 1 printed page
- [ ] Long recipes overflow gracefully to page 2

### Cleanup
- [x] `NutritionCard` import removed from `RecipeContent.astro`
- [x] `nutrition` prop removed from `RecipeContent` Props interface and destructuring
- [x] `ingredientGroups` prop removed from `RecipeContent` Props (already unused)
- [x] `nutrition` and `ingredientGroups` props removed from `<RecipeContent>` usage in slug pages
- [x] `.step-image` print hide rule moved from `RecipeContent.astro` scoped style to `global.css`

## MVP

### 1. `src/components/RecipeContent.astro`

Remove NutritionCard, clean up unused props, move `.step-image` rule out:

```astro
---
import { t, type Locale } from "@i18n/utils";
import { formatDuration } from "@utils/format";
import InstructionSteps from "./InstructionSteps.astro";

interface Props {
  locale: Locale;
  title: string;
  prepTime: string;
  cookTime: string;
  totalTime: string;
  recipeYield: string;
  difficulty: "easy" | "medium" | "hard";
  instructionGroups: InstructionGroup[];
  sourceUrl: string;
}

// ... destructure without nutrition or ingredientGroups
---

<div id="recipe" class="scroll-mt-20">
  <!-- Print-only header (unchanged) -->
  ...

  <!-- Instructions -->
  <InstructionSteps locale={locale} instructionGroups={instructionGroups} />

  <!-- NutritionCard REMOVED from here -->

  <!-- Print-only source URL (unchanged) -->
  ...
</div>

<style>
  .print-only {
    display: none;
  }

  @media print {
    .print-only {
      display: block;
    }
    /* .step-image rule MOVED to global.css */
  }
</style>
```

### 2. `src/pages/en/recipes/[...slug].astro` (and FR equivalent)

Remove unused props from RecipeContent, add NutritionCard to inline block, add `no-print` wrappers:

```astro
<!-- RecipeContent: remove nutrition and ingredientGroups props -->
<RecipeContent
  locale={locale}
  title={data.title}
  prepTime={data.prepTime}
  cookTime={data.cookTime}
  totalTime={data.totalTime}
  recipeYield={data.recipeYield}
  difficulty={data.difficulty}
  instructionGroups={data.instructionGroups}
  sourceUrl={sourceUrl}
/>

<!-- Sidebar: wrap NutritionCard with no-print -->
<aside class="recipe-sidebar hidden lg:block">
  <div class="sticky top-[73px] space-y-6 ...">
    <div class="rounded-lg bg-gray-100 p-4 ...">
      <IngredientList ... />
    </div>
    {data.nutrition && (
      <div class="no-print">
        <NutritionCard locale={locale} nutrition={data.nutrition} compact={true} />
      </div>
    )}
  </div>
</aside>

<!-- Inline ingredients: add NutritionCard, add class for print hiding -->
<div class="recipe-inline-ingredients mx-auto mt-8 max-w-prose rounded-xl bg-gray-50 p-6 lg:hidden dark:bg-neutral-800/30">
  <IngredientList locale={locale} ingredientGroups={data.ingredientGroups} idPrefix="inline-ing" />
  {data.nutrition && (
    <div class="mt-4 no-print">
      <NutritionCard locale={locale} nutrition={data.nutrition} compact={true} />
    </div>
  )}
</div>

<!-- AuthorBioCard: wrap with no-print -->
<div class="mt-8 no-print">
  <AuthorBioCard locale={locale} />
</div>
```

### 3. `src/styles/global.css` — Print Overrides

```css
@media print {
  /* ... existing rules ... */

  /* Step images hidden in print (moved from RecipeContent.astro scoped style) */
  .step-image {
    display: none !important;
  }

  /* Force sidebar visible and reorder before main column */
  .recipe-two-col {
    display: flex !important;
    flex-direction: column !important;
    gap: 0.5rem !important;
  }

  .recipe-sidebar {
    display: block !important;
    order: -1 !important;
    position: static !important;
    max-height: none !important;
  }

  /* Strip sidebar decorative styles for ink/space savings */
  .recipe-sidebar > div {
    border: none !important;
    background: none !important;
    padding: 0 !important;
    border-radius: 0 !important;
    max-height: none !important;
    overflow: visible !important;
  }

  .recipe-sidebar .rounded-lg {
    background: none !important;
    padding: 0 !important;
    border-radius: 0 !important;
  }

  /* Hide inline mobile ingredients in print (sidebar ingredients shown instead) */
  .recipe-inline-ingredients {
    display: none !important;
  }

  /* Compact headings for print */
  h2 {
    font-size: 12pt !important;
    margin-bottom: 0.3rem !important;
    margin-top: 0.5rem !important;
    break-after: avoid;
  }

  h3 {
    font-size: 11pt !important;
    margin-bottom: 0.2rem !important;
    margin-top: 0.3rem !important;
    break-after: avoid;
  }

  /* Compact step numbers: plain inline text instead of circles */
  .step-number {
    width: auto !important;
    height: auto !important;
    background: none !important;
    color: #000 !important;
    font-size: 10pt !important;
    padding: 0 !important;
    border-radius: 0 !important;
  }

  .step-number::after {
    content: ".";
  }

  /* Tighten step spacing */
  .instruction-steps ol {
    gap: 0.25rem !important;
  }

  .instruction-steps li {
    gap: 0.25rem !important;
  }

  /* Tighten ingredient spacing */
  .recipe-sidebar ul {
    gap: 0.15rem !important;
  }
}
```

### 4. `src/components/InstructionSteps.astro`

Add semantic classes for print targeting:

```astro
<!-- Add class to section for print targeting -->
<section class="instruction-steps">
  ...
  <!-- Add class to step number span -->
  <span aria-hidden="true" class="step-number flex h-8 w-8 shrink-0 ...">
    {i + 1}
  </span>
  ...
</section>
```

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/RecipeContent.astro` | Remove NutritionCard import/render/props, clean up unused ingredientGroups prop, remove scoped `.step-image` print rule |
| `src/pages/en/recipes/[...slug].astro` | Remove nutrition/ingredientGroups props from RecipeContent, add NutritionCard to inline block, wrap sidebar NutritionCard + AuthorBioCard with `no-print`, add `recipe-inline-ingredients` class |
| `src/pages/fr/recettes/[...slug].astro` | Mirror all EN changes exactly |
| `src/styles/global.css` | Add print overrides: sidebar visibility + order, heading sizes, step number styling, spacing, decorative style stripping, inline block hiding, `.step-image` rule |
| `src/components/InstructionSteps.astro` | Add `instruction-steps` class to section, `step-number` class to step number span |

## Success Metrics

- Desktop: NutritionCard appears once (sidebar compact) — no duplicate
- Mobile: NutritionCard appears once (inline compact) — was full-size before
- Print: A 10-ingredient / 6-step recipe fits on 1 page in Chrome print preview
- `npm run check` passes with no errors
- `npm run build` succeeds

## Dependencies & Risks

- **Low risk**: All changes are CSS + template-level. No data model or schema changes.
- **EN/FR sync**: Must mirror template changes in both slug page files. Test both.
- **Print rendering differences**: Chrome, Safari, and Firefox render print CSS differently. Test in at least Chrome.
- **Long recipes**: Accept that recipes with 15+ ingredients and 10+ steps may overflow to 2 pages.

## Sources & References

- **Origin brainstorm:** [docs/brainstorms/2026-02-24-nutrition-placement-print-layout-brainstorm.md](docs/brainstorms/2026-02-24-nutrition-placement-print-layout-brainstorm.md) — Key decisions: sidebar-only nutrition, 1-page print target, ingredients-first order, hide AuthorBio + Nutrition in print
- `src/components/NutritionCard.astro` — compact vs full-size modes
- `src/components/RecipeContent.astro:80-85` — NutritionCard to remove
- `src/pages/en/recipes/[...slug].astro:204-216` — sidebar structure
- `src/pages/en/recipes/[...slug].astro:220-222` — inline ingredients block
- `src/styles/global.css:100-172` — existing print stylesheet
- `tailwind.config.mjs:25-33` — custom heading sizes
- CLAUDE.md Lesson #14: hero images need `max-h-[350px] object-cover`
- CLAUDE.md Lesson #5: never pair `uppercase` with negative `letter-spacing`
