---
title: "feat: Fira Sans UI font and tagline update"
type: feat
status: active
date: 2026-02-24
origin: docs/brainstorms/2026-02-24-font-and-tagline-update-brainstorm.md
---

# Fira Sans UI Font & Tagline Update

Two branding updates: switch all interactive UI elements (buttons, links, CTAs, nav) from Bitter to Fira Sans, and replace the tagline with "Romantic Recipes for Unforgettable Date Nights."

## Acceptance Criteria

- [x] All `font-ui` elements render in Fira Sans (buttons, nav links, footer links, filters, toggles, CTAs)
- [x] Fira Sans weights 400, 500, 600, 700 all load correctly (no browser-synthesized weights)
- [x] New tagline appears in hero h1, footer, SEO `<title>`, and RSS feeds (both EN and FR)
- [x] New hero subtitle appears on both homepage locales
- [x] FR SEO title stays within 60-65 character limit
- [ ] Hero title wraps gracefully on mobile (320px-414px) with the longer text
- [x] `npm run check` passes with no errors
- [ ] Visual QA: light/dark mode, mobile/desktop, print preview all look correct

## Implementation

### 1. Update Tailwind font-ui alias

**`tailwind.config.mjs:23`**

```js
// Before
ui: ["Bitter", "serif"],

// After
ui: ['"Fira Sans"', "sans-serif"],
```

This single change cascades to all ~19 files using `font-ui`. No component class changes needed (see brainstorm: docs/brainstorms/2026-02-24-font-and-tagline-update-brainstorm.md).

### 2. Add Fira Sans weights 400/500 to Google Fonts

**`src/layouts/BaseLayout.astro:46`**

```html
<!-- Before -->
<link href="https://fonts.googleapis.com/css2?family=Bitter:wght@400;500;600;700&family=Caveat:wght@400;700&family=Fira+Sans:wght@600;700&display=swap" rel="stylesheet" />

<!-- After -->
<link href="https://fonts.googleapis.com/css2?family=Bitter:wght@400;500;600;700&family=Caveat:wght@400;700&family=Fira+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />
```

**Critical**: Add 400/500 to the existing 600/700 -- do NOT replace them. All four weights are used across UI elements (see lesson: docs/solutions/ui-bugs/typography-system-font-swap-gotchas.md).

### 3. Update i18n strings (EN)

**`src/i18n/en.json`** -- 4 keys:

| Key | Old | New |
|-----|-----|-----|
| `site.tagline` | Recipes worth falling for | Romantic recipes for unforgettable date nights |
| `home.heroTitle` | Recipes Worth Falling For | Romantic Recipes for Unforgettable Date Nights |
| `home.heroSubtitle` | Simple, delicious recipes crafted with love by Victor | Simple dishes to impress, crafted with love |
| `seo.homeTitle` | Date My Dish - Recipes Worth Falling For | Date My Dish - Romantic Recipes for Unforgettable Date Nights |

EN `seo.homeTitle` = 62 characters (within 60-65 limit).

### 4. Update i18n strings (FR)

**`src/i18n/fr.json`** -- 4 keys:

| Key | Old | New |
|-----|-----|-----|
| `site.tagline` | Des recettes dont on tombe amoureux | Recettes romantiques pour des soirees inoubliables |
| `home.heroTitle` | Des recettes dont on tombe amoureux | Recettes romantiques pour des soirees inoubliables |
| `home.heroSubtitle` | Des recettes simples et délicieuses, préparées avec amour par Victor | Des plats simples pour impressionner, préparés avec amour |
| `seo.homeTitle` | Date My Dish - Des recettes dont on tombe amoureux | Date My Dish - Recettes romantiques, soirees inoubliables |

FR `seo.homeTitle` uses shortened form (59 chars) to stay within limit. The full tagline (66 chars with "pour des") would be truncated in SERPs.

### 5. Update RSS feed titles (hardcoded)

**`src/pages/en/rss.xml.ts:12`**

```ts
// Before
"Date My Dish - Recipes Worth Falling For"

// After
"Date My Dish - Romantic Recipes for Unforgettable Date Nights"
```

**`src/pages/fr/rss.xml.ts:12`**

```ts
// Before
"Date My Dish - Des recettes dont on tombe amoureux"

// After
"Date My Dish - Recettes romantiques pour des soirees inoubliables"
```

These are hardcoded strings, not driven by i18n JSON.

### 6. Visual QA checklist

After implementation, verify:

- [ ] Hero section on mobile (320px, 375px) -- title may need `text-4xl` at smallest breakpoint if it wraps to 4+ lines
- [ ] Navigation desktop + mobile (Fira Sans uppercase looks intentional)
- [ ] All button variants: primary filled, outline, gold/accent, filter pills
- [ ] Footer tagline (Caveat font, unchanged -- confirm it still contrasts with the new Fira Sans nav)
- [ ] Dark mode for all above
- [ ] Print preview of a recipe page (step numbers will now be Fira Sans)

## Files Changed (6 total)

1. `tailwind.config.mjs` -- font-ui alias
2. `src/layouts/BaseLayout.astro` -- Google Fonts URL
3. `src/i18n/en.json` -- 4 i18n keys
4. `src/i18n/fr.json` -- 4 i18n keys
5. `src/pages/en/rss.xml.ts` -- hardcoded title
6. `src/pages/fr/rss.xml.ts` -- hardcoded title

## Follow-up (not in this PR)

- Update `seo.homeDescription` (EN/FR) to align with romantic/date-night brand positioning
- Review about page prose "worth falling for" reference (`src/pages/en/about.astro:53`, `src/pages/fr/a-propos.astro:56`)
- Mobile hero text size adjustment if visual QA reveals wrapping issues

## Sources

- **Origin brainstorm:** [docs/brainstorms/2026-02-24-font-and-tagline-update-brainstorm.md](docs/brainstorms/2026-02-24-font-and-tagline-update-brainstorm.md) -- font-ui approach, tagline content, weight decisions
- **Institutional learning:** [docs/solutions/ui-bugs/typography-system-font-swap-gotchas.md](docs/solutions/ui-bugs/typography-system-font-swap-gotchas.md) -- font weight loading, uppercase+tracking gotchas
