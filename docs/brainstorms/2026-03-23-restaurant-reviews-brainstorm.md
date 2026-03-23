---
date: 2026-03-23
topic: restaurant-reviews-content-type
---

# Restaurant Reviews: Third Content Type

## What We're Building

A dedicated restaurant reviews section for Date My Dish, starting with two Montreal restaurant reviews from the existing Notion database. Reviews become a third Astro content collection alongside recipes and articles, with their own schema, JSON-LD (Restaurant + Review), bilingual pages, and a Notion auto-publish pipeline.

**Scope (v1 - basic):** Index listing page + individual review pages (EN/FR). No filter/browse pages by neighborhood or cuisine yet.

## Why This Approach

**Option considered: Reviews as articles** - Rejected. Articles lack restaurant-specific structured data (address, hours, price range, scores). Google surfaces restaurant reviews differently in local search results, and we'd miss rich snippet opportunities.

**Option chosen: Dedicated collection** - Restaurant + Review JSON-LD is a distinct schema type. Dedicated URL structure (`/en/reviews/`) signals content type to search engines. Enables future listing pages (by neighborhood, cuisine, price) without refactoring. Cross-links with recipes build topical authority.

## Key Decisions

- **URL structure:** `/en/reviews/{slug}/` and `/fr/critiques/{slug}/`
- **Schema fields:** Restaurant-specific frontmatter (restaurantName, neighborhood, address, cuisine, priceRange, dateScore, bestFor, dishHighlights, etc.)
- **JSON-LD:** Restaurant + Review structured data (distinct from Recipe and BlogPosting)
- **Notion pipeline:** Filter by `Post Type === "Restaurant Reviews"` + `Status === "Ready to Publish"`
- **Content is EN only in Notion:** Claude generates FR translation (Quebec French)
- **v1 scope:** Basic index + detail pages only; neighborhood/cuisine filter pages deferred
- **Homepage integration:** Reviews appear in "recent posts" feed alongside recipes and articles

## Content Available

### Ready to Publish
1. **Moccione** (#55) - Italian, Villeray, $$$-$$$$, Date Night Score 9/10
2. **McKiernan** (#53) - Brunch/Quebec comfort, Sud-Ouest, $$-$$$, Brunch Score 8/10

### In Progress
3. **Ratafia** (#50) - Intimate date night spot (not ready yet)

## Review Content Structure (from Notion)

Each review contains:
- Restaurant info (name, location, price range, cuisine, dress code)
- Quick verdict box (best for, conversation score, ambiance, reservation tip, date score)
- Vibe description (lighting, noise, best seats)
- Dish-by-dish breakdown with descriptions and mouthfeel notes
- Drinks recommendations
- Cost breakdown with budget tips
- Booking and timing advice
- Date type fit scores (first date, anniversary, impressing, etc.)
- Bottom line summary
- Details block (address, phone, hours, website)

## Open Questions

- Should reviews count toward the homepage "recent posts" merge? (Likely yes)
- Image handling: reviews have food photos in Notion - same optimize pipeline as recipes?
- Should the weekly workflow run on a different day than recipes (Thu) and articles (Mon)?

## Next Steps

Plan implementation with phased approach:
1. Schema + content collection
2. Components (ReviewCard, ReviewSchema, ReviewDetailCard)
3. Pages (EN/FR listing + detail)
4. i18n updates
5. Notion fetch script + workflow
6. Publish first two reviews
