# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Two visitors, equally important:
- **The planner**, 20 to 40, in Montréal, usually on a phone, deciding tonight or this weekend where to take a date. Usually lands from Google on a single review and wants the verdict fast.
- **The reader**, browsing reviews, Date Spots and chef Q&As for pleasure, often on desktop, from the homepage.

## Product Purpose

Date My Dish is a bilingual (English and Quebec French) Montréal date-night guide: where to go, what to drink, what to make for someone. Every Review and Date Spot carries a plain Verdict with its reason (A favourite, Depends on the night, Not our first pick) and says which kinds of dates a place suits. Success is a reader who can decide, book and plan the rest of the evening from one page.

## Positioning

Reporting by a named reporter (Victor), with a qualitative Verdict instead of scores or stars, Good-for Signals per date occasion, "Make a night of it" pairings, and Chef Recipe Cards from the chefs behind reviewed venues. Montréal first; anything elsewhere is a Travel Review that names its city.

## Operating Context

Content comes from a public, read-only Notion database through the Importer routine; prose is never rewritten on the site (see `docs/editorial-publishing-system.md` and `CONTEXT.md`). Astro on Cloudflare, EN and FR pages built side by side.

## Capabilities and Constraints

- Performance budgets block the build: 15 KB of first-party JS per post page, hero under 200 KB, Lighthouse mobile performance 95+.
- WCAG 2.2 AA; every ARIA label is translated.
- No Review, AggregateRating or FAQPage structured data; DMD publishes no numbers of its own.
- Optional sections render nothing when empty.

## Brand Commitments

- The name "Date My Dish" (DMD). Everything else visual was replaced in the 2026 redesign by the Greystone evening system (`DESIGN.md`).
- Chic, minimalist, generous space, small animations that add meaning.
- Must never feel like: cutesy romance (hearts, pinks, script), exclusive luxury (black and gold, intimidating), a generic food blog (clutter, badges everywhere), or a cold tech product (SaaS UI, gradients, glass).
- No em-dashes in any copy. Quebec French conventions (souper, déjeuner, dîner).

## Evidence on Hand

Real venue photography from Notion (`public/images/date-spots/`), real reviews, chef profiles and recipe cards. No testimonials, ratings or press to show, and none may be invented.

## Product Principles

1. The verdict first: a planner gets the answer before the story.
2. Structured fields, never filler: a section with no content does not render.
3. One system everywhere: every page is built from the same tokens and components.
4. Fast on a phone on a Montréal evening.

## Accessibility & Inclusion

WCAG 2.2 AA in light and dark; focus-visible on every control; focus traps in the search overlay and mobile menu; `prefers-reduced-motion` turns motion off.
