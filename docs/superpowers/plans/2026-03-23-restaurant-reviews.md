# Restaurant Reviews Content Type Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add restaurant reviews as a third content collection with dedicated schema, JSON-LD (Restaurant + Review), bilingual EN/FR pages, and a Notion auto-publish pipeline.

**Architecture:** New `reviews` Astro content collection mirroring the `articles` pattern. Restaurant-specific frontmatter fields (address, cuisine, priceRange, dateScore, dishHighlights). Review + Restaurant JSON-LD for local SEO. Reuses existing layout hierarchy (BaseLayout > ReviewLayout). Notion fetch script filters `Post Type === "Restaurant Reviews"`.

**Tech Stack:** Astro 5, TypeScript, Zod schema validation, MDX, Tailwind CSS, notion-client, GitHub Actions

---

## File Map

### Create
| File | Responsibility |
|------|---------------|
| `src/content/reviews/en/*.mdx` | EN review content files |
| `src/content/reviews/fr/*.mdx` | FR review content files |
| `src/layouts/ReviewLayout.astro` | Thin wrapper: `contentType="review"` |
| `src/components/ReviewSchema.astro` | Restaurant + Review + FAQPage JSON-LD |
| `src/components/ReviewCard.astro` | Card for listing pages |
| `src/components/ReviewQuickFacts.astro` | Sidebar with restaurant details |
| `src/pages/en/reviews/index.astro` | EN listing page |
| `src/pages/en/reviews/[...slug].astro` | EN detail page |
| `src/pages/fr/critiques/index.astro` | FR listing page |
| `src/pages/fr/critiques/[...slug].astro` | FR detail page |
| `scripts/fetch-notion-review.mjs` | Notion fetch for restaurant reviews |
| `.github/workflows/auto-publish-review.yml` | Weekly auto-publish pipeline |

### Modify
| File | Change |
|------|--------|
| `src/content.config.ts` | Add `reviews` collection with schema |
| `src/i18n/en.json` | Add review translation keys |
| `src/i18n/fr.json` | Add review translation keys |
| `src/i18n/utils.ts` | Add `getReviewLocalizedPath()`, update `routeMap`, update `getAlternateUrl()` |
| `src/layouts/BaseLayout.astro` | Add `"review"` to `contentType` union |
| `src/components/Navigation.astro` | Add `"review"` to `contentType` prop union, add Reviews nav link |
| `src/pages/en/index.astro` | Add reviews to homepage |
| `src/pages/fr/index.astro` | Add reviews to homepage |
| `notion/published.json` | Add review entries |
| `CLAUDE.md` | Document review schema and routes |

---

### Task 1: Content Schema

**Files:**
- Modify: `src/content.config.ts`

- [ ] **Step 1: Add review schema to content.config.ts**

Add after the `articles` collection definition (before `export const collections`):

```typescript
const ReviewCategorySchema = z.enum([
  "dinner",
  "brunch",
  "cocktails",
  "casual",
  "fine-dining",
]);

const DishHighlightSchema = z.object({
  name: z.string(),
  description: z.string(),
});

const DateTypeFitSchema = z.object({
  type: z.string(),
  score: z.number().min(1).max(5),
  note: z.string().optional(),
});

const reviews = defineCollection({
  loader: glob({ pattern: "**/*.mdx", base: "./src/content/reviews" }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      lang: z.enum(["en", "fr"]),
      translationSlug: z.string(),
      description: z.string().max(160),
      author: z.string().default("Victor"),
      publishDate: z.coerce.date(),
      updatedDate: z.coerce.date().optional(),
      heroImage: image(),
      heroImageAlt: z.string(),
      keywords: z.array(z.string()),
      tags: z.array(z.string()).optional(),
      readingTime: z.number().optional(),
      // Restaurant-specific fields
      restaurantName: z.string(),
      neighborhood: z.string(),
      city: z.string().default("Montreal"),
      address: z.string(),
      website: z.string().url().optional(),
      phone: z.string().optional(),
      cuisine: z.string(),
      priceRange: z.enum(["$", "$$", "$$$", "$$$$"]),
      dateScore: z.number().min(1).max(10),
      reviewCategory: ReviewCategorySchema,
      bestFor: z.array(z.string()),
      costPerPerson: z.string(),
      reservationTip: z.string().optional(),
      dishHighlights: z.array(DishHighlightSchema).optional(),
      dateTypeFit: z.array(DateTypeFitSchema).optional(),
      relatedRecipes: z.array(z.string()).optional(),
      faqs: z
        .array(z.object({ question: z.string(), answer: z.string() }))
        .min(1),
    }),
});
```

Update the exports line:

```typescript
export const collections = { recipes, articles, reviews };
```

- [ ] **Step 2: Create content directories**

Run:
```bash
mkdir -p src/content/reviews/en src/content/reviews/fr
```

- [ ] **Step 3: Run `npm run check` to verify schema compiles**

Run: `npm run check`
Expected: PASS (no reviews yet, empty collection is fine)

- [ ] **Step 4: Commit**

```bash
git add src/content.config.ts src/content/reviews/
git commit -m "feat(reviews): add reviews content collection schema"
```

---

### Task 2: i18n Updates

**Files:**
- Modify: `src/i18n/en.json`
- Modify: `src/i18n/fr.json`
- Modify: `src/i18n/utils.ts`

- [ ] **Step 1: Add EN translation keys**

Add these keys to `src/i18n/en.json`:

In `"nav"` section:
```json
"reviews": "Reviews"
```

Add new `"review"` section (after `"article"`):
```json
"review": {
  "readTime": "min read",
  "publishedOn": "Published on",
  "faq": "Frequently Asked Questions",
  "share": "Share this review",
  "backToReviews": "Back to Reviews",
  "dateScore": "Date Score",
  "priceRange": "Price Range",
  "cuisine": "Cuisine",
  "neighborhood": "Neighborhood",
  "bestFor": "Best For",
  "reservation": "Reservation",
  "costPerPerson": "Cost Per Person",
  "quickFacts": "Quick Facts",
  "dishHighlights": "What to Order",
  "dateTypeFit": "Date Type Fit",
  "visitWebsite": "Visit Website",
  "viewOnMap": "View on Map"
}
```

In `"listing"` section:
```json
"allReviews": "All Reviews",
"noReviewsFound": "No reviews found."
```

In `"seo"` section:
```json
"reviewsTitle": "Restaurant Reviews | Date My Dish",
"reviewsDescription": "Honest restaurant reviews for date nights in Montreal. We rate the vibe, the food, and whether it's worth dressing up for."
```

In `"breadcrumbs"` section:
```json
"reviews": "Reviews"
```

In `"home"` section:
```json
"viewAllReviews": "View All Reviews",
"latestReviews": "Where to Take Your Date",
"readReview": "Read Review"
```

- [ ] **Step 2: Add FR translation keys**

Same structure in `src/i18n/fr.json`:

In `"nav"`:
```json
"reviews": "Critiques"
```

New `"review"` section:
```json
"review": {
  "readTime": "min de lecture",
  "publishedOn": "Publié le",
  "faq": "Questions fréquentes",
  "share": "Partager cette critique",
  "backToReviews": "Retour aux critiques",
  "dateScore": "Score rendez-vous",
  "priceRange": "Gamme de prix",
  "cuisine": "Cuisine",
  "neighborhood": "Quartier",
  "bestFor": "Idéal pour",
  "reservation": "Réservation",
  "costPerPerson": "Coût par personne",
  "quickFacts": "En bref",
  "dishHighlights": "Quoi commander",
  "dateTypeFit": "Type de rendez-vous",
  "visitWebsite": "Visiter le site",
  "viewOnMap": "Voir sur la carte"
}
```

In `"listing"`:
```json
"allReviews": "Toutes les critiques",
"noReviewsFound": "Aucune critique trouvée."
```

In `"seo"`:
```json
"reviewsTitle": "Critiques de restaurants | Date My Dish",
"reviewsDescription": "Critiques honnêtes de restaurants pour vos soirées en amoureux à Montréal. On évalue l'ambiance, la bouffe et si ça vaut la peine de se mettre chic."
```

In `"breadcrumbs"`:
```json
"reviews": "Critiques"
```

In `"home"`:
```json
"viewAllReviews": "Voir toutes les critiques",
"latestReviews": "Où emmener votre date",
"readReview": "Lire la critique"
```

- [ ] **Step 3: Add i18n utility functions**

In `src/i18n/utils.ts`, add after `getArticleLocalizedPath`:

```typescript
export function getReviewLocalizedPath(
  locale: Locale,
  slug: string,
): string {
  const prefix = locale === "fr" ? "critiques" : "reviews";
  return `/${locale}/${prefix}/${slug}`;
}
```

Update the `routeMap` inside `getAlternateUrl` to add:
```typescript
reviews: { en: "reviews", fr: "critiques" },
critiques: { en: "reviews", fr: "critiques" },
```

- [ ] **Step 4: Run `npm run check`**

Run: `npm run check`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/i18n/
git commit -m "feat(reviews): add i18n translation keys and routing helpers"
```

---

### Task 3: Layout and Schema Components

**Files:**
- Create: `src/layouts/ReviewLayout.astro`
- Create: `src/components/ReviewSchema.astro`
- Create: `src/components/ReviewQuickFacts.astro`
- Create: `src/components/ReviewCard.astro`
- Modify: `src/layouts/BaseLayout.astro` (line 19: add `"review"` to contentType union)
- Modify: `src/components/Navigation.astro` (line 9: add `"review"` to contentType union)
- Modify: `src/components/LanguageToggle.astro` (line 8: add `"review"` to contentType union + routing logic)
- Modify: `src/components/SEOHead.astro` (line 17: add `"review"` to contentType union + hreflang logic)

- [ ] **Step 1: Update BaseLayout contentType prop**

In `src/layouts/BaseLayout.astro`, change line 19:
```typescript
contentType?: "recipe" | "article" | "review";
```

- [ ] **Step 2: Update Navigation contentType prop**

In `src/components/Navigation.astro`, change line 9:
```typescript
contentType?: "recipe" | "article" | "review";
```

- [ ] **Step 2b: Update LanguageToggle contentType prop and routing**

In `src/components/LanguageToggle.astro`:

1. Add `getReviewLocalizedPath` to import on line 2:
```typescript
import { t, getAlternateUrl, getRecipeLocalizedPath, getArticleLocalizedPath, getReviewLocalizedPath, type Locale } from "@i18n/utils";
```

2. Change line 8:
```typescript
contentType?: "recipe" | "article" | "review";
```

3. Replace lines 16-21 (the if/else block):
```typescript
if (translationSlug && contentType) {
  if (contentType === "recipe") {
    toggleUrl = getRecipeLocalizedPath(targetLocale, translationSlug);
  } else if (contentType === "review") {
    toggleUrl = getReviewLocalizedPath(targetLocale, translationSlug);
  } else {
    toggleUrl = getArticleLocalizedPath(targetLocale, translationSlug);
  }
} else {
  toggleUrl = getAlternateUrl(Astro.url, targetLocale);
}
```

- [ ] **Step 2c: Update SEOHead contentType prop and hreflang logic**

In `src/components/SEOHead.astro`:

1. Change line 17:
```typescript
contentType?: "recipe" | "article" | "review";
```

2. Replace lines 46-53 (the hreflang building block):
```typescript
if (translationSlug && contentType) {
  let prefix: string;
  if (contentType === "recipe") {
    prefix = targetLocale === "fr" ? "recettes" : "recipes";
  } else if (contentType === "review") {
    prefix = targetLocale === "fr" ? "critiques" : "reviews";
  } else {
    prefix = "articles";
  }
  alternateUrl = `${siteUrl}/${targetLocale}/${prefix}/${translationSlug}`;
} else {
  alternateUrl = `${siteUrl}${getAlternateUrl(Astro.url, targetLocale)}`;
}
```

- [ ] **Step 3: Create ReviewLayout.astro**

Create `src/layouts/ReviewLayout.astro` (mirrors ArticleLayout.astro):

```astro
---
import BaseLayout from "./BaseLayout.astro";
import type { Locale } from "@i18n/utils";

interface Props {
  title: string;
  description: string;
  locale: Locale;
  canonical?: string;
  ogImage?: string;
  translationSlug: string;
  publishDate: Date;
  updatedDate?: Date;
}

const { title, description, canonical, ogImage, translationSlug, publishDate, updatedDate } = Astro.props;
---

<BaseLayout
  title={title}
  description={description}
  canonical={canonical}
  ogImage={ogImage}
  translationSlug={translationSlug}
  ogType="article"
  publishDate={publishDate}
  updatedDate={updatedDate}
  contentType="review"
>
  <slot name="head" slot="head" />
  <slot />
</BaseLayout>
```

- [ ] **Step 4: Create ReviewSchema.astro**

Create `src/components/ReviewSchema.astro`:

```astro
---
import type { Locale } from "@i18n/utils";
import { getReviewLocalizedPath } from "@i18n/utils";

interface FAQ {
  question: string;
  answer: string;
}

interface Props {
  title: string;
  description: string;
  slug: string;
  lang: Locale;
  author: string;
  publishDate: Date;
  updatedDate?: Date;
  heroImageUrl: string;
  keywords: string[];
  faqs: FAQ[];
  restaurantName: string;
  address: string;
  city: string;
  cuisine: string;
  priceRange: string;
  dateScore: number;
  website?: string;
  phone?: string;
}

const {
  title,
  description,
  slug,
  lang,
  author,
  publishDate,
  updatedDate,
  heroImageUrl,
  keywords,
  faqs,
  restaurantName,
  address,
  city,
  cuisine,
  priceRange,
  dateScore,
  website,
  phone,
} = Astro.props;

const siteUrl = "https://datemydish.com";
const reviewPath = getReviewLocalizedPath(lang, slug);
const canonicalUrl = `${siteUrl}${reviewPath}`;

const priceRangeMap: Record<string, string> = {
  "$": "$",
  "$$": "$$",
  "$$$": "$$$",
  "$$$$": "$$$$",
};

const restaurantJsonLd = {
  "@context": "https://schema.org",
  "@type": "Restaurant",
  name: restaurantName,
  address: {
    "@type": "PostalAddress",
    streetAddress: address,
    addressLocality: city,
    addressRegion: "QC",
    addressCountry: "CA",
  },
  servesCuisine: cuisine,
  priceRange: priceRangeMap[priceRange] || priceRange,
  image: [heroImageUrl.startsWith("http") ? heroImageUrl : `${siteUrl}${heroImageUrl}`],
  ...(website ? { url: website } : {}),
  ...(phone ? { telephone: phone } : {}),
};

const reviewJsonLd = {
  "@context": "https://schema.org",
  "@type": "Review",
  name: title,
  reviewBody: description,
  author: {
    "@type": "Person",
    name: author,
    url: `${siteUrl}/${lang}/${lang === "fr" ? "a-propos" : "about"}/`,
  },
  datePublished: publishDate.toISOString().split("T")[0],
  ...(updatedDate ? { dateModified: updatedDate.toISOString().split("T")[0] } : {}),
  itemReviewed: restaurantJsonLd,
  reviewRating: {
    "@type": "Rating",
    ratingValue: dateScore,
    bestRating: 10,
    worstRating: 1,
  },
  publisher: {
    "@type": "Organization",
    name: "Date My Dish",
    url: siteUrl,
    logo: {
      "@type": "ImageObject",
      url: `${siteUrl}/favicon.svg`,
    },
  },
  url: canonicalUrl,
  inLanguage: lang,
  keywords: keywords.join(", "),
};

const faqJsonLd = faqs.length > 0
  ? {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faqs.map((faq) => ({
        "@type": "Question",
        name: faq.question,
        acceptedAnswer: {
          "@type": "Answer",
          text: faq.answer,
        },
      })),
    }
  : null;
---

<script type="application/ld+json" is:inline set:html={JSON.stringify(restaurantJsonLd)} />
<script type="application/ld+json" is:inline set:html={JSON.stringify(reviewJsonLd)} />
{faqJsonLd && <script type="application/ld+json" is:inline set:html={JSON.stringify(faqJsonLd)} />}
```

- [ ] **Step 5: Create ReviewQuickFacts.astro**

Create `src/components/ReviewQuickFacts.astro`:

```astro
---
import { t, type Locale } from "@i18n/utils";

interface DateTypeFit {
  type: string;
  score: number;
  note?: string;
}

interface DishHighlight {
  name: string;
  description: string;
}

interface Props {
  locale: Locale;
  restaurantName: string;
  neighborhood: string;
  address: string;
  cuisine: string;
  priceRange: string;
  dateScore: number;
  costPerPerson: string;
  bestFor: string[];
  reservationTip?: string;
  website?: string;
  phone?: string;
  dishHighlights?: DishHighlight[];
  dateTypeFit?: DateTypeFit[];
}

const {
  locale,
  restaurantName,
  neighborhood,
  address,
  cuisine,
  priceRange,
  dateScore,
  costPerPerson,
  bestFor,
  reservationTip,
  website,
  phone,
  dishHighlights,
  dateTypeFit,
} = Astro.props;

const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
---

<aside class="rounded-2xl border border-warm-200 bg-warm-50 p-6 dark:border-warm-700 dark:bg-warm-900">
  <h2 class="mb-4 font-heading text-xl font-normal text-warm-800 dark:text-warm-100">
    {t(locale, "review.quickFacts")}
  </h2>

  <!-- Date Score -->
  <div class="mb-4 flex items-center gap-3">
    <div class="flex h-14 w-14 items-center justify-center rounded-xl bg-brand-wine text-2xl font-bold text-white dark:bg-brand-wine-dark">
      {dateScore}
    </div>
    <div>
      <div class="text-sm font-medium text-warm-800 dark:text-warm-200">{t(locale, "review.dateScore")}</div>
      <div class="text-xs text-warm-500 dark:text-warm-400">/ 10</div>
    </div>
  </div>

  <dl class="space-y-3 text-sm">
    <div>
      <dt class="font-medium text-warm-600 dark:text-warm-400">{t(locale, "review.cuisine")}</dt>
      <dd class="text-warm-800 dark:text-warm-200">{cuisine}</dd>
    </div>
    <div>
      <dt class="font-medium text-warm-600 dark:text-warm-400">{t(locale, "review.priceRange")}</dt>
      <dd class="text-warm-800 dark:text-warm-200">{priceRange}</dd>
    </div>
    <div>
      <dt class="font-medium text-warm-600 dark:text-warm-400">{t(locale, "review.neighborhood")}</dt>
      <dd class="text-warm-800 dark:text-warm-200">{neighborhood}</dd>
    </div>
    <div>
      <dt class="font-medium text-warm-600 dark:text-warm-400">{t(locale, "review.costPerPerson")}</dt>
      <dd class="text-warm-800 dark:text-warm-200">{costPerPerson}</dd>
    </div>
    <div>
      <dt class="font-medium text-warm-600 dark:text-warm-400">{t(locale, "review.bestFor")}</dt>
      <dd class="flex flex-wrap gap-1.5">
        {bestFor.map((item) => (
          <span class="inline-block rounded-full bg-warm-200 px-2.5 py-0.5 text-xs font-medium text-warm-700 dark:bg-warm-700 dark:text-warm-300">
            {item}
          </span>
        ))}
      </dd>
    </div>
    {reservationTip && (
      <div>
        <dt class="font-medium text-warm-600 dark:text-warm-400">{t(locale, "review.reservation")}</dt>
        <dd class="text-warm-800 dark:text-warm-200">{reservationTip}</dd>
      </div>
    )}
  </dl>

  <!-- Address & Links -->
  <div class="mt-4 space-y-2 border-t border-warm-200 pt-4 dark:border-warm-700">
    <p class="text-sm text-warm-600 dark:text-warm-400">{address}</p>
    {phone && <p class="text-sm text-warm-600 dark:text-warm-400">{phone}</p>}
    <div class="flex flex-wrap gap-2">
      {website && (
        <a href={website} target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1 rounded-lg bg-warm-200 px-3 py-1.5 text-xs font-medium text-warm-700 hover:bg-warm-300 dark:bg-warm-700 dark:text-warm-300 dark:hover:bg-warm-600">
          {t(locale, "review.visitWebsite")}
          <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
        </a>
      )}
      <a href={googleMapsUrl} target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1 rounded-lg bg-warm-200 px-3 py-1.5 text-xs font-medium text-warm-700 hover:bg-warm-300 dark:bg-warm-700 dark:text-warm-300 dark:hover:bg-warm-600">
        {t(locale, "review.viewOnMap")}
        <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path stroke-linecap="round" stroke-linejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
      </a>
    </div>
  </div>

  <!-- Date Type Fit -->
  {dateTypeFit && dateTypeFit.length > 0 && (
    <div class="mt-4 border-t border-warm-200 pt-4 dark:border-warm-700">
      <h3 class="mb-3 text-sm font-medium text-warm-600 dark:text-warm-400">{t(locale, "review.dateTypeFit")}</h3>
      <div class="space-y-2">
        {dateTypeFit.map((fit) => (
          <div class="flex items-center justify-between text-sm">
            <span class="text-warm-700 dark:text-warm-300">{fit.type}</span>
            <span class="font-medium text-warm-800 dark:text-warm-200">{fit.score}/5</span>
          </div>
        ))}
      </div>
    </div>
  )}
</aside>
```

- [ ] **Step 6: Create ReviewCard.astro**

Create `src/components/ReviewCard.astro`:

```astro
---
import { Picture } from "astro:assets";
import { t, getReviewLocalizedPath, type Locale } from "@i18n/utils";
import type { ImageMetadata } from "astro";

interface Props {
  title: string;
  description: string;
  slug: string;
  locale: Locale;
  heroImage: ImageMetadata;
  heroImageAlt: string;
  restaurantName: string;
  neighborhood: string;
  cuisine: string;
  priceRange: string;
  dateScore: number;
  headingLevel?: "h2" | "h3";
  loading?: "lazy" | "eager";
}

const { title, description, slug, locale, heroImage, heroImageAlt, restaurantName, neighborhood, cuisine, priceRange, dateScore, headingLevel = "h2", loading = "lazy" } = Astro.props;
const Heading = headingLevel;
const url = getReviewLocalizedPath(locale, slug);
---

<a href={url} class="group overflow-hidden rounded-xl bg-white no-underline dark:bg-warm-900">
  <div class="relative aspect-[16/14] overflow-hidden">
    <Picture
      src={heroImage}
      alt={heroImageAlt}
      widths={[400, 600]}
      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 30vw"
      formats={["avif", "webp"]}
      class="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
      loading={loading}
      decoding="async"
      data-pin-nopin="true"
    />
    <!-- Date Score Badge -->
    <div class="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-lg bg-brand-wine text-lg font-bold text-white shadow-lg dark:bg-brand-wine-dark">
      {dateScore}
    </div>
  </div>
  <div class="p-5">
    <div class="mb-3 flex items-center justify-between">
      <span class="flex items-center gap-1 text-sm text-brand-wine dark:text-brand-wine-dark">
        {neighborhood}
      </span>
      <span class="inline-block rounded-full bg-warm-100 px-2.5 py-0.5 text-xs font-medium text-warm-600 dark:bg-warm-800 dark:text-warm-300">
        {priceRange}
      </span>
    </div>
    <Heading class="font-heading text-xl font-normal text-warm-800 dark:text-warm-100">
      {restaurantName}
    </Heading>
    <p class="mt-1 text-xs text-warm-500 dark:text-warm-400">{cuisine}</p>
    <p class="mt-2 text-sm text-warm-500 dark:text-warm-400">
      {description}
    </p>
  </div>
</a>
```

- [ ] **Step 7: Run `npm run check`**

Run: `npm run check`
Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add src/layouts/ReviewLayout.astro src/components/Review*.astro src/layouts/BaseLayout.astro src/components/Navigation.astro src/components/LanguageToggle.astro src/components/SEOHead.astro
git commit -m "feat(reviews): add layout, schema, card, and quick facts components"
```

---

### Task 4: Pages (EN + FR)

**Files:**
- Create: `src/pages/en/reviews/index.astro`
- Create: `src/pages/en/reviews/[...slug].astro`
- Create: `src/pages/fr/critiques/index.astro`
- Create: `src/pages/fr/critiques/[...slug].astro`

- [ ] **Step 1: Create EN listing page**

Create `src/pages/en/reviews/index.astro`:

```astro
---
import BaseLayout from "@layouts/BaseLayout.astro";
import ReviewCard from "@components/ReviewCard.astro";
import Breadcrumbs from "@components/Breadcrumbs.astro";
import { t, getReviewLocalizedPath } from "@i18n/utils";
import { getCollection } from "astro:content";
import type { ImageMetadata } from "astro";

const locale = "en";

const allReviews = await getCollection("reviews");
const reviews = allReviews
  .filter((r) => r.data.lang === "en")
  .sort((a, b) => b.data.publishDate.getTime() - a.data.publishDate.getTime());
---

<BaseLayout
  title={t(locale, "seo.reviewsTitle")}
  description={t(locale, "seo.reviewsDescription")}
>
  <Fragment slot="head">
    <script type="application/ld+json" is:inline set:html={JSON.stringify({
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: t(locale, "listing.allReviews"),
      numberOfItems: reviews.length,
      itemListElement: reviews.map((review, i) => {
        const slug = review.id.replace(/^en\//, "");
        return {
          "@type": "ListItem",
          position: i + 1,
          url: `https://datemydish.com${getReviewLocalizedPath(locale, slug)}`,
          name: review.data.title,
        };
      }),
    })} />
  </Fragment>

  <div class="mx-auto max-w-content px-4 py-section-sm">
    <Breadcrumbs
      locale={locale}
      items={[{ label: t(locale, "breadcrumbs.reviews") }]}
    />

    <div class="mb-10">
      <h1 class="mb-3 font-heading text-heading-1 font-normal text-warm-900 sm:text-4xl dark:text-warm-100">
        {t(locale, "listing.allReviews")}
      </h1>
      <div class="mb-4 h-1 w-12 rounded-full bg-brand-rose"></div>
      <p class="text-body-sm text-warm-500 dark:text-warm-400">
        {reviews.length} {reviews.length === 1 ? "review" : "reviews"}
      </p>
    </div>

    {reviews.length > 0 ? (
      <div class="grid gap-8 sm:grid-cols-2 lg:grid-cols-3" data-animate-stagger>
        {reviews.map((review, i) => {
          const slug = review.id.replace(/^en\//, "");
          return (
            <ReviewCard
              title={review.data.title}
              description={review.data.description}
              slug={slug}
              locale={locale}
              heroImage={review.data.heroImage as ImageMetadata}
              heroImageAlt={review.data.heroImageAlt}
              restaurantName={review.data.restaurantName}
              neighborhood={review.data.neighborhood}
              cuisine={review.data.cuisine}
              priceRange={review.data.priceRange}
              dateScore={review.data.dateScore}
              loading={i === 0 ? "eager" : "lazy"}
            />
          );
        })}
      </div>
    ) : (
      <p class="text-warm-500 dark:text-warm-400">{t(locale, "listing.noReviewsFound")}</p>
    )}
  </div>
</BaseLayout>
```

- [ ] **Step 2: Create EN detail page**

Create `src/pages/en/reviews/[...slug].astro`:

```astro
---
import { getCollection, render } from "astro:content";
import { Picture } from "astro:assets";
import ReviewLayout from "@layouts/ReviewLayout.astro";
import ReviewSchema from "@components/ReviewSchema.astro";
import ReviewQuickFacts from "@components/ReviewQuickFacts.astro";
import AuthorBioCard from "@components/AuthorBioCard.astro";
import FAQSection from "@components/FAQSection.astro";
import ShareButton from "@components/ShareButton.astro";
import NewsletterSignup from "@components/NewsletterSignup.astro";
import SocialShareButtons from "@components/SocialShareButtons.astro";
import Breadcrumbs from "@components/Breadcrumbs.astro";
import { t, getReviewLocalizedPath } from "@i18n/utils";
import type { ImageMetadata } from "astro";

export async function getStaticPaths() {
  const reviews = await getCollection("reviews");
  return reviews
    .filter((review) => review.data.lang === "en")
    .map((review) => {
      const slug = review.id.replace(/^en\//, "");
      return {
        params: { slug },
        props: { review },
      };
    });
}

const { review } = Astro.props;
const { Content } = await render(review);
const { data } = review;
const locale = "en";
const slug = review.id.replace(/^en\//, "");
const heroImage = data.heroImage as ImageMetadata;
const sourceUrl = `https://datemydish.com${getReviewLocalizedPath(locale, slug)}`;

const formattedDate = data.publishDate.toLocaleDateString("en-US", {
  year: "numeric",
  month: "long",
  day: "numeric",
});
---

<ReviewLayout
  title={`${data.restaurantName} Review | Date My Dish`}
  description={data.description}
  locale={locale}
  ogImage={heroImage.src}
  translationSlug={data.translationSlug}
  publishDate={data.publishDate}
  updatedDate={data.updatedDate}
>
  <Fragment slot="head">
    <script is:inline>window.pintrk&&pintrk('track','pagevisit');</script>
  </Fragment>
  <ReviewSchema
    slot="head"
    title={data.title}
    description={data.description}
    slug={slug}
    lang={locale}
    author={data.author}
    publishDate={data.publishDate}
    updatedDate={data.updatedDate}
    heroImageUrl={heroImage.src}
    keywords={data.keywords}
    faqs={data.faqs}
    restaurantName={data.restaurantName}
    address={data.address}
    city={data.city}
    cuisine={data.cuisine}
    priceRange={data.priceRange}
    dateScore={data.dateScore}
    website={data.website}
    phone={data.phone}
  />

  <article class="mx-auto max-w-content px-4 py-8" data-pagefind-body data-pagefind-filter={`lang:${locale}`}>
    <div class="mx-auto max-w-prose">
      <Breadcrumbs
        locale={locale}
        items={[
          { label: t(locale, "breadcrumbs.reviews"), href: "/en/reviews/" },
          { label: data.restaurantName },
        ]}
      />

      <!-- Hero Image -->
      <div class="no-print relative mb-8 overflow-hidden rounded-2xl">
        <Picture
          src={heroImage}
          alt={data.heroImageAlt}
          widths={[400, 600, 900]}
          sizes="(max-width: 896px) 100vw, 896px"
          formats={["avif", "webp"]}
          class="w-full max-h-[280px] object-cover sm:max-h-[380px] lg:max-h-[500px]"
          loading="eager"
          fetchpriority="high"
        />
      </div>

      <!-- Title & Meta -->
      <header class="no-print mb-8">
        <h1 class="mb-4 font-heading text-heading-1 font-normal text-warm-900 sm:text-4xl dark:text-warm-100">
          {data.title}
        </h1>
        <p class="mb-6 text-body-lg text-warm-600 dark:text-warm-400">{data.description}</p>

        <!-- Meta Bar -->
        <div class="mb-6 flex flex-wrap items-center gap-4 text-body-sm text-warm-500 dark:text-warm-400">
          <div class="flex items-center gap-1.5">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span>{formattedDate}</span>
          </div>
          {data.readingTime && (
            <>
              <div class="h-4 w-px bg-warm-300 dark:bg-warm-600"></div>
              <div class="flex items-center gap-1.5">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{data.readingTime} {t(locale, "review.readTime")}</span>
              </div>
            </>
          )}
          <div class="h-4 w-px bg-warm-300 dark:bg-warm-600"></div>
          <ShareButton locale={locale} title={data.title} url={sourceUrl} />
          <SocialShareButtons locale={locale} url={sourceUrl} title={data.title} imageUrl={heroImage.src} description={data.description} />
        </div>
      </header>

      <!-- Quick Facts -->
      <div class="no-print mb-8">
        <ReviewQuickFacts
          locale={locale}
          restaurantName={data.restaurantName}
          neighborhood={data.neighborhood}
          address={data.address}
          cuisine={data.cuisine}
          priceRange={data.priceRange}
          dateScore={data.dateScore}
          costPerPerson={data.costPerPerson}
          bestFor={data.bestFor}
          reservationTip={data.reservationTip}
          website={data.website}
          phone={data.phone}
          dishHighlights={data.dishHighlights}
          dateTypeFit={data.dateTypeFit}
        />
      </div>

      <!-- Blog Prose -->
      <div class="prose mb-12 max-w-none">
        <Content />
      </div>

      <!-- Author Bio -->
      <div class="mt-8 no-print">
        <AuthorBioCard locale={locale} />
      </div>

      <!-- Newsletter -->
      <div class="mt-8 no-print">
        <NewsletterSignup locale={locale} compact={true} />
      </div>

      <!-- FAQs -->
      <FAQSection locale={locale} faqs={data.faqs} />

    </div>
  </article>
</ReviewLayout>
```

- [ ] **Step 3: Create FR listing page**

Create `src/pages/fr/critiques/index.astro` -- copy EN listing, change:
- `locale = "fr"`
- Slug extraction: `review.id.replace(/^fr\//, "")`
- Count text: `{reviews.length} {reviews.length === 1 ? "critique" : "critiques"}`

- [ ] **Step 4: Create FR detail page**

Create `src/pages/fr/critiques/[...slug].astro` -- copy EN detail, change:
- `locale = "fr"`
- Slug extraction: `review.id.replace(/^fr\//, "")`
- Date formatting: `"fr-CA"` locale
- Breadcrumbs: `href: "/fr/critiques/"`

- [ ] **Step 5: Commit**

```bash
git add src/pages/en/reviews/ src/pages/fr/critiques/
git commit -m "feat(reviews): add EN/FR listing and detail pages"
```

---

### Task 5: Navigation, Homepage & RSS Integration

**Files:**
- Modify: `src/components/Navigation.astro`
- Modify: `src/pages/en/index.astro`
- Modify: `src/pages/fr/index.astro`
- Modify: `src/pages/en/rss.xml.ts`
- Modify: `src/pages/fr/rss.xml.ts`

- [ ] **Step 1: Add Reviews link to navigation**

In `src/components/Navigation.astro`, add to the `navLinks` array (after articles):
```typescript
{ label: t(locale, "nav.reviews"), path: locale === "fr" ? "/critiques/" : "/reviews/" },
```

- [ ] **Step 2: Add reviews section to EN homepage**

In `src/pages/en/index.astro`, add import:
```typescript
import { getReviewLocalizedPath } from "@i18n/utils";
```

Add after the articles collection fetch:
```typescript
const allReviews = await getCollection("reviews");
const recentReviews = allReviews
  .filter((r) => r.data.lang === "en")
  .sort((a, b) => b.data.publishDate.getTime() - a.data.publishDate.getTime())
  .slice(0, 2);
```

Add a new section after the "Culinary Narratives" section (before closing `</BaseLayout>`):
```astro
<!-- Where to Take Your Date -->
{recentReviews.length > 0 && (
  <section class="bg-warm-50 px-4 py-section dark:bg-warm-950" aria-labelledby="latest-reviews">
    <div class="mx-auto max-w-content">
      <div class="mb-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 id="latest-reviews" class="font-heading text-heading-1 font-normal text-warm-900 dark:text-warm-100">
            {t(locale, "home.latestReviews")}
          </h2>
        </div>
        <a
          href={`/${locale}/reviews/`}
          class="font-ui text-sm font-bold uppercase tracking-widest text-warm-800 underline decoration-brand-wine decoration-2 underline-offset-8 hover:text-brand-wine dark:text-warm-200 dark:decoration-brand-wine-dark dark:hover:text-brand-wine-dark"
        >
          {t(locale, "home.viewAllReviews")}
        </a>
      </div>
      <div class="grid grid-cols-1 gap-8 sm:grid-cols-2">
        {recentReviews.map((review, i) => {
          const slug = review.id.replace(/^en\//, "");
          return (
            <a href={getReviewLocalizedPath(locale, slug)} class="group flex flex-col gap-4 sm:flex-row">
              <div class="relative shrink-0 overflow-hidden rounded-xl border border-warm-200 dark:border-warm-700 sm:w-48">
                <Picture
                  src={review.data.heroImage as ImageMetadata}
                  alt={review.data.heroImageAlt}
                  widths={[200, 400]}
                  sizes="(max-width: 640px) 100vw, 192px"
                  formats={["avif", "webp"]}
                  class="aspect-[4/3] h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  loading="lazy"
                />
                <div class="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-lg bg-brand-wine text-sm font-bold text-white shadow dark:bg-brand-wine-dark">
                  {review.data.dateScore}
                </div>
              </div>
              <div class="flex flex-col justify-center">
                <span class="font-ui text-xs font-bold uppercase tracking-wider text-brand-wine dark:text-brand-wine-dark">
                  {review.data.neighborhood} · {review.data.priceRange}
                </span>
                <h3 class="mt-1 font-heading text-lg font-normal text-warm-800 dark:text-warm-100">
                  {review.data.restaurantName}
                </h3>
                <p class="mt-1 text-sm text-warm-500 dark:text-warm-400">
                  {review.data.description}
                </p>
              </div>
            </a>
          );
        })}
      </div>
    </div>
  </section>
)}
```

- [ ] **Step 3: Add reviews section to FR homepage**

Apply equivalent changes to `src/pages/fr/index.astro` with:
- `locale = "fr"`
- Slug extraction: `review.id.replace(/^fr\//, "")`
- Link: `/${locale}/critiques/`

- [ ] **Step 4: Add reviews to EN RSS feed**

In `src/pages/en/rss.xml.ts`, add after the articles fetch:

```typescript
const reviews = await getCollection("reviews");
const enReviews = reviews
  .filter((r) => r.data.lang === "en")
  .sort((a, b) => b.data.publishDate.getTime() - a.data.publishDate.getTime());

const reviewItems = enReviews.map((review) => {
  const slug = review.id.replace(/^en\//, "");
  return {
    title: review.data.title,
    description: review.data.description,
    pubDate: review.data.publishDate,
    link: `/en/reviews/${slug}/`,
  };
});
```

Update the `allItems` merge:
```typescript
const allItems = [...recipeItems, ...articleItems, ...reviewItems].sort(
  (a, b) => b.pubDate.getTime() - a.pubDate.getTime(),
);
```

- [ ] **Step 5: Add reviews to FR RSS feed**

Apply equivalent changes to `src/pages/fr/rss.xml.ts`:
- Filter by `lang === "fr"`
- Slug extraction: `review.id.replace(/^fr\//, "")`
- Link: `/fr/critiques/${slug}/`

- [ ] **Step 6: Commit**

```bash
git add src/components/Navigation.astro src/pages/en/index.astro src/pages/fr/index.astro src/pages/en/rss.xml.ts src/pages/fr/rss.xml.ts
git commit -m "feat(reviews): add navigation link, homepage section, and RSS feed"
```

---

### Task 6: First Two Reviews (Content)

**Files:**
- Create: `src/content/reviews/en/moccione-montreal.mdx`
- Create: `src/content/reviews/fr/moccione-montreal.mdx`
- Create: `src/content/reviews/en/mckiernan-montreal.mdx`
- Create: `src/content/reviews/fr/mckiernan-montreal.mdx`
- Create: `src/assets/images/reviews/moccione-montreal.webp`
- Create: `src/assets/images/reviews/mckiernan-montreal.webp`

- [ ] **Step 1: Create image directories**

```bash
mkdir -p src/assets/images/reviews
```

- [ ] **Step 2: Create Moccione EN review**

Write the EN MDX file based on the Notion content scraped earlier. Include full frontmatter with all restaurant-specific fields. The MDX body should be 800-1500 words of SEO prose rewritten from the Notion content.

Key frontmatter values:
- `restaurantName: "Moccione"`
- `neighborhood: "Villeray"`
- `address: "7495 Rue Saint-Denis, Montréal, QC H2R 2E5"`
- `website: "https://moccione.com/"`
- `cuisine: "Seasonal Italian"`
- `priceRange: "$$$$"`
- `dateScore: 9`
- `reviewCategory: "dinner"`
- `bestFor: ["date-night", "anniversary", "impressing"]`
- `costPerPerson: "$120-200+ CAD"`

**IMPORTANT:** Before writing prose, read `docs/brand-voice-guide.md` and apply humanizer rules. Run `/humanizer` on the finished copy.

- [ ] **Step 3: Create Moccione FR review**

Translate to Quebec French. Same `heroImage` path (shared image). `translationSlug` pointing to EN slug.

- [ ] **Step 4: Create McKiernan EN review**

Key frontmatter values:
- `restaurantName: "McKiernan"`
- `neighborhood: "Sud-Ouest"`
- `address: "5524 Rue Saint-Patrick, Montréal, QC H4E 1A8"`
- `website: "https://www.mckiernanmtl.com/"`
- `phone: "(514) 759-6677"`
- `cuisine: "Rotisserie / Quebec Comfort"`
- `priceRange: "$$"`
- `dateScore: 8`
- `reviewCategory: "brunch"`
- `bestFor: ["brunch-date", "casual", "out-of-towners"]`
- `costPerPerson: "$30-55 CAD"`

- [ ] **Step 5: Create McKiernan FR review**

Translate to Quebec French.

- [ ] **Step 6: Handle hero images**

For now, create placeholder images or download from the Notion content. Run `/optimize-image` on each.

- [ ] **Step 7: Run `npm run check` and `npm run build`**

Run: `npm run check && npm run build`
Expected: PASS on both

- [ ] **Step 8: Commit**

```bash
git add src/content/reviews/ src/assets/images/reviews/
git commit -m "feat(reviews): add Moccione and McKiernan restaurant reviews (EN+FR)"
```

---

### Task 7: Notion Fetch Script

**Files:**
- Create: `scripts/fetch-notion-review.mjs`

- [ ] **Step 1: Create fetch-notion-review.mjs**

Copy `scripts/fetch-notion-article.mjs` and modify:

1. Change constants:
```javascript
const SELECTION_FILE = "notion-review-selection.json";
const CONTENT_FILE = "notion-review-content.json";
```

2. Change the filter in Step 4:
```javascript
const readyReviews = rows.filter(
  (r) => r.status === "Ready to Publish" && r.postType === "Restaurant Reviews"
);
```

3. Update all log messages from "article" to "review"

4. Everything else stays the same (schema discovery, block parsing, image download, FAQ extraction, published.json cross-reference)

- [ ] **Step 2: Test the script locally**

Run: `node scripts/fetch-notion-review.mjs`
Expected: Should find the 2 ready-to-publish reviews (Moccione #55 and McKiernan #53), but since they'll be in published.json already, it should check for stale ones.

- [ ] **Step 3: Commit**

```bash
git add scripts/fetch-notion-review.mjs
git commit -m "feat(reviews): add Notion fetch script for restaurant reviews"
```

---

### Task 8: GitHub Actions Workflow

**Files:**
- Create: `.github/workflows/auto-publish-review.yml`

- [ ] **Step 1: Create auto-publish-review.yml**

Copy `.github/workflows/auto-publish-article.yml` and modify:

1. Change name: `Auto-Publish Review`
2. Change schedule: `cron: '0 3 * * 3'` (Wednesday 3 AM UTC -- different from Mon articles and Thu recipes)
3. Change concurrency group: `auto-publish-review`
4. Change fetch step: `node scripts/fetch-notion-review.mjs`
5. Change stale PR label: `auto-review`
6. Update the Claude prompt to reference:
   - `notion-review-selection.json` and `notion-review-content.json`
   - Review schema from `src/content.config.ts` (all restaurant-specific fields)
   - `src/content/reviews/en/` and `src/content/reviews/fr/` as output paths
   - `src/assets/images/reviews/` for images
   - Review-specific frontmatter: restaurantName, neighborhood, address, cuisine, priceRange, dateScore, reviewCategory, bestFor, costPerPerson, reservationTip, dishHighlights, dateTypeFit
   - `"type": "review"` in published.json entries
   - File restrictions: ONLY `src/content/reviews/`, `src/assets/images/reviews/`, `notion/published.json`
7. Change branch prefix: `auto-review/`
8. Change PR label: `auto-review`
9. Change failure issue label: `auto-review-failure`

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/auto-publish-review.yml
git commit -m "feat(reviews): add weekly auto-publish workflow for restaurant reviews"
```

---

### Task 9: Update CLAUDE.md and Final Validation

**Files:**
- Modify: `CLAUDE.md`
- Modify: `notion/published.json`

- [ ] **Step 1: Update CLAUDE.md**

Add review schema quick-reference section (after Article Schema). Add review routes to i18n route mapping table. Add `reviews` to content structure description. Update slash commands table if relevant.

- [ ] **Step 2: Update published.json with first two reviews**

Add entries for Moccione (#55) and McKiernan (#53):
```json
"55": {
  "notionTitle": "Moccione Restaurant Review: Villeray's Cozy Italian Date-Night Gem",
  "slug": "moccione-montreal",
  "type": "review",
  "publishedDate": "2026-03-23",
  "lastSyncedDate": "2026-03-23",
  "status": "published"
},
"53": {
  "notionTitle": "McKiernan Brunch Review: Lachine Canal's Big, Lively Daytime Hang",
  "slug": "mckiernan-montreal",
  "type": "review",
  "publishedDate": "2026-03-23",
  "lastSyncedDate": "2026-03-23",
  "status": "published"
}
```

- [ ] **Step 3: Full build validation**

Run: `npm run check && npm run build`
Expected: PASS

- [ ] **Step 4: Final commit**

```bash
git add CLAUDE.md notion/published.json
git commit -m "feat(reviews): update docs and published.json for restaurant reviews"
```
