# Affiliate Articles Design Spec

**Date**: 2026-03-24
**Status**: Approved
**Branch**: `feat/affiliate`

## Problem

The Notion blog database has an "Affiliate Links" post type containing editorial articles with inline Amazon affiliate links to recommended kitchen products. There is no way to publish these articles through the existing pipeline, and no components exist to render product recommendations with proper styling, SEO markup, or FTC compliance.

## Solution

Extend the existing article content type and publishing pipeline to support affiliate articles. No new content collection or route structure needed; affiliate articles are regular articles with additional frontmatter fields and three new components.

## Content Schema Changes

### New Fields in `src/content.config.ts` (article schema)

```typescript
isAffiliate: z.boolean().optional().default(false),
affiliateProducts: z.array(z.object({
  name: z.string(),
  url: z.string().url(),
  description: z.string().optional(),
})).optional(),
```

- `isAffiliate`: When `true`, renders FTC disclosure banner and enables the recommended products section.
- `affiliateProducts`: Array of products displayed in both inline `<ProductCard>` components and the bottom "Recommended Products" section.
- **Product images**: If the Notion article contains images (uploaded product photos, screenshots, etc.), the fetch script downloads them and the publish task includes them in the MDX body using the standard `<Picture>` component pattern. These are author-provided images from Notion, not hotlinked Amazon images. The `affiliateProducts` frontmatter array does not include images; images stay inline in the MDX body where the author placed them.
- **Article category**: Affiliate articles use `articleCategory: "guides"` since they are product recommendation guides.

## New Components

### 1. `ProductCard.astro`

Inline product recommendation card used within MDX body.

**Props:**
- `name: string` (required)
- `url: string` (required, Amazon affiliate URL)
- `description?: string`
- `locale: Locale`

**Behavior:**
- Renders product name, optional description, and a "View on Amazon" CTA button
- All Amazon links get `rel="sponsored nofollow"` and `target="_blank"`
- Semantic markup only (no Schema.org `Product` type, which requires `offers` or `review` for rich results). Uses a simple `<aside>` with appropriate ARIA.
- Light/dark mode styling matching the site's editorial look
- Not "ad-like"; blends with article prose
- Gets `no-print` class (product links are not useful in print)

### 2. `AffiliateDisclosure.astro`

FTC-required disclosure banner.

**Props:**
- `locale: Locale`

**Behavior:**
- Renders a subtle callout with disclosure text
- EN: "As an Amazon Associate I earn from qualifying purchases. Product links on this page are affiliate links."
- FR: Quebec French equivalent
- Styled as a muted callout (not intrusive), consistent with site design

### 3. `RecommendedProducts.astro`

Bottom-of-article product summary grid.

**Props:**
- `products: { name: string; url: string; description?: string }[]` (from frontmatter)
- `locale: Locale`

**Behavior:**
- H2 heading: "Recommended Products" / "Produits recommandes"
- Grid of `ProductCard` components from the `affiliateProducts` frontmatter
- Only renders when `affiliateProducts` array is non-empty
- Acts as a quick-reference for readers who skip the article prose
- Gets `no-print` class

## Article Page Template Changes

In `src/pages/en/articles/[...slug].astro` and `src/pages/fr/articles/[...slug].astro`:

```
if (article.data.isAffiliate) {
  - Render <AffiliateDisclosure> inside the max-w-prose content zone, immediately before <Content />
  - Render <RecommendedProducts> after Related Recipes, before Author Bio
}
```

No changes to existing components. Conditional rendering only.

### Inline Amazon Link Handling

Affiliate articles contain Amazon links directly in the MDX prose body (from Notion content). These inline links also need `rel="sponsored nofollow"`. Two options:

- **Option A (recommended)**: The `daily-content-publish` task wraps all Amazon links in the generated MDX with explicit `rel` and `target` attributes during generation.
- **Option B**: A custom rehype plugin that detects `amzn.to` or `amazon.` domains and automatically adds the attributes at build time.

Option A is simpler and avoids adding build-time plugins.

## Fetch Pipeline Changes

### `scripts/fetch-notion-article.mjs`

1. **Expand the filter** to also match rows where `Post Type === "Affiliate Links"` (currently only fetches "Informative Posts").
2. **Add a `postType` field** to the pending JSON output so downstream tasks know the article type.
3. **Extract product data** from the article body: detect the Notion pattern of H4 heading + prose + Amazon link, and structure each product into a `products` array in the pending JSON. If pattern matching fails for some products, still publish the article with whatever products were successfully extracted and log a warning:
   ```json
   {
     "postType": "Affiliate Links",
     "products": [
       {
         "name": "Victorinox Fibrox 8-inch Chef's Knife",
         "url": "https://amzn.to/4ta72Dr"
       }
     ]
   }
   ```

### `notion/pending-article.json`

Gets a new `postType` field and optional `products` array.

### `daily-content-publish` Scheduled Task

Update to handle affiliate articles:

1. Detect `postType: "Affiliate Links"` in pending JSON.
2. Set `isAffiliate: true` in generated frontmatter.
3. Build the `affiliateProducts` array from extracted product data.
4. Include `<ProductCard>` component imports and usage in the MDX body at appropriate locations (after each product description).
5. Add the affiliate disclosure callout in the prose.
6. Adjust prose generation to use helpful product guidance tone rather than pure technique/education.

### Content Preservation Rule

**The publish pipeline must never remove content from the Notion source.** All text, headings, lists, callouts, images, and links from the Notion article body must be preserved in the generated MDX. The pipeline may:

- **Modify**: Reword for brand voice, add `rel` attributes to links, wrap products in `<ProductCard>` components, adjust heading levels
- **Add**: Affiliate disclosure, `<Picture>` component imports, frontmatter fields, i18n translations
- **Never remove**: Prose paragraphs, product descriptions, tips, callouts, images, or any author-written content from Notion

## i18n

New translation keys in `src/i18n/en.json` and `src/i18n/fr.json`:

- `affiliate.disclosure`: FTC disclosure text
- `affiliate.viewOnAmazon`: "View on Amazon" / "Voir sur Amazon"
- `affiliate.recommendedProducts`: "Recommended Products" / "Produits recommandes"

## SEO & Compliance

- **No Schema.org Product markup**: Bare `Product` type without `offers`/`review` triggers Search Console warnings. Product cards use semantic HTML only. The article itself retains `BlogPosting` + `FAQPage` JSON-LD.
- **Link attributes**: All Amazon affiliate links (both in `ProductCard` components and inline MDX prose) get `rel="sponsored nofollow"` per Google guidelines.
- **FTC disclosure**: Visible on every affiliate article per FTC requirements. EN and FR versions.
- **Hreflang**: Works automatically via existing `translationSlug` system.
- **No duplicate content**: Product descriptions are written by the author in Notion, not sourced from Amazon.

## Out of Scope

- Amazon Product Advertising API integration (can layer on later if sales volume justifies it)
- Live pricing display
- Product image auto-fetching from Amazon (author-uploaded Notion images ARE included)
- Dedicated `/affiliate/` routes (affiliate articles live under `/articles/`)
- Product comparison tables or ratings systems
- Affiliate link expiration monitoring

## Notion Content Structure (Reference)

From article #60 "Entry-Level Cooking Essentials", the Notion body structure is:

- Intro paragraph
- Affiliate disclosure callout (author-written)
- H3: "Top 10 Must-Have Tools..."
- For each product (x10):
  - H4: Product category name (e.g., "1) Chef's knife (20 cm / 8\")")
  - Prose: what it is, what to look for, how to use it
  - Amazon link: product name as link text, affiliate URL as href
- H3: "Quick Buy Order" priority section

The fetch script must parse this pattern to extract structured product data.
