# Date My Dish: Full SEO Audit

**Domain:** datemydish.com | **Date:** April 13, 2026 | **Audit Type:** Full Site Audit

---

## Executive Summary

Date My Dish has an exceptionally strong technical SEO foundation. The codebase implements comprehensive JSON-LD structured data (Recipe, BlogPosting, Review, FAQPage, BreadcrumbList, WebSite, Organization), proper bilingual hreflang support, responsive image optimization with AVIF/WebP, and solid security headers. Content quality is high across all 31 English content pieces, with well-structured prose, strong internal linking, and complete frontmatter.

**Biggest strength:** The structured data implementation is best-in-class for a recipe blog, with every recipe, article, and review fully marked up with schema.org types, FAQPage schema, and proper BreadcrumbList navigation.

**Top 3 priorities that will have the most impact:**

1. **Indexation and discoverability**: The site does not appear in Google search results for branded queries ("date my dish" or "datemydish.com"), and only some pages are indexed. Submitting the sitemap in Google Search Console and requesting indexing for key pages is the single highest-impact action.
2. **Content volume and keyword targeting**: With 18 EN recipes, 11 articles, and 2 reviews, the site needs more content targeting high-volume recipe keywords (meatloaf, pancakes, chicken recipes) and "date night dinner" long-tail variations to compete.
3. **Fix meta description gaps and homepage sitemap exclusion**: A few pages have descriptions below the 120-character minimum, and the homepage is explicitly excluded from the sitemap.

**Overall assessment:** Strong foundation with excellent technical execution. The primary bottleneck is indexation and content volume, not technical quality.

---

## Keyword Opportunity Table

Based on the site's existing content, niche positioning ("date night cooking for couples"), and competitor keyword analysis, here are the top opportunities sorted by estimated opportunity score.

| Keyword | Est. Difficulty | Opportunity | Current Ranking | Intent | Recommended Content |
|---------|----------------|-------------|-----------------|--------|---------------------|
| date night dinner ideas | Hard | High | Not ranking | Commercial | Roundup/pillar page |
| date night recipes | Hard | High | Not ranking | Commercial | Roundup/pillar page |
| romantic dinner recipes | Hard | High | Not ranking | Commercial | Roundup/pillar page |
| cooking for two | Medium | High | Not ranking | Informational | Guide article |
| easy date night meals | Medium | High | Not ranking | Commercial | Roundup page |
| cacio e pepe recipe | Hard | Medium | Unknown | Transactional | Existing recipe (optimize) |
| penne alla vodka recipe | Hard | Medium | Unknown | Transactional | Existing recipe (optimize) |
| beef ragu pappardelle | Easy | High | Unknown | Transactional | Existing recipe (optimize) |
| miso udon carbonara | Easy | High | Unknown | Transactional | Existing recipe (unique!) |
| lamb meatballs gochujang | Easy | High | Unknown | Transactional | Existing recipe (unique!) |
| quinoa crusted salmon recipe | Easy | High | Unknown | Transactional | Existing recipe (optimize) |
| cauliflower steak romesco | Easy | High | Unknown | Transactional | Existing recipe (optimize) |
| lemon posset recipe | Medium | High | Unknown | Transactional | Existing recipe (optimize) |
| pork osso buco recipe | Easy | High | Unknown | Transactional | Existing recipe (optimize) |
| northern thai beef tartare | Easy | High | Unknown | Transactional | Existing recipe (unique!) |
| chocolate tofu pudding | Easy | High | Unknown | Transactional | Existing recipe (unique!) |
| date night dinner for two | Medium | High | Not ranking | Commercial | New recipe roundup |
| anniversary dinner recipes | Medium | High | Not ranking | Commercial | New themed roundup |
| impressive dinner recipes | Medium | Medium | Not ranking | Commercial | New roundup page |
| romantic pasta recipes | Medium | Medium | Not ranking | Commercial | New themed roundup |
| dinner party recipes for couples | Low | Medium | Not ranking | Commercial | New guide article |
| valentines day dinner ideas | Hard (seasonal) | Medium | Not ranking | Commercial | Seasonal roundup |
| sous vide date night | Easy | Medium | Unknown | Informational | Existing article (optimize) |
| how to cook steak for date night | Easy | Medium | Unknown | Informational | Existing article (optimize) |
| best cooking oils guide | Medium | Low | Unknown | Informational | Existing article (optimize) |

**Key insight:** The site has several recipes with very low competition keywords (miso udon carbonara, northern thai beef tartare, lamb meatballs gochujang, chocolate tofu pudding) that are genuinely unique. These are the fastest path to ranking because few competitors target them.

---

## On-Page Issues Table

| Page | Issue | Severity | Recommended Fix |
|------|-------|----------|-----------------|
| 3-day-aged-miso-duck-breast.mdx | Description only 84 chars (target 120-160) | High | Expand to 120+ chars with more keyword-rich detail |
| why-not-wash-chicken.mdx | Description only 106 chars | Medium | Add 14+ characters to reach 120 minimum |
| wok-hei-at-home.mdx | Description only 116 chars | Medium | Expand slightly to 120+ |
| zucchini-eggplant-chips.mdx | Description 118 chars (borderline) | Low | Expand to 125+ for safety margin |
| Homepage (sitemap) | Homepage URL excluded from sitemap | High | Remove the `page !== "https://datemydish.com/"` filter in astro.config.ts |
| Root redirect | Uses 302 instead of 301 for / to /en/ | Medium | Change to 301 permanent redirect in _redirects |
| EN/FR recipe parity | 18 EN recipes but only 12 FR translations visible | Medium | Complete missing FR translations (chocolate-tofu-pudding, gochujang-kimchi-seafood-bucatini, northern-thai-beef-tartare, miso-udon-carbonara, lamb-meatballs-gochujang, penne-alla-vodka) |

**Strengths (no issues found):**

- All 31 content pieces have proper title tags under 46 characters
- All recipes include complete nutrition data
- All content has FAQs (3-7 per piece)
- All content has keywords, tags, and occasion arrays
- All heroImageAlt text is descriptive (50-130 chars)
- Body content consistently hits 1,400-2,100+ words (exceeds 800-1500 target)
- H2 heading counts are 5-8 per page (ideal range)
- Internal linking present in all sampled content
- Step images used effectively in recipes

---

## Content Gap Recommendations

| Topic/Keyword | Why It Matters | Format | Priority | Effort |
|---------------|---------------|--------|----------|--------|
| "Date Night Recipes" pillar page | Highest-volume keyword in the niche; competitors (Foolproof Living, Feel Good Foodie) all have dedicated roundup pages ranking for this | Roundup/pillar page linking to existing recipes | High | Moderate (half day) |
| "Cooking for Two" guide | High search volume informational keyword; natural fit for brand positioning | Long-form guide article | High | Moderate |
| "Easy Romantic Pasta Recipes" | Pasta is the site's strongest category (cacio e pepe, penne alla vodka, miso udon carbonara, bucatini); a roundup would capture cluster traffic | Roundup page | High | Quick win (2 hours) |
| Valentine's Day / Anniversary dinner ideas | Seasonal spikes in search volume; competitors dominate these terms | Seasonal roundup page | Medium | Moderate |
| Chicken-based date night recipes | "Food recipes with chicken" is the #1 recipe keyword (6.1M monthly searches); no chicken recipes on the site | New recipe(s) | High | Substantial |
| Steak recipe (individual) | Site has steak guides/articles but no actual steak recipe | New recipe | High | Moderate |
| Breakfast/brunch for two | No breakfast category content; brunch is a growing date-occasion search | New recipe(s) | Medium | Moderate |
| Cocktail/drink recipes | Only drink category is empty; "date night cocktails" is a natural extension | New recipe(s) | Medium | Moderate |
| Comparison pages ("X vs Y") | Competitors use comparison content (cast iron vs stainless, fresh vs dried pasta); missing entirely from site | Guide articles | Low | Quick win |
| Meal planning for couples | Long-tail informational content with commercial intent | Guide article | Low | Moderate |

---

## Technical SEO Checklist

| Check | Status | Details |
|-------|--------|---------|
| HTTPS | Pass | Cloudflare Pages with automatic HTTPS |
| Sitemap | Warning | Sitemap exists at /sitemap-index.xml, but homepage is excluded by filter |
| robots.txt | Pass | Correctly allows all crawlers, disallows search pages, references sitemap |
| AI bot access | Pass | Explicitly allows GPTBot, ClaudeBot, PerplexityBot, Google-Extended |
| Canonical URLs | Pass | Properly generated in SEOHead.astro with trailing slashes |
| Hreflang tags | Pass | Bidirectional EN/FR with x-default pointing to EN |
| Structured data (Recipe) | Pass | Comprehensive JSON-LD with ingredients, instructions, HowToStep, nutrition, FAQ |
| Structured data (Article) | Pass | BlogPosting with author, publisher, dates, FAQ |
| Structured data (Review) | Pass | Review + Restaurant with address, cuisine, priceRange, rating |
| Structured data (Breadcrumbs) | Pass | BreadcrumbList on all content pages |
| Structured data (WebSite) | Pass | Homepage with SearchAction and Organization |
| Open Graph tags | Pass | Complete OG tags with locale support (en_US, fr_CA) |
| Twitter Cards | Pass | summary_large_image with proper meta tags |
| Image optimization | Pass | Astro Picture component with AVIF/WebP, responsive widths, lazy loading |
| Image loading strategy | Pass | Hero images eager with fetchpriority="high"; rest lazy |
| Security headers | Pass | X-Content-Type-Options, X-Frame-Options, X-XSS-Protection, Referrer-Policy |
| Cache control | Pass | 1yr immutable for hashed assets, 24h Pagefind, 7d images |
| RSS feeds | Pass | Dual-language feeds with proper discovery links |
| 404 page | Pass | Custom page with noindex meta tag |
| Search pages | Pass | noindex properly set on /en/search/ and /fr/recherche/ |
| Mobile responsive | Pass | Viewport meta tag, Tailwind responsive classes throughout |
| Skip-to-content | Pass | Accessibility skip link on every page |
| Dark mode | Pass | Class-based Tailwind dark mode with localStorage persistence |
| Reduced motion | Pass | prefers-reduced-motion: reduce disables animations |
| Print stylesheet | Pass | Full print CSS with single-column forcing |
| WordPress redirects | Pass | 301 redirects for all legacy WordPress URLs |
| Redirect chains | Pass | No chains detected in _redirects |
| Google indexation | Fail | Site not appearing for branded queries; only partial indexing confirmed |
| llms.txt | Warning | Referenced in CLAUDE.md but not verified in public/ |

---

## Competitor Comparison Summary

Based on the "date night recipe" niche, the top 3 organic competitors are Foolproof Living, Feel Good Foodie, and Plays Well With Butter.

| Dimension | Date My Dish | Foolproof Living | Feel Good Foodie | Winner |
|-----------|-------------|-----------------|-----------------|--------|
| Recipe count | ~18 EN | 200+ | 500+ | Competitors |
| Content depth (words/recipe) | 1,400-2,100 | 800-1,200 | 600-1,000 | Date My Dish |
| Publishing frequency | Weekly (automated) | 2-3x/week | 3-5x/week | Competitors |
| Structured data quality | Excellent (Recipe + FAQ + Breadcrumbs) | Good (Recipe only) | Good (Recipe + FAQ) | Date My Dish |
| Bilingual content | Full EN/FR | English only | English only | Date My Dish |
| Social following | Early stage | Established | 9.5M+ followers | Competitors |
| Date night focus | 100% niche | Partial (one roundup) | Partial (one roundup) | Date My Dish |
| Technical SEO | Excellent | Good | Good | Date My Dish |
| Domain authority | Very low (new site) | Established | High | Competitors |
| SERP feature presence | None visible | Featured snippets | Featured snippets, PAA | Competitors |

**Key competitive advantages for Date My Dish:**

1. The niche focus on "date night cooking" is unique; competitors only touch this as one category among many
2. Content depth per recipe far exceeds competitors (1,400-2,100 words vs 600-1,200)
3. Bilingual EN/FR content opens the Quebec French market with virtually zero competition
4. Structured data implementation is more comprehensive than any competitor analyzed
5. Unique fusion recipes (miso udon carbonara, gochujang lamb meatballs, northern thai beef tartare) have almost no keyword competition

---

## Prioritized Action Plan

### Quick Wins (do this week)

1. **Submit sitemap to Google Search Console and request indexing** for all key pages. This is the #1 blocker. If GSC is already set up, check the Coverage report for crawl errors.
   - Expected impact: High
   - Effort: 30 minutes

2. **Fix homepage sitemap exclusion.** Remove `page !== "https://datemydish.com/"` from the sitemap filter in astro.config.ts.
   - Expected impact: High
   - Effort: 5 minutes

3. **Fix short meta descriptions** on 3-day-aged-miso-duck-breast (84 chars), why-not-wash-chicken (106 chars), wok-hei-at-home (116 chars), and zucchini-eggplant-chips (118 chars). Expand all to 120-160 characters.
   - Expected impact: Medium
   - Effort: 30 minutes

4. **Change root redirect from 302 to 301** in public/_redirects (/ to /en/).
   - Expected impact: Medium
   - Effort: 5 minutes

5. **Create a "Date Night Recipes" roundup page** linking to all existing recipes with a brief intro for each. Target the highest-volume keyword in the niche.
   - Expected impact: High
   - Effort: 2 hours

### Strategic Investments (plan for this quarter)

6. **Publish 2-3 chicken-based recipes.** Chicken is the #1 searched recipe ingredient (6.1M monthly searches), and the site has zero chicken recipes. Consider: chicken piccata for two, herb-crusted chicken breast, or Thai basil chicken.
   - Expected impact: High
   - Effort: 1-2 weeks (recipe development + photography + prose)

7. **Create a "Cooking for Two" pillar page** with links to recipes, portion-scaling tips, and equipment recommendations. This captures a high-volume informational keyword and strengthens the site's topical authority.
   - Expected impact: High
   - Effort: 1 week

8. **Complete missing FR recipe translations.** Six EN recipes appear to lack FR counterparts. Completing these strengthens the bilingual competitive advantage and doubles the indexable pages.
   - Expected impact: Medium
   - Effort: 1 week (can use /translate-recipe workflow)

9. **Build a backlink strategy.** As a new site, domain authority is the biggest gap vs competitors. Consider: guest posts on food blogs, recipe submissions to roundup sites, Montreal food community engagement, and creating link-worthy "data" content (e.g., "We tested 10 pasta-to-water ratios").
   - Expected impact: High
   - Effort: Ongoing

10. **Add seasonal content calendar.** Create Valentine's Day, anniversary, and holiday-specific roundup pages 2-3 months before each season to capture seasonal search spikes.
    - Expected impact: Medium
    - Effort: Ongoing (plan quarterly)

11. **Publish a steak recipe.** The site has two steak-related articles (perfect steak guide, well-done steak guide) but no actual steak recipe. Adding one creates a natural content cluster.
    - Expected impact: Medium
    - Effort: 1 week

12. **Expand into drinks/cocktails.** "Date night cocktails" is a natural brand extension with moderate search volume and low competition for specific recipes.
    - Expected impact: Medium
    - Effort: 2-3 weeks for initial batch

---

## Appendix: Content Inventory

### English Recipes (18)
beef-ragu-pappardelle, brussels-sprouts-salad, cacio-e-pepe, cauliflower-steak-with-romesco-sauce, chocolate-tofu-pudding, 3-day-aged-miso-duck-breast, crispy-vegan-calamari, gochujang-kimchi-seafood-bucatini, lamb-meatballs-gochujang-glaze, lemon-posset-brulee, miso-udon-carbonara, northern-thai-beef-tartare, pate-a-choux, penne-alla-vodka, pork-osso-buco, quinoa-crusted-salmon, vietnamese-pickled-vegetables, zucchini-eggplant-chips

### English Articles (11)
clarified-butter-and-ghee, cooking-essentials-starter-kit, cooking-oils-guide, how-to-choose-fresh-seafood-for-a-perfect-date-night, perfect-steak-date-night-guide, sous-vide-date-night, truth-about-msg, velveting-stir-fry-technique, well-done-steak-date-night, wok-hei-at-home, why-not-wash-chicken

### English Reviews (2)
mckiernan-montreal, moccione-montreal

---

*Note: This audit was conducted using codebase analysis and web research. Ahrefs Site Explorer data was unavailable due to plan limitations. For more precise keyword volume, difficulty scores, and ranking data, connect a higher-tier Ahrefs plan or Semrush account.*
