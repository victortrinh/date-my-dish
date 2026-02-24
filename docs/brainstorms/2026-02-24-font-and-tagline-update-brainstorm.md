# Font & Tagline Update Brainstorm

**Date:** 2026-02-24
**Status:** Ready for planning

## What We're Building

Two visual/branding updates to Date My Dish:

### 1. Fira Sans for All Interactive Elements

Change the `font-ui` Tailwind alias from Bitter (serif) to Fira Sans (sans-serif) so that all buttons, links, CTAs, nav items, filters, and interactive UI elements use the same font as headings.

**Why:** Creates a clearer visual hierarchy -- Fira Sans (sans-serif) for headings + interactive elements, Bitter (serif) for body/prose content.

### 2. New Tagline & Hero Text

Replace the current tagline "Recipes Worth Falling For" with copy that better positions the brand around romantic cooking and date nights.

## Key Decisions

### Font Change

| Decision | Choice |
|----------|--------|
| Implementation approach | Update `font-ui` alias in `tailwind.config.mjs` from Bitter to Fira Sans |
| Fira Sans weights to load | 400, 500, 600, 700 (currently only 600/700) |
| Affected elements | All elements using `font-ui`: buttons, nav links, footer links, filters, toggles, CTAs |
| No class changes needed | All components already use `font-ui` -- the alias swap cascades everywhere |

### Tagline Content

| Placement | EN | FR |
|-----------|----|----|
| `site.tagline` | Romantic Recipes for Unforgettable Date Nights | Recettes romantiques pour des soirees inoubliables |
| `home.heroTitle` | Romantic Recipes for Unforgettable Date Nights | Recettes romantiques pour des soirees inoubliables |
| `home.heroSubtitle` | Simple dishes to impress, crafted with love | Des plats simples pour impressionner, prepares avec amour |
| Footer tagline | Same as `site.tagline` (already wired) | Same as `site.tagline` (already wired) |

### SEO Rationale

- "Romantic Recipes for Unforgettable Date Nights" (47 chars) includes two high-value long-tail keywords: **romantic recipes** + **date nights**
- Short enough for meta title format: "Date My Dish | Romantic Recipes for Unforgettable Date Nights" (62 chars, under 60-65 limit)
- Aligns search intent with the brand's niche (couples cooking)

## Implementation Scope

### Files to modify

1. **`tailwind.config.mjs`** -- Change `font-ui` from Bitter to Fira Sans
2. **`src/layouts/BaseLayout.astro`** -- Update Google Fonts `<link>` to include Fira Sans 400/500 weights
3. **`src/i18n/en.json`** -- Update `site.tagline`, `home.heroTitle`, `home.heroSubtitle`
4. **`src/i18n/fr.json`** -- Update `site.tagline`, `home.heroTitle`, `home.heroSubtitle`

### Files NOT modified (no changes needed)

- No component files need class changes (they all use `font-ui` which auto-cascades)
- No page files need changes (hero text comes from i18n JSON)

## Open Questions

None -- all decisions resolved.
