# Translate Article

Assist with translating an article between English and French, using proper culinary terminology and localized SEO keywords.

## Input
- Source article file path or slug: $ARGUMENTS

## Steps

1. Read the source article MDX file
2. Determine source language from frontmatter `lang` field
3. If translating EN -> FR:
   - Translate title with natural French phrasing
   - Generate a French slug (lowercase, hyphens, no accents in slug)
   - Translate description (keep under 160 chars)
   - Translate FAQs naturally
   - Translate MDX body prose with localized SEO keywords
   - Translate alt text for any `<Picture>` components in MDX body to French
   - Use Quebec French terminology where applicable
   - Generate French keywords for SEO
   - Keep `relatedRecipes` slugs identical (they reference EN recipe slugs in both languages)
   - Keep `articleCategory` identical (enum value, not translated)

4. If translating FR -> EN:
   - Similar process in reverse
   - Keep `relatedRecipes` slugs identical
   - Keep `articleCategory` identical
   - Translate alt text for any `<Picture>` components in MDX body to English
   - Generate English SEO keywords

5. Create the translated MDX file at:
   - EN->FR: `src/content/articles/fr/{french-slug}.mdx`
   - FR->EN: `src/content/articles/en/{english-slug}.mdx`

6. Ensure `translationSlug` fields match between the pair:
   - Source file's `translationSlug` = new file's slug
   - New file's `translationSlug` = source file's slug

7. Run `npx astro check` to validate

8. Report what was created and flag any items needing Victor's review (cultural nuances, regional terms)

## Image Handling
- **EN and FR versions share the same image files** -- no image duplication needed
- Hero image: both versions reference the same file in `src/assets/images/articles/`
- **Alt text must be translated**: `heroImageAlt` in frontmatter and any `alt` attributes on `<Picture>` components in the MDX body
- Alt text should be naturally written in the target language, not a literal word-for-word translation

## Key Differences from /translate-recipe
- **No ingredient measurement conversions** -- articles don't have ingredients
- **No instruction step handling** -- articles don't have instructionGroups
- **No step images** -- articles only have hero + optional inline images
- **`relatedRecipes` stays unchanged** -- same EN slugs used in both languages
- **`articleCategory` stays unchanged** -- enum value, not localized
- **Simpler frontmatter** -- fewer fields to translate

## Translation Quality Notes
- Preserve the author's voice and tone
- Use Quebec French conventions (not France French) for culinary terms
- Keep SEO keywords natural -- don't keyword-stuff
- FAQs should feel native, not translated
- Cross-links in prose: translate the link text but keep the URL path structure correct (`/fr/articles/{slug}/`, `/fr/recettes/{slug}/`)
