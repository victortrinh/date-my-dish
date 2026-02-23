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
     - tablespoons -> cuillères à soupe
     - teaspoons -> cuillères à thé (Quebec French)
     - ounces -> grammes
   - Translate instruction steps with proper culinary verbs
   - Translate FAQs naturally
   - Translate MDX body prose with localized SEO keywords
   - Use Quebec French terminology where applicable (souper vs dîner, déjeuner vs petit-déjeuner)
   - Generate French keywords for SEO

4. If translating FR -> EN:
   - Similar process in reverse
   - Use standard North American English measurements
   - Generate English SEO keywords

5. Create the translated MDX file at:
   - EN->FR: `src/content/recipes/fr/{french-slug}.mdx`
   - FR->EN: `src/content/recipes/en/{english-slug}.mdx`

6. Ensure `translationSlug` fields match between the pair:
   - Source file's `translationSlug` = new file's slug
   - New file's `translationSlug` = source file's slug

7. Run `npx astro check` to validate

8. Report what was created and flag any items needing Victor's review (cultural nuances, specific ingredient names, regional terms)

## Translation Quality Notes
- Preserve the author's voice and tone
- Use Quebec French conventions (not France French) for culinary terms
- Keep SEO keywords natural — don't keyword-stuff
- FAQs should feel native, not translated
- Measurements: keep both metric and imperial where helpful
