# Bulk Audit

Run the `/seo-audit` checks across every published post (Reviews, Date Spots, Chefs, Chef Recipe Cards) and produce one collection-wide scorecard.

## Scope (hard rules)

The same rules as `/seo-audit`, which follow `docs/editorial-publishing-system.md` ("SEO rules", "Edit policy", "Performance budgets"):

- **Companion File fields only**: `metaTitle`, `metaDescription`, `imageAlt` and `pairItWith` in `src/content/editorial/{slug}.json`, in either locale, plus a `spotId` on an existing Make a night of it pick, as `/seo-audit` describes. Nothing else.
- **No prose edits.** Prose is Notion's. Report prose suggestions for Victor to make in Notion.
- **No new content.** Never create a post, a Companion File for a post that has none, or any file under `src/content/`. Content gaps (a neighbourhood with no Date Spots, a Make a night of it pick whose venue has no Date Spot page yet) go in the report under "Gaps", not into a file.
- Never change the verdict, signals, Spot Type, category, neighbourhood, Checked date, update lines, Google Snapshot lines, Instagram handle or booking link.
- Never pad toward a word count; never add `Review`, `AggregateRating` or `FAQPage` markup; no em-dashes.

This command does the same job as the weekly SEO maintenance routine (`routines/weekly-seo-maintenance.md`), run by hand.

## Input
- No arguments: audits every published post.
- Optional `--report-only`: change nothing, only report.

## Steps

1. **Collect the posts.** Every record in `src/content/date-spots.json`, `src/content/extended-profiles.json` and `src/content/contributor-recipes.json`, with its Companion File merged over it. If all three are empty (the site is in maintenance mode until the first posts are imported), say so and stop.

2. **Run the guards once.** `npm run validate:source`, then `npm run build`. Record every failure and warning per post.

3. **Read the ranking data.** The latest files in `data/seo/` (from `weekly-seo-ranking.yml`) and `data/lighthouse/` (from `weekly-seo-audit.yml`). Use them to rank posts with impressions but a weak click-through rate or slipping positions first.

4. **Audit each post** with the checklist in `/seo-audit` step 3, both locales.

5. **Fix** what the allowed Companion File fields can fix, unless `--report-only`. Then run `npm run check`, `npm run test:contracts` and `npm run build`; all must pass.

6. **Report:**

   ```
   === Bulk SEO Audit: YYYY-MM-DD ===
   Reviews: X | Date Spots: X | Chefs: X | Recipe Cards: X

   | Post | Type | Meta | Structured data | Words (EN/FR) | Internal links | Images | Issues |
   |------|------|------|-----------------|---------------|----------------|--------|--------|

   --- Validator warnings ---
   (word counts below 1,000, internal links below nine, favourite above one in four)

   --- Companion File changes ---
   (post, locale, field, before, after, reason)

   --- Prose suggestions for Notion ---
   (post, Notion row, quoted sentence, proposed fix)

   --- Gaps ---
   (content that is missing; never filled here)
   ```

   End with the single highest-impact fix, and whether it is a Companion File change or a Notion edit for Victor.
