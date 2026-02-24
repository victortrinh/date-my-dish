---
title: "Typography System Font Swap: Bitter Body, Fira Sans Headings, Caveat Taglines"
date: 2026-02-24
category: ui-bugs
tags:
  - typography
  - fonts
  - google-fonts
  - tailwind-config
  - fira-sans
  - bitter
  - caveat
  - uppercase
  - letter-spacing
severity: medium
component: typography/fonts
status: resolved
---

# Typography System Font Swap Gotchas

## Problem

Swapping font roles across the site (Nunito body -> Bitter, Bitter headings -> Fira Sans uppercase) exposed four cascading issues that required careful handling.

## Symptoms

1. **Font weight synthesis** -- Bitter loaded only weights 600/700; as body font, every `<p>` tag (weight 400) and `font-medium` element (weight 500) would render with browser-synthesized weights
2. **Uppercase Caveat tagline** -- Global `uppercase` on `h1-h4` applied to the hero tagline using Caveat (handwritten font), visually breaking it
3. **Cramped uppercase headings** -- Negative letter-spacing (`-0.02em`, `-0.01em`) in `fontSize` config conflicted with `uppercase`, making headings hard to read
4. **Redundant inline utilities** -- Footer h3s had explicit `uppercase` that duplicated the new global rule

## Root Cause

Each sub-problem had a distinct root cause:

| Issue | Root Cause |
|-------|-----------|
| Synthesized font weights | Google Fonts URL only specified `Bitter:wght@600;700`; body text needs 400/500 |
| Uppercase Caveat | `@layer base` rule targets all `h1-h4`; `font-handwritten` overrides `font-family` but NOT `text-transform` |
| Cramped uppercase | `text-heading-1` utility sets `letterSpacing: -0.01em` which overrides `@layer base` tracking (utility > base specificity) |
| Redundant utilities | Footer h3s had `uppercase` before it was added to the global rule |

## Solution

### File 1: `src/layouts/BaseLayout.astro` (line 46) -- Google Fonts URL

```html
<!-- Before -->
<link href="https://fonts.googleapis.com/css2?family=Bitter:wght@600;700&family=Caveat:wght@400;700&family=Nunito:wght@400;500;600;700&display=swap" rel="stylesheet" />

<!-- After -->
<link href="https://fonts.googleapis.com/css2?family=Bitter:wght@400;500;600;700&family=Caveat:wght@400;700&family=Fira+Sans:wght@600;700&display=swap" rel="stylesheet" />
```

Remove Nunito, expand Bitter to 400/500/600/700, add Fira Sans 600/700.

### File 2: `tailwind.config.mjs` (lines 18-27) -- Font families + letter-spacing

```js
// Font family swap
fontFamily: {
  heading: ['"Fira Sans"', "sans-serif"],  // was Bitter, serif
  body: ["Bitter", "serif"],                // was Nunito, sans-serif
  handwritten: ["Caveat", "cursive"],       // unchanged
  ui: ["Bitter", "serif"],                  // was Nunito, sans-serif
},
// Remove negative letter-spacing from uppercase heading sizes
fontSize: {
  display: ["3.5rem", { lineHeight: "1.1" }],    // removed letterSpacing: "-0.02em"
  "heading-1": ["2.5rem", { lineHeight: "1.2" }], // removed letterSpacing: "-0.01em"
```

### File 3: `src/styles/global.css` (lines 14-19) -- Global heading rule

```css
/* Before */
h1, h2, h3, h4 {
  @apply font-heading font-bold;
}

/* After */
h1, h2, h3, h4 {
  @apply font-heading font-bold uppercase tracking-wide;
}
```

### File 4: `src/pages/{en,fr}/index.astro` (line 73) -- Protect hero tagline

```html
<!-- Add normal-case to prevent uppercase on Caveat font -->
<h1 class="mb-5 font-handwritten text-5xl normal-case text-white drop-shadow-lg sm:text-6xl lg:text-7xl">
```

### File 5: `src/components/Footer.astro` (lines 60, 81) -- Remove redundant uppercase

```html
<!-- Before: redundant uppercase -->
<h3 class="mb-4 font-heading text-sm font-bold uppercase tracking-wider ...">

<!-- After: global rule handles uppercase -->
<h3 class="mb-4 font-heading text-sm font-bold tracking-wider ...">
```

### File 6: `CLAUDE.md` (line 46) -- Update brand docs

```
Fonts: Fira Sans (headings, uppercase), Bitter (body + UI), Caveat (handwritten)
```

## Key Insight: Tailwind Specificity Layers

The critical realization was that `@layer base` styles have **lower specificity** than utility classes. When an element has `text-heading-1` (which includes `letterSpacing: -0.01em`), that utility overrides `tracking-wide` from the base layer. The fix was to remove the negative letter-spacing from the `fontSize` config entirely, letting the base `tracking-wide` apply cleanly.

## Prevention

### Font Weight Checklist (when changing font roles)

- [ ] Document current font weights loaded via Google Fonts
- [ ] Identify weight requirements for the new role (body needs 400/500, headings need 600/700)
- [ ] Grep codebase for `font-medium`, `font-semibold`, `font-bold` pairings with the affected font utility
- [ ] Update Google Fonts URL with all necessary weights before testing
- [ ] Verify no weight synthesis in browser DevTools (Rendering tab)

### Global CSS Rule Checklist

- [ ] Audit all elements matching the selector (`h1-h4`, etc.)
- [ ] Identify elements with overridden `font-family` that might conflict (e.g., handwritten fonts + uppercase)
- [ ] Add protective utility classes (`normal-case`) to exceptions
- [ ] Remove now-redundant inline utilities from components
- [ ] Test light mode, dark mode, print mode, and responsive breakpoints

### Letter-Spacing Rule

> Never pair `uppercase` with negative `letter-spacing`. Uppercase text needs neutral (`0`) or positive tracking (`tracking-wide` to `tracking-wider`).

If `fontSize` entries define negative `letterSpacing`, remove it when those sizes will be used with uppercase headings.

## Related Documentation

- [Font loading performance fix](../performance-issues/seo-performance-accessibility-audit-and-implementation.md) -- Documents the render-blocking Google Fonts fix (CSS `@import` -> `<link>` tags)
- [Dark mode styling patterns](pagefind-dark-mode-accessibility.md) -- Dark mode CSS overrides using `:root.dark` selector
