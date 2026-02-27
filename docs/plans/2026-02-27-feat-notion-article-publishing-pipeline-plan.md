---
title: "feat: Add Article Content Type with Notion Publishing Pipeline"
type: feat
status: active
date: 2026-02-27
origin: docs/brainstorms/2026-02-27-notion-to-blog-pipeline-brainstorm.md
---

# feat: Add Article Content Type with Notion Publishing Pipeline

## Overview

Add a new "articles" content type to the Date My Dish blog, sourced from Notion exports. Articles are informative cooking guides (e.g., "How to Get Wok Hei at Home", "The Truth About MSG") that complement existing recipes. 12 articles are "Ready to Publish" with images. The pipeline converts Notion markdown to SEO-optimized MDX with full EN+FR bilingual pairs, published incrementally at 1-3 per week.

## Problem Statement / Motivation

The blog currently only has recipes. Victor has 12 informative articles written in Notion that are ready to publish but have no way to get onto the site. These articles drive organic traffic for broader cooking-related search queries (e.g., "should I wash chicken", "what is wok hei") that recipes alone don't capture. Adding articles diversifies content, improves SEO topical authority, and creates cross-linking opportunities with existing recipes.

## Proposed Solution

Create a dedicated `articles` Astro content collection with its own Zod schema, layouts, pages, and structured data. Build a Notion-to-MDX conversion workflow tracked by a JSON manifest. Thread a `contentType` prop through the layout hierarchy to fix the hardcoded recipe-only hreflang/language-toggle logic.

(see brainstorm: `docs/brainstorms/2026-02-27-notion-to-blog-pipeline-brainstorm.md`)

## Technical Approach

### Architecture

```
notion/
  published.json                     # NEW: tracking manifest
  Date My Dish Blog Posts/           # Existing Notion exports

src/content/
  articles/                          # NEW: article content collection
    en/{slug}.mdx
    fr/{slug}.mdx
  recipes/                           # Existing (unchanged)

src/layouts/
  ArticleLayout.astro                # NEW: thin wrapper like RecipeLayout

src/components/
  ArticleSchema.astro                # NEW: BlogPosting + FAQPage JSON-LD
  ArticleCard.astro                  # NEW: card for listing page
  RelatedRecipes.astro               # NEW: cross-link component

src/pages/
  en/articles/
    index.astro                      # NEW: listing page
    [...slug].astro                  # NEW: detail page
  fr/articles/
    index.astro                      # NEW: FR listing
    [...slug].astro                  # NEW: FR detail

src/assets/images/articles/          # NEW: article images
```

### Implementation Phases

#### Phase 1: Infrastructure (Foundation)

Build the content collection, layouts, pages, and i18n plumbing. No Notion content yet — just the skeleton that can render articles.

**1.1 Article Content Collection Schema**

File: `src/content.config.ts`

Add a new `articles` collection alongside `recipes`:

```typescript
// New schemas (outside factory, no image() needed)
const ArticleCategorySchema = z.enum([
  "cooking-techniques",
  "food-science",
  "guides",
  "ingredients",
  "kitchen-tips",
  "drinks",
]);

// Inside the schema factory (needs image())
const articles = defineCollection({
  loader: glob({ pattern: "**/*.mdx", base: "./src/content/articles" }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      lang: z.enum(["en", "fr"]),
      translationSlug: z.string(),
      description: z.string().max(160),
      author: z.string().default("Victor"),
      publishDate: z.coerce.date(),
      updatedDate: z.coerce.date().optional(),
      heroImage: image(),
      heroImageAlt: z.string(),
      keywords: z.array(z.string()),
      tags: z.array(z.string()).optional(),
      articleCategory: ArticleCategorySchema,
      readingTime: z.number().optional(), // minutes, auto-calculated
      relatedRecipes: z.array(z.string()).optional(), // recipe slugs
      faqs: z
        .array(z.object({ question: z.string(), answer: z.string() }))
        .min(1),
    }),
});

export const collections = { recipes, articles };
```

**Key decisions:**
- `articleCategory` is an enum (not free string) to prevent inconsistency
- `readingTime` is optional, auto-calculated during publishing as `Math.ceil(wordCount / 200)`
- `relatedRecipes` stores recipe slugs for cross-linking
- `faqs` required (min 1) for FAQPage JSON-LD, same as recipes

**1.2 i18n Updates**

Files: `src/i18n/en.json`, `src/i18n/fr.json`, `src/i18n/utils.ts`

New translation keys:

```json
// en.json additions
{
  "nav": { "articles": "Articles" },
  "article": {
    "readTime": "{minutes} min read",
    "publishedOn": "Published on",
    "relatedRecipes": "Related Recipes",
    "relatedArticles": "Related Articles",
    "faq": "Frequently Asked Questions",
    "share": "Share this article",
    "backToArticles": "Back to Articles"
  },
  "listing": {
    "allArticles": "All Articles",
    "noArticlesFound": "No articles found."
  },
  "seo": {
    "articlesTitle": "Cooking Articles & Guides | Date My Dish",
    "articlesDescription": "Expert cooking guides, food science explanations, and kitchen tips to elevate your date night dinners."
  },
  "breadcrumbs": { "articles": "Articles" }
}
```

```json
// fr.json additions
{
  "nav": { "articles": "Articles" },
  "article": {
    "readTime": "{minutes} min de lecture",
    "publishedOn": "Publié le",
    "relatedRecipes": "Recettes associées",
    "relatedArticles": "Articles similaires",
    "faq": "Questions fréquentes",
    "share": "Partager cet article",
    "backToArticles": "Retour aux articles"
  },
  "listing": {
    "allArticles": "Tous les articles",
    "noArticlesFound": "Aucun article trouvé."
  },
  "seo": {
    "articlesTitle": "Articles et guides de cuisine | Date My Dish",
    "articlesDescription": "Guides de cuisine experts, explications de science alimentaire et astuces de cuisine pour sublimer vos soupers en amoureux."
  },
  "breadcrumbs": { "articles": "Articles" }
}
```

Route utilities (`src/i18n/utils.ts`):

```typescript
// Add to routeMap in getAlternateUrl()
articles: { en: "articles", fr: "articles" },

// New utility function
export function getArticleLocalizedPath(locale: Locale, slug: string): string {
  return `/${locale}/articles/${slug}/`;
}
```

**Decision: FR article URLs use `/fr/articles/`** (same English word). Unlike `recipes`/`recettes`, "articles" is the same word in both languages. This avoids unnecessary complexity.

**1.3 Layout Hierarchy Fix: Add `contentType` Prop**

The core architectural change: thread a `contentType` prop through `BaseLayout` -> `SEOHead` and `LanguageToggle` to fix hardcoded recipe-only hreflang logic.

File: `src/layouts/BaseLayout.astro`

```typescript
interface Props {
  title: string;
  description: string;
  canonical?: string;
  ogImage?: string;
  noindex?: boolean;
  translationSlug?: string;
  ogType?: string;
  publishDate?: Date;
  updatedDate?: Date;
  contentType?: "recipe" | "article"; // NEW
}
```

File: `src/components/SEOHead.astro` (lines 44-51 fix)

```typescript
// Before (hardcoded to recipes):
if (translationSlug) {
  const prefix = targetLocale === "fr" ? "recettes" : "recipes";
  alternateUrl = `${siteUrl}/${targetLocale}/${prefix}/${translationSlug}`;
}

// After (content-type aware):
if (translationSlug && contentType) {
  let prefix: string;
  if (contentType === "recipe") {
    prefix = targetLocale === "fr" ? "recettes" : "recipes";
  } else if (contentType === "article") {
    prefix = "articles"; // same in both locales
  }
  alternateUrl = `${siteUrl}/${targetLocale}/${prefix}/${translationSlug}`;
}
```

Same pattern in `LanguageToggle.astro` — replace `getRecipeLocalizedPath()` call with a conditional based on `contentType`.

File: `src/layouts/ArticleLayout.astro` (NEW)

```typescript
// Thin wrapper, identical pattern to RecipeLayout.astro
interface Props {
  title: string;
  description: string;
  locale: Locale;
  canonical?: string;
  ogImage?: string;
  translationSlug: string;
  publishDate: Date;
  updatedDate?: Date;
}
// Passes contentType="article" and ogType="article" to BaseLayout
```

File: `src/layouts/RecipeLayout.astro` (UPDATE)

Add `contentType="recipe"` to its `BaseLayout` call. This is a backward-compatible addition.

**1.4 Article Pages**

File: `src/pages/en/articles/[...slug].astro`

```typescript
export async function getStaticPaths() {
  const articles = await getCollection("articles");
  return articles
    .filter((article) => article.data.lang === "en")
    .map((article) => {
      const slug = article.id.replace(/^en\//, "");
      return { params: { slug }, props: { article } };
    });
}
```

The detail page renders:
- Breadcrumbs: Home > Articles > {title}
- Hero image with `max-h-[350px] object-cover`
- Title, publish date, reading time, author
- Single-column prose content (`<Content />`)
- `RelatedRecipes` component (if `relatedRecipes` field populated)
- FAQ section
- Author bio card
- Share button

**Single-column layout** — articles don't need the two-column recipe layout (no ingredient sidebar). Full-width prose with `max-w-prose` constraint.

File: `src/pages/en/articles/index.astro`

Listing page with `ArticleCard` components sorted by `publishDate` desc. No category filtering at launch (only 12 articles; add filtering later if needed).

Duplicate pages for FR: `src/pages/fr/articles/index.astro` and `src/pages/fr/articles/[...slug].astro`.

**1.5 ArticleSchema.astro (JSON-LD)**

File: `src/components/ArticleSchema.astro`

Generates two JSON-LD blocks:

```json
{
  "@context": "https://schema.org",
  "@type": "BlogPosting",
  "headline": "...",
  "description": "...",
  "author": { "@type": "Person", "name": "Victor" },
  "datePublished": "2026-03-01",
  "dateModified": "2026-03-01",
  "image": ["https://datemydish.com/..."],
  "url": "https://datemydish.com/en/articles/...",
  "inLanguage": "en",
  "wordCount": 1200,
  "publisher": {
    "@type": "Organization",
    "name": "Date My Dish",
    "url": "https://datemydish.com",
    "logo": { "@type": "ImageObject", "url": "..." }
  }
}
```

Plus `FAQPage` schema (same pattern as `RecipeSchema.astro`).

**Critical:** `image` must be array `[url]`, not single string (CLAUDE.md lesson #3).

**1.6 ArticleCard.astro**

File: `src/components/ArticleCard.astro`

Card shows: hero image, title, description, publish date, reading time badge, article category badge. No `prepTime`/`difficulty` (recipe-specific). Follow `RecipeCard` visual style for consistency.

**1.7 Navigation & Footer Updates**

File: `src/components/Navigation.astro` (line 15 `navLinks` array)

```typescript
{ label: t(locale, "nav.articles"), path: "/articles/" },
```

File: `src/components/Footer.astro`

Add "Articles" link to the Navigation column.

**1.8 RelatedRecipes.astro Component**

File: `src/components/RelatedRecipes.astro` (NEW)

Takes `recipeSlugs: string[]` and `locale: Locale` props. Queries `getCollection("recipes")`, filters by locale, matches slugs with exact `===` comparison (not `.includes()`), renders `RecipeCard` components. Gracefully handles missing slugs (recipe deleted/renamed).

**1.9 Supporting Updates**

- **RSS feed** (`src/pages/en/rss.xml.ts`, `src/pages/fr/rss.xml.ts`): Add articles to existing feed. Update feed title/description to reflect mixed content.
- **llms.txt** (`src/pages/llms.txt.ts`): Add articles to the AI discoverability endpoint.
- **Sitemap**: Astro's sitemap integration auto-includes new pages. No manual change needed unless articles should be excluded (they shouldn't).
- **Pagefind**: Article detail pages get `data-pagefind-body` and `data-pagefind-filter="lang:{locale}"`. Cross-content discovery is desirable (searching "steak" finds both the recipe and the article).

**1.10 Print Stylesheet**

Articles get a simpler print view than recipes (no ingredient card, no recipe-specific print layout). Ensure `.no-print` hides nav/footer/share buttons. Article prose prints naturally in single-column.

---

#### Phase 2: Notion Publishing Workflow

Build the conversion pipeline and tracking manifest. This is the operational workflow Victor uses each week.

**2.1 Published Manifest Schema**

File: `notion/published.json`

```json
{
  "version": 1,
  "entries": {
    "30": {
      "notionId": "30",
      "notionTitle": "Here's How to Get Wok Hei at Home for a Memorable Date Night",
      "postType": "article",
      "enSlug": "wok-hei-at-home",
      "frSlug": "wok-hei-a-la-maison",
      "contentHash": "sha256-of-notion-md-file",
      "publishedDate": "2026-03-01",
      "updatedDate": null
    }
  }
}
```

**Key decisions:**
- Keyed by Notion "Recipe #" (stable integer from CSV), NOT by title (mutable)
- `contentHash` is SHA-256 of the raw `.md` file contents — detects any change
- Stores both `enSlug` and `frSlug` for lookup
- `postType` distinguishes articles from future recipe/review imports

**2.2 Slug Derivation Rule**

From CSV "Post Title":
1. Strip parenthetical suffixes (e.g., "(Make a Great Impression)")
2. Lowercase
3. Strip accents
4. Replace non-alphanumeric with hyphens
5. Collapse consecutive hyphens
6. Strip leading/trailing hyphens
7. Truncate to max 60 chars at a word boundary

Example: "Why You Shouldn't Order a Well-Done Steak on a Date (Make a Great Impression)" → `why-you-shouldnt-order-a-well-done-steak-on-a-date`

**2.3 Image Processing**

For each article:
1. Find image subfolder in `notion/Date My Dish Blog Posts/{truncated-title}/`
2. Copy images to `src/assets/images/articles/`
3. Rename: first image → `{slug}.webp` (hero), subsequent → `{slug}-{n}.webp`
4. Run `/optimize-image`: hero max 1200px/<200KB quality 82, inline max 900px/<150KB quality 80
5. Update frontmatter `heroImage` path and MDX `<Picture>` imports

**2.4 Content Conversion (Notion MD → SEO-Optimized MDX)**

For each article:
1. Read Notion `.md` source
2. Extract metadata (Category, Status, etc.) from the header block
3. Strip Notion-specific formatting (`<aside>` blocks → blockquotes or custom styling)
4. Rewrite prose for SEO: 800-1500 words, keyword-rich H2 structure, internal cross-links to related recipes
5. Add `<Picture>` component imports for inline images
6. Generate proper frontmatter (all required schema fields)
7. Auto-calculate `readingTime` as `Math.ceil(wordCount / 200)`
8. Generate FAQs from existing Q&A sections in Notion content (or create new ones)
9. Write to `src/content/articles/en/{slug}.mdx`

**2.5 French Translation**

For each article:
1. Translate the EN MDX to French following Quebec French conventions (see brainstorm)
2. Translate: title, description, heroImageAlt, keywords, tags, faqs, prose body
3. Keep same image references (EN/FR share images, only alt text translated)
4. Write to `src/content/articles/fr/{slug}.mdx`
5. Ensure `translationSlug` cross-references correctly in both files

**2.6 Update Tracking**

When a previously published article's content hash changes:
1. Re-read and re-convert the Notion source (EN)
2. Re-translate to FR
3. Set `updatedDate` in both EN and FR frontmatter
4. Update manifest with new hash and `updatedDate`

**Decision:** An EN content update always triggers FR re-translation in the same session.

**2.7 Slash Commands (New)**

| Command | Purpose |
|---------|---------|
| `/new-article` | Scaffold EN+FR MDX pair with article frontmatter template |
| `/publish-articles` | Full session workflow: read manifest + CSV, identify new/updated, convert, translate, validate |

Existing commands to adapt:
- `/seo-audit` — Add article variant (skip recipe-specific checks like prepTime, ingredients)
- `/validate-recipes` — Extend to also validate articles collection (EN/FR pairs, images, cross-links)
- `/translate-recipe` — Works for articles too with minor prompt adjustments
- `/write-prose` — Works for articles (different H2 template, no recipe-specific sections)

**2.8 CLAUDE.md Updates**

Update CLAUDE.md with:
- Article content schema quick-reference
- Article route mapping (EN/FR)
- Article category enum values
- Updated slash commands table
- Updated recommended workflows section
- Image path convention for articles (`src/assets/images/articles/`)

---

#### Phase 3: Content Publishing (First Batch)

Publish the first 2-3 articles to validate the pipeline end-to-end.

1. Pick 2-3 articles from the 12 ready ones (start with highest SEO potential)
2. Run the full conversion workflow
3. Run `npx astro check` to validate schemas
4. Run `/seo-audit` on each article
5. Run `/validate-recipes` (extended for articles)
6. Run `npm run build` to verify Pagefind indexes articles
7. Deploy and verify in production:
   - Article pages render correctly (EN + FR)
   - Language toggle works on article pages
   - hreflang tags are correct
   - JSON-LD validates in Google's Rich Results Test
   - Articles appear in search overlay
   - Navigation active state works
   - Print view is clean
   - Dark mode renders correctly

---

## System-Wide Impact

### Interaction Graph

- Adding `contentType` prop to `BaseLayout` → propagates to `SEOHead` (hreflang logic) + `Navigation` (language toggle) + `LanguageToggle`
- New `articles` collection → `getCollection("articles")` used by article pages, RSS feed, llms.txt, Pagefind indexing
- `RelatedRecipes` component → queries `recipes` collection from within article pages (cross-collection dependency)
- Navigation update → affects all pages site-wide (new "Articles" link renders everywhere)

### Error Propagation

- If `contentType` prop is omitted from a page, hreflang falls back to generic `getAlternateUrl()` behavior (which handles `/articles/` route segment correctly via `routeMap`)
- If a `relatedRecipes` slug doesn't exist, `RelatedRecipes.astro` silently skips it (graceful degradation, no build error)
- If Notion export is missing an article's image subfolder, the publishing workflow reports a warning and skips that article

### State Lifecycle Risks

- `notion/published.json` is the only persistent state. If it's lost/corrupted, articles can be re-published from Notion source (idempotent). If it's stale, articles may be re-processed unnecessarily (harmless).
- No database, no external API state, no cache to invalidate.

### API Surface Parity

- `getRecipeLocalizedPath()` → paralleled by `getArticleLocalizedPath()`
- `RecipeLayout` → paralleled by `ArticleLayout`
- `RecipeSchema` → paralleled by `ArticleSchema`
- `RecipeCard` → paralleled by `ArticleCard`

### Integration Test Scenarios

1. **Language toggle on article detail page**: Verify clicking toggle on `/en/articles/wok-hei/` navigates to `/fr/articles/wok-hei-a-la-maison/` (not `/fr/recettes/...`)
2. **hreflang on article page**: Verify `<link rel="alternate" hreflang="fr">` points to correct FR article URL (not recipe URL)
3. **Pagefind search**: Verify searching "wok hei" returns both the article and any related recipe, filtered by locale
4. **RSS feed**: Verify articles appear in RSS XML alongside recipes
5. **Build with missing images**: Verify `npx astro check` catches missing `heroImage` references at build time

## Acceptance Criteria

### Functional Requirements

- [ ] New `articles` content collection with Zod-validated schema in `src/content.config.ts`
- [ ] `ArticleLayout.astro` renders article pages with correct OG type and hreflang
- [ ] Article detail pages at `/en/articles/{slug}/` and `/fr/articles/{slug}/`
- [ ] Article listing pages at `/en/articles/` and `/fr/articles/`
- [ ] `ArticleSchema.astro` generates valid BlogPosting + FAQPage JSON-LD
- [ ] `ArticleCard.astro` displays title, description, hero image, publish date, reading time
- [ ] `RelatedRecipes.astro` cross-links to recipe pages from articles
- [ ] Language toggle works correctly on article pages (navigates to FR article, not recipe)
- [ ] hreflang tags on article pages point to correct alternate URLs
- [ ] "Articles" link in main navigation and footer
- [ ] All ARIA labels i18n'd via `t(locale, key)`
- [ ] Dark mode works on all article pages and components
- [ ] Print stylesheet clean for articles
- [ ] RSS feed includes articles
- [ ] llms.txt includes articles
- [ ] Pagefind indexes articles with correct locale filter
- [ ] `notion/published.json` manifest tracks published articles
- [ ] Notion-to-MDX conversion produces valid, SEO-optimized articles
- [ ] EN+FR pairs linked via `translationSlug`
- [ ] Images optimized via `/optimize-image` (hero <200KB, inline <150KB)
- [ ] `npx astro check` passes with no errors
- [ ] `npm run build` succeeds

### Non-Functional Requirements

- [ ] Article page Lighthouse score >= 90 (performance, accessibility, SEO, best practices)
- [ ] Hero images load with AVIF/WebP with proper `sizes` attribute
- [ ] `prefers-reduced-motion: reduce` respected on article pages
- [ ] WCAG 2.2 AA compliance (color contrast, focus visible, keyboard navigation)

## Dependencies & Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Notion export format changes | Low | Medium | Manifest keyed by stable "Recipe #", not title |
| Oversized images committed | Medium | Low | Mandatory `/optimize-image` step in workflow |
| SEOHead hreflang regression for recipes | Low | High | Add `contentType="recipe"` to existing RecipeLayout; test both paths |
| Article category inconsistency | Low | Low | Zod enum validates at build time |
| Missing FR translation on deploy | Medium | Medium | `/validate-recipes` (extended) checks EN/FR pairs before deploy |

## Files to Create

| File | Purpose |
|------|---------|
| `src/content/articles/en/` | EN article MDX directory |
| `src/content/articles/fr/` | FR article MDX directory |
| `src/layouts/ArticleLayout.astro` | Article page layout wrapper |
| `src/components/ArticleSchema.astro` | BlogPosting + FAQPage JSON-LD |
| `src/components/ArticleCard.astro` | Card component for listing page |
| `src/components/RelatedRecipes.astro` | Cross-link component (recipes from article) |
| `src/pages/en/articles/index.astro` | EN article listing page |
| `src/pages/en/articles/[...slug].astro` | EN article detail page |
| `src/pages/fr/articles/index.astro` | FR article listing page |
| `src/pages/fr/articles/[...slug].astro` | FR article detail page |
| `src/assets/images/articles/` | Article image directory |
| `notion/published.json` | Tracking manifest (initially empty `{"version":1,"entries":{}}`) |
| `.claude/commands/new-article.md` | Scaffold slash command |

## Files to Modify

| File | Change |
|------|--------|
| `src/content.config.ts` | Add `articles` collection + schema |
| `src/layouts/BaseLayout.astro` | Add `contentType` prop |
| `src/layouts/RecipeLayout.astro` | Pass `contentType="recipe"` to BaseLayout |
| `src/components/SEOHead.astro` | Fix hreflang to use `contentType` |
| `src/components/Navigation.astro` | Add "Articles" nav link |
| `src/components/LanguageToggle.astro` | Use `contentType` for path generation |
| `src/components/Footer.astro` | Add "Articles" link |
| `src/i18n/en.json` | Add article-related translation keys |
| `src/i18n/fr.json` | Add article-related translation keys (French) |
| `src/i18n/utils.ts` | Add `routeMap` entry + `getArticleLocalizedPath()` |
| `src/pages/en/rss.xml.ts` | Include articles in RSS feed |
| `src/pages/fr/rss.xml.ts` | Include articles in FR RSS feed |
| `src/pages/llms.txt.ts` | Include articles |
| `CLAUDE.md` | Document article schema, routes, conventions |
| `.claude/commands/seo-audit.md` | Add article variant |
| `.claude/commands/validate-recipes.md` | Extend for articles |

## Sources & References

### Origin

- **Brainstorm document:** [docs/brainstorms/2026-02-27-notion-to-blog-pipeline-brainstorm.md](docs/brainstorms/2026-02-27-notion-to-blog-pipeline-brainstorm.md) — Key decisions carried forward: articles first (no reviews), dedicated collection, `/en/articles/` URL structure, JSON manifest tracking, full EN+FR pairs with SEO rewrite, Article+FAQPage JSON-LD, main nav link.

### Internal References

- Content collection pattern: `src/content.config.ts:28-72`
- Recipe layout pattern: `src/layouts/RecipeLayout.astro:1-31`
- Recipe page routing: `src/pages/en/recipes/[...slug].astro:22-33`
- hreflang logic (needs fix): `src/components/SEOHead.astro:44-51`
- Route map: `src/i18n/utils.ts:54-79`
- Navigation links: `src/components/Navigation.astro:15-20`
- JSON-LD pattern: `src/components/RecipeSchema.astro`
- Institutional learnings: `docs/solutions/` (16 applicable lessons documented)

### Institutional Learnings Applied

- Strip locale prefix from IDs: `article.id.replace(/^(en|fr)\//, "")` (CLAUDE.md)
- Exact slug comparison with `===`, never `.includes()` (docs/solutions/performance-issues)
- JSON-LD `image` as array `[url]` (docs/solutions/performance-issues)
- Explicit priority array for ordering (docs/solutions/ui-bugs/category-tabs)
- Hero `max-h-[350px] object-cover` from day one (docs/solutions/ui-bugs/category-tabs)
- `/optimize-image` mandatory before commit (docs/solutions/performance-issues/oversized-hero)
- All ARIA labels via `t(locale, key)` (docs/solutions/ui-bugs/wcag-2-2-aa)
- Brand text color tokens only (docs/solutions/ui-bugs/wcag-2-2-aa)
- Caveat font needs `normal-case` override (docs/solutions/ui-bugs/typography)
