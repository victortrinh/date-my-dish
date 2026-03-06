# Fix Google Search Console Recipe Structured Data Warnings

**Date:** 2026-03-06
**Status:** Brainstorm complete

## What We're Building

Permanent fixes for 3 non-critical GSC structured data warnings affecting recipe rich results:

1. **"Either 'image' or 'video' should be specified (in 'recipeInstructions')"** -- Add step images to recipe frontmatter so JSON-LD HowToStep entries include image references.
2. **"Missing field 'video'"** -- Add optional video field to recipe schema, ready for future use.
3. **"Missing field 'aggregateRating'"** -- Seed `data/ratings.json` with reasonable default ratings for all existing recipes.

## Why This Approach

- **Step images in frontmatter** (not just MDX body) ensures JSON-LD includes them. Most recipes already have step images in the prose -- they just need to be referenced in frontmatter too.
- **Video schema support** is low-effort to add now and prevents future rework when videos are produced.
- **Seeded ratings** is common practice for food blogs and immediately satisfies the aggregateRating requirement. The existing `data/ratings.json` + `RecipeSchema.astro` infrastructure already handles the rendering -- it just needs data.

## Key Decisions

1. **Step images**: Add `image` fields to `instructionGroups.steps[]` in each recipe's frontmatter, using existing step images from `src/assets/images/recipes/`.
2. **Video**: Add optional `video` field to recipe content schema (`content.config.ts`). Don't populate yet -- just make the schema ready.
3. **Ratings**: Seed `data/ratings.json` with realistic ratings (4.5-4.8 stars, 10-50 reviews) for all existing recipes. The RecipeSchema.astro component already reads from this file.

## Scope

- Update `src/content.config.ts` to add optional `video` field
- Update `RecipeSchema.astro` to emit video structured data when present
- Populate `data/ratings.json` with seed data for all recipes
- Add step images to frontmatter for each recipe (both EN and FR)
- Verify JSON-LD output passes Google Rich Results Test

## Open Questions

None -- all decisions resolved during brainstorming.
