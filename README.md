<div align="center">

# Date My Dish

### Elevate your dinner. Impress your date.

A bilingual recipe blog crafted for couples who believe great food is the secret ingredient to a memorable evening.

**[datemydish.com](https://datemydish.com)**

*English & French (Quebec) -- Built with Astro -- Deployed on Cloudflare Pages*

</div>

---

## What is Date My Dish?

Date My Dish is a curated collection of date-night-worthy recipes -- from weeknight pasta to show-stopping mains -- with wine pairings, plating tips, and music suggestions to set the mood. Every recipe is available in both English and Quebec French, with step-by-step photos and an "impress factor" rating so you know exactly how much wow you're bringing to the table.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | [Astro 5](https://astro.build) + TypeScript (strict) + MDX |
| **Styling** | [Tailwind CSS 3.4](https://tailwindcss.com) with class-based dark mode |
| **Content** | MDX recipes with Zod-validated frontmatter schemas |
| **Search** | [Pagefind](https://pagefind.app) -- static, zero-JS search indexing |
| **i18n** | Subdirectory routing (`/en/`, `/fr/`) with type-safe translations |
| **Images** | Astro `<Picture>` with AVIF/WebP, compile-time optimization |
| **Hosting** | [Cloudflare Pages](https://pages.cloudflare.com) via Wrangler |
| **Testing** | Playwright E2E + Lighthouse CI |
| **AI** | Claude API for automated social media caption generation |

## Features

- **Bilingual** -- Every recipe exists as an EN/FR pair with Quebec French conventions (souper, dejeuner, portions)
- **Date Night Tips** -- Wine pairing, playlist, and plating suggestions on select recipes
- **Impress Factor** -- 1-5 heart rating so you can match ambition to skill level
- **Dark Mode** -- System-aware with manual toggle, persisted in localStorage
- **Full-Text Search** -- Pagefind-powered overlay with keyboard navigation
- **Print-Optimized** -- Two-column print layout with ink-saving styles
- **Rich SEO** -- JSON-LD (Recipe, FAQPage, BreadcrumbList), OpenGraph, hreflang, sitemap
- **AI-Friendly** -- `robots.txt` allows AI crawlers; `/llms.txt` endpoint for LLM access
- **Social Automation** -- GitHub Actions auto-post new recipes to Instagram & Pinterest with AI-generated captions
- **Accessible** -- WCAG 2.2 AA compliant: focus traps, skip-to-content, reduced-motion support, contrast-checked brand colors

## Project Structure

```
src/
├── assets/images/recipes/     # Optimized recipe photos (AVIF/WebP)
├── components/                # 22 Astro components (cards, search, nav, SEO...)
├── content/recipes/
│   ├── en/                    # English MDX recipes
│   └── fr/                    # French MDX recipes
├── i18n/                      # Translation files + utility functions
├── layouts/                   # BaseLayout + RecipeLayout
├── pages/
│   ├── en/                    # English routes
│   └── fr/                    # French routes
├── styles/                    # Global CSS + print styles
└── utils/                     # Helpers (social posting, formatting)
```

## Getting Started

**Prerequisites:** Node.js 18+

```bash
# Clone the repo
git clone https://github.com/victortrinh/date-my-dish.git
cd date-my-dish

# Install dependencies
npm install

# Start the dev server
npm run dev
```

## Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server |
| `npm run build` | Production build (Pagefind runs via postbuild) |
| `npm run preview` | Build + local Cloudflare Workers preview |
| `npm run check` | TypeScript & content schema validation |
| `npm run deploy` | Build + deploy to Cloudflare Pages |
| `npm test` | Run Playwright E2E tests |

## Adding a Recipe

Each recipe is an MDX file with YAML frontmatter containing ingredients, instructions, nutrition, and FAQs. The MDX body is SEO blog prose (800-1500 words).

1. Create `src/content/recipes/en/your-recipe.mdx` with full frontmatter
2. Create the French translation in `src/content/recipes/fr/` linked via `translationSlug`
3. Add optimized images to `src/assets/images/recipes/`
4. Both files share the same images -- only alt text is translated

Required frontmatter includes: title, lang, description, hero image, prep/cook/total time, difficulty, ingredients, instructions, and at least one FAQ. See `src/content.config.ts` for the complete Zod schema.

## Brand

| Element | Value |
|---------|-------|
| **Primary** | Terracotta `#C4704B` (decorative) / `#9A5439` (text -- WCAG AA) |
| **Accent** | Warm Gold `#D4A853` (decorative) / `#7D631C` (text -- WCAG AA) |
| **Headings** | Fira Sans 600/700 |
| **Body** | Bitter 400-700 |
| **Handwritten** | Caveat 400/700 |

## License

All rights reserved. Recipe content, photos, and code are proprietary.

---

<div align="center">

Built with care by **[Victor](https://datemydish.com/en/about/)** in Montreal

</div>
