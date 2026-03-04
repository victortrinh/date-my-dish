---
title: "feat: Full Growth Stack — Ratings, Newsletter, Comments, Scaling, Bookmarks, Share Buttons, Analytics, Pinterest Fix"
type: feat
status: active
date: 2026-03-03
origin: docs/brainstorms/2026-03-03-full-growth-stack-brainstorm.md
---

# Full Growth Stack

## Overview

Ship 10 features + a cookie consent banner to maximize sessions and page views across all growth channels. The blog has excellent technical SEO but only 10 recipes, 5 articles, and near-zero organic traffic (2 GSC impressions, 0 clicks). Since content pace stays at 1 recipe/week + 1 article/week, we maximize the value of every piece through better distribution, engagement, and retention.

## Problem Statement

- **Pinterest is broken** — `boards:write` scope error blocks pin creation. Pinterest is the #1 traffic source for food blogs.
- **No user engagement features** — No ratings, comments, scaling, or bookmarks. Visitors have no reason to interact or return.
- **No owned audience** — Zero newsletter/email capture. Entirely dependent on search/social algorithms.
- **No analytics** — Can't measure user behavior or identify what's working.
- **Dead internal links** — 5+ articles link to non-existent recipes, hurting SEO.
- **Social media underutilized** — Only 1/10 recipes posted. No platform-specific share buttons.

## Proposed Solution

10 features organized into 4 implementation phases, plus a cookie consent banner (required for GDPR compliance before loading Disqus/ConvertKit).

**Key architectural decisions** (see brainstorm: `docs/brainstorms/2026-03-03-full-growth-stack-brainstorm.md`):

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Star ratings backend | Cloudflare Workers KV (free tier) | Real user ratings, 100K reads/day + 1K writes/day free |
| Newsletter | ConvertKit (Kit) free tier | 10K subscribers, popular with food bloggers |
| Comments | Disqus free tier | Universal login, no GitHub requirement |
| Comment threads | Shared per recipe (EN+FR same thread) | Larger community, base slug as identifier |
| Analytics | Cloudflare Web Analytics | Free, already on Cloudflare, privacy-friendly |
| Cookie consent | Custom banner component | Required for Disqus + ConvertKit GDPR compliance |
| Dead links | Remove/replace with existing recipes | Not creating 5 new recipe pairs |
| Recipe scaling | Client-side JS, free-text parsing | Conservative regex, non-parseable lines unchanged |
| Bookmarks | localStorage + dedicated page | Build-time JSON index for recipe data |
| localStorage keys | `dmd_` prefix convention | Avoid collisions: `dmd_ratings_*`, `dmd_bookmarks`, `dmd_cookies` |

## Technical Approach

### Architecture

All new features follow existing codebase conventions:
- Astro components with `locale: Locale` prop and `interface Props`
- `<script is:inline>` with IIFE pattern for client-side JS
- `data-*` attributes to pass i18n strings from server to client
- `dataset.bound` guard for idempotent bindings
- `class:list` for conditional CSS, `dark:` prefix for dark mode
- `no-print` class on interactive-only elements
- `aria-label` via `t(locale, key)`, `aria-pressed`/`aria-live` for interactive elements
- `prefers-reduced-motion: reduce` support
- WCAG 2.2 AA: `brand-primary-text` `#9A5439` for focus outlines (light), `brand-accent` `#D4A853` (dark)

**Files requiring parallel EN/FR updates:**
- `src/pages/en/recipes/[...slug].astro` + `src/pages/fr/recettes/[...slug].astro`
- `src/pages/en/articles/[...slug].astro` + `src/pages/fr/articles/[...slug].astro`
- `src/pages/en/privacy-policy.astro` + `src/pages/fr/politique-de-confidentialite.astro`
- `src/i18n/en.json` + `src/i18n/fr.json`

### Implementation Phases

---

#### Phase 1: Foundation (Low risk, immediate value)

**Goal:** Fix broken things, add analytics, establish conventions for later phases.

##### 1.1 localStorage Namespace Convention

Establish `dmd_` prefix for all localStorage keys to avoid collisions.

**Files:**
- `src/components/DarkModeToggle.astro` — Migrate `theme` → `dmd_theme`
- `src/layouts/BaseLayout.astro` — Update flash prevention script to read `dmd_theme`

**Acceptance criteria:**
- [ ] All existing `localStorage.getItem('theme')` / `setItem('theme', ...)` migrated to `dmd_theme`
- [ ] Dark mode flash prevention in `<head>` reads `dmd_theme`
- [ ] Backward compat: if `theme` key exists and `dmd_theme` doesn't, migrate it once

##### 1.2 i18n Keys (All Features)

Add all new translation keys in one batch to minimize conflicts.

**Files:**
- `src/i18n/en.json`
- `src/i18n/fr.json`

**New namespaces:**

```json
{
  "rating": {
    "rateThis": "Rate this recipe",
    "yourRating": "Your rating: {n} out of 5 stars",
    "average": "Average rating: {n} out of 5",
    "count": "{n} ratings",
    "starLabel": "{n} star",
    "starsLabel": "{n} stars",
    "submitted": "Thanks for rating!"
  },
  "newsletter": {
    "title": "Get Recipes in Your Inbox",
    "description": "New date night recipes delivered weekly. No spam, unsubscribe anytime.",
    "emailPlaceholder": "Your email address",
    "subscribe": "Subscribe",
    "success": "You're subscribed! Check your email to confirm.",
    "error": "Something went wrong. Please try again.",
    "privacy": "We respect your privacy."
  },
  "comments": {
    "title": "Comments",
    "loadComments": "Load Comments",
    "loadingComments": "Loading comments...",
    "failedToLoad": "Comments could not be loaded. Please disable your ad blocker or try again later.",
    "poweredBy": "Powered by Disqus"
  },
  "share": {
    "pinterest": "Pin it on Pinterest",
    "facebook": "Share on Facebook",
    "twitter": "Share on X",
    "opensNewWindow": "(opens new window)"
  },
  "scaling": {
    "label": "Scale recipe",
    "servings": "Servings: {n}",
    "original": "1x",
    "double": "2x",
    "triple": "3x"
  },
  "bookmark": {
    "save": "Save recipe",
    "saved": "Recipe saved",
    "remove": "Remove from saved",
    "viewAll": "Saved Recipes",
    "empty": "No saved recipes yet. Browse recipes and tap the bookmark icon to save your favorites.",
    "pageTitle": "My Saved Recipes"
  },
  "cookies": {
    "message": "We use cookies for comments and newsletter features.",
    "accept": "Accept",
    "decline": "Decline",
    "learnMore": "Learn more"
  }
}
```

**FR translations** follow Quebec French conventions (souper, dejeuner, etc.).

**Acceptance criteria:**
- [ ] All keys added to both `en.json` and `fr.json`
- [ ] TypeScript `t(locale, key)` resolves all new keys without errors
- [ ] `npm run check` passes

##### 1.3 Cloudflare Web Analytics

Add beacon script to `BaseLayout.astro`.

**Files:**
- `src/layouts/BaseLayout.astro` — Add `<script>` in `<head>` after dark mode flash prevention

**Implementation:**
```html
<!-- Cloudflare Web Analytics -->
<script defer src="https://static.cloudflareinsights.com/beacon.min.js"
  data-cf-beacon='{"token": "YOUR_TOKEN"}' is:inline></script>
```

**Acceptance criteria:**
- [ ] Beacon script present in `<head>` of every page
- [ ] Token obtained from Cloudflare dashboard → Web Analytics → Add a site
- [ ] Verified in Cloudflare dashboard that page views are being recorded
- [ ] No impact on Lighthouse Performance score (script is deferred)

##### 1.4 Fix Dead Internal Links

Remove/replace broken recipe references in articles.

**Files to fix:**

*EN articles:*
- `src/content/articles/en/truth-about-msg.mdx` — Remove links to `pan-seared-ribeye`, `spicy-miso-ramen`, `mapo-tofu`. Remove `relatedRecipes: ["spicy-miso-ramen", "mapo-tofu"]`. Replace with links to existing recipes (e.g., `penne-alla-vodka`, `cauliflower-steak-with-romesco-sauce`).
- `src/content/articles/en/why-not-wash-chicken.mdx` — Remove links to `karaage-chicken`, `fish-sauce-wings`. Remove `relatedRecipes: ["karaage-chicken", "fish-sauce-wings"]`. Replace with links to existing recipes.
- `src/content/articles/en/wok-hei-at-home.mdx` — Remove `relatedRecipes` entries for non-existent recipes. Replace with existing recipes.

*FR articles:*
- `src/content/articles/fr/verite-sur-le-msg.mdx` — Fix `relatedRecipes: ["mapo-tofu"]`. Remove or replace.
- `src/content/articles/fr/pourquoi-ne-pas-laver-le-poulet.mdx` — Fix `relatedRecipes` using FR slugs (`poulet-karaage`, `ailes-sauce-poisson`) → must use EN canonical slugs per convention. Remove non-existent entries.
- `src/content/articles/fr/wok-hei-a-la-maison.mdx` — Fix `relatedRecipes` using FR slugs (`ramen-miso-epice`, `poulet-karaage`) → use EN canonical slugs. Remove non-existent entries.

Also fix inline prose links in FR articles that point to non-existent FR recipe URLs.

**Acceptance criteria:**
- [ ] Zero 404 links in any article (EN or FR)
- [ ] All `relatedRecipes` arrays reference existing EN canonical slugs only
- [ ] `ArticleRelatedRecipes` renders valid cards for all referenced recipes
- [ ] Replacement links are topically relevant
- [ ] `/validate-recipes` passes

##### 1.5 Fix Pinterest Token

Re-authorize Pinterest OAuth with correct scopes.

**Steps (manual, not code):**
1. Go to Pinterest Developer App → OAuth settings
2. Re-initiate OAuth flow requesting scopes: `boards:read`, `boards:write`, `pins:read`, `pins:write`
3. Obtain new access token + refresh token
4. Update GitHub Secrets: `PINTEREST_ACCESS_TOKEN`, `PINTEREST_REFRESH_TOKEN`
5. Verify `token-refresh.yml` workflow can refresh the new token
6. Test with a single recipe post before running full backfill

**Acceptance criteria:**
- [ ] `PINTEREST_ACCESS_TOKEN` has `boards:write` scope
- [ ] `node scripts/social-post.mjs --slug beef-ragu-pappardelle --platform pinterest` succeeds
- [ ] Pin appears on the Pinterest board
- [ ] `data/social-posts-log.json` updated with valid `.id` for the recipe

##### 1.6 Cookie Consent Banner

Required before Phase 4 (Disqus + ConvertKit).

**Files:**
- NEW: `src/components/CookieConsent.astro`
- `src/layouts/BaseLayout.astro` — Add component before `</body>`
- `src/i18n/en.json` + `src/i18n/fr.json` — Keys added in 1.2

**Implementation:**
- Fixed bottom banner with "Accept" / "Decline" buttons
- Consent stored in `localStorage` as `dmd_cookies` → `"accepted"` | `"declined"` | absent
- When accepted: set `window.__cookiesAccepted = true` and dispatch `CustomEvent('cookies-accepted')`
- When declined: third-party scripts (Disqus, ConvertKit) do NOT load
- If consent already given (localStorage check): immediately set flag, no banner shown
- Banner uses `aria-live="polite"`, focusable buttons, Escape to dismiss (decline)
- `no-print` class on banner
- Dark mode: `dark:bg-neutral-800 dark:text-neutral-200`
- Reduced motion: no animation on show/hide

**Acceptance criteria:**
- [ ] Banner shows on first visit, hidden after accepting/declining
- [ ] `dmd_cookies` persisted in localStorage
- [ ] `window.__cookiesAccepted` boolean available for other scripts to check
- [ ] `cookies-accepted` CustomEvent dispatched on acceptance
- [ ] WCAG 2.2 AA: focus management, ARIA labels, keyboard navigation
- [ ] Dark mode styled correctly
- [ ] `no-print` applied

---

#### Phase 2: Social & Distribution (Low-medium complexity)

##### 2.1 Social Media Backfill

Post all 10 recipes to Instagram + Pinterest.

**Steps:**
1. After Pinterest token is fixed (Phase 1.5)
2. Clear the error entry in `data/social-posts-log.json` for `beef-ragu-pappardelle` (or let script retry — error entries without `.id` are retried automatically per `social-post.mjs:380-381`)
3. Run: `node scripts/social-post.mjs --backfill --platform instagram`
4. Run: `node scripts/social-post.mjs --backfill --platform pinterest`
5. Verify all 10 recipes appear in `data/social-posts-log.json` with valid `.id` entries

**Acceptance criteria:**
- [ ] All 10 EN recipes posted to Instagram with bilingual captions
- [ ] All 10 EN recipes posted to Pinterest with SEO descriptions
- [ ] `data/social-posts-log.json` has valid entries for all recipes on both platforms
- [ ] No duplicate posts

##### 2.2 Platform-Specific Share Buttons

Add Pinterest "Pin It", Facebook, and X/Twitter share buttons alongside existing Web Share button.

**Files:**
- NEW: `src/components/SocialShareButtons.astro`
- `src/pages/en/recipes/[...slug].astro` — Add after existing `ShareButton` (line ~171)
- `src/pages/fr/recettes/[...slug].astro` — Same
- `src/pages/en/articles/[...slug].astro` — Add after existing `ShareButton`
- `src/pages/fr/articles/[...slug].astro` — Same

**Props:**
```typescript
interface Props {
  locale: Locale;
  url: string;       // Canonical page URL
  title: string;     // Page title for share text
  imageUrl: string;  // Hero image absolute URL (for Pinterest media param)
  description: string; // Page description (for Pinterest)
}
```

**Implementation:**
- Three inline SVG icon buttons in a horizontal row
- Each opens `window.open()` with platform share URL + popup dimensions
- Pinterest: `https://pinterest.com/pin/create/button/?url=&media=&description=`
- Facebook: `https://www.facebook.com/sharer/sharer.php?u=`
- X: `https://twitter.com/intent/tweet?url=&text=`
- `aria-label` via `t(locale, "share.pinterest")` etc. with "(opens new window)" suffix
- Touch targets: min 44x44px with adequate spacing
- Colors: neutral gray icons (not brand colors) to avoid dark mode clashes. `text-gray-500 dark:text-neutral-400 hover:text-brand-primary-text dark:hover:text-brand-accent`
- `no-print` class on container
- `imageUrl` for Pinterest: pass the `heroImage.src` absolute URL from the recipe page's frontmatter data (available via Astro image processing)

**Acceptance criteria:**
- [ ] Three share buttons visible on all recipe and article pages (EN + FR)
- [ ] Each button opens correct platform share dialog in popup window
- [ ] Pinterest pin includes hero image
- [ ] Dark mode: icons visible with proper contrast
- [ ] WCAG: `aria-label` on each button, 44x44px touch targets
- [ ] `no-print` applied
- [ ] No layout shift on load

---

#### Phase 3: Engagement (Medium complexity)

##### 3.1 Star Ratings with Cloudflare Workers KV

Real user ratings aggregated server-side, injected into JSON-LD at build time.

**Architecture:**

```
User clicks star → POST /api/rate { slug, rating }
                → Cloudflare Worker validates + writes to KV
                → Returns { averageRating, ratingCount }

Build time → Script reads KV aggregates for all recipes
           → Writes to data/ratings.json
           → RecipeSchema.astro reads ratings.json → AggregateRating in JSON-LD
```

**Files:**
- NEW: `functions/api/rate.ts` — Cloudflare Pages Function (Worker) for rating submission + retrieval
- NEW: `src/components/StarRating.astro` — Star rating UI component
- NEW: `scripts/fetch-ratings.mjs` — Build-time script to fetch all ratings from KV → `data/ratings.json`
- NEW: `data/ratings.json` — Build-time snapshot of all ratings (generated, gitignored)
- `src/components/RecipeSchema.astro` — Add `AggregateRating` from `data/ratings.json`
- `src/pages/en/recipes/[...slug].astro` — Add `<StarRating>` component below FAQSection
- `src/pages/fr/recettes/[...slug].astro` — Same
- `wrangler.toml` — Add KV namespace binding
- `package.json` — Add `prebuild` script to fetch ratings

**Cloudflare Worker (`functions/api/rate.ts`):**
- `GET /api/rate?slug=cacio-e-pepe` → Returns `{ averageRating: 4.5, ratingCount: 12 }`
- `POST /api/rate` with body `{ slug: "cacio-e-pepe", rating: 4 }` → Validates (1-5 integer), updates KV, returns new aggregate
- KV key pattern: `rating:{slug}` → value: `{ total: number, count: number }`
- Rate limiting: simple check via KV (one rating per IP per slug per 24h)
- CORS: allow only `datemydish.com` origin

**StarRating component:**
- 5 star SVG icons (unfilled by default)
- Hover: stars fill up to cursor position (CSS-only with `:hover` on a flex-reverse trick, or JS)
- Click: submits rating via `fetch('/api/rate', { method: 'POST', ... })`
- After submit: shows filled stars at user's rating, displays "Thanks for rating!" via `aria-live="polite"`
- On page load: fetches current aggregate via `GET /api/rate?slug=...` and displays average + count
- Also checks `dmd_rating_{slug}` in localStorage for the user's own rating (visual indicator)
- Keyboard: `radiogroup` ARIA pattern with arrow key navigation between stars
- Dark mode: unfilled stars `text-gray-300 dark:text-neutral-600`, filled stars `text-yellow-400`
- `no-print` class
- Reduced motion: no animation on fill

**RecipeSchema.astro changes:**
- Import `data/ratings.json` (or receive as prop from page)
- Add to JSON-LD using existing spread conditional pattern:
  ```typescript
  ...(ratingData ? {
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: ratingData.averageRating,
      ratingCount: ratingData.ratingCount,
      bestRating: 5,
      worstRating: 1,
    }
  } : {}),
  ```

**Build-time ratings fetch (`scripts/fetch-ratings.mjs`):**
- Uses Cloudflare API to list all KV keys with `rating:` prefix
- Fetches each value, writes to `data/ratings.json`
- Runs as `prebuild` script in `package.json`
- If KV is empty (first build), writes empty object `{}`

**Acceptance criteria:**
- [ ] Star rating UI visible on all recipe pages (EN + FR)
- [ ] Clicking a star submits to Worker and shows confirmation
- [ ] Returning users see their own rating highlighted
- [ ] Aggregate rating + count displayed below stars
- [ ] `AggregateRating` present in JSON-LD when `ratingCount > 0`
- [ ] Google Rich Results Test validates structured data
- [ ] KV namespace created and bound in `wrangler.toml`
- [ ] Rate limiting prevents spam (1 rating/IP/slug/24h)
- [ ] CORS restricted to `datemydish.com`
- [ ] WCAG: `radiogroup` keyboard pattern, `aria-label` on each star, `aria-live` on result
- [ ] Dark mode: proper star contrast
- [ ] `no-print` applied
- [ ] `prebuild` script runs successfully in CI

##### 3.2 Recipe Scaling

Client-side 1x/2x/3x ingredient scaling.

**Files:**
- `src/components/IngredientList.astro` — Add scaling buttons + JS
- `src/pages/en/recipes/[...slug].astro` — Pass `recipeYield` to IngredientList
- `src/pages/fr/recettes/[...slug].astro` — Same

**Implementation:**

Scaling buttons appear above the ingredient list (in both sidebar and inline-mobile instances):
```html
<div class="no-print flex gap-2 mb-3" role="group" aria-label="Scale recipe">
  <button class="scale-btn" data-scale="1" aria-pressed="true">1x</button>
  <button class="scale-btn" data-scale="2" aria-pressed="false">2x</button>
  <button class="scale-btn" data-scale="3" aria-pressed="false">3x</button>
</div>
```

**Quantity parsing strategy (conservative regex):**
```javascript
// Matches: "2", "1/2", "1 1/2", "0.5", "2-3" at the start of an ingredient string
var qtyRegex = /^(\d+\s+\d+\/\d+|\d+\/\d+|\d+\.?\d*(?:\s*-\s*\d+\.?\d*)?)\s/;
```

- Parse the leading quantity from each ingredient string
- Multiply by scale factor
- Replace the quantity portion, leave the rest unchanged
- Non-parseable items (e.g., "A pinch of salt", "To taste") remain unchanged
- Fractions in display: convert improper fractions (e.g., 3/2 → 1 1/2)
- Scaling updates BOTH ingredient list instances (sidebar `id="sidebar-ingredients"` + inline `id="inline-ingredients"`) simultaneously
- `recipeYield` display text updates to reflect scaled servings (e.g., "2 servings" → "4 servings")
- No persistence — resets to 1x on page load
- Print: prints whatever scale is currently selected (JS-manipulated DOM persists in print)

**`aria-live="polite"` region** announces: "Recipe scaled to {n}x. Servings: {m}."

**Acceptance criteria:**
- [ ] 1x/2x/3x buttons visible above ingredient lists on recipe pages
- [ ] Clicking a button scales all quantities correctly
- [ ] Fractions display properly (1/2, 3/4, 1 1/2)
- [ ] Ranges scale (e.g., "2-3" → "4-6" at 2x)
- [ ] Non-numeric ingredients unchanged
- [ ] Both sidebar and inline ingredient lists update simultaneously
- [ ] `recipeYield` display updates
- [ ] `aria-pressed` toggles correctly
- [ ] `aria-live` announces scale change
- [ ] Dark mode: button styling
- [ ] `no-print` on buttons (but scaled values DO print)
- [ ] Resets to 1x on page reload

##### 3.3 Save/Bookmark Recipes

localStorage-based bookmarks with a dedicated bookmarks page.

**Files:**
- NEW: `src/components/BookmarkButton.astro` — Bookmark toggle button
- NEW: `src/pages/en/bookmarks.astro` — EN bookmarks page
- NEW: `src/pages/fr/signets.astro` — FR bookmarks page
- NEW: `scripts/generate-recipe-index.mjs` — Build-time script generating `dist/recipe-index.json`
- `src/components/Navigation.astro` — Add bookmark icon in utility icons group
- `src/pages/en/recipes/[...slug].astro` — Add `<BookmarkButton>` in action bar after ShareButton
- `src/pages/fr/recettes/[...slug].astro` — Same
- `src/i18n/en.json` + `src/i18n/fr.json` — Keys added in Phase 1.2
- `src/i18n/utils.ts` — Add `getBookmarksLocalizedPath(locale)` helper

**BookmarkButton component:**
- Heart/bookmark SVG icon, toggles filled/unfilled
- On click: adds/removes slug from `dmd_bookmarks` in localStorage (JSON array of EN slugs)
- Uses `translationSlug` to normalize: if on FR page, stores the EN slug via `data-en-slug` attribute
- `aria-pressed` toggles with `aria-label` via `t(locale, "bookmark.save")` / `t(locale, "bookmark.saved")`
- `aria-live="polite"` announces save/remove
- Idempotent binding via `dataset.bound` guard
- Dark mode: `text-gray-400 dark:text-neutral-500` (unfilled), `text-red-500 dark:text-red-400` (filled)
- `no-print` class
- Reduced motion: no animation on toggle

**Navigation bookmark icon:**
- Small bookmark SVG in the utility icons group (between search and dark mode toggle)
- Links to `/en/bookmarks/` or `/fr/signets/` based on locale
- Badge indicator: small dot when bookmarks exist (check localStorage on load, update via `dataset.bound` guard)

**Bookmarks page:**
- Build-time: `scripts/generate-recipe-index.mjs` runs during `postbuild` (after Astro build, before Pagefind). Generates `dist/recipe-index.json` containing all recipes: `{ slug, title, description, heroImage, locale, category }`.
- Client-side: Page loads `recipe-index.json`, reads `dmd_bookmarks` from localStorage, filters and renders matching recipe cards.
- Empty state: message from `t(locale, "bookmark.empty")` with link to recipes page.
- Remove bookmark: each card has an unbookmark button.
- Sorted by most recently saved (bookmarks array is ordered).

**Cross-locale bookmarks:**
- Bookmarks stored as EN slugs regardless of current locale
- On FR bookmarks page, recipe-index.json includes FR data, matched by `translationSlug`

**Acceptance criteria:**
- [ ] Bookmark button visible on all recipe pages (EN + FR)
- [ ] Clicking toggles saved state in localStorage
- [ ] Icon reflects current state on page load
- [ ] Navigation shows bookmark icon with link to bookmarks page
- [ ] Bookmarks page renders saved recipes from recipe-index.json
- [ ] Empty state shown when no bookmarks
- [ ] Removing a bookmark updates both localStorage and the displayed list
- [ ] Cross-locale: bookmarking on FR page shows on EN bookmarks page and vice versa
- [ ] WCAG: `aria-pressed`, `aria-live`, keyboard accessible
- [ ] Dark mode styled
- [ ] `no-print` on interactive elements

---

#### Phase 4: Community (Third-party integrations, requires cookie consent)

##### 4.1 Newsletter Capture (ConvertKit)

Embed form on recipe/article pages and in footer.

**Files:**
- NEW: `src/components/NewsletterSignup.astro`
- `src/components/Footer.astro` — Insert newsletter section between 4-column grid and copyright bar
- `src/pages/en/recipes/[...slug].astro` — Add after AuthorBioCard, before FAQSection
- `src/pages/fr/recettes/[...slug].astro` — Same
- `src/pages/en/articles/[...slug].astro` — Add after article content, before FAQSection
- `src/pages/fr/articles/[...slug].astro` — Same
- `src/pages/en/privacy-policy.astro` — Add email collection disclosure
- `src/pages/fr/politique-de-confidentialite.astro` — Same in French

**Implementation:**
- Custom HTML form (not ConvertKit embed snippet) posting to ConvertKit's form endpoint
- This allows full bilingual control over labels, placeholder, button text via `t(locale, key)`
- Hidden field: `<input type="hidden" name="fields[locale]" value={locale} />` for subscriber segmentation
- **Cookie consent required:** Form only renders if `window.__cookiesAccepted === true` or `localStorage.getItem('dmd_cookies') === 'accepted'`
- If cookies declined: show a message "Enable cookies to subscribe to our newsletter" with link to privacy policy
- Success/error states: swap form content for success/error message via JS
- Footer placement: full-width section between content grid and copyright, warm background `bg-brand-primary/5 dark:bg-brand-primary/10`, centered layout
- Page placement: card-style section with rounded corners, subtle border

**ConvertKit setup (manual):**
1. Create ConvertKit account (free tier)
2. Create a form → get the form ID and endpoint URL
3. Add a custom field `locale` (text) for subscriber segmentation
4. Enable double opt-in (GDPR)
5. Store form endpoint URL as environment variable or hardcode (it's public)

**Acceptance criteria:**
- [ ] Newsletter form visible in footer on all pages
- [ ] Newsletter form visible on recipe and article pages
- [ ] Bilingual labels/CTA match current locale
- [ ] Hidden `locale` field submitted with subscription
- [ ] Success state shown on submission
- [ ] Error state shown on failure
- [ ] Only loads/renders after cookie consent accepted
- [ ] Fallback message when cookies declined
- [ ] Privacy policy updated (EN + FR) to mention email collection
- [ ] Dark mode: form styling
- [ ] WCAG: form labels, focus management, error announcements
- [ ] `no-print` class applied

##### 4.2 Comments (Disqus)

Lazy-loaded Disqus embed on recipe and article pages.

**Files:**
- NEW: `src/components/Comments.astro`
- `src/pages/en/recipes/[...slug].astro` — Add after StarRating, before RelatedRecipes
- `src/pages/fr/recettes/[...slug].astro` — Same
- `src/pages/en/articles/[...slug].astro` — Add after FAQSection, before RelatedRecipes (if applicable)
- `src/pages/fr/articles/[...slug].astro` — Same
- `src/styles/global.css` — Add Disqus dark mode CSS overrides

**Props:**
```typescript
interface Props {
  locale: Locale;
  identifier: string;  // Base slug (shared across EN/FR)
  url: string;         // Canonical page URL
  title: string;       // Page title
}
```

**Implementation:**
- **Lazy loading:** "Load Comments" button (not automatic load). IntersectionObserver detects when the comments section scrolls into view, but does NOT auto-load. User must click the button. This preserves Core Web Vitals.
- **Cookie consent required:** Button only appears if `window.__cookiesAccepted === true`. If declined, show fallback message.
- **Thread identity:** `disqus_identifier` = base slug (e.g., `cacio-e-pepe`), NOT locale-prefixed. This shares threads between EN and FR.
- **Language:** `disqus_config.language` = `locale` prop value
- **Dark mode:** Global CSS overrides via `:root.dark #disqus_thread` selectors. Disqus also supports `colorScheme` reload.
- **Dark mode toggle listener:** When user toggles dark mode, reload Disqus with `DISQUS.reset()` and updated `colorScheme`.
- **Fallback:** If Disqus fails to load (ad blocker, network), show `t(locale, "comments.failedToLoad")` message after 10s timeout.

**Disqus setup (manual):**
1. Create Disqus account → Register site (shortname)
2. Note the shortname for embed configuration
3. Configure trusted domains: `datemydish.com`, `localhost` (for dev)

**Dark mode CSS (`src/styles/global.css`):**
```css
:root.dark #disqus_thread {
  color-scheme: dark;
}
:root.dark #disqus_thread a {
  color: #d4a853; /* brand-accent */
}
```

**Acceptance criteria:**
- [ ] "Load Comments" button visible on recipe + article pages (when cookies accepted)
- [ ] Clicking loads Disqus embed
- [ ] EN and FR pages share the same comment thread per recipe/article
- [ ] Disqus language matches page locale
- [ ] Dark mode: readable text and link colors
- [ ] Dark mode toggle: Disqus re-renders with correct theme
- [ ] Fallback message when Disqus blocked or fails
- [ ] Only loads after cookie consent
- [ ] Fallback message when cookies declined
- [ ] WCAG: button accessible, loading state announced via `aria-live`
- [ ] `no-print` on entire comments section
- [ ] Lighthouse Performance: no regression (lazy loading prevents impact)

---

## System-Wide Impact

### Interaction Graph

```
Page load → BaseLayout
  → CookieConsent checks localStorage('dmd_cookies')
    → If absent: shows banner → user accepts/declines → sets localStorage + dispatches event
    → If 'accepted': sets window.__cookiesAccepted = true
  → CF Analytics beacon loads (no cookie dependency)
  → StarRating fetches GET /api/rate?slug=X → displays aggregate
  → BookmarkButton reads localStorage('dmd_bookmarks') → shows filled/unfilled
  → ScalingButtons default to 1x
  → NewsletterSignup checks window.__cookiesAccepted → renders form or fallback
  → Comments checks window.__cookiesAccepted → shows Load button or fallback

User interaction:
  → Star click → POST /api/rate → updates display + localStorage
  → Scale click → DOM updates ingredient quantities + yield
  → Bookmark click → toggles localStorage array + icon state
  → Share click → window.open(platform URL)
  → Newsletter submit → POST to ConvertKit → success/error state
  → Load Comments click → Disqus script injected → thread renders
  → Dark mode toggle → Disqus DISQUS.reset() if loaded
```

### Error & Failure Propagation

| Component | Failure Mode | Handling |
|-----------|-------------|----------|
| Star Rating Worker | Network error / KV unavailable | Stars still render (visual only), submit shows "Try again" |
| Star Rating KV | Rate limit hit | Returns 429, client shows "You've already rated" |
| Disqus | Ad blocker / network | 10s timeout → fallback message |
| ConvertKit | Form submission fails | Error message shown, form remains |
| Recipe scaling | Unparseable ingredient | Line unchanged, no error shown |
| Bookmarks | localStorage full | Try/catch, graceful degradation |
| CF Analytics | Blocked | Silent failure, no user impact |

### State Lifecycle Risks

- **localStorage `dmd_bookmarks`**: Array of slugs. Risk: corrupt JSON. Mitigation: try/catch parse, reset to `[]` on error.
- **localStorage `dmd_cookies`**: String value. Risk: none (simple string).
- **localStorage `dmd_rating_{slug}`**: Number 1-5. Risk: stale if KV data diverges. Mitigation: display-only indicator, aggregate always from API.
- **KV `rating:{slug}`**: `{ total, count }`. Risk: race condition on concurrent writes. Mitigation: KV is eventually consistent, acceptable for ratings.
- **`data/ratings.json`**: Build artifact. Risk: stale between builds. Mitigation: rebuild triggers on deploy.

### API Surface Parity

| Interface | Affected |
|-----------|----------|
| Recipe page template | EN + FR (must update both) |
| Article page template | EN + FR (must update both) |
| Footer component | Single file, locale-aware |
| Navigation component | Single file, locale-aware |
| Privacy policy | EN + FR (must update both) |
| RecipeSchema JSON-LD | Single file, receives props |
| i18n translations | EN + FR JSON files |

### Integration Test Scenarios

1. **Cookie consent → Disqus load chain:** Accept cookies → Load Comments button appears → click → Disqus loads → toggle dark mode → Disqus re-renders in dark theme
2. **Cookie decline → newsletter fallback:** Decline cookies → newsletter form shows fallback message → accept cookies later (clear localStorage) → form appears
3. **Star rating → JSON-LD:** Rate recipe → build site → verify AggregateRating in JSON-LD matches KV data
4. **Bookmark cross-locale:** Bookmark on EN page → navigate to FR bookmarks page → recipe appears
5. **Scale + print:** Scale to 2x → print → printed ingredients show 2x quantities

---

## Acceptance Criteria

### Functional Requirements

- [ ] All 10 features implemented and working on both EN and FR
- [ ] Cookie consent banner gates Disqus and ConvertKit loading
- [ ] Star ratings stored in Cloudflare Workers KV with AggregateRating in JSON-LD
- [ ] Newsletter subscriptions flow to ConvertKit with locale segmentation
- [ ] Disqus comments load lazily with shared EN/FR threads
- [ ] Platform share buttons open correct share dialogs
- [ ] Recipe scaling correctly handles integers, fractions, decimals, ranges
- [ ] Bookmarks persist across sessions, display on dedicated page
- [ ] All dead internal links fixed
- [ ] Pinterest token fixed and all 10 recipes posted to Instagram + Pinterest
- [ ] Cloudflare Web Analytics collecting page views

### Non-Functional Requirements

- [ ] Lighthouse Performance: no regression below current scores (Disqus lazy-loaded, analytics deferred)
- [ ] Lighthouse SEO: maintains 90+ score
- [ ] Lighthouse Accessibility: maintains 90+ score
- [ ] WCAG 2.2 AA: all interactive components keyboard accessible with proper ARIA
- [ ] Dark mode: all new components styled for both themes
- [ ] Print: all interactive components hidden via `no-print`, scaled ingredients visible
- [ ] Reduced motion: no animations when `prefers-reduced-motion: reduce`
- [ ] Privacy policy updated for ConvertKit email collection and Disqus comments

### Quality Gates

- [ ] `npm run check` passes (TypeScript + content schema validation)
- [ ] `npx playwright test` passes across all 4 projects (desktop/mobile x light/dark)
- [ ] Lighthouse CI PR checks pass
- [ ] `/validate-recipes` passes (no broken cross-links)
- [ ] `/bulk-audit` passes
- [ ] Google Rich Results Test validates Recipe structured data with AggregateRating

---

## Dependencies & Prerequisites

| Dependency | Phase | Type |
|------------|-------|------|
| Cloudflare Web Analytics token | Phase 1 | Manual (dashboard) |
| Pinterest OAuth re-authorization | Phase 1 | Manual (developer portal) |
| Cloudflare KV namespace creation | Phase 3 | Manual (`wrangler kv:namespace create RATINGS`) |
| ConvertKit account + form setup | Phase 4 | Manual (signup + config) |
| Disqus account + site registration | Phase 4 | Manual (signup + config) |

---

## Risk Analysis & Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| AggregateRating flagged by Google | Low | High | Real user ratings (not fake), proper schema, monitor GSC |
| Disqus degrades performance | Medium | Medium | Lazy load behind button click, not automatic |
| Recipe scaling parses incorrectly | Medium | Low | Conservative regex, non-parseable lines unchanged |
| ConvertKit form blocked by ad blockers | Low | Low | Custom HTML form (not their JS embed) |
| Cloudflare KV rate limits exceeded | Very Low | Low | 100K reads/day free tier, blog traffic is minimal |
| localStorage full | Very Low | Low | Try/catch, graceful degradation |
| Disqus blocked by ad blockers | High | Low | Fallback message, comments are not critical path |

---

## Future Considerations

- **Pinterest-specific tall images** — Deferred until 30+ recipes (per brainstorm). Vertical 2:3 images perform significantly better on Pinterest.
- **Recipe scaling with structured quantities** — If free-text parsing proves fragile, migrate ingredient frontmatter to structured format (`{ quantity, unit, ingredient }`). Can be done incrementally.
- **User accounts** — If bookmarks/ratings need cross-device sync, consider Cloudflare D1 with a simple auth layer.
- **Email automation** — ConvertKit supports drip sequences (e.g., welcome series, weekly digest). Implement after subscriber base grows.
- **A/B testing** — Use Cloudflare Workers for simple A/B tests on CTA copy, button placement, etc.

---

## Documentation Plan

- [ ] Update CLAUDE.md: add cookie consent component, rating API endpoint, bookmarks pages, new i18n namespaces, new scripts (`fetch-ratings.mjs`, `generate-recipe-index.mjs`), Disqus/ConvertKit configuration
- [ ] Update privacy policy (EN + FR): email collection, comment data, cookie usage
- [ ] Add `docs/solutions/` entry for Cloudflare Workers KV rating system architecture
- [ ] Document localStorage key convention (`dmd_` prefix) in CLAUDE.md

---

## Sources & References

### Origin

- **Brainstorm document:** [docs/brainstorms/2026-03-03-full-growth-stack-brainstorm.md](docs/brainstorms/2026-03-03-full-growth-stack-brainstorm.md) — Key decisions: Cloudflare Web Analytics, ConvertKit, Disqus, localStorage bookmarks, platform share buttons

### Internal References

- Recipe page template: `src/pages/en/recipes/[...slug].astro`
- RecipeSchema structured data: `src/components/RecipeSchema.astro:104-139`
- BaseLayout head: `src/layouts/BaseLayout.astro:40-70`
- DarkModeToggle localStorage pattern: `src/components/DarkModeToggle.astro:28-45`
- ShareButton pattern: `src/components/ShareButton.astro:25-47`
- SearchOverlay IIFE + focus trap: `src/components/SearchOverlay.astro:95-212`
- Footer structure: `src/components/Footer.astro:33-119`
- Navigation utility icons: `src/components/Navigation.astro:59-73`
- i18n translations: `src/i18n/en.json`, `src/i18n/fr.json`
- Social post script: `scripts/social-post.mjs`
- Social posts log: `data/social-posts-log.json`
- Pagefind dark mode CSS override pattern: `docs/solutions/ui-bugs/pagefind-dark-mode-accessibility.md`
- WCAG accessibility patterns: `docs/solutions/ui-bugs/wcag-2-2-aa-accessibility-remediation.md`

### External References

- Cloudflare Workers KV: https://developers.cloudflare.com/kv/
- Cloudflare Pages Functions: https://developers.cloudflare.com/pages/functions/
- Cloudflare Web Analytics: https://developers.cloudflare.com/web-analytics/
- ConvertKit API: https://developers.convertkit.com/
- Disqus embed: https://help.disqus.com/en/articles/1717112-universal-embed-code
- Google AggregateRating: https://developers.google.com/search/docs/appearance/structured-data/review-snippet
- Pinterest Share URL: https://developers.pinterest.com/docs/rich-pins/overview/
