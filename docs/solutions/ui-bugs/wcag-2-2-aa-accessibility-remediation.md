---
title: "WCAG 2.2 AA Color Accessibility Audit and Remediation"
slug: wcag-2-2-aa-accessibility-remediation
problem_type: ui-bugs
component: site-wide
technology: [astro, tailwind-css, css, aria, i18n]
severity: high
date_solved: 2026-02-24
symptoms:
  - Brand terracotta (#C4704B) used on white backgrounds fails WCAG AA (3.6:1 vs required 4.5:1)
  - White text on gold accent (#D4A853) buttons fails AA (2.2:1 vs required 4.5:1)
  - No visible focus indicators for keyboard navigation
  - Hardcoded English-only ARIA labels on bilingual site
  - No focus trapping in modal overlays (search, mobile menu)
  - Missing prefers-reduced-motion support
  - Unfilled heart icons invisible in dark mode (dark:text-gray-600 on gray-900)
  - Ingredient checkbox borders too low contrast (gray-300 = 1.8:1)
root_cause: Brand color palette was designed for aesthetics without verifying WCAG contrast ratios. Interactive states (focus, hover) and assistive technology attributes (ARIA) were not included in the initial build. Dark mode was implemented visually but not tested for contrast compliance.
solution_approach: Four-phase remediation — (1) fix color tokens and contrast ratios across 25 files, (2) add focus-visible indicators and focus trapping, (3) internationalize all ARIA labels, (4) add reduced-motion media query. Created new Tailwind tokens (accent-text, primary-text) for accessible alternatives.
---

# WCAG 2.2 AA Color Accessibility Audit and Remediation

## Root Cause

The site's brand color palette (Terracotta `#C4704B`, Warm Gold `#D4A853`) was chosen for visual warmth but never validated against WCAG 2.2 AA contrast requirements. This led to systemic failures:

1. **Terracotta on white** (`#C4704B` on `#FFFFFF`) = 3.6:1 ratio (needs 4.5:1 for normal text)
2. **White on gold** (`#FFFFFF` on `#D4A853`) = 2.2:1 ratio (needs 4.5:1 for normal text)
3. **Gold accent on white** (`#D4A853` on `#FFFFFF`) = 2.1:1 ratio (needs 4.5:1)

Beyond color, the site lacked keyboard accessibility infrastructure: no focus indicators, no focus trapping in modals, no reduced-motion support, and all ARIA labels were hardcoded in English on a bilingual (EN/FR) site.

## Solution

### Phase 1: Color Token Updates and Contrast Fixes

#### New Tailwind Tokens

Added to `tailwind.config.mjs`:

```js
"accent-text": "#7D631C", // Gold text on light backgrounds — WCAG AA (5.72:1 on white)
```

Pre-existing tokens leveraged:
- `brand-primary-dark`: `#A85D3D` (4.87:1 on white — passes AA for large text/UI)
- `brand-primary-text`: `#9A5439` (5.67:1 on white — passes AA for all text)

#### Critical Fixes (25 files)

| Component | Before | After | Ratio Change |
|-----------|--------|-------|-------------|
| JumpToRecipe button | `text-white` on gold | `text-gray-900` on gold | 2.2:1 → ~8.5:1 |
| NutritionCard values | `text-brand-primary` | `text-brand-primary-text` | 3.6:1 → 5.67:1 |
| Logo (Nav + Footer) | `text-brand-primary` | `text-brand-primary-text` | 3.6:1 → 5.67:1 |
| Hero CTA buttons | `bg-brand-primary` | `bg-brand-primary-dark` | 3.6:1 → 4.87:1 |
| Category pills (active) | `bg-brand-primary` | `bg-brand-primary-dark` | 3.6:1 → 4.87:1 |
| Occasion tags | `text-brand-accent-dark` | `text-brand-accent-text` | < 3:1 → 5.72:1 |
| Ingredient checkboxes | `border-gray-300` | `border-gray-400` | 1.8:1 → 3:1+ |
| Step number circles | `bg-brand-primary` | `bg-brand-primary-dark` | 3.6:1 → 4.87:1 |
| Unfilled hearts (dark) | `dark:text-gray-600` | `dark:text-gray-500` | < 3:1 → 3:1+ |

### Phase 2: Focus Indicators and Focus Trapping

#### Global Focus-Visible Ring

Added to `src/styles/global.css`:

```css
*:focus:not(:focus-visible) {
  outline: none;
}

*:focus-visible {
  outline: 3px solid #9A5439;
  outline-offset: 2px;
}

:root.dark *:focus-visible {
  outline-color: #D4A853;
}
```

This uses `:focus-visible` so the ring only appears for keyboard navigation (not mouse clicks). Light mode uses terracotta, dark mode uses gold.

#### Focus Trapping in Modals

**SearchOverlay.astro** — Added Tab/Shift+Tab cycling:

```javascript
overlay.addEventListener('keydown', function(e) {
  if (e.key !== 'Tab' || overlay.classList.contains('hidden')) return;
  var focusable = overlay.querySelectorAll(
    'a[href], button:not([disabled]), input, [tabindex]:not([tabindex="-1"])'
  );
  if (focusable.length === 0) return;
  var first = focusable[0];
  var last = focusable[focusable.length - 1];
  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault(); last.focus();
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault(); first.focus();
  }
});
```

**Navigation.astro** — Mobile menu refactored with `openMenu()`/`closeMenu()` functions, Escape key handler, and Tab cycling within the menu. Focus moves to first link on open and returns to hamburger button on close.

### Phase 3: ARIA Labels and Screen Reader Improvements

Added 6 new i18n keys to both `src/i18n/en.json` and `src/i18n/fr.json`:

| Key | English | French |
|-----|---------|--------|
| `nav.toggleMenu` | Toggle menu | Basculer le menu |
| `nav.breadcrumb` | Breadcrumb | Fil d'Ariane |
| `footer.nav` | Footer navigation | Navigation du pied de page |
| `footer.categoriesNav` | Recipe categories | Catégories de recettes |
| `theme.switchToDark` | Switch to dark mode | Activer le mode sombre |
| `theme.switchToLight` | Switch to light mode | Activer le mode clair |

Additional ARIA improvements:
- **DarkModeToggle**: `aria-pressed` toggles with state, `aria-label` dynamically updates
- **ShareButton**: `aria-live="polite"` on label for clipboard copy announcement
- **ImpressFactor**: `role="img"` + `aria-label` for heart rating
- **InstructionSteps**: `aria-hidden="true"` on decorative step numbers
- **Footer tagline**: `aria-hidden="true"` on decorative text
- **404 page**: `lang="fr"` on French-language links

### Phase 4: Reduced Motion Support

Added to `src/styles/global.css`:

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

## Files Changed

- `tailwind.config.mjs` — Added `accent-text` token
- `src/styles/global.css` — Focus-visible, reduced motion, dark mode link colors
- `src/components/JumpToRecipe.astro` — Button text contrast
- `src/components/InstructionSteps.astro` — Step circle contrast, aria-hidden
- `src/components/NutritionCard.astro` — Value text contrast (4 instances)
- `src/components/ImpressFactor.astro` — Dark mode hearts, role/aria-label
- `src/components/IngredientList.astro` — Checkbox border contrast
- `src/components/Navigation.astro` — Logo contrast, i18n aria-label, focus trap
- `src/components/Footer.astro` — Logo contrast, aria-hidden tagline, i18n nav labels
- `src/components/SearchOverlay.astro` — Esc hint contrast, focus trap
- `src/components/DarkModeToggle.astro` — aria-pressed, dynamic aria-label
- `src/components/ShareButton.astro` — aria-live on label
- `src/components/Breadcrumbs.astro` — i18n aria-label
- `src/i18n/en.json` — 6 new accessibility keys
- `src/i18n/fr.json` — 6 new accessibility keys
- `src/pages/404.astro` — Button contrast, lang attributes
- `src/pages/en/index.astro` — Hero CTA and outline button contrast
- `src/pages/fr/index.astro` — Same
- `src/pages/en/recipes/index.astro` — Active pill contrast
- `src/pages/fr/recettes/index.astro` — Same
- `src/pages/en/recipes/category/[category].astro` — Active pill contrast
- `src/pages/fr/recettes/categorie/[category].astro` — Same
- `src/pages/en/recipes/[...slug].astro` — Occasion tag contrast
- `src/pages/fr/recettes/[...slug].astro` — Same

## Prevention Strategies

### Color Contrast Checklist (for new components)

1. **Before using any brand color as text**, check ratio against its background:
   - Normal text (< 18pt / < 14pt bold): needs **4.5:1**
   - Large text (>= 18pt / >= 14pt bold): needs **3:1**
   - Non-text UI (borders, icons, focus rings): needs **3:1**

2. **Use the accessible token variants**, not raw brand colors:
   - For text on white: `text-brand-primary-text` (#9A5439), NOT `text-brand-primary`
   - For gold text on white: `text-brand-accent-text` (#7D631C), NOT `text-brand-accent`
   - For button backgrounds with white text: `bg-brand-primary-dark` (#A85D3D), NOT `bg-brand-primary`

3. **Test both light AND dark mode** for every new element

### Color Contrast Quick Reference

| Token | Hex | On White | On gray-900 | Use For |
|-------|-----|----------|-------------|---------|
| `brand-primary` | #C4704B | 3.6:1 | — | Decorative only, dark mode text |
| `brand-primary-dark` | #A85D3D | 4.87:1 | — | Button backgrounds (large text) |
| `brand-primary-text` | #9A5439 | 5.67:1 | — | Body text, logos, links |
| `brand-accent` | #D4A853 | 2.1:1 | — | Decorative only, dark mode focus rings |
| `brand-accent-text` | #7D631C | 5.72:1 | — | Gold text on light backgrounds |

### ARIA Label Conventions

- Always use `t(locale, "key")` for ARIA labels — never hardcode English
- Add new keys to BOTH `en.json` and `fr.json` simultaneously
- Use `aria-live="polite"` for dynamic content updates (toasts, clipboard feedback)
- Use `aria-hidden="true"` for decorative elements (taglines, step numbers alongside `<ol>`)
- Use `role="img"` + `aria-label` for icon-based ratings/indicators

### Testing Recommendations

- Run axe-core or Lighthouse accessibility audit after any UI change
- Test keyboard navigation flow (Tab through all interactive elements)
- Verify focus rings are visible in both light and dark mode
- Test with `prefers-reduced-motion: reduce` enabled
- Verify screen reader announces dynamic state changes (aria-live, aria-pressed)

## Cross-References

- [Pagefind Dark Mode Accessibility](../ui-bugs/pagefind-dark-mode-accessibility.md) — Related dark mode contrast fixes for search modal
- [SEO Performance Accessibility Audit](../performance-issues/seo-performance-accessibility-audit-and-implementation.md) — Earlier audit that identified initial accessibility gaps
- [Typography System Font Swap Gotchas](../ui-bugs/typography-system-font-swap-gotchas.md) — Font rendering that affects text sizing and contrast perception
