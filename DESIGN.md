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

Every text pair above passes WCAG AA (4.5:1) in its theme. These are the only colours: the old `warm-*`, `brand-wine*` and `brand-rose*` names are gone, and `validate-source` fails them.

## Type

| Role | Face | Token / class |
|---|---|---|
| Display, headings | Young Serif 400 (upright only, `font-synthesis: none`) | `font-display`, `text-display` 4.5rem, `text-heading-1` 3rem, `text-heading-2` 2rem, `text-heading-3` 1.5rem |
| Reading | Libre Caslon Text 400/700, italic 400 | `font-body`, `text-body-lg` 1.125rem / 1.7 |
| UI, captions | Hanken Grotesk 400-700 | `font-ui`, `text-body-sm`, `text-caption` |
| Eyebrow | Hanken Grotesk 500, uppercase, +0.14em | `.eyebrow` |

h1 to h3 get their size from base styles; pages only override for a display moment. Never pair `uppercase` with negative tracking.

Each face is followed in its `--font-*` stack by a metric-matched local fallback (`@font-face` with `size-adjust` and ascent, descent and line-gap overrides on Georgia, Times New Roman or Arial), so a line set before the web font arrives breaks where it will after the swap.

A signature (the reporter's signed note, the interviewer under a chef Q&A) is Libre Caslon Text italic at `text-heading-3` after a 40px `line-strong` rule. There is no script face.

## Space and layout

- Container: `.page-container` (max 76rem, 1rem gutter on phones, 2rem from `sm`).
- Section rhythm: `py-section` (7rem) or `py-section-sm` (4rem). More space above a heading than below it.
- Reading measure: `max-w-measure` (38rem); `max-w-prose` (56rem) for wide prose blocks.

## Components (`@layer components` in `global.css`)

- **Buttons**: `.btn` plus one of `.btn-primary` (iron fill; hover lights amber), `.btn-accent` (amber fill, iron text; one per block), `.btn-secondary` (1px outline). All fully round, press to 97%.
- **`.btn-icon`**: 40px round icon control for search, theme, menu, close.
- **`.link-draw`**: text link whose 1px underline draws in on hover and stays for `aria-current`.
- **`.chip`**: round filter chip; `aria-pressed="true"` fills it with iron. The listing verdict filter is a row of chips.
- **`.card`**: `surface-raised` block with 2px corners; for the one set-apart block (essentials, newsletter, the short version on a chef page, the recipe card teaser).
- **Listing entry** (`DateSpotCard`, chef index): the photo in the arch at 4:5, centred (`object-center`, there is no focal-point field), then the facts in UI caption, the name in `text-heading-3` with a drawn underline on hover, the `VerdictBadge` and the one-line take. No box, no border; the grid gap separates entries.
- **`.eyebrow`**: small tracked uppercase label above a heading.
- **`.arch`**: the greystone window frame for photographs (`rounded-arch`). Hero photos always sit in the arch at 4:5, landscape originals included, cropped from the centre.
- **Breadcrumbs**: UI caption, `/` separators in `line`.

## Brand mark

- **Wordmark** (`src/assets/brand/wordmark.svg`, via `Logo.astro`): the arched window, then "Date My Dish" in Young Serif, outlined. Frame and letters use `currentColor`, the pane `--accent`. Minimum height 24px. On the iron footer it takes `on-iron`.
- **Monogram** (`monogram.svg`): the window with a D, for the 404, avatars and app icons (on stone).
- **Favicon** (`public/favicon.svg`): the window alone; light frame in dark browser chrome.
- Never recolour the pane anything but amber, never set the name in another face, never add a heart or a fork.

## Motion

Tokens: `--ease-out` `cubic-bezier(0.22, 1, 0.36, 1)`, `--duration-quick` 160ms, `--duration-base` 320ms, `--duration-slow` 640ms.

Everything below takes its duration and easing from these tokens; the CSS lives at the end of `src/styles/global.css` ("Motion").

- **Hover**: colour and underline-draw transitions (`quick` / `base`). A card's photo leans in to 1.04 inside its arch (`.zoom` on the img, `.arch isolate` on its frame, `slow`), with the title's drawn underline (`.link-draw`).
- **Press**: `.btn` scales to 0.97.
- **Card to post (cross-document View Transitions)**: `@view-transition { navigation: auto; }`, no JavaScript. A card's photo and title carry the same `view-transition-name` as the post's hero photo and h1, `{spot|chef|recipe}-{id}-{photo|title}`, so the photo grows into the hero and the name into the h1 (`base`), while the page crossfades (old page out in `quick`, new in `base`). The header (`.site-nav`) holds still. Names come only from `transitionStyle()` in `src/utils/view-transitions.ts`, which hands a name out once per page render; `validate-build` fails a page that repeats one, since one repeat makes the browser skip the whole transition.
- **Quiet reveals**: section headings, card grids and cards, and the essentials card carry `data-reveal`. Never body paragraphs. The head script sets `.js-reveal` on `<html>` before first paint (JS on, `IntersectionObserver` present, motion allowed). The reveal script at the end of `BaseLayout` (emitted once) leaves anything on screen at load alone (LCP, CLS) and marks the rest `.reveal-pending`. Each fades and rises 1rem once as it scrolls in (`slow`), with a 90 ms stagger (four steps at most) among elements entering together. Skipped on back/forward. Without JavaScript nothing is ever hidden.
- **The verdict settle**: the page's own verdict mark (`VerdictBadge settle`: `#verdict` on reviews, the essentials card on Date Spots) lights its pane (`.pane-light`) once, like a lamp coming on, when it scrolls into view or on load if already visible (`slow`, after a `quick` pause). An unlit verdict has no pane to light.
- `prefers-reduced-motion: reduce` disables all of it: no View Transitions, no reveals, no settle, no zoom. Content is fully visible without JavaScript, under reduced motion and in print. `tests/smoke/motion.spec.ts` covers it.

## Dark mode

Designed, not inverted: night `#16171a` ground, stone text, the amber brighter (`#f0b254`). The footer sinks to `#101114`. Pagefind reads the same tokens through its `--pagefind-ui-*` properties. Components never carry a `dark:` colour variant.

## Print

The print stylesheet in `global.css` drops navigation, footer, newsletter and fills, and sets text in black. A Chef Recipe Card (`.recipe-card`) prints on one sheet: no hero photo, the facts in one compact row, ingredients beside the method (`.recipe-card-body`).
