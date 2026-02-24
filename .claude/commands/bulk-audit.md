# Bulk Audit

Run SEO audits across all recipes and produce a summary scorecard showing collection-wide health.

## Input
- No arguments required (audits all recipes)
- Optional: `--skip-build` to skip the build step and only check source files

## Steps

1. **Build the site (once):**
   - Run `npm run build`
   - This generates all HTML pages in `dist/` with JSON-LD, hreflang tags, and SEO meta
   - If build fails, report the error and stop
   - If `--skip-build` is passed, skip this step and note that JSON-LD checks will be skipped

2. **Collect all recipes:**
   - List all `.mdx` files in `src/content/recipes/en/` (audit EN versions, which represent the primary content)
   - Parse frontmatter from each recipe
   - For each EN recipe, also locate its FR pair via `translationSlug`

3. **Audit each recipe** using the same criteria as `/seo-audit`:

   **a. Frontmatter Completeness (5 points):**
   | Check | Points |
   |-------|--------|
   | All required fields present | +2 |
   | Description <= 160 chars | +1 |
   | Valid ISO 8601 times | +1 |
   | At least 3 FAQs | +1 |

   **b. JSON-LD Validity (5 points):** *(skipped if --skip-build)*
   - Read the generated HTML from `dist/en/recipes/{slug}/index.html`
   | Check | Points |
   |-------|--------|
   | Recipe schema present with @type: Recipe | +2 |
   | All required Recipe properties (name, image, recipeIngredient, recipeInstructions) | +1 |
   | FAQPage schema present | +1 |
   | BreadcrumbList schema present | +1 |

   **c. Content Quality (5 points):**
   | Check | Points |
   |-------|--------|
   | MDX body word count >= 800 | +2 |
   | At least 3 H2 headings in prose | +1 |
   | Internal cross-links present | +1 |
   | Translation pair exists | +1 |

   **d. Image Score (9 points):**
   | Check | Points |
   |-------|--------|
   | Hero image present and optimized (< 200KB) | +3 |
   | 1-2 step images in instructions | +1 |
   | 3-4 step images in instructions | +2 |
   | 5+ step images in instructions | +3 |
   | All images have descriptive alt text | +2 |
   | All images under size targets | +1 |

   **Total possible: 24 points** (15 SEO + 9 Image)

4. **Produce the summary scorecard:**

   ```
   === Bulk SEO Audit Report ===
   Date: YYYY-MM-DD
   Recipes audited: X

   | Recipe                    | SEO  | Image | Total | Issues                              |
   |---------------------------|------|-------|-------|-------------------------------------|
   | cacio-e-pepe              | 15/15| 9/9   | 24/24 | None                                |
   | quinoa-crusted-salmon     | 14/15| 7/9   | 21/24 | Prose 750 words (target: 800)       |
   | beef-ragu-pappardelle     | 13/15| 5/9   | 18/24 | Missing 2 step images, no nutrition |
   | ...                       |      |       |       |                                     |

   --- Scoring Tiers ---
   Excellent (22-24): X recipes
   Good (18-21): X recipes
   Needs Work (14-17): X recipes
   Critical (< 14): X recipes

   --- Common Issues ---
   - 5 of 9 recipes have < 3 step images
   - 2 of 9 recipes have prose under 800 words
   - 1 recipe missing nutrition data

   --- Priority Fixes ---
   Critical:
   - [list any critical issues]

   Important:
   - [list important issues]

   Nice-to-have:
   - [list nice-to-have improvements]

   --- Collection Averages ---
   Average SEO Score: X/15
   Average Image Score: X/9
   Average Total Score: X/24
   ```

5. **Report actionable next steps:**
   - For each recipe with issues, suggest the specific skill to run:
     - Missing prose → `/write-prose {slug}`
     - Missing images → `/optimize-image` + add to frontmatter
     - Missing translation → `/translate-recipe {slug}`
     - SEO issues → `/seo-audit {slug}` for detailed breakdown
   - Highlight the single highest-impact fix across the collection

## Scoring Tiers Reference

| Tier | Score Range | Meaning |
|------|-------------|---------|
| Excellent | 22-24 | Fully optimized, ready for rich results |
| Good | 18-21 | Minor improvements possible |
| Needs Work | 14-17 | Significant gaps in SEO or images |
| Critical | < 14 | Missing essential elements, unlikely to rank |

## Image Size Targets

| Image Type | Max Width | Max File Size |
|------------|-----------|---------------|
| Hero | 1200px | 200KB |
| Step | 900px | 150KB |
