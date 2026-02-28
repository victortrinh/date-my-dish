# Validate Content

Validate the integrity of the entire content collection (recipes + articles): EN/FR pairs, image references, cross-links, and content parity.

## Input
- Optional: single recipe or article slug to validate: $ARGUMENTS
- If no argument, validate ALL recipes and articles

## Steps

1. **Collect all content files:**
   - List all `.mdx` files in `src/content/recipes/en/`, `src/content/recipes/fr/`, `src/content/articles/en/`, and `src/content/articles/fr/`
   - Parse frontmatter from each file
   - Build maps: `recipes/{locale}/{slug}` -> frontmatter data, `articles/{locale}/{slug}` -> frontmatter data

2. **Pass 1 — Structural Validation:**

   For each recipe, check:

   **a. EN/FR pair matching:**
   - Every EN recipe's `translationSlug` resolves to an existing FR file at `src/content/recipes/fr/{translationSlug}.mdx`
   - Every FR recipe's `translationSlug` resolves to an existing EN file at `src/content/recipes/en/{translationSlug}.mdx`
   - Flag: orphaned recipes with no pair

   **b. Image file existence:**
   - Each recipe's `heroImage` path resolves to a file on disk (the path is relative from the MDX file, e.g., `../../../assets/images/recipes/{slug}.jpg`)
   - Each `instructionGroups.steps[].image` path resolves to a file on disk (step images are `image()` imports with relative paths like `../../../assets/images/recipes/{slug}-step-1.jpg`)
   - Flag: missing image files

   **c. Orphaned images:**
   - List all files in `src/assets/images/recipes/`
   - Check each file is referenced by at least one recipe's `heroImage`, step `image`, or MDX body `import` statement
   - Flag: images not referenced by any recipe

   **d. Cross-link validation:**
   - Extract all markdown links from each MDX body using pattern: `[text](/path/)`
   - For recipe links (`/en/recipes/{slug}/` or `/fr/recettes/{slug}/`): verify the target recipe file exists
   - For article links (`/en/articles/{slug}/` or `/fr/articles/{slug}/`): verify the target article file exists
   - For category links (`/en/recipes/category/{cat}/` or `/fr/recettes/categorie/{cat}/`): verify at least one recipe has that category in its `recipeCategory` array
   - Flag: broken links with the source file and line

3. **Pass 2 — Recipe Content Parity Validation (EN/FR pairs):**

   For each matched EN/FR pair, compare:

   | Check | What to compare |
   |-------|----------------|
   | Ingredient groups | Same count of groups |
   | Ingredient items | Same count of items per group |
   | Instruction groups | Same count of groups |
   | Instruction steps | Same count of steps per group |
   | Step images | Same `image` field presence on corresponding steps |
   | FAQs | Same count |
   | Categories | Same `recipeCategory` values |
   | Nutrition | Both present or both absent |

   Flag: any parity mismatches with specific details (e.g., "EN has 9 steps in group 1, FR has 8")

4. **Pass 3 — Article Structural Validation:**

   Collect all `.mdx` files in `src/content/articles/en/` and `src/content/articles/fr/`.

   **a. EN/FR pair matching:**
   - Every EN article's `translationSlug` resolves to an existing FR file at `src/content/articles/fr/{translationSlug}.mdx`
   - Every FR article's `translationSlug` resolves to an existing EN file at `src/content/articles/en/{translationSlug}.mdx`
   - Flag: orphaned articles with no pair

   **b. Article image existence:**
   - Each article's `heroImage` path resolves to a file on disk
   - Flag: missing image files

   **c. Orphaned article images:**
   - List all files in `src/assets/images/articles/`
   - Check each file is referenced by at least one article's `heroImage` or MDX body `import` statement
   - Flag: images not referenced by any article

   **d. `relatedRecipes` resolution:**
   - For each article with a `relatedRecipes` array, verify each slug exists as an EN recipe file at `src/content/recipes/en/{slug}.mdx`
   - Flag: broken recipe references with the article file and slug

5. **Pass 4 — Article Content Parity Validation (EN/FR pairs):**

   For each matched EN/FR article pair, compare:

   | Check | What to compare |
   |-------|----------------|
   | FAQs | Same count |
   | Category | Same `articleCategory` value |
   | Related recipes | Same `relatedRecipes` entries |
   | Tags | Same `tags` values (if present) |

   Flag: any parity mismatches with specific details

6. **Generate report:**

   ```
   === Content Collection Validation Report ===

   Recipes found: X EN, Y FR
   Articles found: X EN, Y FR

   --- Pass 1: Recipe Structural Validation ---

   EN/FR Pairs:
   [x] cacio-e-pepe <-> cacio-e-pepe
   [ ] some-recipe — MISSING FR pair

   Image Files:
   [x] All hero images found (X/X)
   [ ] Missing step images: {list}

   Orphaned Images:
   [x] No orphaned recipe images

   Cross-Links:
   [x] All cross-links valid (X links checked)

   --- Pass 2: Recipe Content Parity ---

   | Recipe Pair | Ingredients | Steps | FAQs | Images | Categories | Nutrition |
   |-------------|-------------|-------|------|--------|------------|-----------|
   | cacio-e-pepe | OK | OK | OK | OK | OK | OK |

   --- Pass 3: Article Structural Validation ---

   EN/FR Pairs:
   [x] article-slug <-> article-slug-fr

   Image Files:
   [x] All article hero images found (X/X)

   Orphaned Images:
   [x] No orphaned article images

   Related Recipes:
   [x] All relatedRecipes slugs resolve to existing recipes

   --- Pass 4: Article Content Parity ---

   | Article Pair | FAQs | Category | Related Recipes | Tags |
   |-------------|------|----------|-----------------|------|
   | article-slug | OK | OK | OK | OK |

   --- Summary ---
   Total issues: X
   Critical: Y (missing pairs, broken links, broken relatedRecipes)
   Warning: Z (parity mismatches, orphaned images)
   ```

7. **Report and suggest fixes:**
   - List all issues sorted by severity (Critical > Warning)
   - For broken cross-links, suggest the correct target or removal
   - For missing recipe pairs, suggest running `/new-recipe` or `/translate-recipe`
   - For missing article pairs, suggest running `/new-article` or `/translate-article`
   - For broken `relatedRecipes`, suggest the correct slug or removal
   - For orphaned images, suggest deletion or assignment to a recipe/article
