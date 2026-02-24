---
title: "fix: Full-Site Color Accessibility Audit & Remediation"
type: fix
status: completed
date: 2026-02-24
---

# Full-Site Color Accessibility Audit & Remediation

## Overview

Comprehensive audit of all color contrast, focus indicators, and interactive states across the entire Date My Dish site in both light and dark mode. The site has **critical WCAG AA failures** on primary interactive elements (buttons, links, badges) and **zero custom focus indicators** for keyboard navigation. This plan identifies every deficiency and provides a phased remediation strategy.

**Target**: WCAG 2.2 AA conformance for all color contrast, focus indicators, and interactive states.

## Problem Statement

The site currently has:

1. **Critical contrast failures** on key interactive elements (buttons at 2.2:1 and 3.8:1)
2. **No custom focus indicators** -- all 25+ interactive element types rely on browser defaults
3. **No focus trapping** in modal dialogs (search overlay, mobile menu)
4. **Hardcoded English ARIA labels** on multiple components in a bilingual site
5. **No `prefers-reduced-motion`** handling for 7+ animation types
6. **Missing screen reader feedback** for dynamic state changes (clipboard copy, dark mode toggle)

## Current Color Contrast Inventory

### Critical Failures (Must Fix)

| Element | Colors | Ratio | Requirement | Location |
|---------|--------|-------|-------------|----------|
| Jump to Recipe button | `text-white` on `bg-brand-accent` (#D4A853) | **2.2:1** | 4.5:1 AA | `JumpToRecipe.astro` |
| Hero CTA button | `text-white` on `bg-brand-primary` (#C4704B) | **3.8:1** | 4.5:1 AA (text-sm) | `en/index.astro:108` |
| Active category pill | `text-white` on `bg-brand-primary` | **3.8:1** | 4.5:1 AA (text-body-sm) | `en/recipes/index.astro:71` |
| Step number circles | `text-white text-sm` on `bg-brand-primary` | **3.8:1** | 4.5:1 AA | `InstructionSteps.astro:36` |
| Logo/nutrition text | `text-brand-primary` (#C4704B) on `bg-gray-100` | **3.6:1** | 4.5:1 AA | Navigation, NutritionCard |
| Occasion tag text | `text-brand-accent-dark` (#B8923F) on `bg-brand-accent/10` | **~2.9:1** | 4.5:1 AA | `en/recipes/[...slug].astro:152` |
| Outline button hover | `text-white` on `bg-brand-primary` (hover fill) | **3.8:1** | 4.5:1 AA | `en/index.astro:119` |

### Borderline / Needs Verification

| Element | Colors | Ratio | Notes |
|---------|--------|-------|-------|
| Muted text | `text-gray-500` on `bg-gray-100` | ~4.2:1 | Fails for small text, passes large |
| Footer tagline | `text-brand-primary/60` on `bg-gray-200` | ~2.2:1 | Decorative -- mark as such |
| Dark mode footer tagline | `text-brand-primary/40` on `dark:bg-gray-900` | Unknown | Needs computation |
| Unfilled hearts | `dark:text-gray-600` on `dark:bg-gray-800` | ~2.3:1 | Non-text indicator, needs 3:1 |
| Search overlay "Esc" hint | `dark:text-gray-500` on `dark:bg-gray-900/95` | ~3.7:1 | Informational text, needs 4.5:1 |
| Difficulty badges (dark) | `dark:text-yellow-400` on `dark:bg-yellow-900/30` over `dark:bg-gray-900` | Unknown | Yellow on dark is risky |
| Checkbox borders | `border-gray-300` on white | ~1.8:1 | Non-text UI, needs 3:1 |
| Breadcrumb separators | `text-gray-400` / `dark:text-gray-500` | ~3.3:1 / ~3.7:1 | Decorative or meaningful? |
| Base links (dark mode) | `text-brand-primary-text` (#9A5439) on `dark:bg-gray-950` | ~10:1 | Passes -- verify only |
| Pagefind "Load more" button | `#f3f4f6` on `#374151` | ~5.3:1 | Likely passes |

### Passing (No Action Needed)

| Element | Colors | Ratio |
|---------|--------|-------|
| Body text links | `text-brand-primary-text` (#9A5439) on white | 5.7:1 |
| Body text links on gray | `text-brand-primary-text` on `bg-gray-100` | 4.6:1 |
| Gold text on dark bg | `text-brand-accent` (#D4A853) on `dark:bg-gray-950` | 6.8:1 |
| Primary on dark bg | `text-brand-primary` on `dark:bg-gray-950` | 7.6:1 |
| Body text | `text-gray-800` on `bg-gray-100` | ~9.5:1 |
| Dark mode body text | `dark:text-gray-200` on `dark:bg-gray-950` | ~13.5:1 |

## Proposed Solution

### Color Token Updates

Add new accessible tokens to `tailwind.config.mjs`:

```js
colors: {
  brand: {
    primary: "#C4704B",           // Decorative fills, large text, button backgrounds
    "primary-dark": "#A85D3D",    // Hover states (4.89:1 on white -- passes AA)
    "primary-text": "#9A5439",    // Body text links (5.67:1 on white -- solid AA)
    accent: "#D4A853",            // Decorative only -- backgrounds, thin accents, dark mode text
    "accent-dark": "#B8923F",     // DEPRECATED -- remove usage, fails all contrast
    "accent-text": "#7D631C",     // NEW: Gold text on light backgrounds (5.72:1 on white)
    "accent-ui": "#9A7A23",       // NEW: Gold borders/icons, large text (4.05:1 on white)
  },
},
```

### Button Contrast Strategy

For buttons with `bg-brand-primary` (#C4704B) + white text (3.8:1 -- fails AA for small text):

**Option chosen: Darken button backgrounds.** Switch all small-text buttons from `bg-brand-primary` to `bg-brand-primary-dark` (#A85D3D, 4.89:1 on white text). Keep `bg-brand-primary` for large text headings and decorative fills only.

For `bg-brand-accent` (#D4A853) + white text (2.2:1 -- fails everything):

**Option chosen: Switch to dark text.** Change Jump to Recipe and similar accent buttons to use `text-gray-900` instead of `text-white`. Gold background with dark text achieves ~8.5:1.

### Focus Ring Design System

Universal focus ring using `:focus-visible` with brand accent color + safety halo:

```css
/* Light mode */
:focus-visible {
  outline: 3px solid #9A5439;     /* brand-primary-text -- visible on light backgrounds */
  outline-offset: 2px;
}

/* Dark mode */
:root.dark :focus-visible {
  outline: 3px solid #D4A853;     /* brand-accent -- visible on dark backgrounds */
  outline-offset: 2px;
}

/* Remove focus ring for mouse/touch, keep for keyboard */
:focus:not(:focus-visible) {
  outline: none;
}
```

## Technical Approach

### Phase 1: Color Token & Contrast Fixes

**Files to modify:**

- `tailwind.config.mjs` -- Add `accent-text` and `accent-ui` tokens, deprecate `accent-dark` usage
- `src/components/JumpToRecipe.astro` -- Change `text-white` to `text-gray-900` on accent bg
- `src/components/InstructionSteps.astro` -- Change step circle bg to `bg-brand-primary-dark`
- `src/components/NutritionCard.astro` -- Change `text-brand-primary` to `text-brand-primary-text`
- `src/components/ImpressFactor.astro` -- Fix unfilled heart dark mode to `dark:text-gray-500`
- `src/components/IngredientList.astro` -- Change checkbox `border-gray-300` to `border-gray-400`
- `src/pages/en/index.astro` -- Darken hero CTA and category chip active/hover states
- `src/pages/fr/index.astro` -- Same changes (FR mirror)
- `src/pages/en/recipes/index.astro` -- Darken active category pill bg
- `src/pages/fr/recettes/index.astro` -- Same changes (FR mirror)
- `src/pages/en/recipes/category/[category].astro` -- Same category pill fixes
- `src/pages/fr/recettes/categorie/[category].astro` -- Same (FR mirror)
- `src/pages/en/recipes/[...slug].astro` -- Fix occasion tag text, step circles, outline button hover
- `src/pages/fr/recettes/[...slug].astro` -- Same (FR mirror)
- `src/components/Navigation.astro` -- Fix logo `text-brand-primary` to `text-brand-primary-text`
- `src/components/Footer.astro` -- Mark tagline as decorative (`aria-hidden="true"`)
- `src/components/RecipeCard.astro` -- Verify dark mode difficulty badge contrast
- `src/components/SearchOverlay.astro` -- Fix "Esc" hint dark mode text to `dark:text-gray-400`
- `src/styles/global.css` -- Add dark mode link colors, fix prose link contrast

**Acceptance criteria:**
- [x] No color pairing used for text has < 4.5:1 ratio against its background (AA normal text)
- [x] No color pairing used for large text (18px+ or 14px bold) has < 3:1 ratio
- [x] No UI component boundary (borders, checkboxes, icons conveying meaning) has < 3:1 ratio
- [x] All decorative-only elements are marked `aria-hidden="true"` or use CSS pseudo-elements
- [x] Both light and dark mode pass independently
- [x] Brand identity is preserved (terracotta + gold palette recognizable)

### Phase 2: Focus Indicators & Keyboard Navigation

**Files to modify:**

- `src/styles/global.css` -- Add universal `:focus-visible` ring styles
- `src/components/SearchOverlay.astro` -- Implement focus trapping in dialog
- `src/components/Navigation.astro` -- Implement focus trapping in mobile menu, add Escape to close, move focus on open/close
- `src/components/DarkModeToggle.astro` -- Add `aria-pressed`, update dynamically
- `src/components/ShareButton.astro` -- Add `aria-live="polite"` region for "Copied!" feedback
- `src/components/FAQSection.astro` -- Add focus-visible style to `<summary>` elements
- `src/components/TableOfContents.astro` -- Add focus-visible styles to TOC links
- `src/components/ImpressFactor.astro` -- Add `aria-label` with rating text

**Focus trap implementation** (shared utility for search overlay + mobile menu):

```js
function trapFocus(container) {
  const focusable = container.querySelectorAll(
    'a[href], button:not([disabled]), input, [tabindex]:not([tabindex="-1"])'
  );
  const first = focusable[0];
  const last = focusable[focusable.length - 1];

  container.addEventListener('keydown', (e) => {
    if (e.key !== 'Tab') return;
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  });
}
```

**Interactive elements requiring focus-visible (complete list):**

1. Desktop nav links (`Navigation.astro`)
2. Mobile nav links
3. Search button (desktop + mobile)
4. Mobile hamburger button
5. Dark mode toggle
6. Language toggle
7. Footer links (all sections)
8. Social media links
9. Recipe cards (`<a>` wrapper)
10. Category filter chips (active + inactive)
11. Jump to Recipe anchor
12. Print button
13. Share button
14. Ingredient checkboxes
15. FAQ `<summary>` elements
16. TOC links
17. Breadcrumb links
18. Prose links (global.css)
19. Hero CTA buttons (home)
20. Homepage category chips
21. 404 page CTAs
22. Search overlay close button
23. Pagefind input + result links
24. View All Recipes outline button
25. Outline button on recipe detail page

**Acceptance criteria:**
- [x] Every interactive element has a visible focus ring when navigated to via keyboard
- [x] Focus ring has >= 3:1 contrast against adjacent background in both light and dark mode
- [x] Focus ring is at least 2px thick solid outline
- [x] Focus ring is NOT visible on mouse/touch click (uses `:focus-visible` not `:focus`)
- [x] Search overlay traps focus when open, Escape closes it, focus returns to trigger
- [x] Mobile menu traps focus when open, Escape closes it, focus moves to first link on open, returns to hamburger on close
- [x] Tab order is logical on all page types
- [x] Skip-to-content link works and is visible on focus

### Phase 3: ARIA & Screen Reader Fixes

**Files to modify:**

- `src/components/Navigation.astro` -- i18n mobile menu toggle `aria-label`
- `src/components/Breadcrumbs.astro` -- i18n `aria-label="Breadcrumb"`
- `src/components/Footer.astro` -- i18n `aria-label="Footer navigation"` and `aria-label="Recipe categories"`
- `src/components/DarkModeToggle.astro` -- Add `aria-pressed` toggling + dynamic `aria-label`
- `src/components/ShareButton.astro` -- Add `aria-live="polite"` region
- `src/components/ImpressFactor.astro` -- Add `aria-label` with rating (e.g., "3 out of 5 hearts")
- `src/components/InstructionSteps.astro` -- Add `aria-hidden="true"` to visual step number spans
- `src/pages/404.astro` -- Add `lang="fr"` attribute on French text strings
- `src/i18n/translations.ts` (or equivalent) -- Add missing translation keys for ARIA labels

**Hardcoded English ARIA labels to internationalize:**

| Component | Current | Needs |
|-----------|---------|-------|
| `Navigation.astro` mobile toggle | `aria-label="Toggle menu"` | `t(locale, "nav.toggleMenu")` |
| `Breadcrumbs.astro` | `aria-label="Breadcrumb"` | `t(locale, "nav.breadcrumb")` |
| `Footer.astro` footer nav | `aria-label="Footer navigation"` | `t(locale, "footer.nav")` |
| `Footer.astro` categories | `aria-label="Recipe categories"` | `t(locale, "footer.categories")` |
| `Navigation.astro` search | `title="Cmd+K"` | Platform-aware `title` |

**Acceptance criteria:**
- [x] All `aria-label` values are translated for FR locale
- [x] Dark mode toggle announces current state via `aria-pressed`
- [x] Share button clipboard confirmation is announced to screen readers
- [x] ImpressFactor rating is accessible to screen readers
- [x] Step numbers don't double-announce with `<ol>` semantics
- [x] 404 page wraps French text in `lang="fr"` spans

### Phase 4: Motion & Reduced Motion

**Files to modify:**

- `src/styles/global.css` -- Add `@media (prefers-reduced-motion: reduce)` block

**Animations to disable under `prefers-reduced-motion: reduce`:**

| Animation | Location | Action |
|-----------|----------|--------|
| `scroll-smooth` on `html` | `global.css:8` | Remove smooth scrolling |
| `hover:-translate-y-1` on recipe cards | `RecipeCard.astro:38` | Set `transform: none` |
| `group-hover:scale-105` on card images | `RecipeCard.astro:48` | Set `transform: none` |
| `hover:-translate-y-0.5` on category chips | `en/index.astro:142` | Set `transform: none` |
| `group-open:rotate-180` on FAQ chevron | `FAQSection.astro:29` | Instant rotation (no transition) |
| All `transition-all` | Various | Replace with `transition: none` |
| `backdrop-blur-sm` | Navigation, SearchOverlay | Keep (not motion) |

**Keep:** `transition-colors` (instant color changes don't trigger vestibular issues), `backdrop-blur` (not motion-related).

```css
@media (prefers-reduced-motion: reduce) {
  html {
    scroll-behavior: auto !important;
  }

  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

**Acceptance criteria:**
- [x] No layout shift or transform animation plays when `prefers-reduced-motion: reduce` is set
- [x] Smooth scrolling is disabled
- [x] Color transitions still work (instant swap is fine)
- [x] Site remains fully functional with all animations disabled

### Phase 5: Automated Testing & CI

**New files:**

- `.pa11yci.json` -- Pa11y CI configuration for all page templates
- `.github/workflows/accessibility.yml` (optional) -- CI pipeline for PR checks

**Pages to test (representative set):**

```json
{
  "defaults": {
    "standard": "WCAG2AA",
    "runners": ["axe"]
  },
  "urls": [
    "http://localhost:4321/en/",
    "http://localhost:4321/fr/",
    "http://localhost:4321/en/recipes/",
    "http://localhost:4321/fr/recettes/",
    "http://localhost:4321/en/recipes/category/pasta/",
    "http://localhost:4321/en/about/",
    "http://localhost:4321/fr/a-propos/",
    "http://localhost:4321/en/search/",
    "http://localhost:4321/en/contact/"
  ]
}
```

Plus one recipe detail page per locale (pick any published recipe).

**Acceptance criteria:**
- [ ] `npm run build && npx pa11y-ci` passes with zero errors
- [ ] axe-core scan on each page reports zero contrast violations
- [ ] Both light and dark mode scans pass (requires two runs with class toggle)

## Complete Affected Components Matrix

| Component | Phase 1 (Color) | Phase 2 (Focus) | Phase 3 (ARIA) | Phase 4 (Motion) |
|-----------|:---:|:---:|:---:|:---:|
| `tailwind.config.mjs` | X | | | |
| `global.css` | X | X | | X |
| `Navigation.astro` | X | X | X | |
| `Footer.astro` | X | X | X | |
| `DarkModeToggle.astro` | | X | X | |
| `SearchOverlay.astro` | X | X | | |
| `JumpToRecipe.astro` | X | X | | |
| `RecipeCard.astro` | X | X | | X |
| `InstructionSteps.astro` | X | | X | |
| `NutritionCard.astro` | X | | | |
| `ImpressFactor.astro` | X | | X | |
| `IngredientList.astro` | | X | | |
| `FAQSection.astro` | | X | | X |
| `TableOfContents.astro` | | X | | |
| `ShareButton.astro` | | X | X | |
| `Breadcrumbs.astro` | | | X | |
| `LanguageToggle.astro` | | X | | |
| `SearchBar.astro` | | X | | |
| `en/index.astro` | X | X | | X |
| `fr/index.astro` | X | X | | X |
| `en/recipes/index.astro` | X | X | | |
| `fr/recettes/index.astro` | X | X | | |
| `en/recipes/[...slug].astro` | X | X | | |
| `fr/recettes/[...slug].astro` | X | X | | |
| `en/recipes/category/[category].astro` | X | X | | |
| `fr/recettes/categorie/[category].astro` | X | X | | |
| `404.astro` | | X | X | |
| `i18n/translations.ts` | | | X | |

## Success Metrics

- Zero WCAG 2.2 AA color contrast violations across all pages in both modes
- All interactive elements have visible, high-contrast focus indicators
- Full keyboard-only navigation possible for all user flows
- axe-core automated scan returns zero errors on all page templates
- No regressions to brand identity (terracotta + gold palette preserved)

## Dependencies & Risks

| Risk | Mitigation |
|------|------------|
| Darkening brand colors changes visual identity | Minimal darkening (primary-dark is only 1 shade darker); accent buttons switch to dark text instead |
| Focus trap JS adds weight | Shared utility, ~500 bytes unminified |
| Breaking Pagefind dark mode overrides | Pagefind styles use `!important` -- changes to global focus styles won't conflict |
| FR translation additions need review | Use existing `t()` i18n system, add keys to existing translation file |
| Automated testing may flag false positives | Pa11y supports `ignore` rules for documented exceptions |

## Testing Methodology

### Manual Testing Checklist (Per Page Template)

For each of the ~10 page templates, test:

- [ ] **Light mode**: All text readable, all buttons have sufficient contrast
- [ ] **Dark mode**: Toggle dark mode, verify all elements adapt correctly
- [ ] **Keyboard-only**: Tab through entire page, verify focus ring visible on every interactive element
- [ ] **Hover states**: Verify hover text/bg combinations meet contrast requirements
- [ ] **Active/pressed states**: Verify active states are distinguishable and meet contrast
- [ ] **200% zoom**: Verify layout doesn't break, text remains readable
- [ ] **Reduced motion**: Enable `prefers-reduced-motion`, verify no layout shift animations play

### Automated Testing

1. Build site: `npm run build`
2. Serve locally: `npx serve dist -p 4321`
3. Run axe-core: `npx @axe-core/cli http://localhost:4321/en/ --rules color-contrast`
4. Run Pa11y: `npx pa11y-ci --config .pa11yci.json`
5. Repeat steps 3-4 with dark mode class toggled

## Sources & References

### Internal References

- Color token definitions: `tailwind.config.mjs`
- Dark mode implementation: `src/layouts/BaseLayout.astro:62-64`
- Global styles: `src/styles/global.css`
- Past fix -- Pagefind dark mode: `docs/solutions/ui-bugs/pagefind-dark-mode-accessibility.md`
- Past fix -- Typography accessibility: `docs/solutions/ui-bugs/typography-system-font-swap-gotchas.md`
- Past audit -- SEO/accessibility: `docs/solutions/performance-issues/seo-performance-accessibility-audit-and-implementation.md`

### External References

- [WCAG 2.2 Quick Reference](https://www.w3.org/WAI/WCAG22/quickref/)
- [W3C SC 1.4.11: Non-text Contrast](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html)
- [W3C SC 2.4.13: Focus Appearance](https://www.w3.org/WAI/WCAG22/Understanding/focus-appearance.html)
- [Sara Soueidan: Designing Accessible Focus Indicators](https://www.sarasoueidan.com/blog/focus-indicators/)
- [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)
- [Accessible Palette Generator](https://accessiblepalette.com/)
