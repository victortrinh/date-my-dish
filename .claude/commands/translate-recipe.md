# Translate Recipe

Assist with translating a recipe between English and French, using proper culinary terminology and localized SEO keywords.

## Input
- Source recipe file path or slug: $ARGUMENTS

## Steps

1. Read the source recipe MDX file
2. Determine source language from frontmatter `lang` field
3. If translating EN -> FR:
   - Translate title with natural French phrasing
   - Generate a French slug (lowercase, hyphens, no accents in slug)
   - Translate description (keep under 160 chars)
   - Translate all ingredient groups using proper French culinary measurements:
     - cups -> tasses or ml
     - tablespoons -> cuilleres a soupe
     - teaspoons -> cuilleres a the (Quebec French)
     - ounces -> grammes
   - Translate instruction steps with proper culinary verbs
   - Keep step `image` references identical (EN/FR share the same image files)
   - Keep `video` field identical if present (video metadata is language-neutral)
   - Translate FAQs naturally
   - Translate MDX body prose with localized SEO keywords
   - Translate alt text for any `<Picture>` components in MDX body to French
   - Use Quebec French terminology where applicable (souper vs diner, dejeuner vs petit-dejeuner)
   - Generate French keywords for SEO

4. If translating FR -> EN:
   - Similar process in reverse
   - Use standard North American English measurements
   - Keep step `image` references identical (shared files)
   - Keep `video` field identical if present (video metadata is language-neutral)
   - Translate alt text for any `<Picture>` components in MDX body to English
   - Generate English SEO keywords

5. Create the translated MDX file at:
   - EN->FR: `src/content/recipes/fr/{french-slug}.mdx`
   - FR->EN: `src/content/recipes/en/{english-slug}.mdx`

6. Ensure `translationSlug` fields match between the pair:
   - Source file's `translationSlug` = new file's slug
   - New file's `translationSlug` = source file's slug

7. Run `npx astro check` to validate

8. Report what was created and flag any items needing Victor's review (cultural nuances, specific ingredient names, regional terms)

## Image Handling
- **EN and FR versions share the same image files** -- no image duplication needed
- Hero image: both versions reference the same file in `src/assets/images/recipes/`
- Step images: keep the same `image` URL strings in instruction steps (images are language-neutral)
- **Alt text must be translated**: `heroImageAlt` in frontmatter and any `alt` attributes on `<Picture>` components in the MDX body
- Alt text should be naturally written in the target language, not a literal word-for-word translation

## Translation Quality Notes
- Preserve the author's voice and tone
- Use Quebec French conventions (not France French) for culinary terms
- Keep SEO keywords natural -- don't keyword-stuff
- FAQs should feel native, not translated
- Measurements: keep both metric and imperial where helpful
