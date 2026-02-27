---
topic: Homepage Articles Integration
date: 2026-02-27
status: complete
---

# Homepage Articles Integration

## What We're Building

Add a "Recent Posts" section to the homepage that shows the 3 most recent content items (articles and recipes mixed, sorted by publish date). This sits between the existing Hero section and the Featured Recipes section. The hero and all other existing sections remain unchanged.

## Why This Approach

- **SEO**: Fresh internal links near the top of the homepage signal to Google that the site is active. Mixing articles and recipes creates more crawlable paths to content.
- **Content-rich feel**: The homepage should feel like a full food blog, not just a recipe index. Showing articles alongside recipes demonstrates depth.
- **Simplicity**: Uses existing `ArticleCard` and `RecipeCard` components with no new UI to design. Scales naturally as more articles are published.

## Key Decisions

1. **Keep current hero unchanged** — The H1 "Romantic Recipes for Unforgettable Date Nights" is the homepage's primary SEO keyword anchor. Replacing it with rotating content would dilute ranking signals. Auto-rotating H1s confuse Google crawlers.

2. **Mixed "Recent Posts" section, not separate "Latest Articles"** — With only 3 articles published, a dedicated articles section would look static. Mixing both content types in one feed always has fresh-feeling content regardless of which type was published most recently.

3. **3 items (1 row)** — Clean and compact. Shows the site is active without competing with the Featured Recipes section below.

4. **Section order: Hero → Recent Posts → Featured Recipes → Categories** — Fresh content near the top for SEO. Featured Recipes keeps its existing position and prominence.

5. **No article category pills yet** — With only 3 articles, article-specific categories would feel sparse. Revisit when there are 10+ articles.

6. **No carousel** — Carousels hurt SEO and engagement (users rarely click past slide 1, Google treats carousel content as lower priority). Static content is better.

## Scope

### In Scope
- New "Recent Posts" section on EN + FR homepages
- Fetch articles collection alongside recipes collection
- Sort all items by publishDate, take 3 most recent
- Use existing ArticleCard for articles, RecipeCard for recipes
- i18n: new translation keys for section heading ("Recent Posts" / "Publications récentes")
- "View All" link — either to a combined feed page or omit for now

### Out of Scope
- Hero changes
- Article category pills on homepage
- New card components or designs
- Combined "all posts" listing page (can be a follow-up)
- Newsletter signup or other new sections

## Open Questions

None — all questions resolved during brainstorming.
