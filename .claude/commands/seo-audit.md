# SEO Audit

Audit a recipe for SEO completeness, structured data validity, and content quality.

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
- [ ] Image referenced correctly in frontmatter

## Output
Generate a scorecard with:
- Pass/Fail for each item
- Overall score (X/total)
- List of specific issues to fix
- Priority ranking of fixes (Critical > Important > Nice-to-have)

## Steps
1. Read the recipe MDX file (both EN and FR)
2. Check all frontmatter fields against the schema
3. Build the site and inspect the generated HTML for JSON-LD
4. Count words, headings, and links in the MDX body
5. Verify the translation pair exists and slugs match
6. Output the scorecard
