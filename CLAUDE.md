# Date My Dish

Bilingual (EN / Quebec French) Montréal date-night guide built with Astro, deployed on Cloudflare.

**What a post looks like, where its content comes from and how it is published: `docs/editorial-publishing-system.md`. Read it before touching content, the content contracts, the Notion importer or any scheduled job.** Domain terms: `CONTEXT.md`.

## Agent skills

### Issue tracker

Issues and specs are tracked in this repository's GitHub Issues. See `docs/agents/issue-tracker.md`.

### Domain docs

This is a single-context repository. See `docs/agents/domain.md`.

## Tech Stack
- **Framework**: Astro + TypeScript (strict)
- **Styling**: Tailwind CSS (class-based dark mode)
- **Content**: JSON collections validated by Zod contracts in `src/content-contracts/`: `src/content/date-spots.json` (Reviews and Date Spots), `src/content/extended-profiles.json` (Chefs), `src/content/contributor-recipes.json` (Chef Recipe Cards). The source is the read-only public Notion database; see the spec.
- **i18n**: Subdirectory routing (`/en/`, `/fr/`) with `prefixDefaultLocale: true`
- **Search**: Pagefind (runs post-build)
- **Hosting**: Cloudflare via Wrangler

## Key Commands
- `npm run dev` -- Start dev server
- `npm run build` -- Build site. Gated by validators in `prebuild` and `postbuild`; a failing check fails the build.
- `npm run check` -- TypeScript and content schema validation
- `npm run validate:source` -- Pre-build guards (content contracts, descriptions, `<Picture>` fallbackFormat)
- `npm run validate:build` -- Post-build guards against `dist/` (hreflang, sitemap, meta lengths, links to redirects, untranslated keys, oversized images, performance budgets, retired routes)
- `npm run test:contracts` -- Content contract tests
- `npm run preview` -- Build + local Cloudflare Workers preview
- `npm run deploy` -- Build + deploy (build gate runs first)

## Architecture & Conventions

### Component Patterns
- All components take a `locale: Locale` prop for i18n
- TypeScript interfaces for all Props (`interface Props { ... }`)
- Use `class:list` for conditional CSS classes
- SVG icons inlined as raw elements (no icon library)
- Optional sections render nothing when their data is empty: no placeholder, no heading

### Layouts
- `BaseLayout.astro` -- Root HTML shell (SEO head, nav, footer, search overlay, skip-to-content)
- `ReviewLayout.astro`, `DateSpotLayout.astro` -- Wrappers for review and Date Spot pages
- Named slot: `<slot name="head" />` for injecting schema components into `<head>`

### Path Aliases (tsconfig.json)
`@components/*`, `@layouts/*`, `@i18n/*`, `@assets/*`, `@content/*`, `@utils/*`, `@content-contracts/*`

### Client-Side JavaScript
- Vanilla JS only, no React/Vue/Svelte
- IIFE pattern: `(function() { ... })()`
- All scripts use `is:inline` to avoid Astro bundling
- Global hooks via `window` (e.g., `window.__openSearch`)
- Keep a review page at 15 KB of JS or less (performance budget)

### Dark Mode
- Tailwind `class` strategy with `dark:` prefix
- Neutral palette: `dark:bg-neutral-950` (body), `dark:bg-neutral-900` (cards), `dark:text-neutral-200` (text)
- Toggle persisted in `localStorage.theme`
- Flash prevention: inline `<script>` in `<head>` applies `.dark` class before first paint

### CSS Conventions
- `.no-print` hides elements in print view; `.print-only` shows only in print
- `scroll-margin-top: 5rem` on h2/h3 for sticky nav clearance
- `@media (prefers-reduced-motion: reduce)` disables all animations

## i18n

### Route Mapping (EN <-> FR)
| EN | FR |
|----|----|
| `/en/reviews/{neighbourhood}/{slug}/` | `/fr/critiques/{neighbourhood}/{slug}/` |
| `/en/date-spots/{slug}/` | `/fr/lieux/{slug}/` |
| `/en/date-spots/category/{category}/` | `/fr/lieux/categorie/{categorie}/` |
| `/en/date-spots/neighbourhood/{n}/` | `/fr/lieux/quartier/{n}/` |
| `/en/chefs/{slug}/` | `/fr/chefs/{slug}/` |
| `/en/recipe-cards/{slug}/` | `/fr/fiches-recettes/{slug}/` |
| `/en/about/` | `/fr/a-propos/` |
| `/en/search/` | `/fr/recherche/` |
| `/en/contact/` | `/fr/contact/` |
| `/en/privacy-policy/` | `/fr/politique-de-confidentialite/` |
| `/en/terms-of-service/` | `/fr/conditions-dutilisation/` |

### Routing Notes
- EN/FR pages are duplicated files under `src/pages/en/` and `src/pages/fr/`
- Root `/` does a 302 redirect via `Accept-Language` detection to `/en/` or `/fr/`
- All ARIA labels must be i18n'd via `t(locale, key)`, never hardcoded English
- Quebec French conventions: souper (dinner), déjeuner (breakfast), dîner (lunch), portions, tasses

## Brand & Accessibility

### Colors
- **Primary**: Terracotta `#C4704B` (decorative/backgrounds only)
  - `brand-primary-text` `#9A5439` -- WCAG AA 5.67:1 on white (use for text)
  - `brand-primary-dark` `#A85D3D` -- 4.87:1 (larger text/UI elements)
- **Accent**: Warm Gold `#D4A853` (decorative/backgrounds only)
  - `brand-accent-text` `#7D631C` -- WCAG AA 5.72:1 on white (use for text)
  - Never use `brand-accent` or `brand-accent-dark` for text (fails WCAG)
- **Background**: `bg-gray-100` (light) / `bg-neutral-950` (dark)

### Fonts
- **Playfair Display** 400-900 -- Headings (italic)
- **Source Serif 4** 400-700 -- Body text
- **Inter** 400-700 -- UI elements
- **Caveat** 400/700 -- Handwritten accents
- Loaded via `<link>` with `preconnect` in `<head>`, never CSS `@import`

### Accessibility Rules (WCAG 2.2 AA)
- Focus-visible outlines: terracotta `#9A5439` (light), gold `#D4A853` (dark)
- Focus traps in modals (SearchOverlay, mobile Navigation)
- `prefers-reduced-motion: reduce` disables all animations
- Skip-to-content link on every page
- `aria-pressed`, `aria-expanded`, `aria-live="polite"` used on interactive elements
- Never pair `uppercase` with negative `letter-spacing`
- Test third-party components (e.g., Pagefind) in dark mode before shipping

## Writing rules
- **Never use em-dashes (—)** in any content, copy, or UI text. Use commas, periods, colons, or semicolons.
- Post prose comes from Notion and is never rewritten. Only the Allowed Edits in the spec apply.

## Deploy & Infrastructure
- **Deploy**: `npm run deploy` or push to `main` (Cloudflare auto-deploy)
- **`_headers`**: Security headers + cache rules (`/_astro/*` 1yr immutable, `/pagefind/*` 24h, `/images/*` 7d)
- **`_redirects`**: Relative paths ONLY (Cloudflare rejects absolute URLs)
- **www-to-apex**: Configured at DNS level, NOT in `_redirects`
- **Wrangler**: `nodejs_compat` flag, `global_fetch_strictly_public`, observability enabled. `MAINTENANCE_MODE` var plus `src/worker.ts` serve a bilingual 503 while maintenance is on.

## Automation

Publishing, Pinterest and every scheduled job are defined in the spec (`docs/editorial-publishing-system.md`, sections Publishing, Pinterest, Scheduled work). In short: a Claude cloud routine imports eligible Notion rows into a draft PR; merging the PR publishes; no scheduled job edits prose. Each Claude cloud routine's prompt is committed under `routines/` (`weekly-seo-maintenance.md` states the allowed edit set); edit the file to change the routine. The Importer routine (`routines/importer.md`) calls `scripts/notion-import.mjs` (`list`, `next`, `companion`, `check`, `fail`); there is no GitHub workflow for it.

### SEO and performance guards (wired into every build and PR)
- **`scripts/validate-source.mjs`** (`prebuild`) -- Fails on a `<Picture>` missing `fallbackFormat` and on taxonomy values with no translation.
- **`scripts/validate-date-spots.mjs`** (`prebuild`) -- Merges each Companion File (`src/content/editorial/{slug}.json`) over its record, then validates the content contracts (naming any missing required field), EN/FR parity, append-only Google snapshots and update lines, and cross-collection links. Fails a review below 300 reader-facing words per locale; warns below 1,000 words, below nine internal links, and when `favourite` passes one in four.
- **`scripts/notion-import.mjs check`** (`prebuild`, and in the PR check with `--base`) -- Every published record needs a Notion source snapshot in `notion/sources/`. Runs the Verbatim Check (each English sentence must trace to the snapshot after the Allowed Edits) and the publish gate (contracts with Companion Files merged, links, no author placeholders or em-dashes, no venue twice, photo budgets; with `--base`, append-only Google snapshots and update lines and dated updates against the base). Prints Unplaced Text.
- **`scripts/validate-build.mjs`** (`postbuild`) -- Fails on hreflang pointing to a redirect/404 or missing a trailing slash, noindex/bare-root/redirecting URLs in the sitemap, indexable meta descriptions outside 120-160, internal links to a `_redirects` source, untranslated i18n keys in titles/meta, `dist/_astro` images over 500 KB, or any `Review`, `AggregateRating`, `Rating` or `FAQPage` JSON-LD (or `reviewRating`/`aggregateRating`/`ratingValue` keys). Also enforces the performance budgets: over 15 KB of first-party JavaScript on a post page, a hero (`fetchpriority="high"`) source over 200 KB, any `<img>` without width and height, a non-hero `<img>` on a post page without `loading="lazy"`, or a third-party `<iframe>` in the initial HTML.
- **Lighthouse PR check** (`lighthouse-pr-check.yml`) -- Builds from the `tests/fixtures/` data and audits one page per post type (review, Date Spot, chef, recipe card) on mobile and desktop. Every assertion is an error: performance 95+, LCP 2.5 s or less, CLS 0.05 or less, plus accessibility, best practices and SEO 90+. Runs whenever content JSON, `src/components/`, `src/layouts/`, `src/pages/` or `src/styles/` change.
- When adding a check, add a matching lesson below.

### Key files (do not delete)
- `notion/published.json`, `data/seo/`, `data/lighthouse/`, `data/social-posts-log.json` -- automation state
- `routines/` -- prompts for the Claude cloud routines
- `scripts/seo/` -- SEO ranking and reporting scripts (`derive-keywords.mjs` reads only the published collections)
- `scripts/notion-import.mjs`, `scripts/notion-story/` (`fields.mjs` eligibility, `notion.mjs` read-only fetch, `parse.mjs` body parsing, `headings.mjs` heading map, `verbatim.mjs`, `gate.mjs`, `companion.mjs`, `images.mjs`, `rows.mjs` duplicates and updates, `report.mjs` failure issue) -- the Importer's deterministic steps
- `notion/sources/` -- the Notion source snapshot each published post is checked against
- `scripts/venue-maintenance-reminders.mjs` -- recheck reminders

### Testing
- **Playwright E2E**: `npx playwright test` -- auto-discovers pages from `dist/`, 4 projects (desktop/mobile x light/dark)
- **Lighthouse CI**: `.lighthouserc.cjs` (PR checks), `.lighthouserc-full.cjs` (full audit)
- **Contract fixtures**: browser builds set `DATE_SPOT_SOURCE`, `CONTRIBUTOR_RECIPE_SOURCE` and `EXTENDED_PROFILE_SOURCE` to files in `tests/fixtures/`, and `EDITORIAL_SOURCE` to `tests/fixtures/editorial/` (Companion Files)

## Lessons Learned

Detailed write-ups live in `docs/solutions/`.

1. Cloudflare `_redirects` only accepts relative paths. www-to-apex goes at DNS level.
2. Every image is optimised before it ships (hero max 1200px and under 200 KB, others max 900px). Past heroes were 700 KB+.
3. Pagefind UI needs explicit dark mode CSS overrides via the `:root.dark` selector.
4. When changing fonts, load ALL needed weights in the Google Fonts `<link>` URL. Google Fonts via `<link>`, never CSS `@import` (render-blocking).
5. Never pair `uppercase` with negative `letter-spacing`. Protect handwritten fonts (Caveat) with `normal-case` when global uppercase rules exist.
6. Fixed orderings (Make a night of it categories, listing filters) need an explicit priority array. Set insertion order is not a contract.
7. Use `brand-primary-text`/`brand-accent-text` for text, never raw brand colors (WCAG fail).
8. All ARIA labels must be i18n'd via `t(locale, key)`.
9. Focus traps are required in SearchOverlay and mobile Navigation. `prefers-reduced-motion: reduce` must be tested.
10. Related content: use exact slug comparison (`===`), never `.includes()`.
11. The sitemap filter in `astro.config.ts` must exclude every noindex page (search, 404) and the bare root. Astro sitemap does not read noindex meta tags.
12. All URL builders in `src/i18n/utils.ts` return trailing slashes; never append `/` after calling them. Astro 301-redirects non-trailing-slash URLs. Content hreflang/alternate URLs in `SEOHead.astro` must also end in a slash. Enforced by `validate-build`.
13. Meta descriptions run 120 to 160 characters; the rendered `<title>` stays at 60 characters or fewer. Enforced by `validate-descriptions` and `validate-build`.
14. **No content is created outside the Notion importer.** SEO audits and the weekly SEO maintenance routine may report content gaps but never author new posts and never edit prose. They may only change Companion File fields (meta title and description, alt text, internal links) and `public/_redirects` for broken internal links. Never pad prose to hit a word count.
15. **Every `<Picture>` sets `fallbackFormat="webp"`.** Astro's default fallback for webp/avif sources is PNG, which balloons photos to 1-3 MB. Enforced by `validate-source`.
16. **Taxonomy slug maps must cover every value in content** (categories, neighbourhoods, cuisines). A value with no map entry renders a raw key and produces a 404 hreflang. Enforced by `validate-source` and `validate-build`.
17. **Never link to a `_redirects` source, the bare apex, or a retired page.** Internal `<a href>`s must point at final 200 URLs. Enforced by `validate-build`.
18. **Notion fetch requests need a browser `User-Agent` header, not authentication.** Cloudflare's WAF 403s `notion-client` requests without one. `createNotionApi()` in `scripts/notion-utils.mjs` sets it. No token is needed or available: the Notion database is public and read-only for DMD.
19. **`typescript` stays below v7 (`~6.0.3`)**, pinned in `package.json` and `renovate.json` (`allowedVersions: "<7"`), because `@astrojs/check` only supports TS 5 and 6. Don't add an `overrides` block to force it. Lift the pin only once a released `@astrojs/check` lists TS 7 in its peer dependencies.
20. **Pages are built from structured fields, never free text standing in for a section.** Optional sections render only when their field has content. When the design changes, change the spec, the contract, the renderer and the fixtures (`node tests/contracts/date-spot-fixtures.mjs`) together.
21. **The Google rating never enters DMD's structured data**, and no `Review`, `AggregateRating` or `FAQPage` markup is emitted. DMD publishes no numbers of its own. Enforced by `validate-build`.
22. **`_redirects` rules must answer with their own 301, even with `run_worker_first`.** While `run_worker_first` is on, static requests reach `public/_redirects` only through the `ASSETS` binding, which follows redirects by default and serves the target at the old URL with a 200. `src/worker.ts` asks the binding for the redirect itself (`redirect: "manual"`). The legacy flat review URLs (#542) are asserted as a single 301 in `tests/smoke/date-spot.spec.ts`, and `tests/contracts/legacy-review-redirects.test.mjs` fails if a migrated review renders anywhere other than its redirect target.
23. **Notion owns the prose; the Companion File owns everything else.** `src/content/editorial/{slug}.json` (schema in `src/content-contracts/companion.mjs`) holds verdict and reason, signals, Spot Type, category, neighbourhood, `lastChecked` and update lines, Google snapshots, Instagram, booking link, meta fields, alt text and internal links. `loadCollection()` in `src/content-contracts/load.mjs` merges it over the record for both the Astro collections and the validators; its fields win. Required fields per post type are exactly the spec's minimum; everything else is optional and an Optional Section never renders an empty heading.
24. **Performance budgets block the build, not just Lighthouse.** A post page ships at most 15 KB of first-party JavaScript (inline scripts count; JSON-LD does not), the hero stays under 200 KB, every `<img>` sets width and height, below-the-fold images are `loading="lazy"`, and no third-party `<iframe>` loads with the page: the map is a link, and any embed loads on click. `is:inline` scripts are emitted once per component instance, so a component rendered twice ships its script twice; give it an `includeScript` prop and emit the script from one instance (see `DarkModeToggle` and `NewsletterSignup`). Enforced by `validate-build`; the Lighthouse PR check enforces performance 95+, LCP and CLS.
25. **Imported prose must trace to its Notion source.** `notion-import.mjs check` fails any English sentence in a record that is not in `notion/sources/{slug}.json` after the Allowed Edits (word-level match; negations and numbers can never be edited away). When it fails, restore the Notion wording; never loosen the check to fit a rewrite. Author notes (`INTERNAL` callouts, bracketed placeholders) are not traceable source. New author headings go into the heading map in `scripts/notion-story/headings.mjs`, with a test.
