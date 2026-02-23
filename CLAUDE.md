# Date My Dish

Bilingual recipe blog (EN/FR) built with Astro 5, deployed on Cloudflare Pages.

## Tech Stack
- **Framework**: Astro 5.x + TypeScript + MDX
- **Styling**: Tailwind CSS
- **Content**: MDX files in `src/content/recipes/{en,fr}/` with Zod-validated frontmatter
- **i18n**: Subdirectory routing (`/en/`, `/fr/`) with `prefixDefaultLocale: true`
- **Search**: Pagefind (runs post-build)
- **Images**: Astro `<Picture>` with AVIF/WebP, images in `src/assets/` (not `public/`)
- **Hosting**: Cloudflare Pages

## Key Commands
- `npm run dev` — Start dev server
- `npm run build` — Build site + run Pagefind
- `npm run check` — TypeScript and content validation
- `npm run preview` — Preview built site

## Content Structure
- Recipes are MDX files with extensive YAML frontmatter (ingredients, instructions, nutrition, FAQs)
- Every recipe must have an EN + FR pair linked via `translationSlug`
- Ingredients and instructions live in frontmatter (needed for JSON-LD generation)
- MDX body is the SEO blog prose (target 800-1500 words)
- Images go in `src/assets/images/recipes/` with descriptive filenames

## Route Mapping (EN → FR)
- `/en/recipes/` → `/fr/recettes/`
- `/en/recipes/category/` → `/fr/recettes/categorie/`
- `/en/about/` → `/fr/a-propos/`
- `/en/search/` → `/fr/recherche/`
- `/en/contact/` → `/fr/contact/`

## Brand
- Colors: Blue `#1863DC`, Green `#5A822B`
- Fonts: Bitter (headings), Fira Sans Condensed (body), Caveat (handwritten), Raleway (UI)
- Locale: Quebec French (souper, déjeuner, cuillère à thé)
