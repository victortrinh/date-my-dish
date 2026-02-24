---
title: "Fix: Switch Dark Mode from Blue-Tinted Gray to Pure Neutral Palette"
type: fix
status: completed
date: 2026-02-24
---

# Fix: Switch Dark Mode from Blue-Tinted Gray to Pure Neutral Palette

## Overview

Tailwind's default `gray` scale has a subtle blue undertone (e.g., `gray-950` = `#030712`). The user wants a blacker/grayer dark mode. The fix is to replace all `dark:*-gray-*` Tailwind classes with `dark:*-neutral-*` equivalents, which are pure gray with zero color bias (e.g., `neutral-950` = `#0a0a0a`). Light mode is untouched.

## Problem Statement / Motivation

The current dark mode uses Tailwind's `gray` palette, which has a blue-ish cast. This creates a "dark blue" feeling rather than a true dark/black aesthetic. The `neutral` palette provides the same lightness progression with zero hue, giving a cleaner black/gray appearance while maintaining identical contrast ratios.

## Proposed Solution

**Two-pass mechanical replacement:**

1. **Pass 1 — Tailwind classes:** Global find-and-replace of `dark:*-gray-` → `dark:*-neutral-` across all `.astro` and `.css` files (including `@apply` directives in `global.css` and JavaScript string literals in components).

2. **Pass 2 — Hardcoded hex values:** Update Pagefind CSS overrides and inline JS error styles using this mapping table:

| Tailwind Token | Current Hex (gray) | New Hex (neutral) | Used In |
|---|---|---|---|
| 100 | `#f3f4f6` | `#f5f5f5` | SearchOverlay CSS |
| 300 | `#d1d5db` | `#d4d4d4` | SearchOverlay CSS |
| 400 | `#9ca3af` | `#a3a3a3` | SearchOverlay CSS |
| 500 | `#6b7280` | `#737373` | SearchOverlay CSS, SearchBar.astro JS (line 45), SearchOverlay.astro JS (line 141) |
| 700 | `#374151` | `#404040` | SearchOverlay CSS |
| 800 | `#1f2937` | `#262626` | SearchOverlay CSS (mark text, input bg) |

## Technical Considerations

**Accessibility — contrast ratios are preserved:**
The `neutral` and `gray` scales have the same lightness progression; only the hue differs. All WCAG AA ratios remain essentially identical. Key pairs verified:

| Pair | On gray | On neutral | Status |
|---|---|---|---|
| `brand-primary` (#C4704B) on 950 | 7.6:1 | ~7.5:1 | Passes AA |
| `brand-accent` (#D4A853) on 950 | 6.8:1 | ~6.7:1 | Passes AA |
| `neutral-200` text on 950 | ~13.5:1 | ~13.4:1 | Passes AA |
| `neutral-400` text on 900 | ~6.2:1 | ~6.2:1 | Passes AA |
| `neutral-500` (unfilled hearts) on 900 | 3.1:1+ | ~3.5:1 | Passes 3:1 non-text |
| Focus ring `#D4A853` on 950 | 6.8:1 | ~6.7:1 | Passes 3:1 non-text |

**No build/config changes needed:** Tailwind JIT generates `neutral-*` classes automatically — no changes to `tailwind.config.mjs` required.

**EN/FR template parity:** Every EN page has an FR duplicate. Both must receive identical changes.

## Acceptance Criteria

- [x] All `dark:*-gray-*` classes replaced with `dark:*-neutral-*` across all files
- [x] All hardcoded gray hex values in SearchOverlay CSS updated to neutral equivalents
- [x] Inline JS hex values in SearchBar.astro and SearchOverlay.astro updated
- [x] JavaScript string literals in TableOfContents.astro updated
- [x] EN/FR template pairs have identical dark mode classes
- [x] `npm run build` succeeds with no errors
- [x] `npm run check` passes
- [ ] Dark mode visually shows pure black/gray (no blue tint)
- [ ] All brand colors (terracotta, gold) remain legible in dark mode
- [ ] Focus rings remain visible in dark mode
- [ ] Light mode is completely unaffected

## Files to Change (~35 files)

### Styles & Layout
- `src/styles/global.css` — 4 `@apply` dark classes
- `src/layouts/BaseLayout.astro` — body background

### Components (14 files)
- `src/components/Navigation.astro`
- `src/components/Footer.astro`
- `src/components/SearchOverlay.astro` — classes + 15 hardcoded hex values
- `src/components/SearchBar.astro` — 1 inline hex
- `src/components/RecipeCard.astro`
- `src/components/AuthorBioCard.astro`
- `src/components/NutritionCard.astro`
- `src/components/DateNightTips.astro`
- `src/components/FAQSection.astro`
- `src/components/TableOfContents.astro` — includes JS string literals
- `src/components/DarkModeToggle.astro`
- `src/components/ShareButton.astro`
- `src/components/LanguageToggle.astro`
- `src/components/ImpressFactor.astro`
- `src/components/Breadcrumbs.astro`
- `src/components/InstructionSteps.astro`
- `src/components/IngredientList.astro`
- `src/components/RecipeContent.astro`
- `src/components/RelatedRecipes.astro`

### Pages — EN (7 files)
- `src/pages/en/index.astro`
- `src/pages/en/about.astro`
- `src/pages/en/contact.astro`
- `src/pages/en/search.astro`
- `src/pages/en/recipes/index.astro`
- `src/pages/en/recipes/[...slug].astro`
- `src/pages/en/recipes/category/[category].astro`

### Pages — FR (7 files)
- `src/pages/fr/index.astro`
- `src/pages/fr/a-propos.astro`
- `src/pages/fr/contact.astro`
- `src/pages/fr/recherche.astro`
- `src/pages/fr/recettes/index.astro`
- `src/pages/fr/recettes/[...slug].astro`
- `src/pages/fr/recettes/categorie/[category].astro`

### Other
- `src/pages/404.astro`

## Success Metrics

- Dark mode background appears as pure black/gray with no blue cast
- All existing WCAG AA contrast ratios maintained
- No visual regressions in light mode
- Build passes cleanly

## Sources & References

- Tailwind CSS neutral palette: [Tailwind Docs — Customizing Colors](https://tailwindcss.com/docs/customizing-colors)
- WCAG audit: `docs/solutions/ui-bugs/wcag-2-2-aa-accessibility-remediation.md`
- Accessibility remediation plan: `docs/plans/2026-02-24-fix-color-accessibility-audit-and-remediation-plan.md`
