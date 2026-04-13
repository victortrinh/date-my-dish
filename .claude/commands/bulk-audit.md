# Bulk Audit

Run SEO audits across all recipes and articles, producing a summary scorecard showing collection-wide health.

## Input
- No arguments required (audits all recipes and articles)
- Optional: `--skip-build` to skip the build step and only check source files

## Steps

1. **SEO metadata validation:**
   - Run `node scripts/validate-descriptions.mjs` to check all titles (max 46 chars) and descriptions (120-160 chars)
   - Report any failures

2. **Build the site (once):**
   - Run `npm run build`
   - This generates all HTML pages in `dist/` with JSON-LD, hreflang tags, and SEO meta
   - If build fails, report the error and stop
   - If `--skip-build` is passed, skip this step and note that JSON-LD checks will be skipped

2. **Collect all content:**
   - List all `.mdx` files in `src/content/recipes/en/` (audit EN versions, which represent the primary content)
   - List all `.mdx` files in `src/content/articles/en/` (audit EN versions)
   - Parse frontmatter from each file
   - For each EN recipe/article, also locate its FR pair via `translationSlug`

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
   | aggregateRating present in JSON-LD (entry exists in `data/ratings.json` for EN slug + FR slug) | +1 |
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

   **Total possible: 25 points** (16 SEO + 9 Image)

4. **Audit each article** using the article scoring rubric from `/seo-audit`:

   **a. Frontmatter Completeness (5 points):**
   | Check | Points |
   |-------|--------|
   | All required fields present | +2 |
   | Description <= 160 chars | +1 |
   | At least 1 FAQ | +1 |
   | Translation pair exists | +1 |

   **b. JSON-LD Validity (5 points):** *(skipped if --skip-build)*
   - Read the generated HTML from `dist/en/articles/{slug}/index.html`
   | Check | Points |
   |-------|--------|
   | BlogPosting schema present | +2 |
   | All required properties | +1 |
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

   **Total possible: 18 points** (15 SEO + 3 Image)

5. **Produce the summary scorecard:**

   ```
   === Bulk SEO Audit Report ===
   Date: YYYY-MM-DD
   Recipes audited: X | Articles audited: Y

   --- RECIPES (24-point scale) ---

   | Recipe                    | SEO  | Image | Total | Issues                              |
   |---------------------------|------|-------|-------|-------------------------------------|
   | cacio-e-pepe              | 16/16| 9/9   | 25/25 | None                                |
   | quinoa-crusted-salmon     | 15/16| 7/9   | 22/25 | Prose 750 words (target: 800)       |

   --- ARTICLES (18-point scale) ---

   | Article                   | SEO  | Image | Total | Issues                              |
   |---------------------------|------|-------|-------|-------------------------------------|
   | knife-skills-basics       | 15/15| 3/3   | 18/18 | None                                |
   | food-science-emulsions    | 13/15| 2/3   | 15/18 | Prose under 800 words               |

   --- Scoring Tiers ---
   Recipes:  Excellent (23-25): X | Good (19-22): X | Needs Work (15-18): X | Critical (<15): X
   Articles: Excellent (16-18): X | Good (13-15): X | Needs Work (10-12): X | Critical (<10): X

   --- Common Issues ---
   - 5 of 9 recipes have < 3 step images
   - 2 of 9 recipes have prose under 800 words

   --- Priority Fixes ---
   Critical:
   - [list any critical issues]

   Important:
   - [list important issues]

   --- Collection Averages ---
   Recipes:  Avg SEO: X/16 | Avg Image: X/9 | Avg Total: X/25
   Articles: Avg SEO: X/15 | Avg Image: X/3 | Avg Total: X/18
   ```

5. **Report actionable next steps:**
   - For each recipe/article with issues, suggest the specific skill to run:
     - Missing recipe prose → `/write-prose {slug}`
     - Missing images → `/optimize-image` + add to frontmatter
     - Missing recipe translation → `/translate-recipe {slug}`
     - Missing article translation → `/translate-article {slug}`
     - SEO issues → `/seo-audit {slug}` for detailed breakdown
   - Highlight the single highest-impact fix across the collection

## Scoring Tiers Reference

| Tier | Score Range | Meaning |
|------|-------------|---------|
| Excellent | 23-25 | Fully optimized, ready for rich results |
| Good | 19-22 | Minor improvements possible |
| Needs Work | 15-18 | Significant gaps in SEO or images |
| Critical | < 15 | Missing essential elements, unlikely to rank |

## Image Size Targets

| Image Type | Max Width | Max File Size |
|------------|-----------|---------------|
| Hero | 1200px | 200KB |
| Step | 900px | 150KB |
