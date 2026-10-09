# Weekly SEO maintenance

Claude cloud routine on Victor's claude.ai account. Runs Sundays at 5 AM UTC against `victortrinh/date-my-dish`, `main` branch. This file is the routine's prompt; change the routine by changing this file.

The rules come from `docs/editorial-publishing-system.md` ("SEO rules", "Edit policy", "Scheduled work"). Terms are defined in `CONTEXT.md`. Where this prompt and the spec disagree, the spec wins; say so in the PR.

## Your job

Audit every published post and fix what the Companion File can fix. Everything else is reported, not edited.

Published posts are the four post types and nothing else:

| Post type | Collection | English URL |
|---|---|---|
| Review (restaurant or bar) | `src/content/date-spots.json` | `/en/reviews/{neighbourhood}/{slug}/` |
| Date Spot (activity or chef-led) | `src/content/date-spots.json` | `/en/date-spots/{slug}/` |
| Chef | `src/content/extended-profiles.json` | `/en/chefs/{slug}/` |
| Chef Recipe Card | `src/content/contributor-recipes.json` | `/en/recipe-cards/{slug}/` |

Each has a Companion File at `src/content/editorial/{slug}.json`.

## Allowed edits

You may change only these Companion File fields, in either locale:

- **Meta title**: leads with `{Name}, {Neighbourhood}` (Reviews: `{Name}, {Neighbourhood}: Review & Date Night Guide`, shortened when the name is long). The rendered `<title>`, including the site suffix, stays at 60 characters or fewer.
- **Meta description**: 120 to 160 characters, aim for 150 to 160. Write the FR one from the FR prose; never translate the EN meta.
- **Alt text**: describes the plate or the place. No "Image of" prefix.
- **Internal links**: links on words that already exist in the prose, pointing at a published post's final URL (trailing slash, never a redirect, a retired page or the bare apex). Prefer the links the spec counts: Make a night of it picks, the neighbourhood guide, the recipe card, the chef page, nearby reviews.
- **Make a night of it links**: Make a night of it picks are the author's, imported from Notion into the record (`locales.*.makeANight` in `src/content/date-spots.json`); a pick with no published Date Spot shows unlinked. The one link edit there: when a pick's venue now has a published Date Spot, add that Date Spot's id as the pick's `spotId`, in both locales, changing nothing else in the pick. Never set `makeANight` in a Companion File: it would replace the author's picks.

Nothing else. In particular, do not change the verdict or its reason, Good-for or When-it-works signals, Spot Type, category, neighbourhood, Checked date, update lines, Google Snapshot lines, Instagram handle or booking link. Those are Victor's calls.

## Never

- Create a post, a Companion File for a post that has none, or any file under `src/content/`.
- Edit prose. Prose belongs to Notion, and Notion is read-only. That includes sentences, headings, paragraph order and FAQ-style additions.
- Pad a page toward a word count, or add sections to raise the internal-link count.
- Touch `src/content/recipes/` or `src/content/articles/` (Retired Legacy Content), or `notion/published.json`.
- Add `Review`, `AggregateRating` or `FAQPage` structured data.
- Use em-dashes anywhere, including PR and issue text.
- Push to `main` or merge anything.

## Steps

1. `npm ci`, then `npm run build`. Note every validator warning (word counts, internal links below nine, meta lengths).
2. Read the latest ranking data in `data/seo/` (from `weekly-seo-ranking.yml`) and the latest Lighthouse results in `data/lighthouse/` (from `weekly-seo-audit.yml`). Use them to prioritise posts with impressions but a weak click-through rate or slipping positions.
3. For each published post, check its meta title, meta description, alt text and internal links against the rules above, in both locales. Fix what is out of policy or clearly weak, using only the allowed edits.
4. Run `npm run check` and `npm run build` again. Both must pass.
5. If you changed anything, open one PR from a `chore/seo-maintenance-YYYY-MM-DD` branch. The body lists every changed field as before and after, with the reason (validator warning, ranking data, or rule).
6. Collect prose suggestions (spelling, grammar, punctuation, an H2 that could be phrased as the question a searcher would type, an overlong paragraph) into one issue titled `SEO prose suggestions: YYYY-MM-DD`. Quote the sentence, name the post and the Notion row, and propose the fix. These are for Victor to make in Notion; the Importer carries them over on the next sync. Close last week's issue as superseded.
7. Report content gaps (for example a neighbourhood with no Date Spots, or a Make a night of it pick whose venue has no Date Spot page yet) in the same issue under "Gaps". Reporting a gap is fine; filling it is not.

If nothing needs changing, open no PR, and open the issue only when there are suggestions.
