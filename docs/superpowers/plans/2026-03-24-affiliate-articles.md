# Affiliate Articles Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable publishing affiliate articles from Notion with styled product cards, FTC compliance, and bilingual support.

**Architecture:** Extend existing article schema with `isAffiliate` + `affiliateProducts` fields. Three new Astro components handle rendering. The Notion fetch script expands its filter to pick up "Affiliate Links" post type and extract product data. The daily-content-publish scheduled task generates MDX with `<ProductCard>` components.

**Tech Stack:** Astro 5, MDX, Zod, Tailwind CSS, Notion API (notion-client)

**Spec:** `docs/superpowers/specs/2026-03-24-affiliate-articles-design.md`

---

## File Structure

| Action | File | Responsibility |
|--------|------|----------------|
| Modify | `src/content.config.ts:113` | Add `isAffiliate` + `affiliateProducts` to article schema |
| Create | `src/components/ProductCard.astro` | Inline product recommendation card |
| Create | `src/components/AffiliateDisclosure.astro` | FTC disclosure banner |
| Create | `src/components/RecommendedProducts.astro` | Bottom-of-article product grid |
| Modify | `src/pages/en/articles/[...slug].astro` | Conditional affiliate rendering |
| Modify | `src/pages/fr/articles/[...slug].astro` | Conditional affiliate rendering (FR) |
| Modify | `src/i18n/en.json:336` | Affiliate translation keys |
| Modify | `src/i18n/fr.json:336` | Affiliate translation keys (FR) |
| Modify | `scripts/fetch-notion-article.mjs:148-150` | Expand filter + extract products |

---

### Task 1: Add i18n Translation Keys

**Files:**
- Modify: `src/i18n/en.json:336`
- Modify: `src/i18n/fr.json:336`

- [ ] **Step 1: Add EN affiliate translation keys**

In `src/i18n/en.json`, before the closing `}` on line 337, add a comma after the `bookmark` block and insert:

```json
  "affiliate": {
    "disclosure": "As an Amazon Associate I earn from qualifying purchases. Product links on this page are affiliate links.",
    "viewOnAmazon": "View on Amazon",
    "recommendedProducts": "Recommended Products"
  }
```

- [ ] **Step 2: Add FR affiliate translation keys**

In `src/i18n/fr.json`, same location. Quebec French register:

```json
  "affiliate": {
    "disclosure": "En tant que partenaire Amazon, je touche une commission sur les achats admissibles. Les liens de produits sur cette page sont des liens affiliés.",
    "viewOnAmazon": "Voir sur Amazon",
    "recommendedProducts": "Produits recommandés"
  }
```

- [ ] **Step 3: Verify dev server starts without errors**

Run: `npm run dev`
Expected: No i18n errors, site loads normally.

- [ ] **Step 4: Commit**

```bash
git add src/i18n/en.json src/i18n/fr.json
git commit -m "feat(affiliate): add i18n translation keys for affiliate articles"
```

---

### Task 2: Extend Article Content Schema

**Files:**
- Modify: `src/content.config.ts:113`

- [ ] **Step 1: Add affiliate fields to article schema**

In `src/content.config.ts`, after line 113 (`relatedRecipes: z.array(z.string()).optional(),`), add:

```typescript
      isAffiliate: z.boolean().optional().default(false),
      affiliateProducts: z
        .array(
          z.object({
            name: z.string(),
            url: z.string().url(),
            description: z.string().optional(),
          })
        )
        .optional(),
```

- [ ] **Step 2: Run schema validation**

Run: `npm run check`
Expected: PASS. No existing articles break because both fields are optional with safe defaults.

- [ ] **Step 3: Commit**

```bash
git add src/content.config.ts
git commit -m "feat(affiliate): add isAffiliate and affiliateProducts to article schema"
```

---

### Task 3: Create AffiliateDisclosure Component

**Files:**
- Create: `src/components/AffiliateDisclosure.astro`

- [ ] **Step 1: Create the component**

Create `src/components/AffiliateDisclosure.astro`:

```astro
---
import { t, type Locale } from "@i18n/utils";

interface Props {
  locale: Locale;
}

const { locale } = Astro.props;
---

<aside
  class="no-print mb-8 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-700/40 dark:bg-amber-950/30 dark:text-amber-200"
  role="note"
  aria-label={locale === "en" ? "Affiliate disclosure" : "Divulgation d'affiliation"}
>
  <p>{t(locale, "affiliate.disclosure")}</p>
</aside>
```

- [ ] **Step 2: Verify it renders correctly in isolation**

Temporarily add it to an existing article page to check styling:
Run: `npm run dev` and visually inspect.
Expected: Subtle amber callout, readable in both light and dark mode.

Remove the temporary addition after confirming.

- [ ] **Step 3: Commit**

```bash
git add src/components/AffiliateDisclosure.astro
git commit -m "feat(affiliate): create AffiliateDisclosure component"
```

---

### Task 4: Create ProductCard Component

**Files:**
- Create: `src/components/ProductCard.astro`

- [ ] **Step 1: Create the component**

Create `src/components/ProductCard.astro`:

```astro
---
import { t, type Locale } from "@i18n/utils";

interface Props {
  name: string;
  url: string;
  description?: string;
  locale: Locale;
}

const { name, url, description, locale } = Astro.props;
---

<aside
  class="no-print my-6 rounded-lg border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-700 dark:bg-neutral-800/50"
>
  <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
    <div>
      <p class="font-heading text-lg font-semibold text-warm-800 dark:text-warm-100">
        {name}
      </p>
      {description && (
        <p class="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
          {description}
        </p>
      )}
    </div>
    <a
      href={url}
      target="_blank"
      rel="sponsored nofollow"
      class="mt-2 inline-flex shrink-0 items-center rounded-md bg-brand-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-primary-dark sm:mt-0"
    >
      {t(locale, "affiliate.viewOnAmazon")}
      <svg class="ml-1.5 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
      </svg>
    </a>
  </div>
</aside>
```

- [ ] **Step 2: Commit**

```bash
git add src/components/ProductCard.astro
git commit -m "feat(affiliate): create ProductCard component"
```

---

### Task 5: Create RecommendedProducts Component

**Files:**
- Create: `src/components/RecommendedProducts.astro`

- [ ] **Step 1: Create the component**

Create `src/components/RecommendedProducts.astro`:

```astro
---
import ProductCard from "./ProductCard.astro";
import { t, type Locale } from "@i18n/utils";

interface Props {
  products: { name: string; url: string; description?: string }[];
  locale: Locale;
}

const { products, locale } = Astro.props;
---

{products && products.length > 0 && (
  <section class="no-print mt-12 mb-8">
    <h2 class="mb-6 font-heading text-2xl font-normal text-warm-800 dark:text-warm-100">
      {t(locale, "affiliate.recommendedProducts")}
    </h2>
    <div class="grid gap-4 sm:grid-cols-2">
      {products.map((product) => (
        <ProductCard
          name={product.name}
          url={product.url}
          description={product.description}
          locale={locale}
        />
      ))}
    </div>
  </section>
)}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/RecommendedProducts.astro
git commit -m "feat(affiliate): create RecommendedProducts component"
```

---

### Task 6: Integrate Affiliate Components into EN Article Page

**Files:**
- Modify: `src/pages/en/articles/[...slug].astro`

- [ ] **Step 1: Add imports**

In `src/pages/en/articles/[...slug].astro`, after line 8 (`import ArticleRelatedRecipes from ...`), add:

```typescript
import AffiliateDisclosure from "@components/AffiliateDisclosure.astro";
import RecommendedProducts from "@components/RecommendedProducts.astro";
```

- [ ] **Step 2: Add AffiliateDisclosure before Content**

In the content zone (around line 160), change:

```astro
      <!-- Blog Prose -->
      <div class="prose mb-12 max-w-none">
        <Content />
      </div>
```

to:

```astro
      <!-- Affiliate Disclosure -->
      {data.isAffiliate && (
        <AffiliateDisclosure locale={locale} />
      )}

      <!-- Blog Prose -->
      <div class="prose mb-12 max-w-none">
        <Content />
      </div>
```

- [ ] **Step 3: Add RecommendedProducts after Related Recipes**

After the Related Recipes block (around line 167), add:

```astro
      <!-- Recommended Products (affiliate) -->
      {data.isAffiliate && data.affiliateProducts && data.affiliateProducts.length > 0 && (
        <RecommendedProducts products={data.affiliateProducts} locale={locale} />
      )}
```

This should go between `ArticleRelatedRecipes` and the Author Bio `<div>`.

- [ ] **Step 4: Run dev server and verify no regressions**

Run: `npm run dev`
Navigate to an existing non-affiliate article (e.g., `/en/articles/cooking-oils-guide/`).
Expected: Page renders identically to before. No disclosure or product section visible.

- [ ] **Step 5: Commit**

```bash
git add src/pages/en/articles/[...slug].astro
git commit -m "feat(affiliate): integrate affiliate components into EN article page"
```

---

### Task 7: Integrate Affiliate Components into FR Article Page

**Files:**
- Modify: `src/pages/fr/articles/[...slug].astro`

- [ ] **Step 1: Apply identical changes as Task 6**

Same three changes as Task 6 but in `src/pages/fr/articles/[...slug].astro`:
1. Add the two imports after the ArticleRelatedRecipes import
2. Add `<AffiliateDisclosure>` before `<Content />`
3. Add `<RecommendedProducts>` after Related Recipes, before Author Bio

- [ ] **Step 2: Verify FR article page**

Run: `npm run dev`
Navigate to an existing FR article.
Expected: No regressions, no affiliate sections visible on non-affiliate articles.

- [ ] **Step 3: Commit**

```bash
git add src/pages/fr/articles/[...slug].astro
git commit -m "feat(affiliate): integrate affiliate components into FR article page"
```

---

### Task 8: Create a Test Affiliate Article (EN + FR Pair)

**Files:**
- Create: `src/content/articles/en/cooking-essentials-starter-kit.mdx`
- Create: `src/content/articles/fr/essentiels-cuisine-kit-depart.mdx`
- Create: `src/assets/images/articles/cooking-essentials-starter-kit.webp` (placeholder hero)

This is a manual test article to verify the full rendering pipeline before wiring up the fetch script. Use content from the Notion article #60 "Entry-Level Cooking Essentials."

- [ ] **Step 1: Create EN test article**

Create `src/content/articles/en/cooking-essentials-starter-kit.mdx` with full frontmatter including:
- `isAffiliate: true`
- `affiliateProducts` array with 3-4 products from the Notion content
- `articleCategory: "guides"`
- Standard required fields (title, lang, translationSlug, description, publishDate, heroImage, heroImageAlt, keywords, faqs)

Include inline `<ProductCard>` components in the MDX body after product descriptions. Import ProductCard at the top of the MDX body:

```mdx
import ProductCard from "../../../components/ProductCard.astro";
```

All Amazon links in prose must use `rel="sponsored nofollow"` and `target="_blank"`.

- [ ] **Step 2: Create FR test article**

Create `src/content/articles/fr/essentiels-cuisine-kit-depart.mdx` with:
- `translationSlug: "cooking-essentials-starter-kit"`
- Same structure, Quebec French content
- Same `affiliateProducts` array (links are the same, descriptions translated)

- [ ] **Step 3: Build and verify**

Run: `npm run build`
Expected: Build succeeds with no errors.

Run: `npm run dev`
Navigate to `/en/articles/cooking-essentials-starter-kit/`
Verify:
- Affiliate disclosure callout appears before content
- ProductCard components render inline with styled cards
- "View on Amazon" buttons link correctly with `rel="sponsored nofollow"`
- Recommended Products section appears at bottom
- Dark mode styling works
- Print view hides product cards and disclosure

Navigate to `/fr/articles/essentiels-cuisine-kit-depart/`
Verify same behavior in French.

- [ ] **Step 4: Verify hreflang and language toggle**

On the EN page, click the FR language toggle.
Expected: Navigates to the FR version.
Check page source for correct hreflang tags.

- [ ] **Step 5: Commit**

```bash
git add src/content/articles/en/cooking-essentials-starter-kit.mdx src/content/articles/fr/essentiels-cuisine-kit-depart.mdx src/assets/images/articles/cooking-essentials-starter-kit.webp
git commit -m "feat(affiliate): add test affiliate article EN/FR pair"
```

---

### Task 9: Update Notion Fetch Script

**Files:**
- Modify: `scripts/fetch-notion-article.mjs:148-150`

- [ ] **Step 1: Expand the filter to include "Affiliate Links" post type**

In `scripts/fetch-notion-article.mjs`, change lines 148-150:

```javascript
  const readyArticles = rows.filter(
    (r) =>
      r.status === "Ready to Publish" && r.postType === "Informative Posts"
  );
```

to:

```javascript
  const ARTICLE_POST_TYPES = ["Informative Posts", "Affiliate Links"];
  const readyArticles = rows.filter(
    (r) =>
      r.status === "Ready to Publish" && ARTICLE_POST_TYPES.includes(r.postType)
  );
```

- [ ] **Step 2: Add postType to the pending JSON output**

In `scripts/fetch-notion-article.mjs`, in the `pendingJson` object (around line 280), add `postType`:

```javascript
  const pendingJson = {
    source: "notion",
    fetchedAt: new Date().toISOString(),
    notionPageId: selected.pageId,
    title: selected.title,
    postType: selected.postType,  // <-- add this line
    mode,
    existingSlug,
    recipeNum: selected.recipeNum,
    // ... rest stays the same
  };
```

- [ ] **Step 3: Add product extraction function**

Before the `main()` function, add a helper that extracts products from the blocks array:

```javascript
/**
 * Extract affiliate products from article content blocks.
 * Looks for Amazon links (amzn.to or amazon.) and uses the link text as product name.
 * Returns array of { name, url } objects.
 */
function extractAffiliateProducts(blocks) {
  const products = [];
  for (const block of blocks) {
    if (block.type !== "text" || !block.text) continue;
    // Notion stores links as [[text, [["a", url]]]] in block properties
    // After our block parsing, links appear in the text content
    // Check for Amazon URLs in the block's raw properties or parsed links
    if (block.links && Array.isArray(block.links)) {
      for (const link of block.links) {
        if (link.url && (link.url.includes("amzn.to") || link.url.includes("amazon."))) {
          products.push({
            name: link.text || "Amazon Product",
            url: link.url,
          });
        }
      }
    }
  }
  if (products.length === 0) {
    console.warn("[WARN] No affiliate products extracted from blocks");
  } else {
    console.log(`  Extracted ${products.length} affiliate products`);
  }
  return products;
}
```

**Note:** The exact implementation depends on how the existing block parser stores link data. Read the block parsing code (around lines 190-260) to understand the link structure and adapt accordingly. The key logic is: find blocks containing Amazon URLs (`amzn.to` or `amazon.`) and extract the link text as the product name and the URL as the affiliate link.

- [ ] **Step 4: Add products to pending JSON for affiliate articles**

After building the `pendingJson` object, add the products extraction:

```javascript
  // Extract affiliate products if this is an affiliate article
  if (selected.postType === "Affiliate Links") {
    pendingJson.products = extractAffiliateProducts(blocks);
  }
```

- [ ] **Step 5: Test locally**

Run: `node scripts/fetch-notion-article.mjs`
Expected: Script runs, and if an affiliate article is the next unpublished one, the output JSON includes `postType` and `products` fields.

If no affiliate article is ready (other articles are first in queue), temporarily modify the filter to test. Then revert.

- [ ] **Step 6: Commit**

```bash
git add scripts/fetch-notion-article.mjs
git commit -m "feat(affiliate): expand fetch script to handle affiliate articles and extract products"
```

---

### Task 10: Update daily-content-publish Scheduled Task

**Files:**
- The scheduled task trigger is a Claude Code scheduled task (not a file in the repo). It reads `notion/pending-article.json` and generates MDX.

The scheduled task instructions need to be updated to handle the new `postType: "Affiliate Links"` field. This is done through the scheduled task configuration.

- [ ] **Step 1: Document the scheduled task update**

The `daily-content-publish` scheduled task prompt needs these additions:

1. Check `pending.postType` field. If it equals `"Affiliate Links"`:
   - Set `isAffiliate: true` in frontmatter
   - Set `articleCategory: "guides"`
   - Build `affiliateProducts` array from `pending.products`
   - Import `ProductCard` component at top of MDX body
   - After each product description in the prose, insert a `<ProductCard>` component
   - All inline Amazon links in the MDX body must use `<a href="..." target="_blank" rel="sponsored nofollow">` format
   - Preserve ALL content from Notion: never remove paragraphs, descriptions, tips, callouts, or images

2. The prose generation should use a helpful product guidance tone rather than pure technique/education.

- [ ] **Step 2: Update the scheduled task trigger via /schedule**

Use the `/schedule` skill to update the `daily-content-publish` trigger with the affiliate article handling instructions.

- [ ] **Step 3: Commit any trigger file changes**

```bash
git add -A
git commit -m "feat(affiliate): update daily-content-publish task for affiliate articles"
```

---

### Task 11: Full Build Verification

- [ ] **Step 1: Run full build**

Run: `npm run build`
Expected: Build succeeds with zero errors.

- [ ] **Step 2: Run schema validation**

Run: `npm run check`
Expected: All content passes validation.

- [ ] **Step 3: Run Playwright E2E tests**

Run: `npx playwright test`
Expected: All smoke tests pass. The new affiliate article pages return 200 and have no console errors.

- [ ] **Step 4: Visual verification**

Run: `npm run dev`
Check the test affiliate article in all 4 views:
- Desktop light
- Desktop dark
- Mobile light
- Mobile dark

Verify:
- Disclosure banner is visible and readable
- ProductCard components are styled correctly
- RecommendedProducts grid looks good on all breakpoints
- Print view hides affiliate elements
- No layout shifts or broken styling on non-affiliate articles

- [ ] **Step 5: Final commit if any fixes needed**

```bash
git add -A
git commit -m "fix(affiliate): address build verification issues"
```

---

### Task 12: Clean Up Test Article (Optional)

If the test affiliate article from Task 8 should not be deployed to production yet:

- [ ] **Step 1: Remove test content**

Delete the test MDX files and hero image, or move them to a `drafts/` directory.

- [ ] **Step 2: Commit**

```bash
git add -A
git commit -m "chore: remove test affiliate article (will be published via Notion pipeline)"
```
