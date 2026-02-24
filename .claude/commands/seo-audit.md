# SEO Audit

Audit a recipe for SEO completeness, structured data validity, content quality, and image optimization.

## Input
- Recipe slug or file path: $ARGUMENTS

## Audit Checklist

### 1. Frontmatter Completeness
- [ ] All required fields present (title, lang, translationSlug, description, author, publishDate, heroImage, heroImageAlt, prepTime, cookTime, totalTime, recipeYield, difficulty, recipeCategory, recipeCuisine, keywords, ingredientGroups, instructionGroups, faqs)
- [ ] Description is <= 160 characters
- [ ] Times are valid ISO 8601 durations (PT format)
- [ ] At least 3 FAQs
- [ ] Translation pair exists and translationSlug matches

### 2. JSON-LD Validity
- Build the site and check the generated HTML for:
- [ ] Recipe schema present with @type: Recipe
- [ ] All required Recipe properties (name, description, image, prepTime, cookTime, totalTime, recipeIngredient, recipeInstructions, author)
- [ ] HowToStep objects have text property
- [ ] HowToStep objects with images have valid image URLs
- [ ] FAQPage schema present (if FAQs exist)
- [ ] BreadcrumbList schema present

### 3. Hreflang & SEO Tags
- [ ] Self-referencing canonical tag
- [ ] Bidirectional hreflang (en, fr, x-default)
- [ ] Open Graph tags (og:title, og:description, og:image, og:url)
- [ ] Twitter Card tags

### 4. Content Quality
- [ ] MDX body word count >= 800 words
- [ ] At least 3 H2 headings in prose
- [ ] Internal links to other recipes or categories
- [ ] Hero image has descriptive alt text (not generic)
- [ ] Hero image filename is descriptive (not IMG_001.jpg)

### 5. Image Optimization
- [ ] Hero image is in src/assets/ (not public/) for Astro optimization
- [ ] Hero image referenced correctly in frontmatter
- [ ] Hero image file size < 200KB source
- [ ] Step images present in instruction steps (check for `image:` field)
- [ ] Step image file sizes < 150KB source each
- [ ] All image alt text is descriptive (~125 chars, includes dish name, no "Image of" prefix)
- [ ] Total image count assessed (target: 5-7 per recipe)

### 6. Image Score

Calculate and report the image score:

| Criterion | Points |
|-----------|--------|
| Hero image present & optimized | +3 |
| 1-2 step images in instructions | +1 |
| 3-4 step images in instructions | +2 |
| 5+ step images in instructions | +3 |
| All images have descriptive alt text | +2 |
| All images under size targets | +1 |
| **Total possible** | **9** |

**Scoring tiers:**
- **Critical** (0-3): Hero image missing or broken -- blocks Google Rich Results
- **Important** (4-6): < 3 total images -- missing E-E-A-T Experience signals and Guided Recipe support
- **Nice-to-have** (7-8): < 5 total images -- room to improve dwell time and Image Search traffic
- **Excellent** (9): Full image optimization

## Output
Generate a scorecard with:
- Pass/Fail for each item
- Overall score (X/total)
- Image score (X/9)
- List of specific issues to fix
- Priority ranking of fixes (Critical > Important > Nice-to-have)

## Steps
1. Read the recipe MDX file (both EN and FR)
2. Check all frontmatter fields against the schema
3. Build the site and inspect the generated HTML for JSON-LD
4. Count words, headings, and links in the MDX body
5. Verify the translation pair exists and slugs match
6. Count and assess images (hero + step images in instruction steps)
7. Check image file sizes on disk
8. Calculate image score
9. Output the scorecard
