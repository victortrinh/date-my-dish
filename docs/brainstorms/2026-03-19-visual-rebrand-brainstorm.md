---
date: 2026-03-19
topic: visual-rebrand
---

# Date My Dish Visual Rebrand

## What We're Building

A complete visual rebrand of Date My Dish, migrating from the current terracotta/gold earthy palette with Fira Sans uppercase headings to a "Modern Editorial Romance" direction: wine burgundy (#7B2D3B) + rose gold (#D4A08A) palette, Playfair Display mixed-case headings, and magazine-style layouts.

All existing content (recipes, articles, MDX prose, frontmatter data) stays untouched. We're changing how and where things are displayed, not what's displayed.

## Why This Approach

The current design is clean and functional but reads as a generic recipe blog. The brand is called "Date My Dish" and focuses on romantic cooking and date nights. The new direction leans into that identity with:

- **Intimate color palette**: Wine burgundy + rose gold says "candlelit dinner," not "farmhouse kitchen"
- **Editorial typography**: Playfair Display in mixed-case feels like a food magazine, not a corporate site
- **Magazine layouts**: Asymmetric grids with featured cards create visual hierarchy and editorial quality
- **Warm neutrals**: Blush-tinted backgrounds instead of cold grays reinforce the romantic theme

## Key Decisions

### Colors
- **Primary**: Wine burgundy `#7B2D3B` (replaces terracotta `#C4704B`)
- **Accent**: Rose gold `#D4A08A` (replaces warm gold `#D4A853`)
- **Light background**: Warm off-white `#FAF7F5` (replaces `bg-neutral-100`)
- **Section alternating bg**: Light blush gray `#F3EEEB` (replaces `bg-neutral-200`)
- **Text**: Dark warm gray `#2D2226` (replaces `text-neutral-800`)
- **Cards**: White `#FFFFFF` with warm shadows
- **Dark mode body**: Warm charcoal `#1A1215` with wine undertone (replaces `bg-neutral-950`)
- **Dark mode cards**: `#252022` (replaces `bg-neutral-900`)
- **Dark mode primary**: Lighter rose `#C4697A` for contrast
- Need to define full WCAG-compliant text variants (like current `brand-primary-text`)

### Typography
- **Headings**: Playfair Display (serif, mixed-case) replaces Fira Sans (sans-serif, uppercase)
- **Body**: Source Serif 4 (variable font, weights 200-900) replaces Bitter
- **UI**: Inter replaces Fira Sans for buttons, nav, metadata
- **Handwritten**: Caveat stays for logo and decorative moments
- **Remove**: Global `uppercase tracking-wide` from base heading styles
- Need to verify weight availability and loading strategy

### Logo
- **Keep illustrated food-letter logo as-is** (current earthy colors)
- **Nav**: Compact version (~200px wide) in the sticky nav bar. The logo's dark background creates a natural branded element.
- **Footer**: Full-size logo in the dark footer where it shines
- The earthy tones of the logo will create an intentional warm contrast with the burgundy/rose palette

### Homepage Hero
- **Editorial split layout**: Text left (60%), food photo right (40%) with slight tilt/rotation
- Warm blush background (`#FAF7F5` or similar)
- Heading in Playfair Display, subtitle in body font
- Burgundy CTA button
- Replaces current full-bleed photo with dark gradient overlay

### Recipe Grids
- **Magazine asymmetric layout**: First card is large/horizontal (spans 2 cols, image left + text right), remaining cards are standard vertical
- Applies to: Recent Posts, Featured Recipes, Related Recipes sections
- More editorial and visually dynamic than current uniform 3-col

### Component Scope
- **Everything is fair game**: Every visual element can change (layout, colors, typography, spacing, component design)
- Content stays: MDX files, frontmatter data, i18n strings, images (though we can re-crop/reframe for new aspect ratios)

## Scope & Surface Area

### Files That Must Change
- `tailwind.config.mjs` -- colors, fonts, font sizes
- `src/styles/global.css` -- button system, base styles, prose styles, print styles
- `src/layouts/BaseLayout.astro` -- Google Fonts link, body classes
- All 31 components in `src/components/` -- Tailwind classes for colors, fonts, spacing
- All 30 page files in `src/pages/` -- section backgrounds, grid layouts, hero sections
- `src/components/SearchOverlay.astro` -- hardcoded Pagefind dark mode hex values

### Things That Stay
- Content: all MDX files in `src/content/`
- Images: all files in `src/assets/images/`
- i18n: translation strings (though UI labels might need updates if we add new sections)
- Schema/SEO: JSON-LD generation, meta tags logic
- JavaScript: all client-side behavior (dark mode toggle, search, bookmarks, etc.)
- Routing: all URL paths stay the same
- Infrastructure: Cloudflare, CI/CD, automation pipelines

## Resolved Questions

1. **Logo in nav on light mode**: Dark strip/badge. The logo sits on its own small dark rounded rectangle in the light nav, creating an intentional branded element.
2. **Source Serif Pro availability**: Using Source Serif 4 (updated version) from Google Fonts. Variable font with weights 200-900, all we need.
3. **Difficulty badge colors**: Keep semantic green/yellow/red. Universal recognition is more important than palette cohesion here.
4. **Migration strategy**: One big PR on the `rebrand` branch. Easier to see the full picture and ensure visual consistency.

## Open Questions

1. **WCAG text colors**: Need to derive AA-compliant text variants from the new burgundy (#7B2D3B) and rose gold (#D4A08A). Must hit 4.5:1 for body text, 3:1 for large text. Will calculate during implementation.

## SEO Preservation

Critical constraint: SEO must not regress. Safeguards:
- **URLs stay identical**: No route changes, no slug changes, no redirects needed
- **JSON-LD untouched**: RecipeSchema.astro, ArticleSchema.astro, BreadcrumbList logic all stay the same
- **Meta tags untouched**: SEOHead.astro, canonical URLs, hreflang, OG/Twitter cards all preserved
- **Content untouched**: All MDX prose, frontmatter keywords, descriptions, FAQs stay as-is
- **Sitemap unchanged**: Same pages, same structure
- **robots.txt unchanged**: Same crawl permissions
- **Heading hierarchy preserved**: H1/H2/H3 structure stays semantic, just styled differently
- **Image alt text preserved**: Same alt text, same images, just potentially different display sizes
- **Verify post-deploy**: Run `/bulk-audit` and `/validate-recipes` after merge to confirm zero regressions

## Next Steps

-> `/workflows:plan` for implementation details
