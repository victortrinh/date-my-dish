# Validate Content

Check the integrity of every published post (Reviews, Date Spots, Chefs, Chef Recipe Cards): content contracts, Companion Files, Locale Pairs, Notion source traceability, images and cross-links. Report-only: this command changes nothing.

The rules come from `docs/editorial-publishing-system.md`; terms are in `CONTEXT.md`. Fixes happen elsewhere: prose in Notion (the Importer carries it over), Companion File fields through `/seo-audit` or the Importer PR, everything else through Victor.

## Input
- Optional post slug: $ARGUMENTS. Without one, validate everything.

## Steps

1. **Run the deterministic guards.** They are the source of truth; do not reimplement them.
   - `node scripts/validate-date-spots.mjs`: Reviews and Date Spots with their Companion Files merged (`src/content/editorial/{slug}.json`). Contracts and missing required fields, EN/FR parity, append-only Google snapshots and update lines, links into the chef and recipe card collections. Warns below 1,000 words, below nine internal links and when `favourite` passes one in four; fails below 300 words.
   - `node scripts/notion-import.mjs check --report` (add `--base origin/main` on a branch): every published record has a source snapshot in `notion/sources/`, the Verbatim Check, the publish gate (no author placeholders or em-dashes, no venue twice, photo budgets) and the Unplaced Text.
   - `node scripts/validate-contributor-content.mjs`: Chefs and Chef Recipe Cards, and that each declared photo exists under `public/`.
   - `node scripts/validate-descriptions.mjs`: meta titles (46 characters or fewer) and meta descriptions (120 to 160).
   - `node scripts/validate-source.mjs`: `<Picture>` `fallbackFormat` and taxonomy translations.
   - `npm run test:contracts`.
   - With a fresh `npm run build`: `npm run validate:build` (hreflang, sitemap, meta lengths, links to redirects, untranslated keys, image sizes, performance budgets, no rating markup) and `node scripts/validate-retired-content.mjs` (no retired recipe or article route or URL in `dist/`).

2. **Check what the guards do not cover.** For each post (or the one given):
   - **Companion File**: one exists for every published record, and no Companion File is orphaned (no matching record id).
   - **Notion sync**: the record's Notion row is in `notion/published.json` and its snapshot in `notion/sources/{slug}.json`.
   - **Images**: every `image.src` and photo resolves to a file under `public/images/` (`date-spots/`, `profiles/` or `contributor-recipes/`); no file in those folders is unreferenced; filenames are descriptive, not camera names.
   - **Cross-links**: `makeANight` and `pairItWith` point only at published posts, Make a night of it keeps the fixed category order with at most one card per category, a chef links to their published review and recipe card, and every internal URL is final (trailing slash, not a `public/_redirects` source, not a retired page, not the bare apex). French links use the French route segments (`/fr/critiques/`, `/fr/lieux/`, `/fr/fiches-recettes/`).
   - **Optional Sections**: no empty or placeholder section in the data (empty arrays, `TBD`, bracketed author notes).

3. **Report:**

   ```
   === Content Validation: YYYY-MM-DD ===
   Reviews: X | Date Spots: X | Chefs: X | Recipe Cards: X

   Guards:            validate-date-spots PASS | notion-import check PASS | ...
   Companion Files:   X of X records, 0 orphaned
   Notion sync:       X of X in notion/published.json with a snapshot
   Images:            0 missing, 0 unreferenced
   Cross-links:       X checked, 0 broken

   --- Issues ---
   Critical: (guard failures, missing pairs, broken links, missing images)
   Warning:  (word counts, internal links below nine, orphaned files)
   ```

   For each issue say who fixes it and where: Victor in Notion (prose), the Companion File (meta, alt text, links), or Victor's call (verdict, signals, Checked date).
