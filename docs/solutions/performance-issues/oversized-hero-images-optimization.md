---
title: "Oversized Hero Images Exceeding 200KB Guideline"
problem_type: performance-issues
component: images
symptoms:
  - "4 hero images exceeded 200KB size limit (1.1x to 3.5x over)"
  - "All images at 1707x2560px portrait orientation, too large for web hero display"
  - "cauliflower-steak-with-romesco-sauce.webp: 712KB"
  - "lemon-posset-brulee.webp: 379KB"
  - "penne-alla-vodka.jpg: 315KB"
  - "crispy-vegan-calamari.webp: 218KB"
date_solved: 2026-02-23
severity: medium
tags:
  - image-optimization
  - performance
  - webp-compression
  - hero-images
  - core-web-vitals
  - lcp
tech_stack:
  - Astro 5
  - Astro Picture component
  - Cloudflare Pages
---

# Oversized Hero Images Exceeding 200KB Guideline

## Problem Symptom

During the migration of 9 recipes with images (branch `feat/migrate-9-recipes-with-images`), 4 hero images were committed at their original resolution of 1707x2560px, far exceeding the project's guideline of max 1200px wide / < 200KB per hero image.

| Image | File Size | Over Limit By |
|---|---|---|
| cauliflower-steak-with-romesco-sauce.webp | 712KB | 3.5x |
| lemon-posset-brulee.webp | 379KB | 1.9x |
| penne-alla-vodka.jpg | 315KB | 1.6x |
| crispy-vegan-calamari.webp | 218KB | 1.1x |

Total excess data: ~940KB across 4 images (1.62MB total vs. target ~0.68MB).

## Root Cause

Images were sourced/generated at full resolution without resizing for web delivery. The 1707x2560px dimension is portrait orientation at ~1.4x the maximum needed hero width (1200px). No automated validation existed to catch oversized images before commit.

The root cause was a process gap: the `/optimize-image` skill existed but was not applied to these 4 images during the batch migration of 9 recipes.

## Investigation Steps

1. **Identified during review**: Noticed hero images were significantly larger than the 5 images that had already been optimized
2. **Checked dimensions**: All 4 were 1707x2560px (portrait), where max hero width is 1200px
3. **Calculated impact**: 940KB of unnecessary data across 4 recipe pages, directly impacting LCP (Largest Contentful Paint)
4. **Applied existing workflow**: Used the project's `/optimize-image` skill to resize and compress

## Working Solution

**Commit**: `451a5b1`

Resized all 4 images to 1200px wide (maintaining aspect ratio) and compressed:

| Image | Before | After | Reduction |
|---|---|---|---|
| cauliflower-steak-with-romesco-sauce.webp | 712KB | 197KB | 72% |
| lemon-posset-brulee.webp | 379KB | 167KB | 56% |
| penne-alla-vodka.jpg | 315KB | 199KB | 37% |
| crispy-vegan-calamari.webp | 218KB | 120KB | 45% |

**Total**: 1.62MB reduced to 0.68MB (58% overall reduction).

### Optimization Parameters

- **Max width**: 1200px (maintains aspect ratio)
- **JPEG quality**: 82 (imperceptible quality loss)
- **Tool**: Sharp (Node.js) via the `/optimize-image` skill

## Why This Works

1. **Matches display requirements**: 1200px width is the maximum needed for responsive web display; larger dimensions waste bandwidth
2. **Quality preservation**: Quality 82 provides imperceptible visual loss while achieving 37-72% file size reduction
3. **Astro pipeline**: Resized source images are further converted to AVIF/WebP by Astro's `<Picture>` component at build time
4. **Core Web Vitals**: Reduced hero image sizes directly improve LCP, a Google ranking factor

## Prevention Strategies

### Always Use the `/optimize-image` Skill

Every image added to `src/assets/images/recipes/` should pass through the `/optimize-image` Claude skill before commit. The skill enforces:
- Hero images: max 1200px wide, < 200KB, quality 82
- Step images: max 900px wide, < 150KB, quality 80

### Quick Validation Before Commit

```bash
# Check for oversized images in recipes folder
find src/assets/images/recipes -type f \( -name "*.jpg" -o -name "*.webp" \) -size +200k
# Should return nothing for hero images
```

### Image Addition Checklist

- [ ] Run `/optimize-image` on every new image
- [ ] Verify hero images: <= 1200px wide, < 200KB
- [ ] Verify step images: <= 900px wide, < 150KB
- [ ] File named correctly: `{slug}.jpg` (hero), `{slug}-step-{n}.jpg` (steps)
- [ ] File placed in `src/assets/images/recipes/`
- [ ] Alt text written (~125 chars, includes dish name)

### Future: Build-Time Validation

Consider adding a prebuild script that validates all recipe images against size/dimension limits and fails the build if any exceed thresholds.

## Related Documentation

- [Recipe Migration Plan](../../plans/2026-02-23-feat-migrate-recipes-with-images-plan.md) -- Image requirements and per-recipe implementation
- [Image SEO & Skills Update Plan](../../plans/2026-02-23-feat-recipe-image-seo-and-skills-update-plan.md) -- Step image infrastructure and scoring system
- [Optimize Image Skill](../../../.claude/commands/optimize-image.md) -- The optimization workflow that should be used for every image
- [CLAUDE.md Image Guidelines](../../../CLAUDE.md) -- Project-level image sizing rules
- [Cloudflare Pages Redirects Solution](../build-errors/cloudflare-pages-absolute-url-redirects.md) -- Related deployment solution from same branch
