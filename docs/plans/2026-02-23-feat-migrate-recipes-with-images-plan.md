---
title: "Migrate 9 WordPress Recipes with Images to Astro"
type: feat
status: active
date: 2026-02-23
origin: docs/plans/2026-02-23-feat-wordpress-to-astro-migration-plan.md
---

# Migrate 9 WordPress Recipes with Images to Astro

## Overview

Migrate the 9 recipes from datemydish.com that have real hero photographs into the new Astro site. Each recipe gets a bilingual EN + FR MDX pair with SEO-optimized frontmatter, 800-1500 word blog prose, FAQ section, and JSON-LD structured data. This is Phase 6 of the WordPress-to-Astro migration plan.

## Problem Statement / Motivation

The current WordPress site has 31 recipes, but only 9 have actual hero images. The new Astro site currently has just 1 recipe (chocolate crepes). Recipes without images cannot generate Google Rich Results (image is a required field), so migrating the 9 with images first maximizes SEO impact from day one.

## Scope: 9 Recipes to Migrate

| # | Recipe | New EN Slug | Category | Cuisine | Difficulty |
|---|--------|-------------|----------|---------|------------|
| 1 | Brussels Sprouts Salad with Fish Sauce Vinaigrette | `brussels-sprouts-salad` | appetizer | Southeast Asian | medium |
| 2 | Crispy Vegan Calamari (King Oyster Mushroom) | `crispy-vegan-calamari` | appetizer | Mediterranean | medium |
| 3 | Zucchini Eggplant Chips | `zucchini-eggplant-chips` | appetizer | Mediterranean | easy |
| 4 | Cacio e Pepe | `cacio-e-pepe` | dinner | Italian | medium |
| 5 | Beef Ragu Pappardelle | `beef-ragu-pappardelle` | dinner | Italian | medium |
| 6 | Quinoa-Crusted Salmon with Spicy Orange Miso | `quinoa-crusted-salmon` | dinner | Asian-Latin Fusion | medium |
| 7 | Cauliflower Steak with Romesco Sauce | `cauliflower-steak-with-romesco-sauce` | dinner | Spanish | easy |
| 8 | Penne alla Vodka with Sausages | `penne-alla-vodka` | dinner | Italian | easy |
| 9 | Lemon Posset Brulee | `lemon-posset-brulee` | dessert | British | easy |

## Proposed Solution

For each of the 9 recipes, create:
1. **EN MDX file** at `src/content/recipes/en/{slug}.mdx` with complete frontmatter + SEO blog prose
2. **FR MDX file** at `src/content/recipes/fr/{slug-fr}.mdx` with localized frontmatter + Quebec French prose
3. **Hero image** downloaded from WordPress and placed in `src/assets/images/recipes/`
4. **Redirect rule** in `public/_redirects` from old WordPress URL to new Astro URL
5. **Validation** via `astro check` after each batch

## SEO Content Template (Repeatable Per Recipe)

Every recipe MDX file must follow this exact structure for consistent SEO performance.

### Frontmatter Structure

```yaml
---
title: ""                    # Primary keyword in title, 50-60 chars
lang: en                     # "en" or "fr"
translationSlug: ""          # Slug of the paired translation
description: ""              # Meta description, max 160 chars, include primary keyword
author: "Victor"
publishDate: 2025-XX-XX     # Original WordPress publish date
updatedDate: 2026-02-23     # Migration date
heroImage: "../../../assets/images/recipes/{slug}.jpg"
heroImageAlt: ""             # Descriptive, ~125 chars, include dish name
prepTime: "PTXM"            # ISO 8601 exact duration (no ranges)
cookTime: "PTXM"
totalTime: "PTXM"
recipeYield: ""              # e.g., "2 servings" or "4 steaks"
difficulty: easy             # easy | medium | hard
recipeCategory:              # Array: appetizer, breakfast, lunch, dinner, dessert, snack, side-dish, sauce
  - dinner
recipeCuisine: ""            # e.g., "Italian", "Japanese"
keywords:                    # 5-8 SEO keywords (researched, not translated from FR)
  - primary keyword
  - secondary keyword
  - long-tail variant
tags:                        # Optional grouping tags
  - ingredient-based
  - technique-based
ingredientGroups:            # Grouped with optional labels
  - group: "Group Name"     # Optional, omit for single-group recipes
    items:
      - "quantity unit ingredient, preparation"
instructionGroups:           # Grouped with optional labels
  - group: "Group Name"
    steps:
      - text: "Action-oriented instruction step."
nutrition:                   # All fields optional but calories strongly recommended
  calories: "XXX kcal"
  fatContent: "Xg"
  carbohydrateContent: "Xg"
  proteinContent: "Xg"
faqs:                        # Minimum 5, target 5-6
  - question: ""
    answer: ""               # 40-80 words per answer
---
```

### MDX Body Structure (SEO Blog Prose)

Target: **800-1500 words**. Match word count to recipe complexity.

```markdown
[Opening paragraph - 80-120 words]
Include primary keyword in first 100 words.
Direct, confident opening. No hedging.
Self-contained paragraph (works as AI excerpt).

## Why This Recipe Works
[2-3 paragraphs explaining technique, flavor science, or what makes it special]
[Include 1 internal link to related recipe in first 200 words]
[Use specific statistics: exact temperatures, times, measurements]

## Key Ingredients
[Highlight 2-3 star ingredients with buying/selection tips]
[Include substitution guidance]

## Step-by-Step Tips
[Practical cooking advice beyond the instruction steps]
[Short paragraphs: 60-100 words each]
[Definitive language: "Sear for 3 minutes" not "You might want to sear for about 3 minutes"]

## Variations & Substitutions
[Dietary modifications, ingredient swaps]
[Internal link to complementary recipe]

## Serving Suggestions
[Pairing ideas with internal links to side dishes/sauces]
[Internal link to category page]

## Storage & Make-Ahead
[Fridge/freezer life, reheating instructions]

[Closing paragraph - warm, personal, 60-80 words]
```

### Heading Rules
- H1: Only the frontmatter `title` (rendered by layout)
- H2: Main sections (5-7 per post)
- H3: Sub-sections under H2 only (no level skipping)
- Include primary keyword naturally in at least one H2

### Internal Linking Strategy
- **3-5 internal links per recipe**
- At least 1 link in first 200 words
- Link to category pillar page (e.g., `/en/recipes/category/dinner/`)
- Link to 2-3 related recipes (by cuisine, technique, or pairing)
- Varied, descriptive anchor text (not "click here")
- After publishing new recipe, go back and add links FROM existing recipes

### FAQ Requirements
- **5-6 FAQs per recipe** (minimum 5 per Zod schema)
- Best question types:
  - Substitution: "Can I use X instead of Y?"
  - Storage: "How long does this keep?"
  - Technique: "Why did my X turn out Y?"
  - Make-ahead: "Can I prepare this in advance?"
  - Dietary: "Is this gluten-free / vegan?"
  - Scaling: "Can I double this recipe?"
- Answers: 40-80 words, self-contained, definitive
- Visible on page (not hidden) for SEO and AI citability

### GEO (AI Visibility) Requirements
- Lead with direct answer in opening paragraph
- Self-contained paragraphs (each works as standalone excerpt)
- Include specific statistics (exact times, temperatures, calorie counts)
- Definitive statements over hedging
- Question-based H2 headings where natural (matches AI query patterns)
- At least one authoritative reference per recipe (technique source, ingredient origin)

## Image Requirements

### Hero Image
- **Filename**: `{slug}.jpg` (lowercase, hyphenated, descriptive)
- **Source**: Download from WordPress `wp-content/uploads/` directory
- **Location**: `src/assets/images/recipes/{slug}.jpg`
- **Alt text**: `"[Descriptive adjective] [dish name] [context/setting]"` (~125 chars)
  - Example: `"Golden crispy vegan calamari made with king oyster mushrooms served on a white plate with lemon wedges"`
- **Format**: Astro handles AVIF/WebP conversion automatically via `<Picture>`

### Pinterest Image (Optional, Phase 2)
- 1000x1500px (2:3 ratio)
- Text overlay with recipe name
- Brand URL on image
- `pinterestImage` field in frontmatter

## French Translation Guidelines

### Quebec French Specifics
- Use Quebec meal names: dejeuner (breakfast), diner (lunch), souper (dinner)
- Use Quebec measurements: cuillere a the (not cuillere a cafe)
- Localized culinary terms, not France French
- `lang: fr` in frontmatter

### Localized Fields
- `title`: Translated, includes FR primary keyword
- `description`: Independently written for FR SEO (not literal translation)
- `heroImageAlt`: Translated
- `keywords`: Independent FR keyword research (not translations of EN keywords)
- `ingredientGroups.items`: Fully translated
- `instructionGroups.steps.text`: Fully translated
- `faqs`: Translated questions and answers
- MDX body: Full French prose (not machine translation)

### FR Slug Convention
| EN Slug | FR Slug |
|---------|---------|
| `brussels-sprouts-salad` | `salade-de-choux-de-bruxelles` |
| `crispy-vegan-calamari` | `calamars-vegetaliens-croustillants` |
| `zucchini-eggplant-chips` | `chips-de-courgettes-et-aubergines` |
| `cacio-e-pepe` | `cacio-e-pepe` |
| `beef-ragu-pappardelle` | `pappardelle-au-ragu-de-boeuf` |
| `quinoa-crusted-salmon` | `saumon-en-croute-de-quinoa` |
| `cauliflower-steak-with-romesco-sauce` | `steak-de-chou-fleur-sauce-romesco` |
| `penne-alla-vodka` | `penne-alla-vodka` |
| `lemon-posset-brulee` | `posset-brulee-au-citron` |

## Redirect Rules

Add to `public/_redirects` (Cloudflare Pages format):

```
# WordPress recipe redirects (301 permanent)
/brussels-sprouts-salad/           /en/recipes/brussels-sprouts-salad/           301
/crispy-vegan-calamari/            /en/recipes/crispy-vegan-calamari/            301
/zucchini-eggplant-chips/         /en/recipes/zucchini-eggplant-chips/         301
/cacio-e-pepe/                     /en/recipes/cacio-e-pepe/                     301
/beef-ragu-pappardelle/            /en/recipes/beef-ragu-pappardelle/            301
/quinoa-crusted-salmon/            /en/recipes/quinoa-crusted-salmon/            301
/cauliflower-steak-with-romesco-sauce/ /en/recipes/cauliflower-steak-with-romesco-sauce/ 301
/penne-alla-vodka/                 /en/recipes/penne-alla-vodka/                 301
/lemon-posset-brulee/              /en/recipes/lemon-posset-brulee/              301
```

## Implementation Phases

### Phase A: Image Download & Preparation
Download all 9 hero images from WordPress and rename to match new slug convention.

**Files to create:**
- `src/assets/images/recipes/brussels-sprouts-salad.jpg`
- `src/assets/images/recipes/crispy-vegan-calamari.jpg`
- `src/assets/images/recipes/zucchini-eggplant-chips.jpg`
- `src/assets/images/recipes/cacio-e-pepe.jpg`
- `src/assets/images/recipes/beef-ragu-pappardelle.jpg`
- `src/assets/images/recipes/quinoa-crusted-salmon.jpg`
- `src/assets/images/recipes/cauliflower-steak-with-romesco-sauce.jpg`
- `src/assets/images/recipes/penne-alla-vodka.jpg`
- `src/assets/images/recipes/lemon-posset-brulee.jpg`

**Image source URLs:**
| Recipe | WordPress Image URL |
|--------|-------------------|
| Brussels Sprouts Salad | `https://datemydish.com/wp-content/uploads/2025/05/DSCF2569.webp` |
| Crispy Vegan Calamari | `https://datemydish.com/wp-content/uploads/2025/05/DSCF2331-scaled.webp` |
| Zucchini Eggplant Chips | `https://datemydish.com/wp-content/uploads/2025/05/DSCF2661-2.webp` |
| Cacio e Pepe | `https://datemydish.com/wp-content/uploads/2025/05/DSCF2688-2.webp` |
| Beef Ragu Pappardelle | `https://datemydish.com/wp-content/uploads/2025/06/DSCF2966-1.jpg` |
| Quinoa-Crusted Salmon | `https://datemydish.com/wp-content/uploads/2025/06/DSCF2927.jpg` |
| Cauliflower Steak | `https://datemydish.com/wp-content/uploads/2025/05/DSCF2456-scaled.webp` |
| Penne alla Vodka | `https://datemydish.com/wp-content/uploads/2025/06/DSCF2525-1-scaled.jpg` |
| Lemon Posset Brulee | `https://datemydish.com/wp-content/uploads/2025/06/DSCF2440-2-scaled.webp` |

### Phase B: English Recipe MDX Files (Batch of 9)

Create all 9 EN MDX files following the SEO template above. Scraped content from WordPress serves as the base; rewrite and optimize for SEO.

**Files to create:**
- `src/content/recipes/en/brussels-sprouts-salad.mdx`
- `src/content/recipes/en/crispy-vegan-calamari.mdx`
- `src/content/recipes/en/zucchini-eggplant-chips.mdx`
- `src/content/recipes/en/cacio-e-pepe.mdx`
- `src/content/recipes/en/beef-ragu-pappardelle.mdx`
- `src/content/recipes/en/quinoa-crusted-salmon.mdx`
- `src/content/recipes/en/cauliflower-steak-with-romesco-sauce.mdx`
- `src/content/recipes/en/penne-alla-vodka.mdx`
- `src/content/recipes/en/lemon-posset-brulee.mdx`

**Per-recipe data to fill in or verify:**
| Recipe | Missing Data |
|--------|-------------|
| Brussels Sprouts Salad | prepTime, cookTime, totalTime, servings, nutrition |
| Crispy Vegan Calamari | Full nutrition breakdown |
| Zucchini Eggplant Chips | prepTime, cookTime, totalTime, servings, nutrition |
| Cacio e Pepe | Complete (has full nutrition) |
| Beef Ragu Pappardelle | Exact times need ISO conversion, nutrition |
| Quinoa-Crusted Salmon | Full nutrition breakdown |
| Cauliflower Steak | Full nutrition breakdown |
| Penne alla Vodka | prepTime, cookTime, totalTime, servings, nutrition |
| Lemon Posset Brulee | Full nutrition breakdown (note: total time excludes 4h chill) |

### Phase C: French Recipe MDX Files (Batch of 9)

Create all 9 FR MDX files with Quebec French localization.

**Files to create:**
- `src/content/recipes/fr/salade-de-choux-de-bruxelles.mdx`
- `src/content/recipes/fr/calamars-vegetaliens-croustillants.mdx`
- `src/content/recipes/fr/chips-de-courgettes-et-aubergines.mdx`
- `src/content/recipes/fr/cacio-e-pepe.mdx`
- `src/content/recipes/fr/pappardelle-au-ragu-de-boeuf.mdx`
- `src/content/recipes/fr/saumon-en-croute-de-quinoa.mdx`
- `src/content/recipes/fr/steak-de-chou-fleur-sauce-romesco.mdx`
- `src/content/recipes/fr/penne-alla-vodka.mdx`
- `src/content/recipes/fr/posset-brulee-au-citron.mdx`

### Phase D: Redirects & Validation

1. Update `public/_redirects` with all 9 redirect rules
2. Run `npx astro check` to validate all 18 MDX files
3. Run `npm run build` to verify full site builds
4. Spot-check 3 recipe pages in browser for:
   - JSON-LD validity (paste into Google Rich Results Test)
   - Hreflang correctness (EN <-> FR bidirectional)
   - Image rendering (AVIF/WebP served)
   - FAQ section visible and expandable
   - Language toggle navigates to correct FR recipe

## Per-Recipe SEO Checklist

Run this for every recipe after creation:

### Content Quality
- [ ] Title includes primary keyword, under 60 chars
- [ ] Description includes primary keyword, under 160 chars
- [ ] Primary keyword appears in first 100 words of MDX body
- [ ] At least one H2 contains primary keyword naturally
- [ ] Word count: 800-1500 words (body prose only)
- [ ] Short paragraphs (60-100 words max)
- [ ] Definitive language, no hedging
- [ ] Self-contained paragraphs (each works as AI excerpt)
- [ ] 3-5 internal links with varied anchor text

### Schema / Structured Data
- [ ] All required fields present: title, description, heroImage, heroImageAlt
- [ ] Times in ISO 8601 format (PT15M, PT1H30M)
- [ ] recipeYield specified
- [ ] recipeCategory uses site vocabulary (appetizer, dinner, dessert, etc.)
- [ ] recipeCuisine specified
- [ ] 5-8 keywords (researched, not guessed)
- [ ] ingredientGroups with proper grouping
- [ ] instructionGroups with clear, action-oriented steps
- [ ] nutrition.calories at minimum
- [ ] 5-6 FAQs with 40-80 word answers

### Images
- [ ] Hero image exists in `src/assets/images/recipes/`
- [ ] Filename is descriptive and slug-matching
- [ ] heroImageAlt is descriptive (~125 chars), includes dish name
- [ ] No "Image of" or "Picture of" prefix in alt text

### Bilingual
- [ ] FR version exists with matching translationSlug
- [ ] FR keywords independently researched
- [ ] Quebec French terminology used
- [ ] Both lang fields correct (en/fr)
- [ ] translationSlug bidirectional links verified

### Technical
- [ ] `astro check` passes
- [ ] Redirect rule added to `public/_redirects`
- [ ] publishDate matches original WordPress date
- [ ] updatedDate set to migration date

## Recipe-by-Recipe Content Notes

### 1. Brussels Sprouts Salad
- **EN title**: "Brussels Sprouts Salad with Crispy Leaves and Fish Sauce Vinaigrette"
- **Key angle**: Southeast Asian twist on Brussels sprouts, fish sauce dressing, date night presentation
- **Ingredient groups**: Dressing (7 items), Salad Base (6 items)
- **Instruction groups**: Make Dressing, Prepare Salad Base, Fry Brussels Sprout Leaves, Assemble, Plate, Finish
- **Missing data to fill**: prepTime (~20m), cookTime (~15m), totalTime (~35m), servings (2), nutrition (estimate)
- **Difficulty**: medium (deep frying + mandoline work)

### 2. Crispy Vegan Calamari
- **EN title**: "Crispy Vegan Calamari with King Oyster Mushrooms"
- **Key angle**: Plant-based calamari that fools omnivores, king oyster mushroom rings, kombu-infused umami
- **Ingredient groups**: Main (5 items), Batter (6 items)
- **Instruction groups**: Single group, 12 steps
- **Available data**: 15m prep, 15m cook, 30m total, 2 servings, 335 kcal
- **Difficulty**: medium (deep frying technique)

### 3. Zucchini Eggplant Chips
- **EN title**: "Crispy Zucchini and Eggplant Chips with Sparkling Water Batter"
- **Key angle**: Light tempura-style batter with sparkling water for extra crunch, served with tzatziki
- **Ingredient groups**: Vegetable Chips (5 items), Batter (8 items)
- **Instruction groups**: Prepare Batter, Prepare Vegetables, Coat and Fry, Finish
- **Missing data**: prepTime (~15m), cookTime (~15m), totalTime (~30m), servings (2-4), nutrition (estimate)
- **Difficulty**: easy

### 4. Cacio e Pepe
- **EN title**: "Authentic Cacio e Pepe (Roman Cheese and Pepper Pasta)"
- **Key angle**: Only 5 ingredients, technique-driven, toasted peppercorns, starchy pasta water emulsion
- **Ingredient groups**: Single group (5 items)
- **Instruction groups**: Single group, 9 steps
- **Available data**: 10m prep, 15m cook, 25m total, 2 servings, full nutrition (415 kcal)
- **Difficulty**: medium (emulsion technique is tricky)
- **Existing FAQs**: 3 (need 2-3 more)

### 5. Beef Ragu Pappardelle
- **EN title**: "Slow-Cooked Beef Ragu with Pappardelle Pasta"
- **Key angle**: Low-and-slow braised beef, fork-shredded meat, wide ribbons catching every drop
- **Ingredient groups**: Single group (15 items)
- **Instruction groups**: 7 named steps (Sear, Saute, Build Ragu, Shred, Cook Pasta, Combine, Serve)
- **Available data**: ~15m prep, ~2h30m cook, ~3h total, 2 servings
- **Missing**: nutrition
- **Difficulty**: medium (long cook time, not complex technique)

### 6. Quinoa-Crusted Salmon
- **EN title**: "Quinoa-Crusted Salmon with Spicy Orange Miso Sauce"
- **Key angle**: Nikkei fusion (Japanese-Peruvian), aji amarillo heat, crispy quinoa crust
- **Ingredient groups**: Sauce (6 items), Salmon & Crust (6 items)
- **Instruction groups**: 5 named steps (Sauce, Crust, Cook, Warm Sauce, Plate)
- **Available data**: 20m prep, 20m cook, 40m total, 2 servings, 400 kcal
- **Difficulty**: medium

### 7. Cauliflower Steak with Romesco Sauce
- **EN title**: "Roasted Cauliflower Steaks with Smoky Romesco Sauce"
- **Key angle**: Vegan showstopper, Spanish romesco, restaurant-quality presentation
- **Ingredient groups**: Main (4 items), Romesco Sauce (4 items), Garnish (3 items)
- **Instruction groups**: 8 steps (prep, roast, flip, blend sauce, plate)
- **Available data**: 10m prep, 30m cook, 40m total, 4 servings, 252 kcal
- **Difficulty**: easy

### 8. Penne alla Vodka
- **EN title**: "Creamy Penne alla Vodka with Italian Sausage"
- **Key angle**: Comfort food classic with sausage twist, creamy tomato-vodka sauce, one-pan
- **Ingredient groups**: Single group (12 items)
- **Instruction groups**: 3 steps (brown sausage, build sauce, cook pasta)
- **Missing data**: prepTime (~10m), cookTime (~30m), totalTime (~40m), servings (2), nutrition
- **Difficulty**: easy

### 9. Lemon Posset Brulee
- **EN title**: "Lemon Posset Brulee (3-Ingredient No-Bake Dessert)"
- **Key angle**: Only 3 core ingredients, served in hollowed lemon shells, torch-brulee finish
- **Ingredient groups**: Single group (5 items)
- **Instruction groups**: 8 steps (juice, scoop, cook cream, cool, pour, chill, sugar, torch)
- **Available data**: 15m prep, 10m cook, 25m active + 4h chill, 6 servings, 325 kcal
- **Note**: totalTime should be "PT4H25M" to include chilling
- **Difficulty**: easy

## Acceptance Criteria

### Functional
- [ ] All 9 EN MDX files pass `astro check` with zero errors
- [ ] All 9 FR MDX files pass `astro check` with zero errors
- [ ] `npm run build` succeeds
- [ ] All 9 EN recipes render correctly at `/en/recipes/{slug}/`
- [ ] All 9 FR recipes render correctly at `/fr/recettes/{slug-fr}/`
- [ ] Language toggle navigates between EN <-> FR for each recipe
- [ ] FAQ sections are visible and expandable on all 18 pages
- [ ] Related recipes section shows relevant suggestions

### SEO
- [ ] All 18 recipe pages have valid JSON-LD (Recipe + FAQPage schemas)
- [ ] Hreflang tags are bidirectional on all 18 pages
- [ ] Canonical URLs are self-referencing on all pages
- [ ] All 9 redirect rules work (old WordPress URL -> new Astro URL)
- [ ] Meta descriptions are unique per page and under 160 chars
- [ ] Hero images serve AVIF/WebP formats

### Content Quality
- [ ] Each EN recipe has 800-1500 words of blog prose
- [ ] Each recipe has 5-6 FAQs with substantive answers
- [ ] Each recipe has 3-5 internal links
- [ ] Ingredients are accurate and complete (match original WordPress content)
- [ ] Instructions are clear, action-oriented, and accurate
- [ ] Quebec French is used in FR versions (not France French)

## Dependencies & Risks

### Dependencies
- Hero images must be downloaded from WordPress before MDX files are created (image() validation)
- FR slugs must be finalized before EN files can set translationSlug

### Risks
- **WordPress image quality**: Some images may be low resolution or poorly cropped. Mitigation: check dimensions after download, flag any under 800px wide.
- **Missing recipe data**: Several recipes lack prep/cook times, servings, and nutrition. Mitigation: estimate reasonable values based on recipe complexity and document as estimates.
- **FAQ content truncated**: WordPress FAQ content couldn't be fully scraped. Mitigation: write fresh, SEO-optimized FAQs based on "People Also Ask" patterns.

## Success Metrics

- 18 new MDX files (9 EN + 9 FR) passing validation
- 10 total recipes live on site (1 existing + 9 new)
- All 9 old WordPress URLs redirecting correctly
- Zero JSON-LD validation errors across all recipe pages
- All recipes indexed by Google within 2 weeks of deployment (verify via Search Console)

## Sources & References

### Internal References
- **Origin plan**: [docs/plans/2026-02-23-feat-wordpress-to-astro-migration-plan.md](../plans/2026-02-23-feat-wordpress-to-astro-migration-plan.md) - Phase 6: Content Migration
- **Content schema**: `src/content.config.ts` - Zod validation for all frontmatter fields
- **Recipe template**: `.claude/commands/new-recipe.md` - Scaffolding skill
- **Existing recipe example**: `src/content/recipes/en/chocolate-crepes.mdx` - Reference for format/quality

### SEO References
- [Google Recipe Structured Data](https://developers.google.com/search/docs/appearance/structured-data/recipe) - Required/recommended schema fields
- [Google Rich Results Test](https://search.google.com/test/rich-results) - JSON-LD validation
- [Google Image SEO](https://developers.google.com/search/docs/appearance/google-images) - Alt text and naming
- [Princeton/Georgia Tech GEO Research](https://arxiv.org/html/2311.09735v3) - AI visibility optimization

### Multilingual SEO
- [Google Multilingual Sites Guide](https://developers.google.com/search/docs/specialty/international/managing-multi-regional-sites)
- [Hreflang Implementation](https://developers.google.com/search/docs/specialty/international/localized-versions)
