---
title: "Add Step Images to Recipes & Update Claude Skills with Image SEO Best Practices"
type: feat
status: completed
date: 2026-02-23
origin: docs/plans/2026-02-23-feat-migrate-recipes-with-images-plan.md
---

# Add Step Images to Recipes & Update Claude Skills with Image SEO Best Practices

## Overview

Each recipe currently has only 1 image (the hero). The schema already supports step-level images (`HowToStepSchema.image`) and the JSON-LD emits them, but:

1. No recipe provides step images in frontmatter
2. `RecipeContent.astro` doesn't render step images visually
3. No MDX body contains inline images (process shots, close-ups)
4. The Claude skills (`new-recipe`, `optimize-image`, `seo-audit`, `translate-recipe`) don't mention any of these practices

**Why it matters (SEO research findings):**

- Google lists `HowToStep.image` as a **Recommended** property in Recipe structured data
- Step images enable **Guided Recipes** on Google Nest Hub / smart displays
- 5-7 images per recipe is the industry consensus for food blog SEO
- Original process photos are a strong **E-E-A-T Experience** signal (proves you cooked it)
- Image-rich content increases dwell time (up to 260% with multimedia)
- Google Image Search drives 20%+ of searches; recipe photos display with schema overlays
- Pinterest images should be **deferred** until 30+ recipes are published (not enough content yet for traction)

## Proposed Solution

Two parallel tracks:

### Track A: Enable Step Images in the Codebase

Update `RecipeContent.astro` to visually render step images when provided, so the infrastructure is ready for photos.

### Track B: Update Claude Skills/Commands

Bake the image SEO best practices into the 4 existing Claude commands so every future recipe automatically follows them.

## Acceptance Criteria

### Track A: Codebase Changes

- [x] `RecipeContent.astro` renders step images below the step text when `step.image` is provided
  - Use Astro `<img>` with lazy loading for step images (they're URL strings, not `image()` imports)
  - Rounded corners, full-width within the step container
  - Gracefully hidden when no image exists (current behavior preserved)
- [x] Verify JSON-LD still emits step images correctly (already works via `RecipeSchema.astro:89`)
- [x] `npm run build` succeeds with no regressions

### Track B: Skills/Commands Updates

#### `.claude/commands/new-recipe.md`
- [x] Add step image placeholders in the frontmatter template (`image:` field on instruction steps)
- [x] Add guidance on image count target (5-7 total: 1 hero + 3-5 step images)
- [x] Add image naming convention for step images: `{slug}-step-{n}.jpg`
- [x] Add MDX body image section explaining how to import and use `<Picture>` for inline process shots
- [x] Add image alt text guidelines (descriptive, keyword-rich, ~125 chars, no "Image of" prefix)
- [x] Note that Pinterest images are deferred until 30+ recipes exist

#### `.claude/commands/optimize-image.md`
- [x] Add step image processing (not just hero images)
- [x] Add step image sizing: max 900px wide, under 150KB JPEG source
- [x] Add batch processing workflow for multiple step images per recipe
- [x] Add naming convention: `{slug}-step-{n}.jpg` for step images
- [x] Update Pinterest section to say "deferred until 30+ recipes" with reasoning
- [x] Add alt text generation guidance per image type (hero vs step)

#### `.claude/commands/seo-audit.md`
- [x] Add image count check (target 5-7 per recipe, score accordingly)
- [x] Add step image presence check in `instructionGroups` frontmatter
- [x] Add HowToStep image validation in JSON-LD output
- [x] Add alt text quality check on all images (descriptive, keyword-relevant, correct length)
- [x] Add image file size check (hero < 200KB, step < 150KB source)
- [x] Add scoring tiers: Critical (hero missing), Important (< 3 images), Nice-to-have (< 5 images)

#### `.claude/commands/translate-recipe.md`
- [x] Add note that EN/FR versions share the same image files (no image duplication needed)
- [x] Add alt text translation requirement for step images (French alt text for FR version)
- [x] Add reminder to translate any `<Picture>` alt text in MDX body

#### `CLAUDE.md` (project root)
- [x] Add Image Guidelines section covering naming conventions, targets, and alt text rules
- [x] Add note about step images in Content Structure section

## Implementation Details

### `RecipeContent.astro` Change (Track A)

In the instruction steps rendering (lines 70-79), add image rendering after the step text:

```astro
{group.steps.map((step, i) => (
  <li class="flex gap-4">
    <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-blue font-ui text-sm font-bold text-white">
      {i + 1}
    </span>
    <div class="pt-1">
      <p class="text-gray-700">{step.text}</p>
      {step.image && (
        <img
          src={step.image}
          alt=""
          class="mt-3 w-full rounded-lg"
          loading="lazy"
          decoding="async"
        />
      )}
    </div>
  </li>
))}
```

> Note: Step images use `z.string()` (URL strings), not Astro's `image()` helper, so a plain `<img>` tag is appropriate here. If we later want to use Astro-optimized images for steps, the schema would need to change to `image()`.

### Step Image Naming Convention

```
src/assets/images/recipes/
  {slug}.jpg                    # Hero image (existing)
  {slug}-step-1.jpg             # Step image 1
  {slug}-step-2.jpg             # Step image 2
  {slug}-step-3.jpg             # Step image 3
  {slug}-pinterest.jpg          # Pinterest image (future, deferred)
```

### Image Targets Per Recipe

| Image Type | Count | Size | Dimensions |
|------------|-------|------|------------|
| Hero | 1 (required) | < 200KB source | 1200px wide max |
| Step images | 3-5 (recommended) | < 150KB source | 900px wide max |
| Pinterest | 0 (deferred) | < 200KB | 1000x1500 |
| **Total** | **5-7** | | |

### SEO Audit Scoring Addition

```
Image Score:
- Hero image present & optimized: +3 points
- 1-2 step images: +1 point
- 3-4 step images: +2 points
- 5+ step images: +3 points
- All images have descriptive alt text: +2 points
- All images under size targets: +1 point
Total possible: 9 points
```

## Dependencies & Risks

- **No new images required today** -- this plan makes the codebase and skills *ready* for step images. Actual photos need to be taken/sourced per recipe over time.
- **Step images are URL strings** (`z.string().optional()`), not Astro `image()` imports. This means they won't get automatic AVIF/WebP conversion. If we want optimized step images in the future, the schema would need updating. For now, URL strings work for the JSON-LD use case and basic rendering.
- **No breaking changes** -- all additions are optional/additive. Existing recipes with no step images continue to work identically.

## Sources & References

- **Origin plan:** [docs/plans/2026-02-23-feat-migrate-recipes-with-images-plan.md](./2026-02-23-feat-migrate-recipes-with-images-plan.md)
- [Google Recipe Structured Data](https://developers.google.com/search/docs/appearance/structured-data/recipe) -- HowToStep.image is Recommended
- [Google Guided Recipes](https://developers.google.com/assistant/food-and-drink/overview) -- Smart display step images
- [Search Engine Journal - Recipe Schema Update June 2025](https://www.searchenginejournal.com/googles-update-to-recipe-structured-data-confirms-a-ranking-criteria/548559/)
- [RecipeCard.io - SEO for Recipes](https://recipecard.io/blog/seo-for-recipes/) -- 5-7 images per post recommendation
- [AIOSEO Case Study](https://aioseo.com/trends/how-to-cook-recipes-seo-case-study/) -- 237% traffic surge with step photography
- [The Rank Masters - E-E-A-T Experience Evidence](https://www.therankmasters.com/blog/google-experience-evidence) -- Original photos as experience signal
