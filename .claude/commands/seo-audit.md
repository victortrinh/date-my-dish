# SEO Audit

Audit a recipe or article for SEO completeness, structured data validity, content quality, and image optimization.

## Input
- Recipe or article slug or file path: $ARGUMENTS

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
- [ ] HowToStep objects with images have valid image URLs (absolute URLs, not relative)
- [ ] aggregateRating present (check `data/ratings.json` has entry for this slug AND the FR translationSlug; if missing, seed via `node scripts/seed-rating-to-kv.mjs`)
- [ ] video field: if present in frontmatter, VideoObject emitted in JSON-LD
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
- Image score (X/9 for recipes, X/3 for articles)
- List of specific issues to fix
- Priority ranking of fixes (Critical > Important > Nice-to-have)

## Steps
1. Determine content type: check if slug exists in `src/content/recipes/en/` or `src/content/articles/en/`
2. Read the MDX file (both EN and FR)
3. Check all frontmatter fields against the appropriate schema (recipe vs article)
4. Build the site and inspect the generated HTML for JSON-LD
5. Count words, headings, and links in the MDX body
6. Verify the translation pair exists and slugs match
7. Count and assess images
8. Calculate score using the appropriate rubric
9. Output the scorecard

## Article Scoring Rubric (18 points)

When auditing an article (found in `src/content/articles/`), use this adapted scoring:

**a. Frontmatter Completeness (5 points):**
| Check | Points |
|-------|--------|
| All required fields present (title, lang, translationSlug, description, publishDate, heroImage, heroImageAlt, keywords, articleCategory, faqs) | +2 |
| Description <= 160 chars | +1 |
| At least 1 FAQ | +1 |
| Translation pair exists | +1 |

**b. JSON-LD Validity (5 points):**
| Check | Points |
|-------|--------|
| BlogPosting schema present with @type: BlogPosting | +2 |
| All required properties (headline, description, image, author, datePublished) | +1 |
| FAQPage schema present | +1 |
| BreadcrumbList schema present | +1 |

**c. Content Quality (5 points):**
| Check | Points |
|-------|--------|
| MDX body word count >= 800 | +2 |
| At least 3 H2 headings | +1 |
| Internal cross-links present | +1 |
| Translation pair exists | +1 |

**d. Image Score (3 points):**
| Check | Points |
|-------|--------|
| Hero image present and optimized (< 200KB) | +2 |
| Descriptive alt text | +1 |

**Scoring tiers (articles):**
- **Excellent** (16-18): Fully optimized
- **Good** (13-15): Minor improvements possible
- **Needs Work** (10-12): Significant gaps
- **Critical** (< 10): Missing essential elements
