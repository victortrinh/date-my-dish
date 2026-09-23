# Date My Dish editorial publishing system

## Editorial promise

Date My Dish is a Montréal-first guide to Date Spots and contributor recipes. A Date Spot can be a restaurant, bar, activity, or Chef-led Experience. Its working descriptor is:

> Where to go, what to drink, what to make for someone.

Victor Vu is the primary reporter; post bylines print "Victor". Practical copy uses DMD's editorial “we”; first-person writing belongs only in the signed My note section of a review.

Every reader-facing page is human-authored. Do not use AI to write, translate, paraphrase, invent, or illustrate published material. Permitted editorial changes are factual corrections, very small grammar or clarity fixes, and accurate SEO metadata that does not introduce claims or change the meaning of the source work.

## Date Spot model

**Date Spot** is the primary editorial page form. Each Date Spot has one Spot Type:

1. Restaurant
2. Bar
3. Activity
4. Chef-led Experience

Restaurant and Bar Date Spots use the full Review format. Activity and Chef-led Experience Date Spots use the planning format and carry one of five categories: Activities and Sports, Arts and Culture, Games and Entertainment, Nature and Scenic, Social and Romantic. A Bar may also take a category so it can be offered as a before-or-after pick. Contributor Recipes are separate pages (recipe cards). An Extended Chef or Bartender Profile (the chef page) is an occasional companion page, never a required publishing type.

The loop the pages form: a review's "Make a night of it" opens Date Spot pages, a Date Spot's "Pair it with" opens reviews, and a review's chef links to their chef page and recipe card.

Navigation exposes a destination only after it has content. “Reviews” may be a Date Spot filter or landing view for Restaurants and Bars; it is not a separate content hierarchy.

### URLs

| Page | English | French |
|---|---|---|
| Restaurant or Bar review | `/en/reviews/{neighbourhood}/{slug}/` | `/fr/critiques/{neighbourhood}/{slug}/` |
| Activity or Chef-led Experience | `/en/date-spots/{slug}/` | `/fr/lieux/{slug}/` |
| Category listing | `/en/date-spots/category/{category}/` | `/fr/lieux/categorie/{categorie}/` |
| Neighbourhood guide | `/en/date-spots/neighbourhood/{neighbourhood}/` | `/fr/lieux/quartier/{neighbourhood}/` |
| Chef page | `/en/chefs/{slug}/` | `/fr/chefs/{slug}/` |
| Recipe card | `/en/recipe-cards/{slug}/` | `/fr/fiches-recettes/{slug}/` |

The neighbourhood segment is derived from the Neighbourhood property (accents dropped, lower case, hyphenated), so the folder itself is the neighbourhood cluster. Listing pages only exist once they have content. The legacy `/en/recipes/` and `/fr/recettes/` routes stay retired.

### The recommendation signal

No numbers anywhere: no DMD rating, date score, star score or synthetic ranking. Every Date Spot carries the same three-state verdict, stored as `favourite`, `conditional` or `pass` and displayed as `A favourite`, `Depends on the night` and `Not our first pick`. The stored value is the state; the words are display text, so the system can be reworded later without touching a post. The verdict is also the listing filter ("Filter by our take"). Keep `A favourite` scarce, roughly one in four; the build warns when it drifts above that.

Good-for Signals use `Ideal`, `Works, with a caveat` and `Not the one`, always with a reason line. Diplomatic in the label, specific in the reason.

The one outside number allowed on a page is the venue's own Google rating, shown in the Essentials card as a dated snapshot ("4.6 · 312 reviews, as of 18 September 2026, not updated since") and labelled as theirs. It is never refreshed silently: a recheck adds a new snapshot line, and the publish gate rejects an edited or dropped one. It is never emitted in DMD's structured data.

## Every Notion Story

Every story is a structured Notion record with a type-specific template. Maintain a complete English and Canadian French Locale Pair, published together.

Required fields:

- Post Type
- Spot Type, when the Post Type is Date Spot
- English and French title, slug, meta title, and meta description
- Reporter Byline: Victor
- Publication date and review status
- City and neighbourhood
- Original-source notes and factual verification notes
- At least one Editorial Image, with descriptive alt text, caption/credit when needed, and image dimensions

Venue Reviews and Date Spots additionally require:

- Visited date, published date, and last-checked date
- Address/map, booking or access details, expected duration, and practical cost information
- Payment disclosure: paid, hosted, or another clearly stated arrangement
- Visible dated update notes for material later changes

## Restaurant and Bar Date Spots: shared review rules

Restaurant and Bar Date Spots are sibling Venue Reviews. They share one page template and the same recommendation system; their modules follow the subject.

### Required review floor

Every review needs these elements:

1. Venue name, city, neighbourhood, and an original opening sentence that carries the restaurant, the neighbourhood, the cuisine and, when reported, the chef's name (linked down to Meet the chef).
2. The verdict up top: the three-state verdict, a one-line answer (`verdictHeadline`), and the paragraph behind it.
3. Good-for Signals: 4 to 6 rows from the fixed occasions (first date, anniversary, casual midweek, impressing a cook, double date, solo at the bar), each with a reason.
4. The room, The drinks (a first drink, a truthful non-alcohol pick, and the list itself), The real cost (an itemised two-person breakdown and total), My note (signed, with the number of visits), and Before you book (real questions and answers).
5. One Essentials card: Our take, cost per person, booking, how long to allow, address, access and timing, plus the payment disclosure. Optional: "Can you talk?", Instagram handle, Book link, and the dated Google snapshot.
6. At least 1,000 reader-facing words in each language. If a review is short, the words are missing from The room, Meet the chef or The drinks; don't pad the dish cards.

The SEO title leads with `{Venue}, {Neighbourhood}` (pattern `{Venue}, {Neighbourhood}: Review & Date Night Guide`, 60 characters at most); the H1 is `{Venue}, {Neighbourhood}`; the meta description runs 150 to 160 characters. Every H2 is phrased the way a person would ask it ("Is Moccione worth it?", "What to order at Moccione", "How much does dinner at Moccione cost?").

Structured data: an `Article` about a `Restaurant` (or `BarOrPub`) carrying address, cuisine and price range, the chef or bartender as a `Person` employed there, and a `BreadcrumbList`. No `Review` or rating markup and no `FAQPage`.

Internal links are earned by the content: up to five Make a night of it picks, the neighbourhood guide, the recipe card, the chef page and two nearby reviews. The spec aims for nine; the build warns below that rather than blocking the first review in a neighbourhood.

### Restaurant Date Spot

**Ordered structure**

1. Opening, byline ("By Victor · Published · Checked {month}") and hero photo.
2. The verdict (`Is {Restaurant} worth it?`).
3. The essentials card (on phones; in the sidebar on desktop).
4. `Good for`.
5. `The room`: atmosphere, which tables to ask for, noise, service rhythm, dress. Optional room photo.
6. `Meet the chef` (recommended): portrait with credit, background, one quote in their words, and what they're trying to do here, linking to their chef page and recipe card when those exist.
7. `What to drink at {Restaurant}`: an intro, then "To start", "With the meal" and "Not drinking" picks, then the list itself (by-the-glass prices, corkage or bring-your-own-wine, markup).
8. `What to order at {Restaurant}`: the waiter's choice and the set menu when there really is one (name, courses, price, `Take it` or `Go à la carte`), an à la carte strategy for two, then 4 to 7 dish cards, each tagged `Order this`, `Worth it` or `Skip`, with an optional photo.
9. `How much does dinner at {Restaurant} cost?`: the breakdown, the total, and how to spend less.
10. `My note on {Restaurant}`: signed, "after N visits, {month}", payment arrangement, the detail that stayed with you, the honest caveat, and dated Update lines. Ends with the invitation to report a correction.
11. `What to do before or after dinner in {Neighbourhood}` (recommended): up to five picks, one per category, each a published Date Spot in the same city within a 15-minute walk, with before or after, walk time, price and season, plus a link to the neighbourhood guide.
12. `What the chef would make for a date night` (recommended): the chef's Contributor Recipe.
13. `Before you book`.

Never invent a waiter's recommendation, a set menu, a chef section or a pick to fill a slot. Leave the module out.

### Bar Date Spot

Same template and rules as the Restaurant, with these differences: `What to eat at {Bar}` replaces What to order and appears only when the food is part of the decision (1 to 7 tagged dishes); `Meet the bartender` replaces Meet the chef; the drinks need a first drink and a non-alcohol pick (second round optional); the cost heading asks about a night rather than dinner; the planning section is `Before you go`.

## Extended People Profile (chef page)

The primary `Meet the chef` or `Meet the bartender` reporting lives inside its Restaurant or Bar Date Spot. Use this standalone companion page only when an interview has enough original reporting to earn one. Quotes are recorded, accurately transcribed, and only minimally edited for length or obvious errors. The subject may verify factual details, quotations, and their recipe; they do not approve DMD's editorial assessment.

**SEO title pattern**

`{Name}, {Role} at {Venue}: Interview`

**H1**

`{Name}`, under the kicker "In the kitchen with" (or "Behind the bar with").

**Ordered structure**

1. Standfirst (role, venue, neighbourhood, the hook), byline ("Interview by Victor · {month} · Edited for length, not for politeness"), portrait, and a short reported scene.
2. Round one, `The restaurant` (or `The bar`): as many questions about their work, training, menu and daily rhythm as the interview earns, with one pull quote.
3. Round two, `Dinner and a date`: the same eight questions for every profile, in this order: the first thing you cooked for someone you liked; what you ate on your last day off; cook for your date or cook together; what you order to judge a restaurant; the most overrated romantic ingredient; how long a date dinner should take; what you cook the morning after; table six is on a bad date, send something over or leave them alone. Each answer card stands on its own.
4. The last question, `What would you make for a date night at home?`, whose answer is their Contributor Recipe. It is the same question that closes their restaurant's review, so the two pages meet.
5. Sidebar, `The short version`: venue, neighbourhood, cuisine, where they're from, where they trained, the year they started, and a link to the review.

## Contributor Recipe

A recipe is published only when supplied and attributed to a named chef or bartender. It is not a recreation, adaptation, or “inspired by” version unless the contributor has explicitly supplied and approved that precise version.

**SEO title pattern**

`{Dish}: {Name}'s Date-Night Recipe`

**H1**

`{Dish}`

**Ordered structure**

1. Attribution: contributor, role, venue, and the original context for cooking it at home.
2. At-a-glance facts: serves, active time, total time, difficulty, equipment, and dietary notes.
3. `Ingredients`.
4. `Method`.
5. `Notes from {Name}`: supplied advice, substitutions, and mistakes to avoid.
6. `Pair it with`: a specific DMD venue, drink, or Date Spot only when editorially earned.
7. Source and testing note: what DMD tested, if anything, without changing the contributor's recipe.

## Activity and Chef-led Experience Date Spots

Activity and Chef-led Experience Date Spots are the non-restaurant, non-bar variants. A Chef-led Experience is labelled as such and names its host. Do not duplicate a Restaurant or Bar Date Spot as an Activity Date Spot; link to its review instead.

**SEO title pattern**

`{Place}, {Neighbourhood}: Date Spot Guide`

**H1**

`{Place}`

**Ordered structure**

1. Category kicker, opening (what it is, where it is, the specific date context), byline with visited, published and checked dates, and the hero photo.
2. `When it works`: rows that name their own situation ("After dinner, summer", "November to April"), each `Ideal`, `Works, with a caveat` or `Not the one`, with a reason.
3. `What it actually is`: two short paragraphs, the experience at the hour you'd go and then the history or small story, with the same honesty rule as the reviews.
4. `How to do it well`: labelled tips (Timing, Entrance, Bring, and so on).
5. `Pair it with`: published Restaurants or Bars in the same city, with the walk in minutes and each one's verdict.
6. Sidebar: the Essentials card with Our take (the verdict, optionally qualified: "A favourite, in season"), category, cost, how long to allow, season, booking, transit, step-free access and map; the five categories; and more spots in the same category.

## Geography and maintenance

Montréal is DMD's Home Market. Travel Reviews are allowed whenever Victor Vu reports a venue elsewhere; they name their actual city and do not create an implied local-coverage promise.

Dynamic information is not silently overwritten. Recheck venue facts every six months and seasonal Date Spots before the relevant season. Scheduled automation may create research or maintenance reminders but may not draft, translate, score, publish, or change reader-facing content.

## Publishing a Notion Story

Each supported Post Type has a Notion Story template in `notion/templates/`
listing its database properties and its Locale Pair's exact JSON shape (one
Notion "code" block per locale, English then Canadian French). Nothing
about a Story is generated: every property and every field in those code
blocks is written by Victor in Notion.

**Status flow.** A Story is picked up once its `Status` is `Ready to
Publish`. `scripts/fetch-notion-story.mjs` (run by the `Publish Notion
Story` workflow) selects the lowest-numbered Story that is either
unpublished or has been edited in Notion since its last sync, downloads and
resizes its Editorial Image, maps its properties and Locale Pair onto the
matching content contract in `src/content-contracts/`, and runs the result
through the publish gate.

**What the gate enforces**, beyond the schema itself:

- The three sign-off checkboxes (`Human reporting`, `Human translation`,
  `DMD-held photograph`) are all checked.
- The Notion database carries no leftover numeric score or rating property.
- Google review snapshots are append-only: earlier lines are kept exactly.
- Links into the other collections resolve: a review's recipe card and chef
  page, a profile's companion review, a recipe's pairings.
- **Dated updates.** Republishing an already-live Date Spot with a changed
  verdict, Good-for Signal or When-it-works row, or Essentials
  requires a new Material update, dated after the previous `Last checked`,
  in both locales. A recommendation cannot change silently.

**On success**, the workflow opens a draft PR with the updated collection
JSON, the resized image, and the updated `notion/published.json`. Merging
that PR, after the usual PR checks and review, is the act of publishing;
nothing else does.

**On failure**, nothing on the site changes. The workflow opens or updates
a `notion-story`-labelled issue listing exactly what to fix in Notion.
There is no partial or silent publish.

## Maintenance reminders

`scripts/venue-maintenance-reminders.mjs` (run monthly by the `Venue
Maintenance Reminders` workflow) reads `src/content/date-spots.json` and
flags any Date Spot whose `Last checked` is over six months old, or whose
planning copy names a `season` (flagged every run, since a season can't be
scheduled exactly by cron). It opens or updates a single tracking issue
with a checklist. This script only ever reports; the recheck itself,
updating the Notion Story, and republishing through the flow above are
Victor's.
