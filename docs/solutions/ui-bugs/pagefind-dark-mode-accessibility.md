---
title: Fix Search Modal Dark Mode Accessibility and UI Issues
slug: pagefind-dark-mode-accessibility
problem_type: ui-bugs
component: SearchOverlay
technology: [astro, pagefind, tailwind-css]
severity: medium
date_solved: 2026-02-24
symptoms:
  - Search modal results completely inaccessible in dark mode (dark text on dark background)
  - Language filter panel wasting space and cluttering UI
  - Clear button had incorrect white background in dark mode
  - Search input focus outline was white/default instead of matching brand colors
root_cause: Pagefind UI loads its own CSS with no dark mode support; no custom style overrides for dark mode; filter panel not hidden
solution_approach: Added global CSS overrides for Pagefind dark mode styles, hid language filter panel, styled Clear button with appropriate background, changed focus outline to warm gold accent color (#D4A853)
---

# Fix Search Modal Dark Mode Accessibility and UI Issues

## Root Cause

Pagefind UI lacks built-in dark mode support. When the site switches to dark mode (`:root.dark`), the search modal displays with light-colored text on light backgrounds and light-colored UI elements on dark backgrounds, making search results unreadable. The "Clear" button retained its white background, and the focus outline used the browser default (white/blue) which clashed with the dark theme.

Additionally, the language filter panel (`Lang`) was unnecessary and took up valuable space in the modal — search results were already scoped by the page's locale during indexing.

## Solution

### 1. Dark Mode CSS Overrides

Added a `<style is:global>` block in `SearchOverlay.astro` targeting all Pagefind UI elements under `:root.dark`:

```css
/* Hide the filter panel entirely */
.pagefind-ui__filter-panel {
  display: none !important;
}

/* Dark mode overrides */
:root.dark .pagefind-ui__result-title,
:root.dark .pagefind-ui__result-link {
  color: #f3f4f6 !important;
}
:root.dark .pagefind-ui__result-excerpt {
  color: #d1d5db !important;
}
:root.dark mark {
  background-color: #d4a853 !important;
  color: #1f2937 !important;
}
:root.dark .pagefind-ui__message {
  color: #9ca3af !important;
}
:root.dark .pagefind-ui__search-input {
  background-color: #1f2937 !important;
  color: #f3f4f6 !important;
  border-color: #374151 !important;
  outline-color: #D4A853 !important;
}
:root.dark .pagefind-ui__search-input::placeholder {
  color: #6b7280 !important;
}
:root.dark .pagefind-ui__search-clear {
  color: #9ca3af !important;
  background-color: #374151 !important;
}
:root.dark .pagefind-ui__result {
  border-color: #374151 !important;
}
:root.dark .pagefind-ui__result-thumb {
  border-color: #374151 !important;
}
:root.dark .pagefind-ui__button {
  background-color: #374151 !important;
  color: #f3f4f6 !important;
}
```

### 2. Remove Language Filter

Replaced `filters: { lang: locale }` with `showEmptyFilters: false` in the PagefindUI initialization:

```javascript
new window.PagefindUI({
  element: '#search-overlay-container',
  showSubResults: true,
  showEmptyFilters: false,
  translations: locale === 'fr' ? { /* ... */ } : { /* ... */ },
});
```

### Dark Mode Color Mapping

| Element | Color | Token |
|---------|-------|-------|
| Input background | `#1f2937` | gray-800 |
| Text (titles, links) | `#f3f4f6` | gray-100 |
| Text (excerpts) | `#d1d5db` | gray-300 |
| Text (messages) | `#9ca3af` | gray-400 |
| Borders | `#374151` | gray-700 |
| Highlight (mark) | `#d4a853` | brand accent (Warm Gold) |
| Focus outline | `#D4A853` | brand accent (Warm Gold) |
| Button backgrounds | `#374151` | gray-700 |

## Changes Made

1. Added global CSS style block with dark mode overrides for all Pagefind UI elements
2. Hidden language filter panel via `display: none !important`
3. Removed `filters: { lang: locale }` option, replaced with `showEmptyFilters: false`
4. Styled Clear button background (`#374151`) for dark mode
5. Changed search input focus outline to warm gold (`#D4A853`)
6. Styled highlighted search terms with warm gold background and dark text

## Prevention Strategies

1. **Dark mode audit before integrating third-party UI** -- always test third-party components in dark mode before shipping
2. **Develop with dark mode on** -- don't treat it as an afterthought; test both modes in every phase
3. **Use `:root.dark` selector pattern** consistently for all third-party CSS overrides
4. **Check interactive elements specifically** -- buttons, form inputs, focus states are frequently overlooked

## Checklist for Future Third-Party Component Integration

- [ ] Tested component in dark mode before integration
- [ ] Text contrast meets WCAG AA (4.5:1 minimum)
- [ ] All interactive elements visible and clickable in dark mode
- [ ] Focus outlines visible with sufficient contrast
- [ ] Overrides grouped in a clearly marked CSS section
- [ ] No regression in light mode

## Related Documentation

- `docs/solutions/performance-issues/seo-performance-accessibility-audit-and-implementation.md` -- Pagefind locale filtering (Solution #6), accessibility compliance
- `docs/plans/2026-02-24-feat-full-site-redesign-pinchofyum-gordonramsay-plan.md` -- SearchOverlay architecture, dark mode integration strategy
- `tailwind.config.mjs` -- Dark mode class-based strategy, brand color tokens
- `src/styles/global.css` -- Global dark mode base styles
