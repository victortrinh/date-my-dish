# New Recipe

Scaffold a new bilingual recipe (EN + FR MDX file pair) with all required frontmatter fields.

## Input
- Recipe name in English: $ARGUMENTS

## Steps

1. Ask for recipe details if not provided:
   - Recipe name (EN + FR)
   - Description (EN + FR, max 160 chars)
   - Prep time, cook time, total time (ISO 8601: PT15M)
   - Servings
   - Difficulty (easy/medium/hard)
   - Categories (breakfast, lunch, dinner, dessert, snack, appetizer, side-dish, drink, sauce)
   - Cuisine
   - Keywords (EN + FR)

2. Generate the English slug from the recipe name (lowercase, hyphens, no special chars)
3. Generate the French slug

4. Create `src/content/recipes/en/{slug}.mdx` with:
   - Complete frontmatter with all required fields from the content schema
   - `translationSlug` pointing to the French slug
   - Placeholder ingredient groups and instruction groups
   - 3 starter FAQ entries
   - MDX body with heading structure for SEO prose (h2s for sections)

5. Create `src/content/recipes/fr/{slug-fr}.mdx` with:
   - Complete frontmatter translated to French
   - `translationSlug` pointing to the English slug
   - Same structure as English version

6. Create a placeholder hero image if none exists:
   - `src/assets/images/recipes/{slug}.jpg`

7. Run `npx astro check` to validate the new files

8. Report what was created and any fields that need to be filled in (like actual recipe content)

## Frontmatter Template Reference

```yaml
title: ""
lang: en
translationSlug: ""
description: ""
author: "Victor"
publishDate: YYYY-MM-DD
heroImage: "../../../assets/images/recipes/{slug}.jpg"
heroImageAlt: ""
prepTime: "PT0M"
cookTime: "PT0M"
totalTime: "PT0M"
recipeYield: ""
difficulty: easy
recipeCategory: []
recipeCuisine: ""
keywords: []
ingredientGroups:
  - items: []
instructionGroups:
  - steps:
      - text: ""
faqs:
  - question: ""
    answer: ""
```
