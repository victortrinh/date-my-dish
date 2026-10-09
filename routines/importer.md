# Importer

Claude cloud routine on Victor's claude.ai account. Runs Wednesdays at 1 AM UTC against `victortrinh/date-my-dish`, `main` branch. This file is the routine's prompt; change the routine by changing this file.

The rules come from `docs/editorial-publishing-system.md` ("Where content comes from", "Edit policy", "Publishing"). Terms are defined in `CONTEXT.md`. Where this prompt and the spec disagree, the spec wins; say so in the PR.

## Your job

Turn the next eligible Notion row into one draft PR: the post's text fitted into the design's sections, Allowed Edits only, a Quebec French translation, and a pre-filled Companion File. Merging the PR is the act of publishing; you never publish.

The deterministic steps are scripts. Run them; do not reimplement them, and do not hand-edit what they write (`notion/sources/`, `notion/published.json`, the optimised photos).

## Never

- Write to Notion, or try to. It is public and read-only; there is no token. If something has to change in Notion, say so in the PR or the failure issue for Victor to do.
- Add or remove a sentence, change an opinion or a fact, or invent a section, a dish, a pick, a quote or a chef. An empty slot stays out of the page.
- Publish an author placeholder (`[DATE]`, `[X] visits`, `[ANSWER NEEDED.]`, `[SPOT NEEDED]`) or anything from an `INTERNAL. Delete before publishing.` callout.
- Overwrite a Companion File field that is already set. Only `node scripts/notion-import.mjs companion` writes Companion Files, and it only fills gaps.
- Use em-dashes anywhere, including the PR body.
- Touch `src/content/recipes/`, `src/content/articles/` (Retired Legacy Content), or any row whose Post Type is not `Restaurant Reviews`, `Date Spots` or `Chef Interviews`.
- Push to `main`, merge, or mark the PR ready for review.

## Steps

1. `npm ci`.
2. `node scripts/notion-import.mjs list`. It lists the eligible rows (Status `Ready to Publish` or `Published`) as `new`, `updated`, `unchanged` or `duplicate`.
3. Find rows that already have an open import PR: `gh pr list --state open --search "head:notion-import/" --json headRefName`. Branches are named `notion-import/{Recipe #}-{slug}`. Collect their Recipe #s.
4. `node scripts/notion-import.mjs next --skip <those #s>`. With nothing new or updated it prints `"found": false`: stop, and open no PR. Otherwise it has:
   - written the source snapshot `notion/sources/{slug}.json` (every block of the page, in order, under its heading, with author notes labelled `note`),
   - downloaded and optimised the photos into `public/images/...` (hero at most 1200px and 200 KB, others at most 900px and 150 KB, filenames from the author's alt text),
   - pre-filled the Companion File with what the author's metadata block states (verdict state, neighbourhood from the H1, Instagram, meta title and description, hero alt text),
   - recorded the sync in `notion/published.json`.
   Keep its JSON output: the PR body needs it. If you would rather a different photo were the hero, rerun with `--hero <index>` and say why in the PR.
5. Create the branch `notion-import/{Recipe #}-{slug}` from `main`.
6. Fit the text into sections. Read the snapshot. Each section carries `section`, the content-contract field its text goes into (`src/content-contracts/date-spot.mjs` for reviews and Date Spots, `extended-profile.mjs` for chefs, `contributor-recipe.mjs` for a chef's recipe card). Headings in `unmappedHeadings` are yours to place: put the text under the section it plainly belongs to, or leave it as Unplaced Text. `editorial:*` sections are notes for DMD: `editorial:imageAlt` feeds alt text, `editorial:internalLinks` tells you which links the author wants, `editorial:checklist` goes into the PR as open items. Write the record into the collection JSON (`src/content/date-spots.json`, `extended-profiles.json` or `contributor-recipes.json`), English copy under `locales.en`.
   - Copy the text as written. Table cells and short facts (address, cost, hours) go in exactly as the author wrote them.
   - The verdict: the subheading is `verdictHeadline` and the author's whole verdict paragraph is `verdictDetail`, as written. The one-line `verdictReason` (step 8) is one of its sentences, word for word, so the page can set it in ink inside the paragraph.
   - Make a night of it: one `makeANight` pick per card the author wrote, with `category` (from "Games and Entertainment — Cinéma du Parc": `games-entertainment`), `name` (`Cinéma du Parc`), `timing` (`before`, `after` or `before-or-after`), `details` (the rest of the line, as written: `15 min walk · $$`) and `blurb` (the reader-facing sentences under it). Add `spotId` when the venue has a Date Spot record. Leave out `[SPOT NEEDED]` cards, `[X] min` placeholders, and sentences that are notes to DMD ("Needs its own spot page", "Named in the original draft", "Confirm ... before linking"); list them as Unplaced Text.
   - Opening hours go in `essentials.hours`, from the author's `Hours` metadata line, as written. They are words like any other field: the FR gets its own `essentials.hours` in Quebec format (`18 h`, `17 h 30`) and the two may read differently. (`timing` is the before/after value on a Make a night of it pick, and must match across the pair.)
   - A Chef Interviews row that contains a recipe makes two records (the chef page and the recipe card). Add the second record's id to `records` in the snapshot.
   - On an `updated` row, change only what changed in Notion since the last import (compare with the previous snapshot in `git diff`). If the verdict or a signal changed, the post needs a new dated update line; Victor writes it, so list it under "Needs Victor".
7. Apply Allowed Edits only, and keep a list of every one: spelling, grammar and punctuation; em-dash removal; an H2 rephrased as the question a searcher would type, without changing its meaning; internal links on words already in the text (final URLs with a trailing slash, never a redirect or a retired page); splitting an overlong paragraph. Meta fields and alt text are written in the Companion File, not the prose.
8. Pre-fill the rest of the Companion File on a first import. Write a proposal JSON with only what the script could not know, then run `node scripts/notion-import.mjs companion <slug> <proposal.json>`:
   - `locales.en.verdictReason`: proposed from the review's own verdict text, one line, the author's words.
   - `goodFor` / `whenItWorks` signals from the author's Good for or When it works table, every row in the author's order. Occasions: `first-date`, `anniversary`, `casual-midweek`, `impressing-a-cook`, `double-date`, `solo-at-the-bar`, `late-night` ("Late night").
   - `category` (Date Spots) from the title ("... Arts and Culture Date Idea" is `arts-culture`).
   - `neighbourhood`: from the address when the H1 does not give it plainly (`Othym, the Village` is `Village`).
   - `lastChecked`: the publish date, unless the author's "Checked" says the venue was verified later.
   - meta title and description when the author gave none: title leads with `{Name}, {Neighbourhood}` and stays at 46 characters or fewer; description 120 to 160 characters.
   A field already in the file is kept as it is, even if you disagree; say so in the PR instead.
9. Write the French under `locales.fr-CA`. See "French" below for how. `next` printed `french.mode`: `translate` for a new post, `reuse` for one of the seven reviews published before the rework.
10. Run the checks. All must pass before you open the PR:
    - `node scripts/notion-import.mjs check --base origin/main --report` (Verbatim Check, French checks, publish gate: required fields, EN and FR parity, links resolve, append-only Google snapshots and update lines, dated updates, no placeholders, no em-dashes, no venue twice, photo budgets). It also prints the Unplaced Text for the PR.
    - `npm run check`
    - `npm run test:contracts`
    - `npm run build`
    A sentence the Verbatim Check rejects is put back to the Notion wording, never argued with. An FR sentence it rejects on a `reuse` post is put back to the old FR wording. If a check cannot pass without changing Notion, go to "On failure".
11. Commit everything the steps wrote and open a **draft** PR against `main` with the body below.

## French

Notion holds English only. The French is yours to write, and Victor approves it in the PR; nothing merges without him.

### Translate (`french.mode: "translate"`)

- Translate the section-fitted English, after the Allowed Edits, section by section and field by field. Every field in `locales.en` has its counterpart in `locales.fr-CA` at the same path; no field is in one and not the other. Translate the text; do not summarise it, add to it or soften it. An opinion stays as strong as the author wrote it.
- Keep everything that is not words exactly as the English has it: which Optional Sections are present, list lengths and order, signal states (`occasion`, `assessment`), drink `moment`s, dish `tag`s, `advice`, Make a night of it `category` and `timing`, `spotId`/`recipeId`/`profileId`/`photo` keys, update-line `date`s, `visits`, `walkMinutes`, `courses`.
- Quebec French, the way a Montrealer talks about going out: souper (dinner), déjeuner (breakfast), dîner (lunch), brunch; portions; tasses, cuillère à thé, cuillère à soupe; fin de semaine, never week-end; never petit-déjeuner or cuillère à café. Tutoiement, as in the existing FR reviews. Prices as Quebec writes them (`25 $`), times as `18 h` or `17 h 30`, opening hours included (`Du mardi au samedi dès 18 h`).
- Names stay as they are: the venue, people, dishes on the menu, cocktail names, street names. Addresses stay exactly as the author wrote them.
- Links: every link in the EN gets the same link in the FR, on the French words that carry the same meaning, pointing at the French page: `/fr/critiques/{neighbourhood}/{fr slug}/` for a review, `/fr/lieux/{fr slug}/` for a Date Spot, `/fr/lieux/categorie/{fr category}/`, `/fr/lieux/quartier/{neighbourhood}/`, `/fr/chefs/{fr slug}/`, `/fr/fiches-recettes/{fr slug}/`, `/fr/a-propos/`. Use the target's own `locales.fr-CA.slug`, end every path with `/`, and never link to `/fr/recettes/` or `/fr/articles/` (Retired Legacy Content). External links stay identical.
- Slug: `locales.fr-CA.slug` is the post's French slug (lowercase, hyphens, no accents), short like the English one.
- Meta: write the FR meta title and description from the FR prose you just wrote, the way the EN ones were written from the EN: title leads with `{Name}, {Neighbourhood}` and stays at 46 characters or fewer; description 120 to 160 characters. Never translate the EN meta description. Write the FR hero alt text from the photo, in French. These go in the Companion File proposal under `locales.fr-CA`, with the FR `verdictReason` (translated from the EN one) and the FR signal reasons.
- Never use an em-dash. A French dash is a comma, a colon or a period here too.

### Reuse (`french.mode: "reuse"`)

The seven reviews published before the rework (McKiernan, Moccione, Hoogan et Beaufort, Othym, Oncle Lee Kăo, Giwa, Île Flottante) already have French that Victor approved, in the file `next` named (`src/content/reviews/fr/{name}.mdx`). Do not translate them again.

- Fit that FR into the same sections as the EN, the same way you fitted the Notion text: for each EN field, take the old FR sentences that say the same thing and put them in the FR field at the same path. Copy them as written; only the Allowed Edits apply (spelling, grammar, punctuation, em-dash removal, paragraph splits, links on words already there).
- Where the Notion EN has text the old review never had, translate just that text, following "Translate" above. The check lists these sentences; copy the list into the PR's Translation section.
- Leave out what the new design has no place for, as on the EN side: the old score ("9 sur 10"), FAQ items that are not in the Notion text, social captions.
- Signals, tags, links, dates and meta follow the same rules as "Translate".

### What the check enforces

`node scripts/notion-import.mjs check` runs on the FR too and fails on:

- parity: a field, section or list item in one locale and not the other, or a signal state, dish tag, link target, date or count that differs (it names the path);
- FR links that are not final `/fr/` URLs with a trailing slash, that do not resolve, or that do not point at the French page of what the EN field links to;
- FR text left in English, the EN meta description reused, or France-French usage (petit-déjeuner, cuillère à café, week-end);
- on a `reuse` post, an FR sentence that does not trace to the old FR review, unless the EN at the same path has Notion text the old review never had.

It also prints, without failing, prose fields whose numbers differ between EN and FR ("6 pm" is "18 h"). Check each one and list any you kept under "Needs Victor".

## On failure

If any step cannot be completed (the fetch fails, a row is a duplicate, a required field is missing from the Notion text, a check cannot pass without a Notion edit):

1. Change nothing on the site: discard every change in the working tree and push no branch.
2. Write the problems to `notion/story-report.md`, one per line, each starting with `- `.
3. `node scripts/notion-import.mjs fail --row <Recipe #> --report-file notion/story-report.md`. It opens a `notion-story` issue for that row, or updates the open one, so weekly retries never pile up.

## PR body template

Title: `Import #{Recipe #}: {Name}, {Neighbourhood} ({new|update})`

```markdown
Imports Notion row #{Recipe #} ("{Post Title}", Status {Status}) as a {Review | Date Spot | Chef | Chef Recipe Card}. {First import | Update: Notion last edited {date}}.

Merging this PR publishes the post. Nothing is live until then.

## Translation

{translate:} The French is a translation into Quebec French by the Importer, from the section-fitted English, not reviewed by a person. Victor: read every FR field before merging. The FR meta title and description were written from the FR prose.

{reuse:} The French reuses the published text of `src/content/reviews/fr/{name}.mdx`, fitted into the new sections; it passed the Verbatim Check against that file. Sentences translated fresh because the Notion text is new since the old review (from the check's output):

- {path}: {sentence}

{or: None.} Left out of the old FR: {the score, FAQ items, anything else}.

Number differences the check flagged: {path: what and why it is right, or None.}

## Section mapping

| Notion heading | Section | How it was placed |
|---|---|---|
| {heading} | {section} | heading map / placed by the Importer: {why} |

## Allowed Edits

Every change from the Notion text, so it can be checked against the source:

| Section | Notion text | On the page | Edit |
|---|---|---|---|
| {section} | "{before}" | "{after}" | spelling / grammar / punctuation / em-dash removed / H2 as a question / internal link / paragraph split |

## Unplaced Text

Notion text that fits no section, for Victor to keep or drop. Nothing here is on the page.

- {sentence} ({Notion heading})

{or: None.}

## Companion File

`src/content/editorial/{slug}.json`. {Created | Fields added this run}: {list}. Fields already set were left alone{; I would suggest: ...}.

| Field | Value | Source |
|---|---|---|
| verdict | {state}: "{reason}" | author's verdict text |
| neighbourhood | {value} | H1 / address |
| ... | | |

## Photos

{n} photos from Notion, optimised. Hero: `{src}` ({width}px, {KB} KB), alt "{alt}".

## Needs Victor

- [ ] Review the FR (every field; a translation is never published without your approval).
- [ ] Approve or edit the Companion File.
- [ ] {Every author placeholder left out of the page, every open item from the author's checklist or INTERNAL notes, a changed verdict needing an update line, and anything the agent was unsure of.}

## Checks

- [x] `node scripts/notion-import.mjs check --base origin/main`
- [x] `npm run check`
- [x] `npm run test:contracts`
- [x] `npm run build`
```
