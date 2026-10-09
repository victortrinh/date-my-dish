# Design system: Greystone evening

The look of a Plateau greystone at dusk: limestone fronts, black wrought-iron stairs, one window lit. Chic and quiet, lots of space, one warm light. Product truth lives in `PRODUCT.md`; this file owns the visual decisions. Tokens are implemented in `src/styles/global.css`; `validate-source` fails a component that bypasses them.

## Principles

- **Stone and iron carry the page; amber is the one light.** Amber appears once or twice per view: the main call to action, the logo's pane, the verdict. Never as body text on stone.
- **Space is the luxury.** Sections breathe (`py-section`, 7rem); running text stays near 38rem (`max-w-measure`).
- **One corner language.** Square (2px) blocks, fully round controls, and the arch for photographs and the brand mark. Nothing in between.
- **No shadows, no gradients, no glass.** Separation comes from surface steps and 1px lines.
- **Motion explains, it does not decorate.** Underlines draw, buttons press, the verdict settles. Everything stops under `prefers-reduced-motion`.

## Colour

Semantic tokens flip with the theme (`.dark` on `<html>`), so components never need `dark:` variants.

| Token | Light | Dark | Use |
|---|---|---|---|
| `surface` | `#e7e5e1` stone | `#16171a` night | Page background |
| `surface-raised` | `#f2f1ee` | `#1f2024` | Cards, panels, search overlay |
| `surface-sunken` | `#dcd9d3` | `#101114` | Hover fills, image placeholders |
| `ink` | `#1b1c1e` iron | `#ece9e3` | Headings, primary text, primary button |
| `ink-muted` | `#424347` | `#bab6ae` | Body copy, nav links |
| `ink-subtle` | `#5d5e62` | `#908d86` | Captions, meta, eyebrows |
| `line` | `#c7c3bc` | `#2f3136` | Dividers, borders |
| `line-strong` | `#1b1c1e` | `#ece9e3` | Outline buttons |
| `accent` | `#e8a33d` amber | `#f0b254` | Fills only: accent button, logo pane, highlights |
| `accent-ink` | `#7c4a00` | `#f0b254` | Amber text, links, focus ring |
| `on-accent` | `#1b1c1e` | `#16171a` | Text on an amber fill |
| `iron` / `on-iron` / `on-iron-muted` | `#1b1c1e` / `#ece9e3` / `#a8a49c` | `#101114` / same | Footer |
| `verdict-favourite` / `-conditional` / `-pass` | `#7c4a00` / `#424347` / `#5d5e62` | `#f0b254` / `#bab6ae` / `#908d86` | Verdict text |

Every text pair above passes WCAG AA (4.5:1) in its theme. Legacy names (`warm-*`, `brand-wine*`, `brand-rose*`) map onto this ramp until the post templates are migrated; do not use them in new code.

## Type

| Role | Face | Token / class |
|---|---|---|
| Display, headings | Young Serif 400 (upright only, `font-synthesis: none`) | `font-display`, `text-display` 4.5rem, `text-heading-1` 3rem, `text-heading-2` 2rem, `text-heading-3` 1.5rem |
| Reading | Libre Caslon Text 400/700, italic 400 | `font-body`, `text-body-lg` 1.125rem / 1.7 |
| UI, captions | Hanken Grotesk 400-700 | `font-ui`, `text-body-sm`, `text-caption` |
| Eyebrow | Hanken Grotesk 500, uppercase, +0.14em | `.eyebrow` |

h1 to h3 get their size from base styles; pages only override for a display moment. Never pair `uppercase` with negative tracking.

## Space and layout

- Container: `.page-container` (max 76rem, 1rem gutter on phones, 2rem from `sm`).
- Section rhythm: `py-section` (7rem) or `py-section-sm` (4rem). More space above a heading than below it.
- Reading measure: `max-w-measure` (38rem); `max-w-prose` (56rem) for wide prose blocks.

## Components (`@layer components` in `global.css`)

- **Buttons**: `.btn` plus one of `.btn-primary` (iron fill; hover lights amber), `.btn-accent` (amber fill, iron text; one per block), `.btn-secondary` (1px outline). All fully round, press to 97%.
- **`.btn-icon`**: 40px round icon control for search, theme, menu, close.
- **`.link-draw`**: text link whose 1px underline draws in on hover and stays for `aria-current`.
- **`.chip`**: round filter chip; `aria-pressed="true"` fills it with iron.
- **`.card`**: `surface-raised` block with 2px corners; for the one set-apart block (essentials, newsletter).
- **`.eyebrow`**: small tracked uppercase label above a heading.
- **`.arch`**: the greystone window frame for photographs (`rounded-arch`).
- **Breadcrumbs**: UI caption, `/` separators in `line`.

## Brand mark

- **Wordmark** (`src/assets/brand/wordmark.svg`, via `Logo.astro`): the arched window, then "Date My Dish" in Young Serif, outlined. Frame and letters use `currentColor`, the pane `--accent`. Minimum height 24px. On the iron footer it takes `on-iron`.
- **Monogram** (`monogram.svg`): the window with a D, for the 404, avatars and app icons (on stone).
- **Favicon** (`public/favicon.svg`): the window alone; light frame in dark browser chrome.
- Never recolour the pane anything but amber, never set the name in another face, never add a heart or a fork.

## Motion

Tokens: `--ease-out` `cubic-bezier(0.22, 1, 0.36, 1)`, `--duration-quick` 160ms, `--duration-base` 320ms, `--duration-slow` 640ms.

- Hover: colour and underline-draw transitions (`quick` / `base`).
- Press: `.btn` scales to 0.97.
- Planned (redesign phase 4): cross-document View Transitions from card to post hero, one-time quiet reveals, the verdict settle on review pages.
- `prefers-reduced-motion: reduce` disables all of it; content is visible without JavaScript.

## Dark mode

Designed, not inverted: night `#16171a` ground, stone text, the amber brighter (`#f0b254`). The footer sinks to `#101114`. Pagefind reads the same tokens through its `--pagefind-ui-*` properties.
