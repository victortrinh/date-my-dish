# New Recipe

Scaffold a new bilingual recipe (EN + FR MDX file pair) with all required frontmatter fields.

## Input
- Recipe name in English: $ARGUMENTS

## Steps

1. Ask for recipe details if not provided:
   - Recipe name (EN + FR)
   - Description (EN + FR, 120-160 chars for SEO)
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
   - Step image placeholders on key instruction steps (see Image Guidelines below)
   - 3 starter FAQ entries (GEO: each answer must be self-contained, 40-60 words, quotable by AI engines)
   - MDX body with heading structure for SEO prose (h2s for sections)
   - Start prose with a "What is [dish]?" paragraph (40-60 words, directly quotable by AI engines)
   - Include 1-2 sourced citations in prose (chef attributions, food science references)
   - Inline image imports and `<Picture>` usage for process shots in body (see Image Guidelines)

5. Create `src/content/recipes/fr/{slug-fr}.mdx` with:
   - Complete frontmatter translated to French
   - `translationSlug` pointing to the English slug
   - Same structure as English version
   - Same step image references (shared files, French alt text)

6. Create a placeholder hero image if none exists:
   - `src/assets/images/recipes/{slug}.jpg`

7. Run `npx astro check` to validate the new files

8. Report what was created and any fields that need to be filled in (like actual recipe content)

## Frontmatter Template Reference

```yaml
title: ""  # Max 46 chars (renders as "title | Date My Dish" in Google, must stay under 60 total)
lang: en
translationSlug: ""
description: ""  # 120-160 chars, personality-infused CTA (under 120 triggers Ahrefs "too short" warning)
summary: ""  # GEO: 40-60 word factual summary for AI citation (what the dish is, key technique)
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
      - text: "Step description here."
        image: "../../../assets/images/recipes/{slug}-step-1.jpg"  # Optional: step photo (Astro image() import)
      - text: "Another step."
        # image omitted = no step photo for this step
nutrition:
  calories: ""
  fatContent: ""
  carbohydrateContent: ""
  proteinContent: ""
occasion: []
impressFactor: 3
dateNightTips:
  wine: ""
  music: ""
  platingTip: ""
# video:  # Optional — only add when a video URL is available
#   name: ""
#   description: ""
#   thumbnailUrl: ""
#   contentUrl: ""
#   uploadDate: YYYY-MM-DD
#   duration: "PT0M0S"  # ISO 8601 duration
faqs:
  - question: ""
    answer: ""
```

## Image Guidelines

### Target: 5-7 Images Per Recipe
- 1 hero image (required)
- 3-5 step images (recommended for key techniques/stages)
- Each image proves you actually cooked the dish (E-E-A-T Experience signal)

### Naming Convention
```
src/assets/images/recipes/
  {slug}.jpg              # Hero image
  {slug}-step-1.jpg       # Step image 1
  {slug}-step-2.jpg       # Step image 2
  {slug}-step-3.jpg       # Step image 3
```

### Step Images in Frontmatter
Add the `image` field to instruction steps that show key moments:
- Major technique (searing, emulsifying, folding)
- Visual transformation (before/after browning, sauce thickening)
- Plating / final presentation
- Not every step needs an image -- pick 3-5 most impactful moments

Step images use Astro `image()` imports (relative paths from the MDX file). They appear in:
- The recipe page visually (below the step text)
- JSON-LD HowToStep structured data (enables Google Guided Recipes on smart displays)

### Inline MDX Body Images
For process shots in the blog prose (e.g., close-ups, ingredient prep), import and use Astro's `<Picture>` component:

```mdx
import { Picture } from "astro:assets";
import stepSear from "../../../assets/images/recipes/{slug}-step-1.jpg";

<Picture
  src={stepSear}
  alt="Descriptive alt text for the searing step"
  widths={[400, 600, 900]}
  sizes="(max-width: 896px) 100vw, 896px"
  formats={["avif", "webp"]}
  class="my-4 w-full rounded-lg"
  loading="lazy"
/>
```

### Alt Text Rules
- Descriptive, ~125 characters max
- Include the dish name naturally
- Describe what's visible: colors, textures, arrangement
- No "Image of" or "Picture of" prefix
- Good: `"Golden seared salmon fillet with crispy quinoa crust on a bed of wilted greens"`
- Bad: `"Image of salmon recipe step 3"`

### Pinterest Images (Deferred)
Pinterest images (1000x1500, 2:3 ratio) are deferred until the site has 30+ published recipes. Pinterest requires a minimum content library for traction. The `pinterestImage` field exists in the schema for future use.
