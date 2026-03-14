---
date: 2026-03-13
topic: recipe-card
---

# Recipe Card

## What We're Building

A self-contained `RecipeCard.astro` component that lives at the **end** of every recipe page, after the SEO prose content. It replaces the current `RecipeContent` (instructions) and the inline mobile `IngredientList`. The "Jump to Recipe" button scrolls directly to it.

The card has a two-panel split layout on desktop: hero image sticky on the left (~40% width), and all recipe details (meta stats, ingredients, instructions) scrollable on the right. On mobile it stacks vertically: image on top, content below. Print mode hides the image and collapses to a minimal single-column layout designed to fit one page.

## Why This Approach

The current layout separates ingredients (sidebar) from instructions (main column) and requires the user to scroll back and forth. A unified card puts everything in one place, matches the reference design's visual clarity, and gives the "Jump to Recipe" button a meaningful, distinct landing target.

The card is added **after** the prose rather than replacing it so the SEO blog content is preserved. The existing `RecipeSchema.astro` already handles all JSON-LD structured data in `<head>` — the card will complement this with `itemprop` microdata attributes on key elements for belt-and-suspenders SEO coverage.

## Key Decisions

- **Placement**: After prose, before FAQs/AuthorBioCard. The `id="recipe"` anchor moves from `RecipeContent` to this card.
- **Layout**: Split on `lg+` (grid `2fr 3fr`), stacked on mobile. Image column is `sticky top-20` on desktop.
- **Meta bar**: Prep time, cook time, total time, servings/yield, difficulty, calories (shown only if `nutrition.calories` is present). Icons + labels, same style as the reference image.
- **Ingredients**: Keep checkboxes for ingredient tracking. No multiplier (already removed). `recipeYield` displayed above the list.
- **Instructions**: Numbered steps with the branded circle badge, same as current `InstructionSteps`. Step images omitted (user requested no images except hero).
- **Print**: Image column hidden (`print:hidden`), content column goes full-width, compact spacing, targets fitting one page. Print header (title, timing, yield, difficulty) injected via `print:block`.
- **SEO microdata**: Wrap card in `<div itemscope itemtype="https://schema.org/Recipe">`. Add `itemprop` to: `name`, `prepTime`, `cookTime`, `totalTime`, `recipeYield`, `recipeIngredient` items, `recipeInstructions` steps.
- **Existing components removed from page**: `RecipeContent.astro` and the mobile-inline `IngredientList` + `NutritionCard` block. The sidebar `IngredientList` on desktop is also replaced by the card.
- **NutritionCard**: Folded into the meta bar (calories only). The full nutrition breakdown is omitted to keep the card minimal.

## Resolved Questions

- **Card placement**: After prose content (end of page), not replacing it.
- **Desktop layout**: Split (image left, sticky), content right.
- **Mobile**: Stacked (image top, content below).
- **Meta stats**: Show everything available: prep/cook/total time, yield, difficulty, calories.

## Resolved Questions (continued)

- **Group headings**: Show ingredient and instruction group headings (e.g. "For the sauce") in the card.
- **Card style**: Bordered card with subtle background (white / neutral-50 dark:neutral-900), rounded corners, shadow. Visually distinct from the prose above.

## Open Questions

None.

## Next Steps

→ `/workflows:plan` for implementation details
