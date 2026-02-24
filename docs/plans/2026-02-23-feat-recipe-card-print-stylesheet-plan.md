---
title: "Self-Contained Recipe Card & Print Stylesheet"
type: feat
status: completed
date: 2026-02-23
---

# Self-Contained Recipe Card & Print Stylesheet

## Overview

Make the recipe card a self-contained, printable unit and add a comprehensive print stylesheet so that printing a recipe page outputs **only** the recipe card — not the blog prose, hero image, FAQs, or related recipes. This aligns with industry best practices (WP Recipe Maker, Tasty Recipes) and ensures the printed output matches what users actually need in the kitchen.

## Problem Statement / Motivation

Currently:
- **Print output includes everything**: blog prose, hero image, FAQs, related recipes all print alongside the recipe — users get 5+ pages when they only need 1-2
- **RecipeContent is incomplete**: it only contains ingredients and instructions, missing title, times, yield, and nutrition — so even if we hide everything else in print, the output lacks essential info
- **No print optimization**: no page-break rules, no ink-saving adjustments, no source URL attribution
- **Poor user experience**: users who print recipes (a core use case for food blogs) get cluttered, wasteful output

Industry standard (WP Recipe Maker, Tasty Recipes, Serious Eats): print shows only recipe title, times, yield, ingredients, instructions, nutrition, and source URL.

## Proposed Solution

### 1. Expand RecipeContent into a self-contained recipe card

Add to the `RecipeContent.astro` component:
- Recipe title (`<h2>`)
- Prep time, cook time, total time, yield
- Difficulty (plain text in print, badge on screen)
- Nutrition facts (moved inside the card boundary)
- Source URL (print-only footer)
- Wrap everything in a visually distinct card container (border + subtle background)

**Key decision — avoiding on-screen duplication:**
The page header already shows title, times, yield, and difficulty above the blog prose. Rather than showing this info twice on screen, use **Option B**: the card metadata (title, times, yield) is rendered with a `print-only` class — hidden on screen, visible only in print. This way:
- On screen: the existing header meta bar stays as-is, no duplication
- In print: the card is self-contained with all info
- Nutrition moves into the card wrapper and is visible in both screen and print

### 2. Comprehensive print stylesheet

Add `@media print` rules to `global.css`:

**SHOW in print:**
- Recipe card title, times, yield, difficulty
- Ingredients with empty checkbox squares
- Instructions (numbered steps)
- Nutrition facts
- Source URL attribution footer

**HIDE in print:**
- Navigation, footer, breadcrumbs (already hidden)
- Blog prose (MDX `<Content />`)
- Hero image
- "Jump to Recipe" button (already hidden)
- Print button (already hidden)
- FAQ section
- Related recipes section
- Step images (hide by default — saves ink/pages)

### 3. Print CSS best practices

- `@page { margin: 1.5cm; }` for consistent margins
- `break-inside: avoid` on ingredient groups, instruction steps, nutrition grid
- `break-after: avoid` on headings
- Remove background colors and shadows for ink savings
- Monochrome-friendly difficulty display
- Source URL attribution via print-only footer element

## Technical Considerations

### Architecture

- **RecipeContent.astro** gains new props: `title`, `prepTime`, `cookTime`, `totalTime`, `recipeYield`, `difficulty`, `nutrition` (optional), `sourceUrl`, `locale`
- **`formatDuration` utility**: currently duplicated in both EN and FR slug page templates — extract to `src/utils/format.ts` shared utility
- **i18n keys needed**: `recipe.source` ("Source" / "Source"), `recipe.perServing` ("Per serving" / "Par portion")
- **Nutrition section**: remove standalone section from slug pages, move into RecipeContent card wrapper
- **Print button**: stays outside the card, keeps `no-print` class

### Existing bug to fix

The `peer-checked:text-gray-400 peer-checked:line-through` classes on ingredient labels don't work because the `<input>` checkbox is missing the `peer` class. Fix while modifying RecipeContent.

### Files to modify

1. `src/components/RecipeContent.astro` — expand with new props, card wrapper, print-only metadata, nutrition section
2. `src/styles/global.css` — comprehensive `@media print` rules
3. `src/pages/en/recipes/[...slug].astro` — pass new props to RecipeContent, remove standalone nutrition section
4. `src/pages/fr/recettes/[...slug].astro` — same changes as EN slug page
5. `src/utils/format.ts` (new) — extract shared `formatDuration` function
6. `src/i18n/en.json` — add new translation keys
7. `src/i18n/fr.json` — add new translation keys

### What NOT to change

- `RecipeSchema.astro` — JSON-LD is already correct and pulls from the same frontmatter
- `RecipeCard.astro` — this is the listing card for index pages, unrelated
- Page header with title/description/meta bar — stays as-is for above-the-fold experience
- Hero image rendering — stays on screen, just hidden in print

## Acceptance Criteria

- [x] Print output contains ONLY: recipe title, times, yield, difficulty, ingredients (with checkbox squares), instructions (numbered), nutrition, source URL
- [x] Print output does NOT contain: blog prose, hero image, nav, footer, breadcrumbs, FAQs, related recipes, buttons, step images
- [x] No duplicate content visible on screen — card metadata is print-only
- [x] Nutrition is inside the recipe card wrapper
- [x] `formatDuration` extracted to shared utility, no duplication
- [x] Ingredient checkbox `peer-checked` strikethrough bug fixed
- [x] New i18n keys added for both EN and FR
- [x] Page breaks don't split ingredient groups, instruction steps, or nutrition grid
- [ ] Print renders correctly in Chrome, Safari, and Firefox
- [x] Recipes without nutrition gracefully omit that section in print
- [x] Source URL shows current locale's canonical URL

## Success Metrics

- Print output fits 1-2 pages for a typical recipe (vs. 5+ currently)
- No broken structured data in Google Rich Results Test
- Recipe card is visually distinct from blog prose on screen

## Dependencies & Risks

- **Risk**: Cross-browser print CSS inconsistencies, especially Safari checkbox rendering → mitigate with testing
- **Risk**: Very long recipes (20+ ingredients, 15+ steps) may still span 2-3 pages → acceptable with proper page-break rules
- **Dependency**: None — this is a standalone frontend improvement

## Sources & References

- [Google Recipe Structured Data Docs](https://developers.google.com/search/docs/appearance/structured-data/recipe)
- [Google Structured Data Policies](https://developers.google.com/search/docs/appearance/structured-data/sd-policies)
- [WP Recipe Maker Print Feature](https://bootstrapped.ventures/print-recipe/)
- [Tasty Recipes Printable Cards](https://www.wptasty.com/how-to-make-printable-recipe-cards)
- [MDN CSS Printing Guide](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Media_queries/Printing)
- Current codebase: `src/components/RecipeContent.astro`, `src/styles/global.css`, `src/pages/en/recipes/[...slug].astro`
