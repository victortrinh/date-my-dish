---
title: "feat: Update typography system (Bitter body, Fira Sans headings, Caveat tagline)"
type: feat
status: completed
date: 2026-02-24
---

# feat: Update Typography System

Swap the font roles across the site: Bitter becomes the body/UI font, Fira Sans replaces Bitter as the heading font (uppercase), and Caveat remains the handwritten/tagline font.

## Acceptance Criteria

- [x] Body text renders in Bitter (was Nunito)
- [x] All headings (h1-h4) render in Fira Sans uppercase with appropriate letter-spacing
- [x] UI elements (buttons, nav, labels) render in Bitter (was Nunito)
- [x] Caveat tagline/handwritten elements unchanged
- [x] Hero h1 tagline (Caveat) protected from global uppercase rule with `normal-case`
- [x] Google Fonts loads correct weights: Bitter 400/500/600/700, Fira Sans 600/700, Caveat 400/700
- [x] Nunito fully removed from Google Fonts URL
- [x] French accented characters render correctly in Fira Sans headings
- [x] CLAUDE.md brand documentation updated
- [x] No visual regression in dark mode or print styles

## Context

The codebase uses Tailwind utility classes (`font-heading`, `font-body`, `font-ui`, `font-handwritten`) throughout all ~30+ components. Changing the Tailwind config cascades everywhere automatically, so the core change only touches a few files.

### Key findings from research:

- **Font weight gap (critical):** Bitter currently loads only weights 600/700. As body font it needs 400 (normal text) and 500 (medium buttons/nav). Without these, every `<p>` tag and `font-medium` element renders with synthesized weights.
- **Uppercase scope:** Adding `uppercase` to the global `h1, h2, h3, h4` rule affects everything including recipe titles and card titles. The hero h1 (`font-handwritten`) must get `normal-case` since uppercase Caveat is visually broken.
- **Letter-spacing:** Uppercase without tracking is a readability issue. The existing `fontSize` config has *negative* letter-spacing for heading sizes (`-0.01em`), which compounds the problem. Footer h3s already pair `uppercase` with `tracking-wider`, establishing a pattern.
- **Performance (documented learning):** Fonts must load via `<link>` in `<head>` (not CSS `@import`) with `display=swap` and preconnect hints. Already implemented correctly — just update the URL.

## Implementation

### File 1: `src/layouts/BaseLayout.astro` (line 46)

Update Google Fonts URL. Remove Nunito, add Fira Sans, expand Bitter weights:

```
Before: family=Bitter:wght@600;700&family=Caveat:wght@400;700&family=Nunito:wght@400;500;600;700
After:  family=Bitter:wght@400;500;600;700&family=Caveat:wght@400;700&family=Fira+Sans:wght@600;700
```

### File 2: `tailwind.config.mjs` (lines 18-23)

```js
fontFamily: {
  heading: ['"Fira Sans"', "sans-serif"],
  body: ["Bitter", "serif"],
  handwritten: ["Caveat", "cursive"],
  ui: ["Bitter", "serif"],
},
```

Note: fallback changes from `sans-serif` to `serif` for body/UI (matches Bitter's nature).

### File 3: `src/styles/global.css` (lines 14-19)

Add `uppercase` and `tracking-wide` to the heading base rule:

```css
h1, h2, h3, h4 {
  @apply font-heading font-bold uppercase tracking-wide;
}
```

Consider removing or neutralizing the negative letter-spacing in `tailwind.config.mjs` for `display` and `heading-1` font sizes (currently `-0.02em` and `-0.01em`) since negative tracking + uppercase is a poor combination.

### File 4: `src/pages/en/index.astro` (line 73) + `src/pages/fr/index.astro` (line 73)

Add `normal-case` to the hero h1 tagline to prevent uppercase Caveat:

```html
<h1 class="font-handwritten ... normal-case">
```

### File 5: `CLAUDE.md` (line 47)

Update brand documentation:

```
Before: Fonts: Bitter (headings), Nunito (body + UI), Caveat (handwritten)
After:  Fonts: Fira Sans (headings, uppercase), Bitter (body + UI), Caveat (handwritten)
```

### Optional cleanup

- Remove redundant `uppercase` class from Footer h3s (`src/components/Footer.astro` lines 60, 81) since the global rule now handles it

## Sources

- Font loading gotcha: `docs/solutions/performance-issues/seo-performance-accessibility-audit-and-implementation.md`
- Tailwind font config: `tailwind.config.mjs:18-23`
- Global heading styles: `src/styles/global.css:14-19`
- Google Fonts link: `src/layouts/BaseLayout.astro:46`
