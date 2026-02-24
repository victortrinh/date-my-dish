# Date My Dish

Bilingual recipe blog (EN/FR) built with Astro 5, deployed on Cloudflare Pages.

## Tech Stack
- **Framework**: Astro 5.x + TypeScript (strict) + MDX
- **Styling**: Tailwind CSS 3.4+ (class-based dark mode)
- **Content**: MDX files in `src/content/recipes/{en,fr}/` with Zod-validated frontmatter
- **i18n**: Subdirectory routing (`/en/`, `/fr/`) with `prefixDefaultLocale: true`
- **Search**: Pagefind (runs post-build via `postbuild` script)
- **Images**: Astro `<Picture>` with AVIF/WebP, images in `src/assets/` (not `public/`)
- **Hosting**: Cloudflare Pages via Wrangler adapter

## Key Commands
- `npm run dev` -- Start dev server
- `npm run build` -- Build site (Pagefind runs automatically via `postbuild`)
- `npm run check` -- TypeScript and content schema validation
- `npm run preview` -- Build + local Cloudflare Workers preview
- `npm run deploy` -- Build + deploy to Cloudflare Pages

## Architecture & Conventions

### Component Patterns
- All components take a `locale: Locale` prop for i18n
- TypeScript interfaces for all Props (`interface Props { ... }`)
- Use `class:list` for conditional CSS classes
- SVG icons inlined as raw elements (no icon library)

### Layout Hierarchy
- `BaseLayout.astro` -- Root HTML shell (SEO head, nav, footer, search overlay, skip-to-content)
- `RecipeLayout.astro` -- Thin wrapper extending BaseLayout for recipe pages (`ogType="article"`)
- Named slot: `<slot name="head" />` for injecting `<RecipeSchema>` into `<head>`

### Path Aliases (tsconfig.json)
`@components/*`, `@layouts/*`, `@i18n/*`, `@assets/*`, `@content/*`, `@utils/*`

### Client-Side JavaScript
- Vanilla JS only -- no React/Vue/Svelte
- IIFE pattern: `(function() { ... })()`
- All scripts use `is:inline` to avoid Astro bundling
- Global hooks via `window` (e.g., `window.__openSearch`)

### Data Flow for Recipes
```
getCollection("recipes") -> filter by recipe.data.lang === locale
-> extract slug: recipe.id.replace(/^(en|fr)\//, "")
-> render(recipe) returns { Content }
```
Recipe IDs in Astro 5 are locale-prefixed (e.g., `en/cacio-e-pepe`). Always strip the prefix.

### Dark Mode
- Tailwind `class` strategy with `dark:` prefix
- Neutral palette: `dark:bg-neutral-950` (body), `dark:bg-neutral-900` (cards), `dark:text-neutral-200` (text)
- Toggle persisted in `localStorage.theme`
- Flash prevention: inline `<script>` in `<head>` applies `.dark` class before first paint

### CSS Conventions
- `.prose` class for recipe blog content (custom-styled headings, lists, links, images)
- `.no-print` hides elements in print view; `.print-only` shows only in print
- `scroll-margin-top: 5rem` on h2/h3 for sticky nav clearance
- `@media (prefers-reduced-motion: reduce)` disables all animations
- Full print stylesheet: single-column forcing, ink-saving background removal

## Content Schema Quick-Reference

Source of truth: `src/content.config.ts`. Content loader: `glob({ pattern: "**/*.mdx", base: "./src/content/recipes" })`

### Required Fields
| Field | Type | Constraint |
|-------|------|------------|
| `title` | string | Recipe title |
| `lang` | enum | `"en"` or `"fr"` |
| `translationSlug` | string | Slug of the paired translation |
| `description` | string | Max 160 chars (SEO meta) |
| `publishDate` | date | YYYY-MM-DD (coerced) |
| `heroImage` | image() | Relative import path (e.g., `"../../../assets/images/recipes/slug.webp"`) |
| `heroImageAlt` | string | Descriptive, ~125 chars |
| `prepTime` | string | ISO 8601 duration (e.g., `PT10M`) |
| `cookTime` | string | ISO 8601 duration (e.g., `PT30M`) |
| `totalTime` | string | ISO 8601 duration (e.g., `PT45M`) |
| `recipeYield` | string | e.g., "2 servings" |
| `difficulty` | enum | `"easy"`, `"medium"`, or `"hard"` |
| `recipeCategory` | string[] | Canonical EN keys (e.g., `["dinner"]`) |
| `recipeCuisine` | string | e.g., "Italian" |
| `keywords` | string[] | SEO keywords |
| `ingredientGroups` | array | `{ group?: string, items: string[] }` |
| `instructionGroups` | array | `{ group?: string, steps: HowToStep[] }` |
| `faqs` | array | Min 1. `{ question: string, answer: string }` |

### Optional Fields
| Field | Type | Notes |
|-------|------|-------|
| `author` | string | Defaults to `"Victor"` |
| `updatedDate` | date | YYYY-MM-DD |
| `pinterestImage` | image() | Deferred until 30+ recipes |
| `tags` | string[] | e.g., `["italian", "pasta", "quick", "vegetarian"]` |
| `nutrition` | object | `{ calories?, fatContent?, carbohydrateContent?, proteinContent? }` (all optional strings) |
| `occasion` | string[] | Values: `date-night`, `weeknight`, `entertaining`, `comfort`, `celebration`, `quick-meal` |
| `impressFactor` | number | 1-5 heart rating |
| `dateNightTips` | object | `{ wine?, music?, platingTip? }` (all optional strings) |

### HowToStep Schema
`{ text: string, image?: image() }` -- Step images use Astro `image()` imports, NOT URL strings.

## Content Structure
- Recipes are MDX files with extensive YAML frontmatter (ingredients, instructions, nutrition, FAQs)
- Every recipe must have an EN + FR pair linked via `translationSlug`
- Ingredients and instructions live in frontmatter (needed for JSON-LD generation)
- MDX body is the SEO blog prose (target 800-1500 words, 5-8 H2 sections)
- Images go in `src/assets/images/recipes/` with descriptive filenames
- EN/FR share the same image files -- only alt text is translated
- Cross-links in prose use absolute paths with trailing slashes: `/en/recipes/{slug}/`

### Picture Component Pattern in MDX
```mdx
import { Picture } from "astro:assets";
import imgName from "../../../assets/images/recipes/{slug}-{descriptor}.webp";

<Picture
  src={imgName}
  alt="Descriptive alt text (~125 chars)"
  widths={[400, 600, 900]}
  sizes="(max-width: 896px) 100vw, 896px"
  formats={["avif", "webp"]}
  class="my-6 w-full rounded-lg"
  loading="lazy"
/>
```

## Image Guidelines
- **Target 5-7 images per recipe**: 1 hero (required) + 3-5 step images (recommended)
- **Naming**: `{slug}.jpg` (hero), `{slug}-step-{n}.jpg` (steps) -- descriptive names also accepted
- **Formats in use**: `.jpg`, `.webp`, `.png` (mixed)
- **Sizing**: Hero max 1200px wide / < 200KB (quality 82), Step max 900px wide / < 150KB (quality 80)
- **Alt text**: Descriptive, ~125 chars, include dish name, no "Image of" prefix
- **Step images** go in frontmatter `instructionGroups.steps[].image` as `image()` imports
- **Always run `/optimize-image`** on new images before commit
- **Pinterest images deferred** until 30+ recipes published

## i18n Details

### Route Mapping (EN <-> FR)
| EN | FR |
|----|----|
| `/en/recipes/` | `/fr/recettes/` |
| `/en/recipes/category/` | `/fr/recettes/categorie/` |
| `/en/about/` | `/fr/a-propos/` |
| `/en/search/` | `/fr/recherche/` |
| `/en/contact/` | `/fr/contact/` |

### Category Slug Map (canonical EN key -> localized slug)
| Canonical | EN | FR |
|-----------|----|----|
| appetizer | appetizer | entree |
| dinner | dinner | souper |
| dessert | dessert | dessert |
| breakfast | breakfast | dejeuner |
| lunch | lunch | diner |
| snack | snack | collation |
| side-dish | side-dish | accompagnement |
| drink | drink | boisson |
| sauce | sauce | sauce |

`recipeCategory` values in frontmatter always use the canonical EN key (e.g., `dinner`, not `souper`).

### Quebec French Conventions
- souper (dinner), dejeuner (breakfast), diner (lunch)
- cuillere a the (tsp), cuillere a soupe (tbsp), tasses (cups)
- portions (servings)

### Key i18n Functions (`src/i18n/utils.ts`)
- `t(locale, key)` -- Type-safe translation lookup
- `getLocaleFromUrl(url)` -- Extract locale from URL path
- `getRecipeLocalizedPath(locale, slug)` -- Build recipe URL
- `getCategoryLocalizedPath(locale, category)` -- Build category URL
- `getAlternateUrl(currentUrl, targetLocale)` -- Translate full URL for hreflang

### Routing Notes
- EN/FR pages are duplicated files under `src/pages/en/` and `src/pages/fr/` (not generated from a shared template)
- Root `/` does a 302 redirect via `Accept-Language` detection to `/en/` or `/fr/`
- All ARIA labels must be i18n'd via `t(locale, key)` -- never hardcode English

## Brand & Accessibility

### Colors
- **Primary**: Terracotta `#C4704B` (decorative/backgrounds only)
  - `brand-primary-text` `#9A5439` -- WCAG AA 5.67:1 on white (use for text)
  - `brand-primary-dark` `#A85D3D` -- 4.87:1 (larger text/UI elements)
- **Accent**: Warm Gold `#D4A853` (decorative/backgrounds only)
  - `brand-accent-text` `#7D631C` -- WCAG AA 5.72:1 on white (use for text)
  - Never use `brand-accent` or `brand-accent-dark` for text (fails WCAG)
- **Background**: `bg-gray-100` (light) / `bg-neutral-950` (dark) -- NOT cream (cream is legacy)

### Fonts
- **Fira Sans** 600/700 -- Headings (uppercase)
- **Bitter** 400/500/600/700 -- Body text + UI
- **Caveat** 400/700 -- Handwritten accents
- Loaded via `<link>` with `preconnect` in `<head>` -- never CSS `@import`

### Accessibility Rules (WCAG 2.2 AA)
- Focus-visible outlines: terracotta `#9A5439` (light), gold `#D4A853` (dark)
- Focus traps in modals (SearchOverlay, mobile Navigation)
- `prefers-reduced-motion: reduce` disables all animations
- Skip-to-content link on every page
- `aria-pressed`, `aria-expanded`, `aria-live="polite"` used on interactive elements
- Never pair `uppercase` with negative `letter-spacing`
- Test third-party components (e.g., Pagefind) in dark mode before shipping

## SEO & Structured Data

### JSON-LD Types
- **Recipe + FAQPage** -- On every recipe page (via `RecipeSchema.astro`)
- **BreadcrumbList** -- On every page (via `Breadcrumbs.astro`)
- **WebSite + Organization** -- Homepage only
- **ItemList** -- Recipe listing and category pages

### Rules
- Recipe JSON-LD `image` must be array format `[url]`, not single string
- Meta tags: canonical, hreflang (bidirectional EN/FR), Open Graph, Twitter Cards
- Related content filtering: use exact slug comparison (`===`), never `.includes()`
- `robots.txt` allows AI crawlers (GPTBot, ClaudeBot, PerplexityBot, Google-Extended)
- `llms.txt` endpoint at `/llms.txt` (generated from recipe collection)
- Sitemap excludes search pages and bare root URL

## Slash Commands & Workflows

### Available Commands
| Command | Purpose |
|---------|---------|
| `/new-recipe` | Scaffold EN+FR MDX pair with full frontmatter template |
| `/write-prose` | Generate 800-1500 word SEO blog prose for recipe MDX body |
| `/translate-recipe` | Translate recipe EN<->FR with Quebec French conventions |
| `/optimize-image` | Resize/rename images (hero 1200px/<200KB, step 900px/<150KB) |
| `/seo-audit` | Audit single recipe: frontmatter, JSON-LD, content, images (24-pt score) |
| `/bulk-audit` | Audit ALL recipes with collection-wide summary scorecard |
| `/validate-recipes` | Collection integrity: EN/FR pairs, images, cross-links, content parity |
| `/deploy` | Pre-deploy checks + commit + push to main (triggers Cloudflare auto-deploy) |

### Recommended Workflows
- **New recipe**: `/new-recipe` -> add real images -> `/optimize-image` -> `/write-prose` -> `/translate-recipe` -> `/seo-audit` -> `/deploy`
- **Audit & fix**: `/bulk-audit` -> fix issues -> `/validate-recipes` -> `/deploy`
- **Translation**: `/translate-recipe` -> `/validate-recipes`
- **Image update**: add images -> `/optimize-image` -> update frontmatter paths -> `/validate-recipes`

## Deploy & Infrastructure
- **Deploy**: `npm run deploy` (build + Wrangler deploy) or push to `main` (Cloudflare auto-deploy)
- **`_headers`**: Security headers + cache rules (`/_astro/*` 1yr immutable, `/pagefind/*` 24h, `/images/*` 7d)
- **`_redirects`**: Relative paths ONLY (Cloudflare rejects absolute URLs) + WordPress migration 301s
- **www-to-apex**: Configured at DNS level (CNAME + Redirect Rule), NOT in `_redirects`
- **Wrangler**: `nodejs_compat` flag, `global_fetch_strictly_public`, observability enabled

## Lessons Learned

Key gotchas from `docs/solutions/` -- read the full docs for detailed context.

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

For detailed context on any lesson, see `docs/solutions/`.
