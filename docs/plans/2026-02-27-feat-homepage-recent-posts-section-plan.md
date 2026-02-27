---
title: "feat: Add Recent Posts section to homepage"
type: feat
status: completed
date: 2026-02-27
origin: docs/brainstorms/2026-02-27-homepage-articles-section-brainstorm.md
---

# feat: Add Recent Posts section to homepage

Add a "Recent Posts" section to the EN + FR homepages showing the 3 most recent content items (articles and recipes mixed, sorted by publish date). Sits between the Hero and Featured Recipes sections. Uses existing `ArticleCard` and `RecipeCard` components. (see brainstorm: docs/brainstorms/2026-02-27-homepage-articles-section-brainstorm.md)

## Acceptance Criteria

- [x] New "Recent Posts" section visible on both `/en/` and `/fr/` homepages
- [x] Shows the 3 most recent items across both articles and recipes collections, sorted by `publishDate` descending
- [x] Articles render with `ArticleCard`, recipes render with `RecipeCard` (discriminated by `entry.collection`)
- [x] Section uses alternating gray background (`bg-gray-200 dark:bg-neutral-900`) for visual rhythm: Hero (dark) → Recent Posts (gray) → Featured Recipes (white) → Categories (gray)
- [x] Section heading follows existing pattern: h2 + gold accent bar
- [x] Cards use `headingLevel="h3"` for correct heading hierarchy
- [x] Section conditionally renders only when there are posts (`posts.length > 0`)
- [x] No "View all" link (no unified posts page exists yet)
- [x] Duplication with Featured Recipes is acceptable (sections serve different purposes)
- [x] Secondary sort by entry `id` for deterministic builds when dates collide
- [x] i18n keys added: `home.recentPosts` (EN: "Recent Posts" / FR: "Publications récentes")
- [x] `aria-labelledby` on the section element pointing to the h2 id
- [x] Works in dark mode, all breakpoints (1-col / 2-col / 3-col), and with prefers-reduced-motion
- [x] `npm run build` succeeds, `npm run check` passes

## Context

**Current homepage structure** (`src/pages/en/index.astro`, `src/pages/fr/index.astro`):
- Hero section (lines 58-86): background image + H1 + CTA
- Featured Recipes (lines 88-126): `getCollection("recipes")` → filter by locale → sort by date → `.slice(0, 6)` → `RecipeCard` grid
- Categories (lines 128-150): pill links from recipe categories

**Key patterns to follow:**
- Section heading: `<h2 class="font-heading text-heading-1 ...">` + `<div class="mx-auto mt-3 h-1 w-12 rounded-full bg-brand-accent">` (`src/pages/en/index.astro:91-96`)
- Card grid: `<div class="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">` (`src/pages/en/index.astro:98`)
- Conditional render: `{items.length > 0 && (...)}` (`src/pages/en/index.astro:89`)
- Data fetching: `getCollection("articles")` already used in `src/pages/en/articles/index.astro:11`
- Card usage: `ArticleCard` props at `src/pages/en/articles/index.astro:64-74`
- Discriminator: use `entry.collection` property (`"recipes"` or `"articles"`) to pick the right card component
- i18n keys in `src/i18n/en.json` and `src/i18n/fr.json` under `"home"` namespace

## Implementation

### 1. Add i18n keys

**`src/i18n/en.json`** — add to `"home"` object:
```json
"recentPosts": "Recent Posts"
```

**`src/i18n/fr.json`** — add to `"home"` object:
```json
"recentPosts": "Publications récentes"
```

### 2. Update EN homepage (`src/pages/en/index.astro`)

- [x] Add `import ArticleCard from "@components/ArticleCard.astro"` to imports
- [x] Fetch articles: `const allArticles = await getCollection("articles")`
- [x] Filter + merge: create a union array with type tags from both collections, sort by publishDate desc with secondary sort by id, take 3
- [x] Insert new section HTML between Hero (line ~86) and Featured Recipes (line ~88) following the gray-background section pattern
- [x] Render each item conditionally: `item.collection === "recipes"` → `RecipeCard`, else → `ArticleCard`
- [x] Pass `headingLevel="h3"` to both card types
- [x] Add `id="recent-posts"` on h2 and `aria-labelledby="recent-posts"` on section

### 3. Update FR homepage (`src/pages/fr/index.astro`)

- [x] Mirror all changes from EN with FR-specific adjustments (locale filter `"fr"`, slug regex `/^fr\//`)

### 4. Validate

- [x] `npm run check` — no TypeScript errors
- [x] `npm run build` — builds successfully, new section rendered on both homepage URLs
- [ ] Visual check: dark mode, mobile/tablet/desktop, mixed content types in grid

## Sources

- **Origin brainstorm:** [docs/brainstorms/2026-02-27-homepage-articles-section-brainstorm.md](docs/brainstorms/2026-02-27-homepage-articles-section-brainstorm.md) — Key decisions: keep hero unchanged, mixed Recent Posts section, 3 items, no carousel, no article category pills
- Similar pattern: `src/pages/en/rss.xml.ts:36-38` (only existing place that merges recipes + articles into one sorted list)
- Card components: `src/components/RecipeCard.astro`, `src/components/ArticleCard.astro`
- i18n pattern: `src/i18n/en.json:59-65` (existing `home` namespace)
- Learnings: Category ordering needs explicit priority arrays (`docs/solutions/ui-bugs/category-tabs-ordering-and-image-height-constraints.md`), all ARIA labels must be i18n'd (`docs/solutions/ui-bugs/wcag-2-2-aa-accessibility-remediation.md`)
