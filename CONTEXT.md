# Date My Dish Editorial Context

Date My Dish is a Montreal date-night guide. Its reporting connects places to go, the people who make them, and practical ways to plan the evening. The full rules live in `docs/editorial-publishing-system.md`.

## Editorial content

**Review**:
A post assessing a Restaurant or Bar, built from the review page design. Restaurant and Bar share one template and one recommendation system.
_Avoid_: Scorecard, separate restaurant and bar content types

**Date Spot**:
A post recommending an activity or a Chef-led Experience for a date, built from the date spot page design and carrying one of five categories.
_Avoid_: Date idea, generic listing

**Spot Type**:
`restaurant`, `bar`, `activity` or `chef-led`. Restaurant and bar make a Review; activity and chef-led make a Date Spot.
_Avoid_: Post Type (that is the Notion property)

**Chef-led Experience**:
A Date Spot whose activity is delivered by a named chef or bartender, such as a cooking class, tasting or supper club.
_Avoid_: Restaurant event

**Chef**:
A post built from the chef page design: a Q&A with the chef behind a reviewed venue.
_Avoid_: Extended Profile, founder profile

**Chef Recipe Card**:
An at-home recipe supplied by a named chef, linked from their review and chef page.
_Avoid_: House recipe, inspired-by recipe, home recipe

**Verdict**:
The qualitative recommendation on every Review and Date Spot, stored as `favourite`, `conditional` or `pass`, always with a reason.
_Avoid_: Date score, rating, stars

**Good-for Signal**:
A reasoned row saying how well a Review suits one date occasion: `Ideal`, `Works, with a caveat` or `Not the one`. Date Spots use the same states as When-it-works rows.
_Avoid_: Date type fit, compatibility score

**Google Snapshot**:
The venue's own Google rating and review count, printed with the date it was recorded, labelled as theirs, appended and never overwritten, and never put in DMD's structured data.
_Avoid_: Live rating, our rating

**Optional Section**:
Any page section outside a post type's required minimum. It renders only when it has content and is never filled with invented material.
_Avoid_: Placeholder, filler section

**Make a Night of It**:
The review section with the author's picks for before or after, up to five, one per category, in a fixed category order. A pick whose Date Spot is published links to its page; one without a page shows unlinked.
_Avoid_: Related posts box

**Reporter Byline**:
The factual credit for DMD's reporting: Victor Vu, printed as "Victor".
_Avoid_: Home-cook creator, anonymous critic

**Editorial Voice**:
DMD's publication-level "we" for practical copy; first person appears only in the signed My note.
_Avoid_: Founder voice

**Home Market**:
Montréal. A venue elsewhere is a Travel Review that names its actual city.
_Avoid_: Canada-wide guide

## Content sources

**Notion Source**:
The public, read-only Notion database every post is fetched from. DMD never writes to it and takes its properties and free-form page bodies as they are.
_Avoid_: CMS we control, Notion Story template

**Companion File**:
`src/content/editorial/{slug}.json`: the fields Notion does not carry and DMD controls (verdict, signals, neighbourhood, Checked date, Google Snapshot, Instagram, meta fields, alt text, internal links). Pre-filled by the Importer, approved by Victor, never overwritten by a later import.
_Avoid_: Overlay, frontmatter

**Importer**:
The Claude cloud routine that turns an eligible Notion row into a draft PR: sections fitted, allowed edits applied, FR translated, Companion File pre-filled.
_Avoid_: Auto-publisher (merging the PR is what publishes)

**Allowed Edit**:
One of the only changes the site may make to Notion prose: spelling, grammar, punctuation, em-dash removal, meta fields, alt text, an H2 rephrased as a question without changing its meaning, internal links on existing words, splitting a long paragraph.
_Avoid_: Rewrite, polish, padding

**Verbatim Check**:
The PR check that fails when a sentence on a page cannot be traced to its Notion source after Allowed Edits.

**Unplaced Text**:
Notion text the Importer could not fit into any section, listed in the PR for Victor to keep or drop.

**Locale Pair**:
The English and Quebec French versions of a post, published together. FR is translated by the Importer and approved by Victor.
_Avoid_: Partial translation, EN-only page

**Checked Date**:
The month the venue facts were last verified. Defaults to the publish date, printed as "Checked {month}", and feeds `dateModified`.
_Avoid_: Silently refreshed page

**Retired Legacy Content**:
Home recipes, informative articles and affiliate articles. Their pages are gone (404, no redirect) and their Notion rows are ignored.
_Avoid_: Archived content, redirect target
