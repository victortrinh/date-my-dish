# SEO Audit

Audit one published post (Review, Date Spot, Chef or Chef Recipe Card) against the SEO rules and performance budgets in `docs/editorial-publishing-system.md`, and fix what its Companion File can fix.

## Scope (hard rules)

Read the spec's "SEO rules", "Edit policy" and "Performance budgets" first. Terms are in `CONTEXT.md`.

- **Companion File fields only.** The only file you may edit is the post's Companion File, `src/content/editorial/{slug}.json`, and only these fields, in either locale (`locales.en`, `locales.fr-CA`):
  - `metaTitle`: leads with `{Name}, {Neighbourhood}` (Reviews: `{Name}, {Neighbourhood}: Review & Date Night Guide`, shortened when the name is long). 46 characters or fewer, so the rendered `<title>` with the site suffix stays at 60 or fewer.
  - `metaDescription`: 120 to 160 characters, aim for 150 to 160. Write the FR one from the FR prose; never translate the EN meta.
  - `imageAlt`: describes the plate or the place, no "Image of" prefix.
  - Internal links: `makeANight` (Reviews) and `pairItWith` (Date Spots), pointing only at published posts.
- **No prose edits.** Prose belongs to the read-only Notion database. Never change a sentence, heading, paragraph order or table cell in the collection JSON (`src/content/date-spots.json`, `extended-profiles.json`, `contributor-recipes.json`). Prose problems (spelling, an H2 that could be phrased as a searcher's question, an overlong paragraph) are reported for Victor to fix in Notion; the Importer carries the fix over on the next sync.
- **No new content.** Never create a post, a Companion File for a post that has none, or any other file under `src/content/`. Report content gaps; never fill them.
- Never change Victor's calls: verdict and reason, Good-for and When-it-works signals, Spot Type, category, neighbourhood, Checked date, update lines, Google Snapshot lines, Instagram handle, booking link.
- Never pad toward a word count or add sections to raise the internal-link count.
- Never add `Review`, `AggregateRating` or `FAQPage` structured data, and never put the Google rating in JSON-LD.
- No em-dashes anywhere, including your report.

## Input
- Post slug (the record's `id`, which is also the Companion File name): $ARGUMENTS

## Steps

1. **Find the post.** Look the slug up in the three collections:

   | Post type | Collection | English URL | French URL |
   |---|---|---|---|
   | Review (`spotType` `restaurant` or `bar`) | `src/content/date-spots.json` | `/en/reviews/{neighbourhood}/{slug}/` | `/fr/critiques/{neighbourhood}/{slug}/` |
   | Date Spot (`spotType` `activity` or `chef-led`) | `src/content/date-spots.json` | `/en/date-spots/{slug}/` | `/fr/lieux/{slug}/` |
   | Chef | `src/content/extended-profiles.json` | `/en/chefs/{slug}/` | `/fr/chefs/{slug}/` |
   | Chef Recipe Card | `src/content/contributor-recipes.json` | `/en/recipe-cards/{slug}/` | `/fr/fiches-recettes/{slug}/` |

   Read the record and its Companion File together: Companion File fields win when merged (`loadCollection()` in `src/content-contracts/load.mjs`). If the slug is not published, say so and stop.

2. **Run the guards.** `npm run validate:source`, then `npm run build` (which runs `validate:build`). Note every failure and warning that names this post (word count, internal links below nine, meta lengths, `favourite` share, photo budgets).

3. **Inspect the built pages** in `dist/client/` for both locales:

   | Check | Rule |
   |---|---|
   | H1 | Exactly one; for a Review or Date Spot it reads `{Name}, {Neighbourhood}` |
   | `<title>` | Leads with `{Name}, {Neighbourhood}`; 60 characters or fewer including the suffix |
   | Meta description | 120 to 160 characters |
   | Canonical and hreflang | Self-canonical; EN, FR and x-default alternates; every URL ends in a slash and returns 200 |
   | Structured data | `Article` with `datePublished` and `dateModified` (from Checked), `BreadcrumbList` matching the visible breadcrumb, `Restaurant` or `BarOrPub` as `about` with address, `servesCuisine`, `priceRange`, the chef as a `Person`; recipe cards add `Recipe`. No `Review`, `AggregateRating`, `Rating` or `FAQPage`, no Google rating |
   | H2s | Phrased the way a person would ask; dish names are H3s (report only) |
   | Word count | Warn below 1,000 reader-facing words per locale, block below 300 (report; never pad) |
   | Internal links | Earned links (Make a night of it, neighbourhood guide, recipe card, chef page, nearby reviews); warn below nine. No link to a redirect, retired page or the bare apex |
   | Images | Descriptive filenames and alt text, explicit width and height, hero under 200 KB with AVIF and WebP and a WebP fallback, below-the-fold images `loading="lazy"` |
   | Required sections | The spec's minimum for the post type is present; optional sections render only with content, never as a placeholder |
   | Checked | "Checked {month}" is shown and matches `lastChecked` |
   | Locale Pair | EN and FR agree on everything but the words (sections, signals, links, dates) |

4. **Fix** what is out of policy using only the Companion File fields above. Run `npm run check`, `npm run test:contracts` and `npm run build` again; all must pass.

## Output

A scorecard per locale: pass, warn or fail for each check above, the Companion File changes you made (field, before, after, reason), and a separate list of prose suggestions and content gaps for Victor, each quoting the sentence and naming the post and its Notion row (`notion/published.json`).
