# New Article

Scaffold a new bilingual article (EN + FR MDX file pair) with all required frontmatter fields.

## Input
- Article title in English: $ARGUMENTS

## Steps

1. Ask for article details if not provided:
   - Article title (EN + FR, max 46 chars each -- renders as "title | Date My Dish" in Google, must stay under 60 total)
   - Description (EN + FR, 120-160 chars for SEO)
   - Article category (one of: `cooking-techniques`, `food-science`, `guides`, `ingredients`, `kitchen-tips`, `drinks`)
   - Keywords (EN + FR)
   - Related recipe slugs (optional -- list existing EN recipe slugs for selection)
   - Tags (optional)

2. Generate the English slug from the title (lowercase, hyphens, no special chars)
3. Generate the French slug

4. Create `src/content/articles/en/{slug}.mdx` with:
   - Complete frontmatter with all required fields from the article schema
   - `translationSlug` pointing to the French slug
   - `relatedRecipes` array (verify each slug exists in `src/content/recipes/en/`)
   - 3 starter FAQ entries (GEO: each answer must be self-contained, 40-60 words, quotable by AI engines)
   - MDX body with heading structure for SEO prose (h2s for sections)
   - Include 1-2 sourced citations in prose (expert attributions, food science references)

5. Create `src/content/articles/fr/{slug-fr}.mdx` with:
   - Complete frontmatter translated to French
   - `translationSlug` pointing to the English slug
   - Same structure as English version
   - Same `relatedRecipes` slugs (EN slugs used in both)

6. Create a placeholder hero image if none exists:
   - `src/assets/images/articles/{slug}.jpg`

7. Run `npx astro check` to validate the new files

8. Report what was created and any fields that need to be filled in

## Frontmatter Template Reference

```yaml
title: ""
lang: en
translationSlug: ""
description: ""
author: "Victor"
publishDate: YYYY-MM-DD
heroImage: "../../../assets/images/articles/{slug}.jpg"
heroImageAlt: ""
keywords: []
tags: []
articleCategory: "guides"
readingTime: 5
relatedRecipes: []
faqs:
  - question: ""
    answer: ""
```

## Article Category Options

| Value | Description |
|-------|-------------|
| `cooking-techniques` | How-to guides for cooking methods and skills |
| `food-science` | The science behind cooking (Maillard, emulsions, etc.) |
| `guides` | General cooking guides and overviews |
| `ingredients` | Deep dives into specific ingredients |
| `kitchen-tips` | Practical kitchen tips and hacks |
| `drinks` | Beverage guides, cocktails, pairings |

## MDX Body Structure

Articles differ from recipes -- they don't have ingredients/instructions sections. Use this structure:

```mdx
import { Picture } from "astro:assets";
import heroImg from "../../../assets/images/articles/{slug}.jpg";

[Opening paragraph -- hook the reader. Why this topic matters. 2-3 sentences.]

## [Core Concept or Technique 1]

[2-3 paragraphs exploring the main topic]

## [Deep Dive or Practical Application]

[2-3 paragraphs with actionable advice]

## [Tips, Variations, or Common Mistakes]

[Practical tips, things to avoid]

## Related Recipes to Try

[Reference the related recipes with cross-links:]
- [Recipe Name](/en/recipes/{slug}/)

## [Final Thought or Summary]

[Closing paragraph -- key takeaway for the reader]
```

## Key Differences from Recipe Scaffolding
- No `ingredientGroups`, `instructionGroups`, `prepTime`, `cookTime`, `totalTime`, `recipeYield`, `difficulty`, `recipeCategory`, `recipeCuisine`, `nutrition`, `occasion`, `impressFactor`, or `dateNightTips`
- Uses `articleCategory` (enum) instead of `recipeCategory` (string array)
- Has `readingTime` (number) and `relatedRecipes` (string array)
- Hero images go in `src/assets/images/articles/` (not `src/assets/images/recipes/`)
- No step images -- articles only need a hero image
- JSON-LD uses `BlogPosting` schema (not `Recipe`)

## Image Guidelines
- 1 hero image required (same sizing as recipe heroes: max 1200px, < 200KB, quality 82)
- Additional inline images optional for visual examples
- Images go in `src/assets/images/articles/`
- Alt text: descriptive, ~125 chars, no "Image of" prefix

## Alt Text Rules
- Descriptive, ~125 characters max
- Include the topic naturally
- Describe what's visible: colors, textures, arrangement
- No "Image of" or "Picture of" prefix
