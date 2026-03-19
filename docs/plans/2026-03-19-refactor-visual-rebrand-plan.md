---
title: "refactor: Visual rebrand to Modern Editorial Romance"
type: refactor
status: active
date: 2026-03-19
origin: docs/brainstorms/2026-03-19-visual-rebrand-brainstorm.md
---

# Visual Rebrand: Modern Editorial Romance

## Overview

Complete visual rebrand of Date My Dish from terracotta/gold earthy aesthetic to a "Modern Editorial Romance" direction. Wine burgundy + rose gold palette, Playfair Display editorial headings, Source Serif 4 body, Inter UI, magazine-style asymmetric layouts, and warm-tinted neutrals throughout.

All existing content (MDX, frontmatter, images, i18n strings) stays untouched. All URLs, SEO metadata, JSON-LD schemas, and routing remain identical. One big PR on the `rebrand` branch.

## Key Decisions (from brainstorm)

- **Colors**: Wine burgundy `#7B2D3B` primary, rose gold `#D4A08A` accent, custom warm neutral palette
- **Typography**: Playfair Display headings (mixed-case), Source Serif 4 body, Inter UI, Caveat stays
- **Logo**: Keep illustrated food-letter logo as-is. Compact in nav on dark strip/badge, full-size in footer.
- **Hero**: Editorial split layout (text 60% left, photo 40% right, blush background)
- **Grids**: Magazine asymmetric (featured large card + smaller cards)
- **Difficulty badges**: Keep semantic green/yellow/red
- **Scope**: Everything visual is fair game. Clean up all unused code after migration.

## Color System

### Brand Tokens

```js
brand: {
  // Wine Burgundy (primary)
  wine:        '#7B2D3B',  // Decorative, backgrounds, large text (9.21:1 on white)
  'wine-text': '#7B2D3B',  // Body text — same value, passes AAA on white
  'wine-dark': '#C4697A',  // Dark mode primary (lighter rose for contrast)

  // Rose Gold (accent)
  rose:        '#D4A08A',  // Decorative only in light mode (2.28:1 — fails WCAG)
  'rose-text': '#8B5A45',  // Light mode text variant (5.76:1 on white — AA)
}
```

### Warm Neutral Palette (replaces Tailwind `neutral-*`)

```js
warm: {
  50:  '#FBF8F7',  // Light bg (replaces neutral-50/neutral-100)
  100: '#F3EEEB',  // Section alt bg (replaces neutral-200)
  200: '#E4DBD8',  // Borders, dividers
  300: '#CBC0BD',  // Muted borders
  400: '#A19491',  // Muted text, icons
  500: '#786A68',  // Secondary text
  600: '#584C4B',  // Body text secondary
  700: '#433739',  // Dark borders
  800: '#2D2226',  // Body text primary (replaces neutral-800)
  900: '#1F1A1C',  // Dark mode section alt
  950: '#1A1215',  // Dark mode body bg (replaces neutral-950)
}
```

### Dark Mode Mapping

| Element | Light | Dark |
|---------|-------|------|
| Body bg | `warm-50` (#FBF8F7) | `warm-950` (#1A1215) |
| Card bg | white | `warm-800` (#2D2226) |
| Section alt bg | `warm-100` (#F3EEEB) | `warm-900` (#1F1A1C) |
| Body text | `warm-800` (#2D2226) | `warm-50` (#FBF8F7) |
| Muted text | `warm-500` (#786A68) | `warm-400` (#A19491) |
| Borders | `warm-200` (#E4DBD8) | `warm-700` (#433739) |
| Links | `brand-wine` | `brand-wine-dark` (#C4697A) |
| Accent hover | `brand-rose-text` | `brand-rose` (#D4A08A) |
| Focus ring (light) | `brand-wine` | `brand-rose` |

## Typography System

### Font Loading

Replace the current Google Fonts `<link>` in `BaseLayout.astro` with:

```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link
  href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400..900;1,400..700&family=Source+Serif+4:ital,opsz,wght@0,8..60,400..700;1,8..60,400..700&family=Inter:opsz,wght@14..32,400..700&family=Caveat:wght@400..700&display=swap"
  rel="stylesheet"
/>
```

Remove the current `preload` link for fonts (unnecessary with `display=swap`).

### Tailwind Font Config

```js
fontFamily: {
  heading: ['"Playfair Display"', 'serif'],
  body: ['"Source Serif 4"', 'serif'],
  handwritten: ['Caveat', 'cursive'],
  ui: ['Inter', 'sans-serif'],
}
```

### Base Heading Styles

Remove `uppercase tracking-wide` from `h1-h4` in `global.css`. Replace with mixed-case Playfair Display:

```css
h1, h2, h3, h4 {
  @apply font-heading font-bold;
  /* No uppercase, no tracking-wide */
}
```

Keep `normal-case` protection on Caveat elements (hero title, logo text).

## Implementation Phases

### Phase 1: Design Foundation

Update the core config files that everything else depends on.

**Files:**
- `tailwind.config.mjs`
- `src/styles/global.css`
- `src/layouts/BaseLayout.astro`

**Tasks:**

1. **`tailwind.config.mjs`** — Replace entire color and font configuration:
   - Replace `brand.*` tokens with new wine/rose tokens
   - Add `warm` neutral palette
   - Replace `fontFamily` entries (Playfair Display, Source Serif 4, Inter, Caveat)
   - Keep custom `fontSize`, `spacing`, and `maxWidth` tokens unchanged

2. **`src/styles/global.css`** — Update all base and component styles:
   - `@layer base`: Remove `uppercase tracking-wide` from headings, update body text color to `warm-800`, update link colors to `brand-wine`/`brand-rose`
   - `.btn-primary`: Change from terracotta to wine burgundy bg
   - `.btn-accent`: Change from gold to rose gold bg
   - `.btn-outline`: Update border/text from neutral to warm
   - `.btn-outline-brand`: Update from terracotta border to wine
   - `.btn-ghost`: Update neutral colors to warm
   - `.prose` styles: Update heading colors, link colors, blockquote border
   - Focus-visible: Update to `brand-wine` (light) and `brand-rose` (dark)
   - Print styles: Update hardcoded hex references

3. **`src/layouts/BaseLayout.astro`** — Update font loading and body:
   - Replace Google Fonts `<link>` URL with new fonts
   - Remove `preload` link for fonts
   - Update body class: `bg-neutral-100` → `bg-warm-50`, `dark:bg-neutral-950` → `dark:bg-warm-950`
   - Update dark mode localStorage key references if needed
   - Update `text-neutral-800` → `text-warm-800`, `dark:text-neutral-200` → `dark:text-warm-50` (or `warm-100`)

### Phase 2: Shell Components (Nav + Footer + Overlays)

These wrap every page, so updating them first gives the rebrand its overall frame.

**Files:**
- `src/components/Navigation.astro`
- `src/components/Footer.astro`
- `src/components/SearchOverlay.astro`
- `src/components/SearchBar.astro`
- `src/components/DarkModeToggle.astro`
- `src/components/LanguageToggle.astro`
- `src/components/Breadcrumbs.astro`

**Tasks:**

1. **`Navigation.astro`** — Major visual change:
   - Replace Caveat text logo with illustrated logo image (compact, ~200px, on dark rounded badge/strip)
   - Update nav bg: `bg-neutral-50/95` → `bg-warm-50/95`, `dark:bg-neutral-950/95` → `dark:bg-warm-950/95`
   - Update border: `border-neutral-100` → `border-warm-200`, dark equivalent
   - Update link colors: `text-neutral-600` → `text-warm-600`, active state to `text-brand-wine`
   - Update active indicator: `bg-brand-primary` → `bg-brand-wine`
   - Update icon button colors from neutral to warm

2. **`Footer.astro`** — Update to dark warm background:
   - Background: `bg-neutral-200` → dark warm bg (`bg-warm-800` or `bg-[#2D2226]`)
   - Add full-size illustrated logo (replacing text logo)
   - Update all link colors from neutral to warm
   - Update newsletter card accent from terracotta to rose
   - Update border and text colors

3. **`SearchOverlay.astro`** — Update Pagefind dark mode overrides:
   - Replace all hardcoded neutral hex values with warm equivalents
   - Update `#D4A853` highlight mark to new accent color
   - Update overlay bg, input styles, result styles

4. **Other shell components** — Update color references:
   - `DarkModeToggle.astro`: neutral → warm text colors
   - `LanguageToggle.astro`: border and text colors
   - `Breadcrumbs.astro`: text and separator colors

### Phase 3: Content Cards

The reusable card components used across listing pages.

**Files:**
- `src/components/RecipeCard.astro`
- `src/components/ArticleCard.astro`
- `src/components/SectionHeading.astro`

**Tasks:**

1. **`RecipeCard.astro`** — Restyle and add featured variant:
   - Card bg: keep white, update `dark:bg-neutral-900/80` → `dark:bg-warm-800`
   - Shadow: warm-tinted (`shadow-warm-900/10` or custom)
   - Title hover: `group-hover:text-brand-primary` → `group-hover:text-brand-wine`
   - Description: `text-neutral-500` → `text-warm-500`
   - Time icon: `text-neutral-400` → `text-warm-400`
   - Add a new `featured` prop or create a `RecipeCardFeatured.astro` variant for the large horizontal card (image left, text right, spans 2 cols)

2. **`ArticleCard.astro`** — Same neutral → warm color updates as RecipeCard

3. **`SectionHeading.astro`** — Update accent bar:
   - `bg-brand-accent` (gold underline) → `bg-brand-rose` (rose gold underline)
   - Text colors neutral → warm

### Phase 4: Recipe Detail Components

The components that make up a recipe page.

**Files:**
- `src/components/RecipeDetailCard.astro`
- `src/components/IngredientList.astro`
- `src/components/InstructionSteps.astro`
- `src/components/RecipeContent.astro`
- `src/components/JumpToRecipe.astro`
- `src/components/NutritionCard.astro`
- `src/components/DateNightTips.astro`
- `src/components/ImpressFactor.astro`
- `src/components/FAQSection.astro`
- `src/components/RelatedRecipes.astro`
- `src/components/TableOfContents.astro`
- `src/components/StarRating.astro`
- `src/components/BookmarkButton.astro`
- `src/components/ShareButton.astro`
- `src/components/SocialShareButtons.astro`
- `src/components/AuthorBioCard.astro`
- `src/components/NewsletterSignup.astro`

**Tasks:**

1. **`RecipeDetailCard.astro`** — Update card and meta bar:
   - Card border/bg: neutral → warm
   - Dividers: `divide-neutral-100` → `divide-warm-200`

2. **`InstructionSteps.astro`** — Update step number circles:
   - `bg-brand-primary-dark` → `bg-brand-wine`
   - Text white stays

3. **`JumpToRecipe.astro`** — Update button:
   - `btn-accent` already updated in Phase 1 global.css

4. **`DateNightTips.astro`** — Update card:
   - Gold border accent → rose gold border
   - Background and text colors

5. **`ImpressFactor.astro`** — Update hearts:
   - `brand-accent` (gold) → `brand-rose` (rose gold)

6. **`NutritionCard.astro`** — Update:
   - `text-brand-primary-text` → `text-brand-wine`
   - Border/bg neutral → warm

7. **`FAQSection.astro`** — Update:
   - `border-brand-primary` → `border-brand-wine`

8. **All remaining components**: Find-and-replace `neutral-*` → `warm-*`, `brand-primary*` → `brand-wine*`, `brand-accent*` → `brand-rose*`

### Phase 5: Page Files

Update all 30 page files with new layouts and colors.

**Files:** All files in `src/pages/en/` and `src/pages/fr/`

**Tasks:**

1. **Homepage (`en/index.astro`, `fr/index.astro`)** — Major layout change:
   - Replace full-bleed hero with editorial split layout (text left 60%, photo right 40%, blush bg)
   - Hero heading: Playfair Display, mixed-case
   - CTA: `btn-primary` (already updated to wine in Phase 1)
   - Recent Posts section: Convert from uniform 3-col grid to magazine asymmetric (1 large featured + 2 standard)
   - Featured Recipes: Same asymmetric treatment or keep 3-col
   - Categories section: `bg-neutral-200` → `bg-warm-100`, pill colors neutral → warm
   - Remove scroll indicator bounce animation if it clashes with new aesthetic

2. **Recipe listing pages** (`recipes/index.astro`, `recettes/index.astro`):
   - Section backgrounds neutral → warm
   - Category/occasion/tag pills: neutral → warm with wine hover
   - Grid layout: consider asymmetric for first row

3. **Recipe detail pages** (`recipes/[...slug].astro`, `recettes/[...slug].astro`):
   - Section backgrounds neutral → warm
   - Prose wrapper spacing/colors

4. **Article pages** (listing + detail):
   - Same neutral → warm treatment

5. **Category/occasion/tag filter pages**:
   - Active pill: `bg-brand-primary` → `bg-brand-wine`
   - Section backgrounds

6. **Static pages** (about, contact, search, bookmarks, privacy, terms):
   - Background/text color updates
   - Any brand color references

7. **404 page**: Update colors

### Phase 6: Cleanup and Verification

**Tasks:**

1. **Remove unused code**:
   - Delete old color tokens from `tailwind.config.mjs` (terracotta `#C4704B`, gold `#D4A853`, etc.)
   - Remove any references to old font families (Fira Sans, Bitter) from config and components
   - Remove old Google Fonts URL weights if any remain
   - Grep for any remaining `neutral-*` classes and replace with `warm-*`
   - Grep for any remaining `brand-primary*`, `brand-accent*` references
   - Remove any dead CSS classes from `global.css`

2. **WCAG verification**:
   - Verify all text colors meet AA (4.5:1 body, 3:1 large text)
   - Test focus-visible indicators in both modes
   - Test keyboard navigation through nav, search overlay, FAQ accordions

3. **Dark mode testing**:
   - Verify every component in dark mode
   - Pagefind search overlay tested in dark mode
   - No white flashes on page load

4. **Responsive testing**:
   - Hero split layout works on mobile (stacks vertically)
   - Magazine grid degrades gracefully (single column on mobile)
   - Logo in nav doesn't overflow on small screens
   - Footer logo scales appropriately

5. **Build and validate**:
   - `npm run check` — zero TypeScript errors
   - `npm run build` — successful build
   - `/validate-recipes` — content integrity
   - `/bulk-audit` — SEO preservation
   - Visual smoke test: homepage, recipe detail, article, search, 404 in both modes at desktop + mobile

6. **Print stylesheet**:
   - Verify print mode still works (hardcoded colors may need updating)
   - Test recipe print layout

## Acceptance Criteria

- [ ] New wine burgundy / rose gold color palette applied across all components
- [ ] Playfair Display headings (mixed-case) on all pages
- [ ] Source Serif 4 body text throughout
- [ ] Inter for all UI elements (nav, buttons, metadata)
- [ ] Warm neutral palette replaces cold neutrals everywhere
- [ ] Illustrated logo: compact in nav (dark badge), full in footer
- [ ] Editorial split hero on homepage
- [ ] Magazine asymmetric grid for recipe listings (at least Recent Posts)
- [ ] Dark mode uses warm charcoal with wine undertone
- [ ] All text passes WCAG AA contrast (4.5:1 body, 3:1 large)
- [ ] Zero TypeScript errors (`npm run check`)
- [ ] Successful build (`npm run build`)
- [ ] No SEO regressions (URLs, JSON-LD, meta tags, hreflang all preserved)
- [ ] No remaining references to old colors (terracotta, gold) or fonts (Fira Sans, Bitter)
- [ ] No remaining `neutral-*` Tailwind classes (all migrated to `warm-*`)
- [ ] Print stylesheet still functional
- [ ] Pagefind dark mode overrides updated
- [ ] Responsive: hero stacks on mobile, grids degrade to single column
- [ ] Focus indicators visible and branded in both light and dark mode

## Sources & References

### Origin

- **Brainstorm document:** [docs/brainstorms/2026-03-19-visual-rebrand-brainstorm.md](docs/brainstorms/2026-03-19-visual-rebrand-brainstorm.md) — Key decisions: wine/rose palette, Playfair Display headings, keep illustrated logo as-is, editorial split hero, magazine grids, one big PR.

### Internal References

- Color accessibility audit: `docs/solutions/ui-bugs/wcag-2-2-aa-accessibility-remediation.md`
- Typography gotchas: `docs/solutions/ui-bugs/typography-system-font-swap-gotchas.md`
- Pagefind dark mode: `docs/solutions/ui-bugs/pagefind-dark-mode-accessibility.md`
- Image constraints: `docs/solutions/ui-bugs/category-tabs-ordering-and-image-height-constraints.md`
- Current design system: `tailwind.config.mjs`, `src/styles/global.css`

### External References

- [Google Fonts CSS2 API](https://developers.google.com/fonts/docs/css2)
- [Playfair Display on Google Fonts](https://fonts.google.com/specimen/Playfair+Display)
- [Source Serif 4 on Google Fonts](https://fonts.google.com/specimen/Source+Serif+4)
- [Inter on Google Fonts](https://fonts.google.com/specimen/Inter)
- [WCAG 2.2 Contrast Requirements](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html)
