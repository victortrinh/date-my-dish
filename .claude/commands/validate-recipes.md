# Validate Recipes

Validate the integrity of the entire recipe collection: EN/FR pairs, image references, cross-links, and content parity.

## Input
- Optional: single recipe slug to validate: $ARGUMENTS
- If no argument, validate ALL recipes

## Steps

1. **Collect all recipe files:**
   - List all `.mdx` files in `src/content/recipes/en/` and `src/content/recipes/fr/`
   - Parse frontmatter from each file (title, lang, translationSlug, heroImage, instructionGroups, ingredientGroups, faqs, recipeCategory, nutrition)
   - Build a map of `{locale}/{slug}` -> frontmatter data

2. **Pass 1 — Structural Validation:**

   For each recipe, check:

   **a. EN/FR pair matching:**
   - Every EN recipe's `translationSlug` resolves to an existing FR file at `src/content/recipes/fr/{translationSlug}.mdx`
   - Every FR recipe's `translationSlug` resolves to an existing EN file at `src/content/recipes/en/{translationSlug}.mdx`
   - Flag: orphaned recipes with no pair

   **b. Image file existence:**
   - Each recipe's `heroImage` path resolves to a file on disk (the path is relative from the MDX file, e.g., `../../../assets/images/recipes/{slug}.jpg`)
   - Each `instructionGroups.steps[].image` URL has a corresponding file (step images are URL strings like `/images/recipes/{slug}-step-1.jpg` — check for matching file in `src/assets/images/recipes/`)
   - Flag: missing image files

   **c. Orphaned images:**
   - List all files in `src/assets/images/recipes/`
   - Check each file is referenced by at least one recipe's `heroImage`, step `image`, or MDX body `import` statement
   - Flag: images not referenced by any recipe

   **d. Cross-link validation:**
   - Extract all markdown links from each MDX body using pattern: `[text](/path/)`
   - For recipe links (`/en/recipes/{slug}/` or `/fr/recettes/{slug}/`): verify the target recipe file exists
   - For category links (`/en/recipes/category/{cat}/` or `/fr/recettes/categorie/{cat}/`): verify at least one recipe has that category in its `recipeCategory` array
   - Flag: broken links with the source file and line

3. **Pass 2 — Content Parity Validation (EN/FR pairs):**

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

4. **Generate report:**

   ```
   === Recipe Collection Validation Report ===

   Recipes found: X EN, Y FR

   --- Pass 1: Structural Validation ---

   EN/FR Pairs:
   [x] cacio-e-pepe <-> cacio-e-pepe
   [x] quinoa-crusted-salmon <-> saumon-en-croute-de-quinoa
   [ ] some-recipe — MISSING FR pair

   Image Files:
   [x] All hero images found (X/X)
   [ ] Missing step images: {list}

   Orphaned Images:
   [x] No orphaned images
   -- or --
   [ ] Orphaned: {list of unreferenced files}

   Cross-Links:
   [x] All cross-links valid (X links checked)
   -- or --
   [ ] Broken links:
       - src/content/recipes/en/foo.mdx:143 -> /en/recipes/nonexistent/ (404)

   --- Pass 2: Content Parity ---

   | Recipe Pair | Ingredients | Steps | FAQs | Images | Categories | Nutrition |
   |-------------|-------------|-------|------|--------|------------|-----------|
   | cacio-e-pepe | OK | OK | OK | OK | OK | OK |
   | quinoa-salmon | OK | MISMATCH (EN:9, FR:8) | OK | OK | OK | OK |

   --- Summary ---
   Total issues: X
   Critical: Y (missing pairs, broken links)
   Warning: Z (parity mismatches, orphaned images)
   ```

5. **Report and suggest fixes:**
   - List all issues sorted by severity (Critical > Warning)
   - For broken cross-links, suggest the correct target or removal
   - For missing pairs, suggest running `/new-recipe` or `/translate-recipe`
   - For orphaned images, suggest deletion or assignment to a recipe
