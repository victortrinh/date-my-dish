---
title: "Comprehensive SEO, performance, and accessibility audit with implementation"
date: 2026-02-23
problem_type: multi-phase-audit
severity: medium
components:
  - BaseLayout
  - RecipeSchema
  - RecipeContent
  - RecipeCard
  - RelatedRecipes
  - Navigation
  - SearchBar
  - global.css
  - astro.config.ts
  - homepage pages
  - category pages
  - recipe detail pages
tags:
  - SEO
  - accessibility
  - performance
  - Core-Web-Vitals
  - JSON-LD
  - i18n
  - Astro
  - responsive-design
related_files:
  - src/styles/global.css
  - src/layouts/BaseLayout.astro
  - src/components/RecipeSchema.astro
  - src/components/RecipeContent.astro
  - src/components/RecipeCard.astro
  - src/components/RelatedRecipes.astro
  - src/components/Navigation.astro
  - src/components/SearchBar.astro
  - src/pages/404.astro
  - src/pages/en/index.astro
  - src/pages/fr/index.astro
  - src/pages/en/rss.xml.ts
  - src/pages/fr/rss.xml.ts
  - src/pages/en/recipes/[...slug].astro
  - src/pages/fr/recettes/[...slug].astro
  - src/pages/en/recipes/category/[category].astro
  - src/pages/fr/recettes/categorie/[category].astro
  - src/pages/en/recipes/index.astro
  - src/pages/fr/recettes/index.astro
  - astro.config.ts
---

# Comprehensive SEO, Performance, and Accessibility Audit

## Problem

Multiple SEO, performance, accessibility, and UX issues accumulated through incremental development of a bilingual (EN/FR) Astro 5 recipe blog without periodic audits.

## Symptoms

### Critical (Performance/SEO)
1. **Google Fonts loaded via render-blocking CSS `@import`** in `global.css:1` -- browser cannot paint text until all 4 font families download, directly harming LCP and FCP
2. **Sitemap included noindex search pages** and root URL with duplicate hreflang entries -- contradictory signals to crawlers
3. **No 404 page** -- broken URLs showed generic Cloudflare error

### High (SEO/Accessibility)
4. **Recipe JSON-LD `image` was a single string** instead of recommended array (`RecipeSchema.astro:114`) -- reduced rich result eligibility
5. **Step images had empty `alt=""`** in `RecipeContent.astro:127` -- accessibility violation and missed image SEO
6. **No skip-to-content link** -- accessibility gap for keyboard/screen reader users
7. **Empty Cloudflare analytics script** in `BaseLayout.astro:67` -- token was `""`, loading script for nothing
8. **No WebSite or Organization JSON-LD** -- missing sitelinks searchbox and E-E-A-T signals
9. **No RSS feeds** -- fewer content discovery vectors

### Medium (UX)
10. **No active states on nav links or category tabs** -- users lost context of current page
11. **Mobile menu had no close affordance** -- hamburger icon didn't change to X when open
12. **`RelatedRecipes` used `.includes()` for slug matching** (`RelatedRecipes.astro:20`) -- substring false-match bug
13. **Recipe cards showed prep time, not total time** -- total time matters more for date-night planning
14. **Print button buried below recipe card** -- poor discoverability
15. **Hero image had fixed `max-h-[350px]`** -- too tall on mobile, too short on desktop
16. **Homepage hero was text-only gradient** -- no food photography
17. **Pagefind search didn't filter by locale** -- French users could see English results
18. **Recipe author schema had no URL** -- weaker E-E-A-T signal

## Root Cause

Incremental development without systematic SEO/UX/accessibility audits. Technical debt accumulated across font loading strategy, structured data completeness, navigation patterns, accessibility compliance, and content presentation.

## Investigation

Used a 5-agent team approach for parallel research:
1. **UX Auditor** -- analyzed navigation flow, user journey, mobile experience, accessibility, and "date night" brand alignment (26 recommendations)
2. **UI Designer** -- reviewed color palette, typography, component design, layout, and branding against food blog trends (major rebrand proposed)
3. **SEO Expert** -- deep technical audit of structured data, sitemaps, Core Web Vitals, multilingual SEO, and recipe-specific SEO (22 issues found)
4. **Devil's Advocate** -- challenged all findings for feasibility and prioritization at 9-recipe scale
5. **Planner** -- consolidated into phased action plan

The devil's advocate was critical: filtered out premature feature creep (Impress Factor ratings, meal planner, occasion tags) and deferred the full rebrand until 25-30 recipes exist. Key insight: "30 recipes with mediocre SEO will outperform 9 recipes with perfect SEO."

Full audit plan: `docs/plans/2026-02-23-feat-design-seo-comprehensive-review-plan.md`

## Solution

### 1. Fix render-blocking Google Fonts

Removed CSS `@import` and added `<link>` tags in `<head>`:

```css
/* BEFORE: global.css line 1 -- RENDER BLOCKING */
@import url("https://fonts.googleapis.com/css2?family=Bitter:wght@400;600;700&...");
```

```html
<!-- AFTER: BaseLayout.astro <head> -- NON-BLOCKING -->
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Bitter:wght@400;600;700&family=Caveat:wght@400;700&family=Fira+Sans+Condensed:wght@300;400;500;600&family=Raleway:wght@400;500;600;700&display=swap" rel="stylesheet" />
```

### 2. Fix Recipe JSON-LD image to array

```typescript
// BEFORE: RecipeSchema.astro:114
image: heroImageUrl.startsWith("http") ? heroImageUrl : `${siteUrl}${heroImageUrl}`,

// AFTER: Wrapped in array per Google recommendation
image: [heroImageUrl.startsWith("http") ? heroImageUrl : `${siteUrl}${heroImageUrl}`],
```

### 3. Fix RelatedRecipes slug matching

```typescript
// BEFORE: RelatedRecipes.astro:20 -- substring match bug
if (recipe.id.includes(currentSlug)) return false;

// AFTER: Exact slug comparison
const recipeSlug = recipe.id.replace(/^(en|fr)\//, "");
if (recipeSlug === currentSlug) return false;
```

### 4. Add step image alt text

```html
<!-- BEFORE: RecipeContent.astro:127 -->
<img src={step.image} alt="" ... />

<!-- AFTER: Uses step instruction text -->
<img src={step.image} alt={`${t(locale, "recipe.instructions")} ${i + 1}: ${step.text.slice(0, 120)}`} ... />
```

### 5. Navigation active states + mobile menu X icon

```typescript
// Navigation.astro: Added isActive() function
function isActive(linkPath: string): boolean {
  const fullPath = getLocalizedPath(locale, linkPath);
  if (linkPath === "/") return currentPath === fullPath;
  return currentPath.startsWith(fullPath);
}
```

```html
<!-- Desktop nav links with active state -->
<a href={...} class:list={[
  "font-ui text-sm font-medium no-underline",
  isActive(link.path) ? "text-brand-blue" : "text-gray-600 hover:text-brand-blue",
]} aria-current={isActive(link.path) ? "page" : undefined}>
```

Mobile menu icon swap via CSS (peer-checked can't target descendant elements):
```css
#mobile-menu-toggle:checked ~ label .hamburger-icon { display: none; }
#mobile-menu-toggle:checked ~ label .close-icon { display: block; }
```

### 6. Pagefind locale filtering

```javascript
// SearchBar.astro: Added filters to PagefindUI config
new window.PagefindUI({
  element: '#pagefind-container',
  showSubResults: true,
  filters: { lang: locale },  // <-- Added
  translations: { ... },
});
```

### 7. Responsive hero image height

```html
<!-- BEFORE: Fixed height on all screens -->
<Picture ... class="w-full max-h-[350px] object-cover" />

<!-- AFTER: Responsive breakpoints -->
<Picture ... class="w-full max-h-[250px] object-cover sm:max-h-[350px] lg:max-h-[450px]" />
```

### 8. Other changes (summary)

| Change | File(s) |
|--------|---------|
| Created bilingual 404 page | New: `src/pages/404.astro` |
| Removed empty Cloudflare analytics | `BaseLayout.astro` (removed script with empty token) |
| Added skip-to-content link | `BaseLayout.astro` (sr-only, visible on focus, bilingual) |
| Added `id="main-content"` to `<main>` | `BaseLayout.astro` |
| Show total time on recipe cards | `RecipeCard.astro` (new optional `totalTime` prop) + all 7 usages |
| Sitemap excludes search pages + root | `astro.config.ts` (added `filter` function) |
| Category filter tabs on category pages | EN + FR `[category].astro` (with active state) |
| WebSite + Organization JSON-LD | EN + FR `index.astro` (with SearchAction) |
| RSS feeds (EN + FR) | New: `src/pages/{en,fr}/rss.xml.ts` using `@astrojs/rss` |
| Print button next to Jump to Recipe | EN + FR `[...slug].astro` (moved from below recipe card) |
| Enriched Recipe author with URL | `RecipeSchema.astro` (locale-aware about page link) |
| RSS `<link>` tags in head | `BaseLayout.astro` |
| Homepage hero food photo | EN + FR `index.astro` (full-width `<Picture>` with gradient overlay) |

## Verification

- `npm run check` -- 0 errors, 0 warnings
- `npm run build` -- clean build, sitemap generated without search pages
- Pagefind indexes 18 pages across 2 languages
- Homepage hero image optimized by Astro: AVIF 9-19KB, WebP 20-52KB
- Dev server confirms all visual changes render correctly

## Prevention

### Periodic Audit Checklist

**Monthly (5 min):**
- [ ] Check Google Search Console for crawl errors
- [ ] Verify Core Web Vitals passing

**Quarterly (30 min):**
- [ ] Run Lighthouse audit on homepage + a recipe page
- [ ] Validate JSON-LD with Google Rich Results Test
- [ ] Test accessibility with axe DevTools
- [ ] Test locale switching and search filtering
- [ ] Verify mobile menu functionality

### Build-Time Catches

- Never use CSS `@import` for external resources -- always `<link>` in `<head>`
- Always wrap JSON-LD `image` in an array for Recipe schema
- Use exact slug comparison (`===`), never `.includes()` for filtering
- Every `<img>` must have descriptive alt text (not empty `alt=""`)
- Active navigation states should use `aria-current="page"`
- Sitemap filter should exclude all `noindex` pages

### Key Pattern: CSS-Only Icon Swap

When using CSS-only checkbox toggle patterns, `peer-checked:` only works on **siblings** of the peer element. For targeting elements **inside** a sibling (like SVGs inside a label), use a `<style>` block with `#checkbox:checked ~ label .icon` selector instead.

## Related Documentation

- `docs/solutions/performance-issues/oversized-hero-images-optimization.md` -- Image sizing guidelines and compression strategies
- `docs/solutions/ui-bugs/category-tabs-ordering-and-image-height-constraints.md` -- Category tab ordering pattern and image height constraints
- `docs/solutions/build-errors/cloudflare-pages-absolute-url-redirects.md` -- Cloudflare Pages redirect constraints
- `docs/plans/2026-02-23-feat-design-seo-comprehensive-review-plan.md` -- Full audit plan with all agent findings
- `docs/plans/2026-02-23-feat-recipe-image-seo-and-skills-update-plan.md` -- Step image SEO strategy
