# Date My Dish editorial publishing system

This is the single source of truth for what a DMD post looks like, where its content comes from, and how it gets published. The visual reference is the Review Page Rework design (desktop and phone review page, recommendation signals, content and SEO spec, date spot page, chef page). Where this document and the design disagree, this document wins.

## Editorial promise

Date My Dish is a Montréal-first guide to date nights:

> Where to go, what to drink, what to make for someone.

Victor Vu is the reporter; bylines print "Victor". Practical copy uses the editorial "we"; first-person writing belongs only in the signed My note section of a review. Montréal is the Home Market. A venue elsewhere is published as a Travel Review that names its actual city.

## Post types

| Post type | Design board | Notion source (`Post Type` value) |
|---|---|---|
| Review (Spot Type `restaurant` or `bar`) | Review page | `Restaurant Reviews` |
| Date Spot (Spot Type `activity` or `chef-led`) | Date spot page | `Date Spots` |
| Chef | Chef page | `Chef Interviews` |
| Chef Recipe Card | Recipe card, linked from a review and a chef page | `Chef Interviews` rows that contain a recipe |

Restaurant and Bar share one review template. A bar puts the drinks first and swaps Meet the chef for Meet the bartender, What to order for What to eat, and Before you book for Before you go.

The pages form a loop: a review's Make a night of it opens Date Spot pages, a Date Spot's Pair it with opens reviews, and a review's chef links to their chef page and recipe card. Navigation exposes a destination only once it has published content.

Home recipes, informative articles and affiliate articles are not DMD post types. Their Notion rows are ignored and their old pages stay retired (404, no redirect).

### URLs

| Page | English | French |
|---|---|---|
| Review | `/en/reviews/{neighbourhood}/{slug}/` | `/fr/critiques/{neighbourhood}/{slug}/` |
| Date Spot | `/en/date-spots/{slug}/` | `/fr/lieux/{slug}/` |
| Category listing | `/en/date-spots/category/{category}/` | `/fr/lieux/categorie/{categorie}/` |
| Neighbourhood guide | `/en/date-spots/neighbourhood/{neighbourhood}/` | `/fr/lieux/quartier/{neighbourhood}/` |
| Chef page | `/en/chefs/{slug}/` | `/fr/chefs/{slug}/` |
| Recipe card | `/en/recipe-cards/{slug}/` | `/fr/fiches-recettes/{slug}/` |

The neighbourhood segment is the companion file's `neighbourhood` (accents dropped, lower case, hyphenated). Every URL ends in a trailing slash.

The seven reviews published before the rework lived at `/en/reviews/{slug}-montreal/` and `/fr/critiques/{slug}-montreal/`. Each of those 14 URLs 301-redirects, in one hop, to its new nested URL.

## The recommendation signal

No numbers from DMD anywhere: no rating, date score, stars or ranking.

- **Verdict**: stored as `favourite`, `conditional` or `pass`; displayed as `A favourite`, `Depends on the night`, `Not our first pick`. Always paired with a one-line reason. It is also the listing filter ("Filter by our take"). Keep `favourite` scarce, about one in four; the build warns above that.
- **Good-for and When-it-works rows**: `Ideal`, `Works, with a caveat`, `Not the one`, each with a reason line.
- **Google rating**: the venue's own number, shown only in the essentials card as a dated snapshot ("4.6 · 312 reviews, as of 18 September 2026, not updated since") and labelled as theirs. A recheck appends a new dated line and never overwrites. It never appears in DMD's structured data.

## What every post must have, and what is optional

Almost every section is optional. An optional section renders only when it has content. It never renders a placeholder, and nothing is ever invented to fill a slot (no made-up waiter's choice, set menu, chef section or pick).

### Review

Required:

1. H1 `{Name}, {Neighbourhood}`, and the matching URL.
2. The opening paragraph (ideally one sentence carrying the chef's name when known, the venue, the neighbourhood and the cuisine).
3. The verdict with its reason.
4. The essentials card: cuisine, neighbourhood, address, price per person.
5. "Checked {month}": defaults to the publish date and feeds `dateModified`. It changes only when the venue is actually rechecked.
6. A hero photo with descriptive alt text.
7. Byline and visit or payment disclosure.
8. EN and FR versions.

Optional, in design order: Good for (up to 6 rows), The room, Meet the chef (or bartender), The drinks (to start, with the meal, not drinking, the list), What to order (waiter's choice, set menu, à la carte strategy, dish cards tagged `Order this`, `Worth it` or `Skip`), The real cost (breakdown and total), My note (signed, visit count, dated Update lines), Make a night of it, What the chef would make for a date night (links the recipe card), Before you book, and in the essentials card: "Can you talk?", booking, time to allow, Instagram, the Google snapshot, Book and Map links.

**Make a night of it** shows 1 to 5 cards, always in this order: Activities and Sports, Arts and Culture, Games and Entertainment, Nature and Scenic, Social and Romantic. A card appears only when its Date Spot page is published. With no published picks the section is hidden.

### Date Spot

Required: name, category (one of the five above), neighbourhood, a signal with its reason, address, practical info (hours, cost, season), a hero photo with alt text, EN and FR.

Optional: When it works rows, What it actually is, How to do it well, Pair it with (published reviews only), booking, transit, step-free access, map, a Chef-led Experience's named host.

### Chef

Required: name, the restaurant they are tied to (a published review, or just its name), at least one answer from the Q&A, EN and FR.

Optional: portrait with credit, standfirst and reported scene, round one about their restaurant, the rest of the eight fixed Dinner and a date questions, the closing question "What would you make for a date night at home?", and the short-version sidebar.

### Chef Recipe Card

Required: title, the chef's name and the source of the recipe, ingredients, steps, servings, EN and FR.

Optional: photo, active and total time, equipment, notes from the chef, DMD testing notes, Pair it with.

## SEO rules

- One H1 per page. Every H2 is phrased the way a person would ask it ("Is Moccione worth it?", "What to order at Moccione", "How much does dinner at Moccione cost?"); dish names are H3s.
- Meta title: leads with `{Name}, {Neighbourhood}` (reviews: `{Name}, {Neighbourhood}: Review & Date Night Guide`, shortened when the name is long). The rendered `<title>`, including any site suffix, stays at 60 characters or fewer. Meta description: 120 to 160 characters (aim for 150 to 160).
- Structured data: `Article` with `datePublished` and `dateModified` (from Checked), `BreadcrumbList` matching the visible breadcrumb, `Restaurant` (or `BarOrPub`) as the article's `about` with address, `servesCuisine` and `priceRange`, and the chef as a `Person` employed there. Recipe cards add `Recipe`. Never `Review`, `AggregateRating` or `FAQPage` markup; the Before you book section stays for readers.
- Internal links are earned by the content: Make a night of it picks, the neighbourhood guide, the recipe card, the chef page, nearby reviews. The build warns below nine; it does not block.
- Word count: the build warns below 1,000 reader-facing words per locale and blocks below 300. Never pad to reach a number.
- Images use real descriptive filenames, alt text that describes the plate or place, and explicit width and height.
- Internal links never point at a redirect, a retired page or the bare apex.

## Performance budgets

These block a PR (Lighthouse PR check and `validate-build`):

| Budget | Limit |
|---|---|
| Lighthouse performance, mobile | 95 or more |
| Largest Contentful Paint | 2.5 s or less |
| Cumulative Layout Shift | 0.05 or less |
| JavaScript on a review page | 15 KB or less |
| Hero image | 200 KB or less, AVIF and WebP with WebP fallback, width and height set |
| Below-the-fold images | `loading="lazy"` |
| Third-party embeds | none on load; the map loads on click |

## Where content comes from

### Notion is read-only and taken as it is

All posts are fetched from the public Notion database at `https://congruous-eyebrow-e80.notion.site/9ce95183503543d68450194d1010824b`, without authentication. DMD never writes to Notion and cannot change its schema or page format. The importer adapts to whatever the authors put there: the existing properties (`Post Title`, `Post Type`, `Status`, `Borough`, `Recipe #`, `Publish Date`, and so on) and free-form page bodies with the author's own headings.

The importer reads only rows where:

- `Post Type` is `Restaurant Reviews`, `Date Spots` or `Chef Interviews`, and
- `Status` is `Ready to Publish` or `Published`.

Every other `Post Type` (`Recipes`, `Informative Posts`, `Affiliate Links`, empty) is ignored in code. Two rows that resolve to the same venue are flagged in the PR rather than published twice.

### Notion owns the prose; the companion file owns everything else

Each published post has a companion file, `src/content/editorial/{slug}.json`. It holds what Notion does not carry and what DMD controls:

- verdict and its reason, Good-for and When-it-works signals
- Spot Type, category, neighbourhood
- Checked date and dated update lines
- Google snapshot lines, Instagram handle, booking link
- meta title and meta description per locale
- alt text and internal links

The importer pre-fills the companion file on first import (verdict and reason proposed from the review's own text, neighbourhood from the address, category from the title, Checked from the publish date). Victor approves or edits it in the PR. On later imports the importer never overwrites a companion file field.

### Edit policy

The prose on the site is the Notion text. The only changes allowed are:

- spelling, grammar and punctuation (Quebec French conventions on the FR side)
- removing em-dashes
- meta title and meta description, written when missing
- alt text
- rephrasing an H2 into the question a searcher would type, without changing its meaning
- adding internal links on existing words
- splitting an overlong paragraph

Never: adding or removing sentences, changing opinions or facts, or inventing a section. A verbatim check fails the PR if any sentence on the page cannot be traced back to the Notion source after the allowed edits. Every edit is visible in the PR diff.

### Fitting free-form text into sections

The importer maps the author's headings onto the design's sections with a fixed heading map (for example "The Vibe" to The room, "What to Order" to What to order, "Before and After" to Make a night of it, "The Real Cost" to The real cost). Headings the map does not know are placed by the importer agent. Text that fits no section is listed in the PR as unplaced, and Victor decides whether to drop it. Nothing is deleted silently.

### French

Notion holds English. The importer translates EN into Quebec French (souper, déjeuner, dîner; portions; tasses). The FR is marked as a translation in the PR and is never published without Victor's approval. A missing FR meta description is written from the FR prose, not translated from the EN meta. The seven reviews published before the rework reuse their existing FR text, reorganised into the new sections.

## Publishing

1. **Importer** (Claude cloud routine on Victor's claude.ai account, Wednesdays): fetches the next eligible Notion row, downloads and optimises its images, fits the text into sections, applies the allowed edits, translates to FR, writes or updates the collection JSON and the companion file, and opens a draft PR listing every edit, the section mapping, unplaced text and the translation.
2. **Deterministic checks**, run by the routine and again by CI on the PR: Notion fetch, image optimisation, verbatim check, publish gate (required fields, EN and FR parity, append-only Google snapshots and update lines, links resolve), source and build validators, performance budgets.
3. **Merge** is the act of publishing. Nothing else publishes.
4. **Updates**: when a published Notion row is edited (detected by its last-edited time), the importer opens an update PR that keeps the companion file intact. A changed verdict or signal needs a new dated update line.
5. **Failure**: nothing on the site changes. The importer opens or updates a `notion-story` issue saying what blocked it.

`notion/published.json` records which Notion rows are live and when they were last synced.

## Pinterest

- Pins use real photos only, with a title overlay rendered by script. No AI-generated images.
- Pin copy is assembled from the meta title, meta description and verdict line. No new prose.
- Pins link to the nested review URLs, English only.
- Publishing a post queues its pins; `pinterest-pin-rotation.yml` posts the queue daily.
- Pins created before the rework stay up; the 301 redirects keep them working.

## Scheduled work

| Job | Runs as | What it does |
|---|---|---|
| Importer | Claude cloud routine, Wednesdays; prompt in `routines/importer.md` | Publishing flow above |
| Weekly SEO maintenance | Claude cloud routine, Sundays; prompt in `routines/weekly-seo-maintenance.md` | Audits published posts. Edits only companion file fields (meta, alt text, internal links) and opens a PR. Prose suggestions go into an issue, because prose belongs to Notion. Never pads word counts. |
| `weekly-seo-ranking.yml` | GitHub Actions, Mondays | GSC and SERP data into `data/seo/`, keywords derived from published posts |
| `weekly-seo-audit.yml` | GitHub Actions, Sundays | Full Lighthouse audit into `data/lighthouse/` |
| `venue-maintenance.yml` | GitHub Actions, monthly | Flags reviews and Date Spots due a recheck (six months since Checked, or seasonal). Report only. |
| `pinterest-pin-rotation.yml` | GitHub Actions, daily | Posts queued pins |
| `token-refresh.yml` | GitHub Actions, 1st and 25th | Refreshes the Pinterest access token pin posting needs |
| `playwright-weekly.yml` | GitHub Actions, Sundays | Full E2E suite |

No scheduled job edits prose on the site. Each routine prompt is committed under `routines/`; changing the file is how the routine changes.
