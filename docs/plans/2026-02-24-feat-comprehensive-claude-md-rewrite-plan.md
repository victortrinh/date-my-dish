---
title: "feat: Comprehensive CLAUDE.md Rewrite"
type: feat
status: completed
date: 2026-02-24
origin: docs/brainstorms/2026-02-24-claude-md-comprehensive-update-brainstorm.md
---

# feat: Comprehensive CLAUDE.md Rewrite

## Overview

Rewrite the 48-line CLAUDE.md into a ~250-300 line comprehensive project reference that gives every future Claude Code session full project awareness without needing to explore the codebase. Fixes factual errors, documents all conventions, slash commands, workflows, schema, and lessons learned.

## Problem Statement / Motivation

Every Claude Code session starts cold. The current CLAUDE.md covers basics but:
- Contains factual errors (step images described as "URL strings" but are `image()` imports; cream listed as background but actual bg is `bg-gray-100`/`bg-neutral-950`)
- Misses 8 slash commands and their recommended workflows
- Omits architecture patterns (component conventions, layout hierarchy, path aliases, JS patterns)
- Doesn't document accessibility requirements (WCAG AA tokens, focus traps, ARIA i18n)
- Lacks schema quick-reference (forces a file read every recipe task)
- Doesn't capture 16 hard-won lessons from 7 documented solutions

(see brainstorm: docs/brainstorms/2026-02-24-claude-md-comprehensive-update-brainstorm.md)

## Proposed Solution

Single-file rewrite of `CLAUDE.md` with 11 sections covering everything a session needs. No new files created -- this replaces the existing content.

## Acceptance Criteria

- [x] All factual errors fixed (step image type, background color)
- [x] 11 sections as defined in brainstorm are present
- [x] Schema quick-reference matches `src/content.config.ts` exactly
- [x] All 8 slash commands listed with descriptions
- [x] Recommended workflows documented (new recipe, audit, translation)
- [x] Inline lesson summaries from all 7 solution docs
- [x] i18n details: category slug map, Quebec French rules, key functions
- [x] Accessibility section: color tokens, focus, ARIA, dark mode, reduced motion
- [x] SEO section: all JSON-LD types, meta tags, robots/llms.txt
- [x] Architecture section: component patterns, path aliases, JS conventions, data flow
- [x] Total length ~250-300 lines (273 lines)
- [x] `npm run check` passes (0 errors, 0 warnings, 3 hints -- pre-existing)

## Implementation Plan

### Single Phase: Rewrite CLAUDE.md

The file has 11 sections. Here's the exact content plan for each:

#### Section 1: Project Overview (~15 lines)
Keep existing tech stack, hosting, key commands. Fix:
- Remove cream from "Background" in Brand (it's legacy)
- Add `postbuild` and `deploy` scripts to key commands

#### Section 2: Architecture & Conventions (~30 lines)
New section covering:
- Component patterns: all take `locale: Locale` prop, TypeScript interfaces for Props, `class:list` for conditional classes
- Layout hierarchy: BaseLayout (root) -> RecipeLayout (thin wrapper for recipes)
- Path aliases: `@components/*`, `@layouts/*`, `@i18n/*`, `@assets/*`, `@content/*`, `@utils/*`
- Client-side JS: vanilla JS only, IIFE pattern, `is:inline` scripts, no frameworks
- Data flow: `getCollection("recipes")` -> filter `lang === locale` -> strip ID prefix `recipe.id.replace(/^(en|fr)\//, "")` -> `render()`
- Dark mode: `class` strategy, neutral palette (`neutral-*`), `localStorage.theme`
- CSS: `.prose` for content, `.no-print` for print hiding, `scroll-margin-top: 5rem` on headings

#### Section 3: Content Schema Quick-Reference (~45 lines)
Condensed table of all frontmatter fields from `src/content.config.ts`:

**Required fields table:**
| Field | Type | Constraint |
|-------|------|------------|
| title | string | -- |
| lang | enum | "en" \| "fr" |
| translationSlug | string | Slug of paired translation |
| description | string | max 160 chars |
| publishDate | date | YYYY-MM-DD (coerced) |
| heroImage | image() | Astro image import path |
| heroImageAlt | string | ~125 chars, descriptive |
| prepTime/cookTime/totalTime | string | ISO 8601 (e.g. PT15M) |
| recipeYield | string | e.g. "2 servings" |
| difficulty | enum | "easy" \| "medium" \| "hard" |
| recipeCategory | string[] | Canonical EN keys (e.g. "dinner") |
| recipeCuisine | string | e.g. "Italian" |
| keywords | string[] | SEO keywords |
| ingredientGroups | IngredientGroup[] | `{ group?: string, items: string[] }` |
| instructionGroups | InstructionGroup[] | `{ group?: string, steps: HowToStep[] }` |
| faqs | FAQ[] | min 1; `{ question: string, answer: string }` |

**Optional fields table:**
| Field | Type | Notes |
|-------|------|-------|
| author | string | Defaults to "Victor" |
| updatedDate | date | YYYY-MM-DD |
| pinterestImage | image() | Deferred until 30+ recipes |
| tags | string[] | e.g. ["italian", "pasta", "quick"] |
| nutrition | object | `{ calories?, fatContent?, carbohydrateContent?, proteinContent? }` (all strings) |
| occasion | string[] | e.g. ["date-night", "weeknight"] |
| impressFactor | number | 1-5 rating |
| dateNightTips | object | `{ wine?, music?, platingTip? }` (all strings) |

**HowToStep schema:** `{ text: string, image?: image() }` -- step images use Astro `image()` imports, NOT URL strings.

#### Section 4: Content Structure (~20 lines)
Expand existing section:
- Recipe inventory: 9 EN + 9 FR pairs
- MDX body: 800-1500 words, 5-8 H2s, `<Picture>` imports for inline images
- EN/FR share images; only alt text is translated
- `<Picture>` pattern: import from `astro:assets`, relative path from `../../../assets/images/recipes/`, `widths={[400, 600, 900]}`, `formats={["avif", "webp"]}`, `class="my-6 w-full rounded-lg"`, `loading="lazy"`
- Cross-links: absolute paths with trailing slashes (`/en/recipes/{slug}/`)
- `heroImage` path is relative import (e.g., `"../../../assets/images/recipes/slug.webp"`)

#### Section 5: Image Guidelines (~15 lines)
Keep existing, fix step image description (image() not URL), add:
- Mixed formats in use: `.jpg`, `.webp`, `.png`
- Always run `/optimize-image` on new images before commit

#### Section 6: i18n Details (~30 lines)
Expand route mapping, add:
- Category slug map (full table: canonical -> en/fr)
- Occasion values: `date-night`, `weeknight`, `entertaining`, `comfort`, `celebration`, `quick-meal`
- Quebec French rules: souper (dinner), dejeuner (breakfast), diner (lunch), cuillere a the (tsp)
- Key functions: `t(locale, key)`, `getLocaleFromUrl()`, `getRecipeLocalizedPath()`, `getCategoryLocalizedPath()`, `getAlternateUrl()`
- `recipeCategory` values use canonical EN keys in frontmatter
- EN/FR pages are duplicated files (not generated from shared template)
- Recipe IDs are locale-prefixed: `en/slug`, `fr/slug` -- strip with `recipe.id.replace(/^(en|fr)\//, "")`

#### Section 7: Brand & Accessibility (~30 lines)
Replace current Brand section with expanded version:
- Colors with accessible variants:
  - Primary: `#C4704B` (decorative only) -> `brand-primary-text` `#9A5439` (5.67:1, WCAG AA)
  - Accent: `#D4A853` (decorative only) -> `brand-accent-text` `#7D631C` (5.72:1, WCAG AA)
  - `brand-primary-dark` `#A85D3D` (4.87:1, for larger text/UI)
  - Background: `bg-gray-100` (light) / `bg-neutral-950` (dark) -- NOT cream
- Fonts: Fira Sans 600/700 (headings), Bitter 400/500/600/700 (body+UI), Caveat 400/700 (handwritten)
- Loaded via `<link>` with `preconnect` -- never `@import`
- Dark mode: neutral palette, focus ring `#9A5439` light / `#D4A853` dark
- Accessibility rules: WCAG AA mandatory, all ARIA labels i18n'd via `t()`, focus-visible outlines, focus traps in modals (SearchOverlay, mobile nav), `prefers-reduced-motion` disables animations
- Never use `brand-accent` or `brand-accent-dark` for text (fails WCAG)
- Never pair `uppercase` with negative letter-spacing
- Test third-party components in dark mode before shipping

#### Section 8: SEO & Structured Data (~15 lines)
New section:
- JSON-LD types: Recipe + FAQPage (recipe pages), BreadcrumbList (all pages), WebSite + Organization (homepage), ItemList (listing/category pages)
- Recipe JSON-LD `image` must be array format `[url]`
- Meta: canonical, hreflang (bidirectional EN/FR), OG, Twitter Cards
- `robots.txt` allows AI crawlers (GPTBot, ClaudeBot, PerplexityBot)
- `llms.txt` endpoint exists at `/llms.txt`
- Sitemap excludes search pages and bare root URL
- Related content filtering: use exact slug comparison (`===`), never `.includes()`

#### Section 9: Slash Commands & Workflows (~35 lines)
All 8 commands with 1-line descriptions, then workflow sequences:

**Commands:**
| Command | Purpose |
|---------|---------|
| `/new-recipe` | Scaffold EN+FR MDX pair with full frontmatter |
| `/write-prose` | Generate 800-1500 word SEO blog prose for recipe MDX body |
| `/translate-recipe` | Translate recipe EN<->FR with Quebec French conventions |
| `/optimize-image` | Resize/rename images (hero 1200px/<200KB, step 900px/<150KB) |
| `/seo-audit` | Audit single recipe: frontmatter, JSON-LD, content, images (24-pt score) |
| `/bulk-audit` | Audit ALL recipes with summary scorecard |
| `/validate-recipes` | Collection integrity: EN/FR pairs, images, cross-links, content parity |
| `/deploy` | Pre-deploy checks + commit + push to main (triggers Cloudflare auto-deploy) |

**Recommended workflows:**
- **New recipe**: `/new-recipe` -> add real images -> `/optimize-image` -> `/write-prose` -> `/translate-recipe` -> `/seo-audit` -> `/deploy`
- **Audit & fix**: `/bulk-audit` -> fix issues -> `/validate-recipes` -> `/deploy`
- **Translation**: `/translate-recipe` -> `/validate-recipes`
- **Image update**: add images -> `/optimize-image` -> update frontmatter paths -> `/validate-recipes`

#### Section 10: Deploy & Infrastructure (~15 lines)
New section:
- Cloudflare Pages via Wrangler (`npm run deploy`)
- Auto-deploy on push to `main` (Cloudflare GitHub integration)
- `_headers`: security headers + cache rules (`/_astro/*` 1yr immutable, `/pagefind/*` 24h, `/images/*` 7d)
- `_redirects`: relative paths ONLY (Cloudflare rejects absolute URLs) + WordPress 301s
- www-to-apex redirect at DNS level, not in `_redirects`
- Wrangler compatibility: `nodejs_compat` flag, `global_fetch_strictly_public`

#### Section 11: Lessons Learned (~25 lines)
1-line summaries from `docs/solutions/`:
1. Cloudflare `_redirects` only accepts relative paths -- www-to-apex goes at DNS level
2. Always run `/optimize-image` on new images -- past heroes were 700KB+
3. Pagefind UI needs explicit dark mode CSS overrides via `:root.dark` selector
4. When changing fonts, load ALL needed weights in Google Fonts `<link>` URL
5. Never pair `uppercase` with negative `letter-spacing` -- use `tracking-wide` or neutral
6. Category/tag ordering needs explicit priority array -- Set insertion is non-deterministic
7. Use `brand-primary-text`/`brand-accent-text` for text, never raw brand colors (WCAG fail)
8. All ARIA labels must be i18n'd via `t(locale, key)` -- never hardcode English
9. Focus traps required in SearchOverlay and mobile Navigation modals
10. `prefers-reduced-motion: reduce` must be tested -- disables all animations
11. Recipe JSON-LD `image` must be array `[url]`, not single string
12. Related content: use exact slug comparison (`===`), never `.includes()`
13. Google Fonts via `<link>` tags, not CSS `@import` (render-blocking)
14. Hero images need `max-h-[350px] object-cover`; step images need responsive max-width
15. Sitemap must filter out search pages and bare root URL
16. Protect handwritten fonts (Caveat) with `normal-case` when global uppercase rules exist

Footer: `For detailed context on any lesson, see docs/solutions/`

## Sources & References

- **Origin brainstorm:** [docs/brainstorms/2026-02-24-claude-md-comprehensive-update-brainstorm.md](docs/brainstorms/2026-02-24-claude-md-comprehensive-update-brainstorm.md) -- Key decisions: comprehensive scope, inline lessons, workflow guidance, schema quick-reference
- Content schema: `src/content.config.ts`
- i18n system: `src/i18n/utils.ts`, `src/i18n/en.json`, `src/i18n/fr.json`
- Tailwind config: `tailwind.config.mjs`
- Astro config: `astro.config.ts`
- Global styles: `src/styles/global.css`
- Slash commands: `.claude/commands/*.md` (8 files)
- Solution docs: `docs/solutions/**/*.md` (7 files)
