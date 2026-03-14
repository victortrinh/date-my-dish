---
title: "feat: Beautiful Recipe Card with SEO Microdata"
type: feat
status: completed
date: 2026-03-13
origin: docs/brainstorms/2026-03-13-recipe-card-brainstorm.md
---

# feat: Beautiful Recipe Card with SEO Microdata

## Overview

Add a self-contained `RecipeCard.astro` component at the end of every recipe page (after SEO prose). It replaces the current two-column sidebar layout (sticky `IngredientList` + `RecipeContent` instructions). The "Jump to Recipe" button scrolls directly to it. On desktop: split layout with sticky hero image left and all recipe details right. On mobile: stacked. Print mode hides the image and targets one-page output.

(see brainstorm: docs/brainstorms/2026-03-13-recipe-card-brainstorm.md)

---

## Problem Statement / Motivation

The current layout separates ingredients (sticky sidebar) from instructions (main column), requiring the user to scroll back and forth. There is no clear, unified visual anchor for the "Jump to Recipe" action. The new card gives the recipe a distinct, beautiful landing target that matches the reference design's clarity.

---

## Proposed Solution

### New component: `RecipeCard.astro`

A single card with:
- **Left panel** (desktop): Hero image, sticky. Hidden in print.
- **Right panel**: Title (`h2`), meta stats row, ingredient groups (with checkboxes), instruction groups (numbered steps).
- **Card shell**: Rounded corners, subtle background (`bg-white dark:bg-neutral-900`), border and shadow, `id="recipe"` anchor.
- **Print layout**: Image panel hidden, content full-width, ingredients + instructions in a two-column print grid, fits one page.
- **SEO microdata**: `itemscope itemtype="https://schema.org/Recipe"` on the card root, `itemprop` on key fields.

### Replaced/removed from slug pages

| Removed | Replaced by |
|---------|-------------|
| `RecipeContent.astro` (instructions + print header/footer) | RecipeCard |
| Sidebar `IngredientList` + `NutritionCard` (desktop, sticky) | RecipeCard |
| Mobile-inline `IngredientList` + `NutritionCard` | RecipeCard |
| Old two-column grid `lg:grid-cols-[1fr_320px]` | RecipeCard (full-width) |
| Old print CSS targeting `.recipe-two-col`, `.recipe-sidebar`, `.instruction-steps`, etc. | New print CSS scoped to `.recipe-card-*` |

The `id="recipe"` anchor moves from `RecipeContent` to `RecipeCard`. `JumpToRecipe.astro` (`href="#recipe"`) requires no changes.

---

## Technical Considerations

### RecipeCard.astro — Props

```ts
// src/components/RecipeCard.astro
interface Props {
  locale: Locale;
  title: string;
  heroImage: ImageMetadata;
  heroImageAlt: string;
  prepTime: string;
  cookTime: string;
  totalTime: string;
  recipeYield: string;
  difficulty: "easy" | "medium" | "hard";
  ingredientGroups: IngredientGroup[];
  instructionGroups: InstructionGroup[];
  calories?: string;         // from nutrition.calories
  impressFactor?: number;    // optional, 1-5
  sourceUrl: string;         // for print footer
}
```

### Layout Structure

```
<article id="recipe" itemscope class="recipe-card rounded-2xl border bg-white dark:bg-neutral-900 shadow-sm overflow-hidden">

  <div class="recipe-card-grid lg:grid lg:grid-cols-[2fr_3fr]">

    <!-- LEFT: hero image (sticky on desktop, hidden in print) -->
    <div class="recipe-card-image lg:sticky lg:top-20 lg:self-start">
      <Picture src={heroImage} ... class="w-full h-full object-cover" />
    </div>

    <!-- RIGHT: all recipe details -->
    <div class="recipe-card-content p-6 lg:p-8 overflow-y-auto">

      <h2 itemprop="name">Title</h2>

      <!-- Meta stats bar: icons + labels -->
      <div class="recipe-card-meta">
        prep / cook / total / yield / difficulty / calories (if present)
      </div>

      <!-- Ingredients -->
      <section class="recipe-card-ingredients">
        <h3>{t(locale, "recipe.ingredients")}</h3>
        <p itemprop="recipeYield">{recipeYield}</p>
        {ingredientGroups.map(group => (
          <h4>{group.group}</h4>  <!-- only if group name exists -->
          <ul>
            <li><input type="checkbox" /><label itemprop="recipeIngredient">{item}</label></li>
          </ul>
        ))}
      </section>

      <!-- Instructions -->
      <section class="recipe-card-instructions">
        <h3>{t(locale, "recipe.instructions")}</h3>
        {instructionGroups.map(group => (
          <h4>{group.group}</h4>  <!-- only if group name exists -->
          <ol>
            <li itemprop="recipeInstructions">{step.text}</li>
            <!-- NO step images per design spec -->
          </ol>
        ))}
      </section>

      <!-- Print-only footer -->
      <div class="print-only recipe-card-footer">
        {t(locale, "recipe.source")}: {sourceUrl}
      </div>

    </div>
  </div>
</article>
```

### Meta Stats Bar

Display all available stats with icon + label + value. Use ISO 8601 → `formatDuration()` from `@utils/format`. All i18n keys already exist.

| Stat | i18n key | Condition |
|------|----------|-----------|
| Prep time | `recipe.prepTime` | Always |
| Cook time | `recipe.cookTime` | Always |
| Total time | `recipe.totalTime` | Always |
| Servings | `recipe.servings` | Always |
| Difficulty | `recipe.difficulty` | Always |
| Calories | `recipe.calories` | Only if `calories` prop present |

Difficulty pill uses existing pattern: `easy` → green, `medium` → yellow, `hard` → red.

### SEO Microdata (`itemprop`)

The JSON-LD in `RecipeSchema.astro` already handles all machine-readable SEO. The microdata attributes on the card provide belt-and-suspenders coverage:

- `<article itemscope itemtype="https://schema.org/Recipe">`
- `<h2 itemprop="name">`
- `<time itemprop="prepTime" datetime={prepTime}>`
- `<time itemprop="cookTime" datetime={cookTime}>`
- `<time itemprop="totalTime" datetime={totalTime}>`
- `<span itemprop="recipeYield">`
- `<label itemprop="recipeIngredient">` (each ingredient)
- `<li itemprop="recipeInstructions">` (each step)

### Print Layout

New print CSS block in `src/styles/global.css` targeting `.recipe-card-*` classes:

```css
@media print {
  /* Hide image panel */
  .recipe-card-image { display: none !important; }

  /* Card: no border/shadow, full width */
  .recipe-card {
    border: none;
    box-shadow: none;
    border-radius: 0;
  }

  /* Two-column body: ingredients left, instructions right */
  .recipe-card-body {
    display: grid;
    grid-template-columns: 1fr 1.5fr;
    gap: 1rem;
    align-items: start;
  }

  /* Compact spacing */
  .recipe-card-content { padding: 0; }
  .recipe-card-meta { margin-bottom: 0.75rem; }
}
```

Old load-bearing print rules targeting `.recipe-two-col`, `.recipe-sidebar`, `.recipe-main-col`, `.instruction-steps`, `#recipe` (as `display: contents`) can be removed once the old layout is gone from the slug pages.

### Ingredient Checkboxes

Keep checkbox + `peer-checked:line-through` pattern from existing `IngredientList.astro`. No scaling buttons (removed in PR #75). No JS needed — pure CSS peer interaction.

---

## Acceptance Criteria

- [ ] `RecipeCard.astro` created with all props and both EN/FR slug pages updated
- [ ] Split layout on desktop (`lg:grid-cols-[2fr_3fr]`), stacked on mobile
- [ ] Hero image is sticky on desktop (`lg:sticky lg:top-20 lg:self-start`)
- [ ] Meta stats bar shows: prep, cook, total time, servings, difficulty, calories (conditional)
- [ ] Ingredient groups rendered with optional group headings and checkboxes; `itemprop="recipeIngredient"` on each item
- [ ] Instruction groups rendered with optional group headings and numbered steps; `itemprop="recipeInstructions"` on each step. No step images.
- [ ] Card has `id="recipe"` anchor — "Jump to Recipe" button works without changes
- [ ] Card has `itemscope itemtype="https://schema.org/Recipe"` with key `itemprop` attributes
- [ ] Old two-column grid (sidebar + RecipeContent) removed from both slug pages
- [ ] Old mobile-inline IngredientList + NutritionCard removed from both slug pages
- [ ] Print: image panel hidden, content full-width, two-column print grid (ingredients left, instructions right), fits ~1 page
- [ ] Old print CSS targeting removed load-bearing classes cleaned up in `global.css`
- [ ] Dark mode: card background `dark:bg-neutral-900`, text `dark:text-neutral-200`
- [ ] `npm run check` passes (TypeScript + schema validation)

---

## Dependencies & Risks

| Item | Notes |
|------|-------|
| PR #75 | Removes scaling buttons from `IngredientList`. Not yet merged to main. RecipeCard should not include scaling buttons regardless. |
| Load-bearing print CSS | Old `.recipe-two-col`, `.recipe-sidebar` etc. classes are in `global.css`. Remove them only after confirming old layout is fully gone from slug pages. |
| `NutritionCard` removal | Full nutrition breakdown is dropped (calories only in meta bar). Confirm no other page references `NutritionCard` beyond the slug pages. |
| `RecipeContent.astro` removal from slug pages | The `<slot name="head" />` in the layout is unrelated — only the page body changes. |
| `TableOfContents` | Stays in the main column above the prose. No changes needed. |
| EN + FR parity | Both `[...slug].astro` and `recettes/[...slug].astro` must be updated identically (diff only in `locale`). |

---

## Implementation Order

1. **Create** `src/components/RecipeCard.astro`
2. **Update** `src/pages/en/recipes/[...slug].astro` — swap out old layout for `<RecipeCard>`
3. **Update** `src/pages/fr/recettes/[...slug].astro` — same swap
4. **Update** `src/styles/global.css` — add new print CSS, remove old load-bearing rules
5. **Run** `npm run check` and fix any TS errors
6. **Visual check** — `npm run dev`, verify desktop split, mobile stack, print preview

---

## Files to Touch

| File | Action |
|------|--------|
| `src/components/RecipeCard.astro` | CREATE |
| `src/pages/en/recipes/[...slug].astro` | MODIFY — remove 2-col grid + mobile inline block, add `<RecipeCard>` |
| `src/pages/fr/recettes/[...slug].astro` | MODIFY — same |
| `src/styles/global.css` | MODIFY — add recipe-card print CSS, remove old print rules |

Components **not changed**: `JumpToRecipe.astro`, `RecipeSchema.astro`, `RecipeContent.astro` (just no longer used in slug pages), `IngredientList.astro` (just no longer used), `NutritionCard.astro` (just no longer used in slug pages), `InstructionSteps.astro` (just no longer used).

---

## Sources & References

- **Origin brainstorm:** [docs/brainstorms/2026-03-13-recipe-card-brainstorm.md](docs/brainstorms/2026-03-13-recipe-card-brainstorm.md)
  Key decisions carried forward: split desktop layout, card after prose, no scaling, meta bar with all available stats, bordered card with subtle bg, group headings shown.
- Existing pattern — ingredient checkboxes: `src/components/IngredientList.astro`
- Existing pattern — instruction steps: `src/components/InstructionSteps.astro`
- Existing pattern — print layout: `src/styles/global.css` (lines 120-213)
- Existing pattern — `formatDuration`: `src/utils/format.ts`
- i18n keys: `src/i18n/en.json` (all `recipe.*` keys needed already exist)
- Learnings: `docs/solutions/ui-bugs/wcag-2-2-aa-accessibility-remediation.md` — brand color text rules
- Learnings: `docs/solutions/integration-issues/gsc-recipe-structured-data-schema-compliance.md` — JSON-LD already handles SEO; microdata is supplemental
