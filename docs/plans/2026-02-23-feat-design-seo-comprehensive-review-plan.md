---
title: "Design, Branding & SEO Comprehensive Review"
type: feat
status: active
date: 2026-02-23
---

# Design, Branding & SEO Comprehensive Review

## Overview

Multi-perspective audit of Date My Dish covering UX, UI/branding, and SEO. Conducted by a 5-agent team: UX auditor, UI designer, SEO expert, devil's advocate, and planner. The goal: identify what actually moves the needle for a 9-recipe bilingual recipe blog vs. what's premature optimization.

**Key insight from the devil's advocate:** The single most important thing the site can do is **publish more recipes**. 30 recipes with mediocre SEO will outperform 9 recipes with perfect SEO. The recommendations below are prioritized with that reality in mind.

## Current State Summary

**What works well:**
- Recipe JSON-LD is thorough (name, image, ingredients, instructions, times, yield, nutrition, FAQs)
- Hreflang in HTML `<head>` is correctly implemented with bidirectional EN/FR links
- `robots.txt` is well-configured (AI crawlers allowed, search pages blocked)
- Old WordPress redirects are proper 301s
- Pagefind search integration is smart (client-side, static, no server needed)
- Content quality is strong (800-1500 word prose, internal linking, keywords in headings)
- Interactive ingredient checkboxes, print-friendly recipe layout, "Jump to Recipe" button
- `llms.txt` endpoint for AI discoverability
- Astro `<Picture>` with AVIF/WebP on hero and MDX body images

**What needs fixing (confirmed by all reviewers):**
- Google Fonts loaded via render-blocking CSS `@import` -- kills Core Web Vitals
- Sitemap has broken/inconsistent hreflang annotations
- No 404 page
- Recipe JSON-LD image is a single string instead of recommended array
- Step images bypass Astro optimization (plain `<img>` tags)
- Homepage hero has no food photography -- just text on a gradient
- The visual design does not reinforce the "date night" brand angle
- Empty Cloudflare analytics token (loading script for nothing)

## Findings by Perspective

### UX Audit (26 recommendations)

**Top findings:**
1. **No locale filtering on Pagefind search** -- French users may see English results (`SearchBar.astro` doesn't pass `filters: { lang: locale }` to PagefindUI)
2. **No active states** on nav links or category filter tabs -- users lose context of current page
3. **Step images have empty `alt=""`** -- accessibility violation and missed image SEO
4. **No skip-to-content link** -- accessibility gap
5. **Mobile menu lacks close affordance** -- hamburger doesn't visually change to X on open
6. **"Date night" brand gap** -- nothing in the UX differentiates this from a generic recipe blog beyond the name; no occasion tags, no "impress factor," no date night tips
7. **Recipe cards show prep time but not total time** -- total time matters more for date planning
8. **No share button** -- users can't easily text a recipe link to their date
9. **Print button buried below recipe card** -- should be near Jump to Recipe
10. **`RelatedRecipes.astro:21`** uses `.includes()` for slug matching -- substring false-match bug

### UI & Branding Review

**Top findings:**
1. **Color palette** (`#1863DC` blue + `#5A822B` green) reads corporate/utilitarian, not romantic/food
   - Proposed alternative: Burgundy `#722F37` + Warm Gold `#D4A853` + Cream `#FDF6EC`
2. **4 fonts is too many** -- Fira Sans Condensed (body) is a condensed UI font, not a reading font; Raleway (UI) overlaps with Fira Sans
   - Proposed: Playfair Display (headings) + Lora or Source Sans 3 (body) + Caveat (logo)
3. **Text-only logo** in Caveat is forgettable -- no visual mark for favicon, social avatar, Pinterest watermark
4. **Hero image 350px cap** is too restrictive for a food blog where photography should dominate
5. **Homepage lacks visual storytelling** -- text gradient hero with no food imagery
6. **Step number circles and CTAs use cold blue/green** -- disconnected from food/romance mood
7. **Top food blogs in 2025-2026** use: warm palettes, dominant photography, 2-3 fonts max, strong logomarks, full-width hero images

### SEO Audit (22 issues found)

**Critical:**
1. **Google Fonts render-blocking `@import`** (`src/styles/global.css:1`) -- browser can't paint text until all 4 font families download. Directly harms LCP/FCP. Fix: self-host fonts as WOFF2 or switch to `<link rel="preload">`
2. **Sitemap hreflang broken** (`dist/sitemap-0.xml`) -- root URL has duplicate EN hreflang, most recipe URLs have NO hreflang, about/recipes listing pages missing alternates, noindex search pages included
3. **No 404 page** -- generic Cloudflare error on broken URLs

**High:**
4. Recipe JSON-LD `image` should be array of 3 aspect ratios (16:9, 4:3, 1:1) -- `RecipeSchema.astro:114`
5. Missing WebSite schema with SearchAction (sitelinks searchbox)
6. Missing Organization/Person schema (E-E-A-T signals)
7. Step images use plain `<img>` bypassing optimization -- `RecipeContent.astro:125-131`
8. Root redirect is 302 not 301 -- `public/_redirects:7` (though devil's advocate notes 302 may be correct for language detection)
9. No RSS/Atom feed

**Medium:**
10. No `twitter:site`/`twitter:creator` meta tags
11. No Google Search Console verification meta tag
12. Empty Cloudflare analytics token (wasted script load)
13. FR category URLs use English slugs (`/fr/recettes/categorie/appetizer/`)
14. Missing ItemList schema on listing/category pages
15. `description` schema hard-capped at 160 chars (fine for meta, limiting for JSON-LD)

### Devil's Advocate Critique

**Key pushback:**

1. **Don't rebrand yet.** Nobody recognizes this brand. Changing colors at 9 recipes vs. 30 recipes costs the same effort. Time is better spent publishing recipes. The burgundy/gold suggestion is also a cliche ("romantic = burgundy" is the most predictable choice and pigeonholes the brand).

2. **"Date night" features are premature.** Impress Factor ratings, occasion-based categories, meal planner, Date Night Tips component -- this is building product features for 9 recipes. Users can see all recipes on one screen. Let the editorial voice carry the theme; don't build features around it.

3. **Many SEO items are checklist completionism.** RSS, WebSite schema, Organization schema, ItemList, aggregateRating, twitter:site -- none will be the reason a 9-recipe blog does or doesn't rank. Content volume matters more.

4. **Contradiction found:** UX says hero is too tall on mobile (350px). UI says it's too short for desktop. Both are right for their context -- use responsive sizing.

5. **Another contradiction:** UI proposes cream backgrounds (`#FDF6EC`), but UX flags gray-400/gray-500 as contrast problems. Cream backgrounds would make contrast issues worse.

6. **The "date" brand is a modest advantage now** but could become limiting. Brussels sprouts salad and zucchini-eggplant chips already stretch the concept. Don't build elaborate systems around it.

7. **Scope reality check:** The three auditors collectively proposed 3-6 months of work for a blog with 9 recipes.

## Prioritized Action Plan

### Phase 1: Quick Wins (Ship This Week)
*High impact, low effort. Do these before writing another recipe.*

| # | Change | Files | Effort | Impact |
|---|--------|-------|--------|--------|
| 1 | **Fix Google Fonts loading** -- self-host as WOFF2 or switch `@import` to `<link rel="preload">` in BaseLayout | `src/styles/global.css`, `src/layouts/BaseLayout.astro` | 1 hr | Critical CWV fix |
| 2 | **Create 404 page** with navigation, search link, popular recipes | New: `src/pages/404.astro` | 30 min | Basic site hygiene |
| 3 | **Fix Recipe JSON-LD image** to array of 3 aspect ratios | `src/components/RecipeSchema.astro:114` | 30 min | Rich result eligibility |
| 4 | **Remove or configure Cloudflare analytics** -- empty token = wasted script | `src/layouts/BaseLayout.astro:67` | 5 min | Remove dead weight |
| 5 | **Add descriptive alt text to step images** | Recipe MDX frontmatter + `src/components/RecipeContent.astro` | 1 hr | Accessibility + image SEO |
| 6 | **Add skip-to-content link** | `src/layouts/BaseLayout.astro` | 15 min | Accessibility compliance |
| 7 | **Fix `RelatedRecipes` slug matching** -- use exact match instead of `.includes()` | `src/components/RelatedRecipes.astro:21` | 15 min | Bug fix |
| 8 | **Show total time on recipe cards** (not just prep time) | `src/components/RecipeCard.astro` | 15 min | Better date-night planning UX |
| 9 | **Add Google Search Console verification** meta tag | `src/layouts/BaseLayout.astro` | 5 min | Enable GSC data |

**Estimated total: ~4 hours**

### Phase 2: Medium Effort (Ship Within 2-4 Weeks)
*Meaningful improvements that require more thought.*

| # | Change | Files | Effort | Impact |
|---|--------|-------|--------|--------|
| 10 | **Fix sitemap hreflang** -- configure Astro sitemap integration to exclude noindex pages, add proper bidirectional hreflang for all page pairs, remove root `/` from sitemap | `astro.config.ts` (sitemap config) | 2-3 hrs | Fix indexing/duplicate content |
| 11 | **Add food photography to homepage hero** -- replace the text-on-gradient with an actual dish photo | `src/pages/en/index.astro`, `src/pages/fr/index.astro`, new hero image | 2 hrs | Transform first impression |
| 12 | **Optimize step images** -- either convert to Astro `<Picture>` imports or ensure frontmatter URL images are pre-optimized | `src/components/RecipeContent.astro`, recipe frontmatter | 3-4 hrs | Performance + image SEO |
| 13 | **Add active states** to nav links and category filter tabs | `src/components/Navigation.astro`, category page files | 1 hr | Navigation context |
| 14 | **Improve mobile menu** -- add X close icon on `peer-checked`, consider backdrop overlay | `src/components/Navigation.astro` | 1-2 hrs | Mobile UX |
| 15 | **Add WebSite + Organization JSON-LD** to homepage, enrich Recipe author with URL and sameAs | `src/components/SEOHead.astro` or new component, `src/components/RecipeSchema.astro` | 1-2 hrs | E-E-A-T signals |
| 16 | **Add RSS feed** (EN + FR) using `@astrojs/rss` | New: RSS route files, `astro.config.ts` | 1-2 hrs | Content discovery |
| 17 | **Move print button** next to Jump to Recipe CTA | Recipe detail pages | 15 min | Discoverability |
| 18 | **Responsive hero image height** -- `max-h-[250px] sm:max-h-[400px] lg:max-h-[500px]` | Recipe detail pages | 15 min | Better mobile + desktop balance |

**Estimated total: ~15 hours**

### Phase 3: Larger Initiatives (At 25-30 Recipes)
*Revisit these when there's an audience and content volume to justify them.*

| # | Change | Why Wait |
|---|--------|----------|
| 19 | **Brand palette refresh** -- explore warmer tones (not necessarily burgundy; test options) | Need audience data on current brand recognition; premature without traffic analytics |
| 20 | **Font system refinement** -- consider reducing to 3 fonts, test readability of alternatives | Tied to rebrand; current fonts work, font loading fix in Phase 1 addresses performance |
| 21 | **Design a logomark** (fork+heart, plate+heart, or stylized DMD) | Needs design investment; text logo is fine while building audience |
| 22 | **Translate FR category slugs** (`/fr/recettes/categorie/entree/` instead of `appetizer`) | Requires URL redirects and careful routing changes; low traffic to these pages currently |
| 23 | **Add Pagefind locale filtering** | With 9 recipes per locale, false matches are unlikely; becomes important at 50+ |
| 24 | **"Date night" UX features** -- occasion tags, Impress Factor, wine/meal pairing suggestions | Content-editorial features, not structural; only useful with a large enough recipe catalog |
| 25 | **Add ItemList schema** to listing/category pages | More impactful with larger catalog |
| 26 | **Explore dark mode** | Emerging trend for evening browsing; tied to future design system work |
| 27 | **Share button / copy link** | Nice-to-have, add when analytics show sharing behavior |

### Explicitly NOT Recommended

| Suggestion | Why Skip |
|------------|----------|
| aggregateRating in Recipe schema | Requires a real rating system; no fake ratings |
| Video in recipe schema | No videos exist; note the absence, don't build infrastructure for it |
| "Plan a Date Night Menu" feature | 3x3x3 = 27 combos; a simple blog post suggesting pairings achieves the same thing |
| Full design system documentation | One-person blog; Tailwind config is the design system |
| IndexNow integration | Tiny site, infrequent publishes; Google indexes it fine through sitemap |
| Content-Security-Policy header | Not an SEO concern; address when security becomes a priority |

## Success Metrics

- **Core Web Vitals**: LCP < 2.5s, FCP < 1.8s (measure via PageSpeed Insights before/after Phase 1)
- **Google Search Console**: Zero hreflang errors after Phase 2 sitemap fix
- **Rich Results Test**: All recipes pass Google Rich Results Test with image array
- **Indexing**: All 18 recipe pages indexed within 2 weeks of sitemap fix
- **Content milestone**: Reach 25 recipes before starting Phase 3

## Sources & References

### Internal References
- SEO Head: `src/components/SEOHead.astro`
- Recipe Schema: `src/components/RecipeSchema.astro`
- Recipe Content: `src/components/RecipeContent.astro`
- Navigation: `src/components/Navigation.astro`
- Base Layout: `src/layouts/BaseLayout.astro`
- Global CSS: `src/styles/global.css`
- Tailwind Config: `tailwind.config.mjs`
- Sitemap Output: `dist/sitemap-0.xml`
- Redirects: `public/_redirects`
- Robots: `public/robots.txt`
- i18n Utils: `src/i18n/utils.ts`
- Related Recipes: `src/components/RelatedRecipes.astro`

### Documented Solutions Applied
- `docs/solutions/performance-issues/oversized-hero-images-optimization.md`
- `docs/solutions/ui-bugs/category-tabs-ordering-and-image-height-constraints.md`
- `docs/solutions/build-errors/cloudflare-pages-absolute-url-redirects.md`
- `docs/plans/2026-02-23-feat-recipe-image-seo-and-skills-update-plan.md`
