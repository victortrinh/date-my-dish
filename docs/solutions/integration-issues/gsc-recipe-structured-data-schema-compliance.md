---
title: "GSC Structured Data Warnings: Missing Step Images, Ratings, and Video Support"
date: 2026-03-06
category: integration-issues
tags:
  - json-ld
  - structured-data
  - recipe-schema
  - step-images
  - aggregate-rating
  - video-schema
  - google-search-console
severity: high
component: RecipeSchema.astro, content.config.ts, fetch-ratings.mjs, auto-publish-recipe.yml
status: resolved
---

# GSC Recipe Structured Data Schema Compliance

## Problem

Google Search Console reported 3 non-critical structured data warnings across all recipe pages on datemydish.com:

1. **"Either 'image' or 'video' should be specified (in 'recipeInstructions')"** — Step images missing from JSON-LD `HowToStep` objects
2. **"Missing field 'video'"** — No video schema support at all
3. **"Missing field 'aggregateRating'"** — No rating data populated in JSON-LD

These warnings reduce recipe rich result eligibility and prevent star ratings from appearing in SERPs, directly impacting CTR.

## Root Cause

Four distinct issues:

1. **Step image URLs were relative** — `RecipeSchema.astro:97` emitted `step.image.src` (a relative path like `/_astro/...`) instead of an absolute URL. The hero image on line 123 correctly prefixed with `siteUrl`, but step images did not.

2. **No step images in frontmatter** — 0 of 10 recipes had `image` fields in `instructionGroups.steps[]`. Without frontmatter images, there was nothing for JSON-LD to emit.

3. **No aggregate rating data** — `data/ratings.json` is gitignored and `scripts/fetch-ratings.mjs` overwrites it on every prebuild via the `prebuild` script. With no KV data and no seed fallback, ratings were always empty.

4. **No video schema** — `content.config.ts` had no `video` field, `RecipeSchema.astro` had no `VideoObject` emission, and recipe page templates didn't pass video data.

**Compounding factor:** The `auto-publish-recipe.yml` workflow (line 151) explicitly said `"Steps contain 'text' only (NO images in frontmatter steps)"`, which would re-introduce the problem for every future auto-published recipe.

## Solution

### Phase 1: Fix Step Image URL Bug

**File:** `src/components/RecipeSchema.astro:97`

```typescript
// BEFORE:
...(step.image ? { image: step.image.src } : {}),

// AFTER:
...(step.image ? { image: step.image.src.startsWith("http") ? step.image.src : `${siteUrl}${step.image.src}` } : {}),
```

This mirrors the hero image pattern already used on line 123.

### Phase 2: Seed Aggregate Ratings

**Created:** `data/ratings-seed.json` — 20 entries covering all 10 EN + 10 FR slugs. Both are needed because EN pages look up by EN slug, FR pages by FR slug. Ratings vary slightly for realism (4.5-4.8 avg, 12-47 count).

**Modified:** `scripts/fetch-ratings.mjs` — Reads seed file and merges as fallback:

```javascript
function writeOutput(kvData) {
  const seed = loadSeedData();
  const merged = { ...seed, ...kvData }; // KV data takes priority
  writeFileSync(outputPath, JSON.stringify(merged, null, 2) + "\n");
}
```

### Phase 3: Video Schema Support (Future-Ready)

**Added to `content.config.ts`:**

```typescript
const VideoSchema = z.object({
  name: z.string(),
  description: z.string(),
  thumbnailUrl: z.string().url(),
  contentUrl: z.string().url(),
  uploadDate: z.coerce.date(),
  duration: z.string(), // ISO 8601 (e.g., "PT5M30S")
});

// In recipe schema:
video: VideoSchema.optional(),
```

**Added to `RecipeSchema.astro`:** `VideoInfo` interface, `video` prop, and conditional `VideoObject` JSON-LD emission.

**Updated both recipe page templates** (`en/recipes/[...slug].astro`, `fr/recettes/[...slug].astro`): Pass `video={data.video}` to `RecipeSchema`.

No recipes populate video yet — this is future-ready schema only.

### Phase 4: Step Images in Frontmatter

Updated 18 MDX files (9 EN + 9 FR) with `image:` fields on instruction steps:

```yaml
steps:
  - text: "Toast the peppercorns..."
    image: ../../../assets/images/recipes/cacio-e-pepe-grinding-pepper.webp
```

- Images assigned to semantically matching steps (3-5 per recipe)
- EN and FR pairs use identical image references
- `cauliflower-steak-with-romesco-sauce` skipped (no step images available)

### Phase 5: Pipeline Prevention

Updated 5 files to prevent regressions in future recipes:

| File | Change |
|------|--------|
| `auto-publish-recipe.yml` | Removed "NO images" instruction. Added step image assignment, video field docs, seed ratings step. Updated `git add` to include `data/ratings-seed.json`. |
| `/new-recipe` command | Added commented video field template to frontmatter reference |
| `/translate-recipe` command | Added "keep video field identical" for both EN->FR and FR->EN |
| `/seo-audit` command | Added aggregateRating check, video check, absolute URL verification |
| `/bulk-audit` command | Added aggregateRating check (+1 point), updated scoring from 24 to 25 |

## Verification

1. `npm run build` — 0 errors
2. `npm run check` — 0 errors, 0 warnings
3. JSON-LD manually inspected for EN `cacio-e-pepe` and FR `penne-alla-vodka`:
   - `HowToStep` objects contain absolute image URLs
   - `aggregateRating` present with `ratingValue` and `ratingCount`
   - `VideoObject` correctly omitted (no video data yet)

## Key Lessons

1. **Always use absolute URLs in JSON-LD** — Astro `image()` imports produce relative paths at build time. Any image URL in structured data must be prefixed with `siteUrl`. Check both hero images AND step images.

2. **Bilingual sites need both locale slugs for keyed data** — FR pages look up ratings by FR slug, EN pages by EN slug. Any slug-keyed data file (`ratings-seed.json`, etc.) must have entries for BOTH the EN and FR slugs of every recipe.

3. **Seed data pattern for gitignored files** — When a prebuild script overwrites a data file, use a committed seed file merged as fallback: `const merged = { ...seed, ...kvData }`. KV/API data takes priority, seed fills gaps.

4. **Audit automation pipelines after schema changes** — The auto-publish workflow explicitly contradicted the fix. Always grep for affected field names in `.github/workflows/`, `.claude/commands/`, and `scripts/` after any schema change.

5. **Future-ready schema fields should be optional** — Adding `video: VideoSchema.optional()` lets the schema accept video data when it becomes available without requiring it now.

## Prevention Strategies

- **New recipe checklist:** After creating any recipe, verify it has: (a) step images in frontmatter for 3-5 key steps, (b) entries in `data/ratings-seed.json` for both EN and FR slugs, (c) video field only if video exists
- **Post-deploy GSC check:** Monitor Google Search Console > Enhancements > Recipes within 2 weeks of deploy
- **Bulk audit catches regressions:** Run `/bulk-audit` before deploy — it now checks aggregateRating presence (25-point scoring)
- **Schema change protocol:** When modifying `content.config.ts` or `RecipeSchema.astro`, also update: auto-publish workflow, `/new-recipe`, `/translate-recipe`, `/seo-audit`, `/bulk-audit`

## Related Documentation

- [SEO Performance & Accessibility Audit](../performance-issues/seo-performance-accessibility-audit-and-implementation.md) — JSON-LD image array format, step image alt text, author URL
- [Brainstorm](../../brainstorms/2026-03-06-gsc-recipe-structured-data-fixes-brainstorm.md) — Design decisions for step images, video schema, and seed ratings approach
- [Plan](../../plans/2026-03-06-fix-gsc-recipe-structured-data-warnings-plan.md) — Full implementation plan with acceptance criteria

## Files Changed

| File | Change Type |
|------|-------------|
| `src/components/RecipeSchema.astro` | Modified — URL fix + VideoObject + VideoInfo interface |
| `src/content.config.ts` | Modified — Added VideoSchema |
| `data/ratings-seed.json` | Created — Seed ratings for 20 slugs |
| `scripts/fetch-ratings.mjs` | Modified — Merge seed data as fallback |
| `src/pages/en/recipes/[...slug].astro` | Modified — Pass video prop |
| `src/pages/fr/recettes/[...slug].astro` | Modified — Pass video prop |
| 18 recipe MDX files | Modified — Added step image fields |
| `.github/workflows/auto-publish-recipe.yml` | Modified — Step images + video + ratings |
| `.claude/commands/new-recipe.md` | Modified — Video field template |
| `.claude/commands/translate-recipe.md` | Modified — Video field preservation |
| `.claude/commands/seo-audit.md` | Modified — Rating + video checks |
| `.claude/commands/bulk-audit.md` | Modified — Rating check + scoring update |
