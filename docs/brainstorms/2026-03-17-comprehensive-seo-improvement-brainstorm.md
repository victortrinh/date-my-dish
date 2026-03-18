# Comprehensive SEO Improvement Plan

**Date:** 2026-03-17
**Status:** Brainstorm
**Branch:** feat/seo

## What We're Building

A phased SEO improvement strategy for Date My Dish covering three pillars:

1. **Content-level SEO optimization** of all 12 existing recipes and 6 articles
2. **Programmatic SEO pages** to multiply indexable URLs (occasion/mood pages + cuisine directories)
3. **AI/GEO optimization** to get cited by ChatGPT, Perplexity, Google AI Overviews, and Claude

## Why This Approach

The site has a strong technical SEO foundation (JSON-LD, sitemaps, `llms.txt`, Core Web Vitals, AI bot access) but almost no organic rankings. The bottleneck is content volume and optimization depth, not technical infrastructure.

With only 12 recipes, we need to:
- Maximize the SEO value of every existing page (Phase 1)
- Create new high-quality indexable pages without thin content (Phase 2)
- Position content for AI citation, which is where search is heading (Phase 3)

Conservative approach: only create pSEO pages where 3+ recipes exist to back them.

## Key Decisions

### Phase 1: Content-Level SEO Audit & Fixes
- Run `seo-audit` skill on all 12 recipes and 6 articles
- Fix frontmatter gaps: populate `keywords` and `tags` fields (currently under-utilized)
- Strengthen E-E-A-T signals: author bio, recipe credibility, date-night expertise
- Optimize meta descriptions to 150-160 chars with compelling CTAs
- Ensure every recipe has 5-7 images (hero + step images)
- Add internal cross-links between related recipes and articles

### Phase 2: Programmatic SEO Pages
- **Occasion/mood pages**: Rich editorial landing pages for occasions like "date-night", "weeknight", "entertaining" with curated recipe collections, tips, and menu suggestions
- **Cuisine directories**: Pages like "Italian Date Night Recipes" grouping recipes by cuisine with editorial descriptions
- Only generate pages with 3+ backing recipes (conservative threshold)
- Hub-and-spoke internal linking from pSEO pages to individual recipes
- Full bilingual support (EN/FR) matching existing route structure

### Phase 3: AI/GEO Optimization (prioritized by Princeton GEO research impact)
1. **Citations (+40% visibility)**: Add sourced claims and attributions to recipe prose (e.g., "According to Marcella Hazan..." or citing food science)
2. **Statistics (+37%)**: Add concrete numbers to prose (cook temps, timing benchmarks, nutrition comparisons)
3. **Quick-answer blocks**: Add a 2-3 sentence summary at top of each recipe (directly quotable by AI engines)
4. **FAQ enhancement**: Rewrite FAQ answers to be specific and self-contained (each answer should make sense without the question)
5. **`llms.txt` enrichment**: Add structured summaries and recipe relationships to the AI-readable index
6. **AI citation monitoring**: Set up tracking via Otterly or similar to measure which recipes get cited

## Approach: Phased Rollout

**Phase 1 (immediate):** Audit and optimize existing content
- Highest ROI: fixes to existing pages compound immediately
- No new pages needed, just better optimization of current 36 pages

**Phase 2 (after Phase 1):** Build programmatic SEO pages
- Only where content density supports it (3+ recipes per grouping)
- Start with occasion pages (aligns with brand's date-night positioning)
- Add cuisine directories where recipe count allows

**Phase 3 (alongside Phase 2):** GEO optimization
- Can be applied to both existing and new pages
- Focus on content patterns that boost AI citation rates (+40% for citations, +37% for statistics per Princeton GEO research)

## Content Inventory Analysis (for pSEO feasibility)

### By Occasion (3+ threshold for pSEO pages)
| Occasion | Count | Eligible? | Recipes |
|----------|-------|-----------|---------|
| date-night | **9** | YES | cacio-e-pepe, penne-alla-vodka, cauliflower-steak, crispy-vegan-calamari, quinoa-salmon, lemon-posset, pork-osso-buco, beef-ragu, gochujang-bucatini, vietnamese-pickled-vegetables |
| entertaining | **7** | YES | cauliflower-steak, crispy-vegan-calamari, quinoa-salmon, zucchini-chips, brussels-sprouts, beef-ragu, vietnamese-pickled-vegetables |
| weeknight | **5** | YES | cacio-e-pepe, penne-alla-vodka, brussels-sprouts, gochujang-bucatini, vietnamese-pickled-vegetables |
| comfort | **3** | YES | penne-alla-vodka, pork-osso-buco, beef-ragu |
| celebration | 1 | No | lemon-posset |
| quick-meal | 1 | No | zucchini-chips |

**4 occasion pages are viable now.** "date-night" is the strongest (9 recipes, aligns with brand).

### By Cuisine (3+ threshold for pSEO pages)
| Cuisine | Count | Eligible? | Recipes |
|---------|-------|-----------|---------|
| Italian | **4** | YES | cacio-e-pepe, penne-alla-vodka, pork-osso-buco, beef-ragu |
| Mediterranean | 2 | No | crispy-vegan-calamari, zucchini-chips |
| Others (1 each) | — | No | British, Spanish, Southeast Asian, Vietnamese, Nikkei, Korean-Italian |

**1 cuisine directory is viable now** (Italian). Mediterranean is close at 2.

### By Category (3+ threshold for pSEO pages)
| Category | Count | Eligible? | Recipes |
|----------|-------|-----------|---------|
| dinner | **7** | YES | cacio-e-pepe, penne-alla-vodka, cauliflower-steak, quinoa-salmon, pork-osso-buco, beef-ragu, gochujang-bucatini |
| appetizer | **3** | YES | brussels-sprouts, crispy-vegan-calamari, zucchini-chips |
| side-dish | 1 | No | vietnamese-pickled-vegetables |
| dessert | 1 | No | lemon-posset |

**2 category pages are viable now.** Note: category pages already exist as routes (`/category/[category]`), so this is about enriching them with editorial content, not creating new routes.

### pSEO Summary
**7 pages viable today:** 4 occasion + 1 cuisine directory + 2 enriched category pages. At 1-2 recipes/week, more groupings will cross the threshold within weeks.

## Resolved Questions

1. **Author/expertise page**: Yes, enhance the About page with stronger E-E-A-T signals (cooking credentials, date-night expertise story). Added to Phase 1.
2. **AI monitoring tools**: Yes, explore AI citation monitoring (Otterly, Peec AI, or similar). Added to Phase 3.
3. **Product marketing context**: Yes, create `.agents/product-marketing-context.md` for richer brand context. Added as Phase 0 prerequisite.
4. **Content velocity**: 1-2 recipes per week via Notion auto-publish. pSEO pages viable in ~1-2 months as content accumulates.
