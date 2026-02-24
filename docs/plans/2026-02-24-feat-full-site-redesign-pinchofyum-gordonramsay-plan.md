---
title: "Full Site Redesign: Pinch of Yum Warmth Meets Gordon Ramsay Premium"
type: feat
status: active
date: 2026-02-24
---

# Full Site Redesign: Pinch of Yum Warmth Meets Gordon Ramsay Premium

## Overview

A comprehensive visual and structural redesign of Date My Dish, blending Pinch of Yum's warm, inviting recipe blog aesthetic (elegant serif typography, generous whitespace, image-forward cards, jump-to-recipe UX, table of contents) with Gordon Ramsay's premium minimalism (restrained color palette, large hero photography, clean grids, professional credibility). The redesign covers all pages, the navigation, footer, and introduces new structural elements: two-column recipe layout with sticky ingredient sidebar, table of contents, author bio card, and a search overlay modal.

## Problem Statement / Motivation

The current Date My Dish design is functional but lacks the visual sophistication and UX polish of top-tier recipe blogs. Key gaps:

- **Single-column recipe pages** miss the opportunity for a sticky ingredient sidebar (a pattern users expect from modern recipe sites)
- **No table of contents** on long recipe pages makes navigation through 800-1500 word prose tedious
- **No author bio card** weakens E-E-A-T signals and personal connection
- **Basic search UX** (dedicated page with delayed Pagefind load) feels disconnected from the browsing flow
- **Typography and spacing** could better leverage the warm brand palette for a premium feel
- **Recipe cards** lack the visual impact of image-forward designs seen on Pinch of Yum

The site has 9 recipe pairs (EN/FR) with plans to scale. Establishing a premium design foundation now prevents compounding design debt.

## Design Philosophy

### From Pinch of Yum
- **Warm, approachable feel** with elegant serif headings and generous whitespace
- **Image-forward recipe cards** with hover effects and circular featured elements
- **Jump-to-recipe + table of contents** for long-form content navigation
- **Recipe card with bold visual borders** and structured ingredient/instruction layout
- **Category discovery** with visual hierarchy (hero → categories → featured)

### From Gordon Ramsay
- **Premium minimalism** — let food photography dominate, restrained UI ornamentation
- **Clean grid discipline** — consistent card sizes, balanced gutters, breathing room
- **Professional credibility** — author presence, structured metadata, quality signals
- **Content-first approach** — every UI element earns its place or gets removed

### Blended for Date My Dish
- Keep the terracotta/gold/cream brand palette but refine its application
- Bitter serif for headings (warmth) + Nunito sans-serif for body (clean readability)
- Generous whitespace between sections (Pinch of Yum) with restrained decoration (Gordon Ramsay)
- Image-forward cards with subtle shadows and smooth hover transitions
- Two-column recipe layout with sticky ingredients (modern recipe blog standard)

---

## Proposed Solution

### Architecture Summary

| Area | Current | Proposed |
|------|---------|----------|
| Recipe page layout | Single column, `max-w-4xl` | Two-column on `lg:` (main + sticky sidebar), single column on mobile/tablet |
| Recipe content component | Monolithic `RecipeContent.astro` | Split into `IngredientList.astro`, `InstructionSteps.astro`, `NutritionCard.astro` |
| Search UX | Dedicated `/search` page, 3s deferred Pagefind load | Search overlay modal from nav icon, lazy-loads Pagefind on open |
| Navigation | Sticky nav with CSS-only mobile menu | Enhanced sticky nav with search overlay trigger, refined styling |
| Recipe cards | `aspect-[4/3]`, basic shadow, 3-col grid | Refined cards with better typography hierarchy, enhanced hover states |
| Table of Contents | None | New TOC component above blog prose, extracted from MDX headings |
| Author bio | None | New `AuthorBioCard.astro` on recipe pages and about page |
| Footer | 3-column with basic links | Richer footer with category links, improved layout |
| Mobile menu | CSS-only checkbox hack | Migrate to JS-managed for consistency with search overlay |
| Typography | Functional but unrefined | Refined scale, better heading/body contrast, improved line heights |

### Component Inventory

**New Components (7):**
| Component | Purpose |
|-----------|---------|
| `TableOfContents.astro` | Extracts h2/h3 from prose, renders anchor links with active-section tracking |
| `IngredientList.astro` | Extracted ingredients with checkboxes, used in sidebar and inline |
| `InstructionSteps.astro` | Extracted instructions with step numbers and optional images |
| `NutritionCard.astro` | Extracted nutrition grid display |
| `AuthorBioCard.astro` | Author photo, name, short bio, link to about page |
| `SearchOverlay.astro` | Full-screen search modal with Pagefind integration |
| `ScrollToTop.astro` | Floating button to scroll back to top on long pages |

**Modified Components (8):**
| Component | Changes |
|-----------|---------|
| `Navigation.astro` | Search overlay trigger, refined styling, JS-managed mobile menu |
| `Footer.astro` | Richer structure with category links, improved dark mode |
| `RecipeContent.astro` | Decomposed — becomes a thin wrapper calling sub-components |
| `RecipeCard.astro` | Enhanced visual design, better typography hierarchy, refined hover states |
| `BaseLayout.astro` | Updated font loading strategy, refined global spacing |
| `RecipeLayout.astro` | Two-column grid wrapper for `lg:` breakpoint |
| `SEOHead.astro` | Enhanced author structured data |
| `SearchBar.astro` | Simplified or removed (functionality moves to `SearchOverlay.astro`) |

**Unchanged Components (6):**
`Breadcrumbs.astro`, `DarkModeToggle.astro`, `LanguageToggle.astro`, `JumpToRecipe.astro`, `ShareButton.astro`, `RecipeSchema.astro` (minor JSON-LD enrichment for author)

**Modified Pages (12):**
All 6 page pairs (EN/FR): homepage, recipe listing, recipe detail, about, search, contact

---

## Technical Approach

### Architecture

#### Design Token System

Before touching components, establish a refined design token system in `tailwind.config.mjs`:

```javascript
// tailwind.config.mjs additions/refinements
{
  theme: {
    extend: {
      colors: {
        brand: {
          primary: "#C4704B",        // Terracotta (keep)
          "primary-dark": "#A85D3D", // Hover state (keep)
          "primary-text": "#A0573A", // Darker terracotta for text (NEW - WCAG AA compliant)
          accent: "#D4A853",         // Warm Gold (keep)
          "accent-dark": "#B8923F",  // Hover state (keep)
          cream: "#FDF6EC",          // Background (keep)
          "cream-dark": "#F5EDDF",   // Slightly darker cream for cards/sections (NEW)
        }
      },
      fontSize: {
        // Refined type scale for premium feel
        "display": ["3.5rem", { lineHeight: "1.1", letterSpacing: "-0.02em" }],
        "heading-1": ["2.5rem", { lineHeight: "1.2", letterSpacing: "-0.01em" }],
        "heading-2": ["1.875rem", { lineHeight: "1.3" }],
        "heading-3": ["1.5rem", { lineHeight: "1.4" }],
        "body-lg": ["1.125rem", { lineHeight: "1.7" }],
        "body": ["1rem", { lineHeight: "1.7" }],
        "body-sm": ["0.875rem", { lineHeight: "1.6" }],
        "caption": ["0.75rem", { lineHeight: "1.5" }],
      },
      spacing: {
        "section": "5rem",      // 80px between major sections
        "section-sm": "3rem",   // 48px between minor sections
      },
      maxWidth: {
        "content": "72rem",     // 1152px (current max-w-6xl)
        "prose": "56rem",       // 896px (current max-w-4xl)
        "narrow": "48rem",      // 768px (current max-w-3xl)
      }
    }
  }
}
```

**Critical fix**: The current brand primary `#C4704B` on cream `#FDF6EC` has approximately 3.2:1 contrast ratio, failing WCAG AA for normal text. Introduce `brand-primary-text` (`#A0573A` or darker) for text use, keeping `#C4704B` for large text, decorative elements, and backgrounds only.

#### Two-Column Recipe Layout Architecture

```
Desktop (lg: 1024px+):
┌──────────────────────────────────────────────────┐
│  Hero Image (full width of content area)         │
├──────────────────────────────────────────────────┤
│  Title + Description + Meta Bar (full width)     │
├──────────────────────────────────────────────────┤
│  Occasion Tags + Action Buttons (full width)     │
├──────────────────────────────┬───────────────────┤
│  Table of Contents (inline)  │                   │
│  Blog Prose (h2/h3 sections) │  Sticky           │
│  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─│  Ingredient       │
│  Instructions (numbered)     │  Sidebar          │
│                              │  (with checkboxes)│
│                              │  ─ ─ ─ ─ ─ ─ ─ ─│
│                              │  Nutrition Mini   │
├──────────────────────────────┴───────────────────┤
│  Date Night Tips (full width)                    │
│  Author Bio Card (full width)                    │
│  FAQ Accordion (full width)                      │
│  Related Recipes Grid (full width)               │
└──────────────────────────────────────────────────┘

CSS Implementation:
- Container: max-w-content (1152px) mx-auto
- Two-column zone: grid grid-cols-1 lg:grid-cols-[1fr_320px] lg:gap-8
- Sidebar: sticky top-[73px] (nav height ~57px + 16px gap) self-start max-h-[calc(100vh-89px)] overflow-y-auto
- Below two-column zone: full-width sections within max-w-content
```

**Sidebar unstick behavior**: The sidebar uses `position: sticky` within the grid. It naturally stops being sticky when it reaches the bottom of its grid row (the two-column zone ends). No JavaScript needed for this.

**Mobile/tablet (below lg:)**: Single column. Ingredients appear inline between prose and instructions, maintaining the current flow.

#### Search Overlay Architecture

```
Trigger: Search icon in Navigation (both desktop and mobile)
Action: Opens full-screen overlay

┌─────────────────────────────────────────────┐
│                                      [✕]    │
│                                             │
│         Search Date My Dish...              │
│    ┌────────────────────────────────┐       │
│    │ 🔍  Type to search...          │       │
│    └────────────────────────────────┘       │
│                                             │
│    Results appear below as cards:           │
│    ┌─────┐ ┌─────┐ ┌─────┐                 │
│    │ img │ │ img │ │ img │                  │
│    │     │ │     │ │     │                  │
│    │Title│ │Title│ │Title│                  │
│    └─────┘ └─────┘ └─────┘                 │
│                                             │
│    Keyboard: Esc to close                   │
│    Click outside results to close           │
└─────────────────────────────────────────────┘

Technical approach:
- SearchOverlay.astro renders hidden overlay HTML on every page (lightweight, no Pagefind yet)
- On search icon click: overlay becomes visible, focus trapped inside, body scroll locked
- On first keystroke: dynamically import Pagefind JS + CSS
- Results styled to match site's RecipeCard design
- Escape key or close button dismisses overlay, returns focus to trigger
- aria-modal="true", role="dialog", focus trap with Tab/Shift+Tab cycling
```

**Dedicated search page**: Kept as fallback. Nav search links to it for users who want full-page results. The search page itself gets the same visual refresh.

#### Table of Contents Architecture

**Heading extraction approach**: Use a Remark plugin to extract headings at build time and inject IDs.

```javascript
// remark-toc-extract.mjs (new file in project root or src/utils/)
// Adds `id` attributes to h2/h3 in MDX output
// Exposes headings via Astro's Content Collections API
```

**Alternative (simpler)**: Client-side DOM scan. On page load, a small inline script scans the `.prose` container for h2/h3 elements, generates a TOC, and adds scroll-spy behavior via IntersectionObserver.

**Recommended**: Client-side approach for simplicity. The script is small (~2KB) and avoids build pipeline changes.

```
TOC placement: Above blog prose, inside the main content column
Style: Bordered card with heading links
Active section: Highlighted via IntersectionObserver
Mobile: Collapsible accordion (closed by default)
Desktop: Always visible, static (not sticky — sidebar is already sticky)
```

### Implementation Phases

#### Phase 1: Design Foundation (Typography, Colors, Global Styles)

**Goal**: Establish the refined design system that all subsequent phases build on.

**Tasks and deliverables:**

- [ ] Update `tailwind.config.mjs` with refined design tokens (type scale, spacing, `brand-primary-text`)
- [ ] Refine `src/styles/global.css` prose styles (improved heading sizes, line heights, paragraph spacing)
- [ ] Update `src/layouts/BaseLayout.astro` font loading (audit which Bitter/Nunito weights are actually used, remove unused)
- [ ] Fix WCAG AA contrast: replace `text-brand-primary` with `text-brand-primary-text` for body-size text across all components
- [ ] Audit and refine dark mode color mappings (improve `dark:` variants for better contrast)
- [ ] Add `scroll-margin-top` utility to headings for sticky nav offset

**Files modified:**
- `tailwind.config.mjs`
- `src/styles/global.css`
- `src/layouts/BaseLayout.astro`
- All components using `text-brand-primary` (global find/replace)

**Success criteria:**
- All text passes WCAG AA contrast ratio (4.5:1 for normal text, 3:1 for large text)
- Typography scale feels premium — clear hierarchy between display, h1, h2, h3, body
- Dark mode has no muddy or low-contrast areas
- No visual regressions on existing pages

**Estimated effort:** Small-medium

---

#### Phase 2: Navigation + Search Overlay + Footer

**Goal**: Redesign the global chrome that wraps every page.

**Tasks and deliverables:**

- [ ] **Navigation.astro** — Refined visual design:
  - Increase logo presence (slightly larger `font-handwritten`, consider adding a small icon/illustration)
  - Refined nav link styling with subtle hover underline animation
  - Search icon that triggers search overlay (not a page link)
  - Migrate mobile menu from CSS-only checkbox hack to JS-managed (for consistency with search overlay's focus trapping and body scroll lock)
  - Mobile: search icon visible in nav bar (outside hamburger), hamburger for menu items
  - Ensure `aria-current="page"` active states on nav links
  - Dark mode: ensure backdrop-blur works well with dark backgrounds

- [ ] **SearchOverlay.astro** — New component:
  - Full-screen overlay with semi-transparent backdrop (`bg-black/60 backdrop-blur-sm`)
  - Centered search container (`max-w-2xl`) with large input field
  - Pagefind JS/CSS lazy-loaded on first interaction (not on page load)
  - Results displayed as mini recipe cards (image + title + category)
  - Focus trap: Tab cycles within overlay, Escape closes
  - `aria-modal="true"`, `role="dialog"`, `aria-label` for search region
  - Body scroll lock when open (`overflow: hidden` on `<html>`)
  - Smooth open/close transitions (fade + slight scale)
  - Dark mode support for overlay, input, and result cards
  - Keyboard shortcut: `Cmd/Ctrl + K` to open search from anywhere

- [ ] **Footer.astro** — Richer structure:
  - Four-section layout: Brand (logo + tagline), Navigation (key pages), Categories (top recipe categories), Social + Legal
  - Slightly larger footer with more breathing room
  - Subtle top border or background color change (`bg-gray-50 dark:bg-gray-900`)
  - Add popular category links dynamically from recipe data
  - Ensure all links have proper `aria-label` where needed
  - Mobile: stack sections vertically with clear separation

- [ ] **Update SearchBar.astro** — Simplify or deprecate (search moves to overlay)
- [ ] **Dedicated search page** (`en/search.astro`, `fr/recherche.astro`) — Visual refresh to match new design, keep as full-page fallback

**Files modified:**
- `src/components/Navigation.astro`
- `src/components/SearchOverlay.astro` (NEW)
- `src/components/Footer.astro`
- `src/components/SearchBar.astro`
- `src/layouts/BaseLayout.astro` (add SearchOverlay)
- `src/pages/en/search.astro` + `src/pages/fr/recherche.astro`

**New i18n keys:**
```json
{
  "search": {
    "overlayTitle": "Search Date My Dish",
    "overlayPlaceholder": "Search recipes...",
    "close": "Close search",
    "noResults": "No recipes found. Try different keywords.",
    "keyboardShortcut": "Press {key} to search"
  }
}
```

**Success criteria:**
- Search overlay opens smoothly, loads Pagefind on first keystroke
- Escape closes overlay, focus returns to trigger
- Mobile menu works consistently with search overlay (no z-index conflicts)
- Footer looks richer without feeling cluttered
- All interactive elements are keyboard-accessible

**Estimated effort:** Medium

---

#### Phase 3: Homepage Redesign

**Goal**: Create a striking first impression that combines warmth with premium quality.

**Tasks and deliverables:**

- [ ] **Hero Section** — Elevated visual impact:
  - Larger hero image with improved gradient overlay for text legibility
  - Handwritten tagline (Caveat font) + refined CTA button
  - Consider subtle parallax effect or slow zoom on hero image (CSS-only, no JS)
  - Mobile: hero should be impactful but not overwhelming (appropriate height scaling)
  - Dark mode: overlay gradient adjustments for dark backgrounds

- [ ] **Featured Recipes Section** — Redesigned grid:
  - Section heading with decorative accent (thin horizontal rule or brand accent line)
  - 3-column grid on desktop (keep), but with refined `RecipeCard` design (see Phase 5)
  - Consider showing 6 or 9 recipes with a "View All Recipes" CTA button
  - Better spacing between section heading and grid (`section` spacing token)

- [ ] **Categories Section** — Visual upgrade:
  - Keep as category pills/chips (no category images yet, only 9 recipes)
  - Refined pill design: slightly larger, better hover states, subtle background on hover
  - Section heading consistent with featured recipes section heading style
  - Consider arranging in a visually balanced centered layout with varying pill sizes

- [ ] **Overall homepage rhythm**:
  - Clear visual separation between sections (whitespace, not dividers)
  - Consistent section padding using `section` spacing token (80px)
  - Smooth scroll behavior between sections

**Files modified:**
- `src/pages/en/index.astro` + `src/pages/fr/index.astro`

**Success criteria:**
- Hero feels premium and inviting (Pinch of Yum warmth + Gordon Ramsay impact)
- Clear visual hierarchy: Hero → Featured → Categories
- Page feels well-paced with generous whitespace
- Fast LCP (hero image loads eagerly with proper `sizes`)

**Estimated effort:** Medium

---

#### Phase 4: Recipe Card Redesign

**Goal**: Elevate recipe cards to be more visually compelling — image-forward with refined typography.

**Tasks and deliverables:**

- [ ] **RecipeCard.astro** — Refined design:
  - Keep `aspect-[4/3]` image ratio (good for food photography)
  - Improved image hover: subtle zoom + slight shadow lift (current `scale-105` is good, refine timing)
  - Better typography hierarchy in card body:
    - Recipe title: `font-heading text-lg font-bold` with `line-clamp-2`
    - Description: `text-body-sm text-gray-600` with `line-clamp-2`
    - Meta row: refined with small icons for cook time + difficulty badge
  - Card container: refine shadow (`shadow-sm` → custom subtle shadow), rounded corners (`rounded-xl` keep)
  - Hover state: card lifts slightly (`hover:-translate-y-1 hover:shadow-lg transition-all duration-300`)
  - Add subtle bottom border accent in brand color on hover
  - Dark mode: card background `dark:bg-gray-900`, ensure text contrast
  - Consistent padding (`p-5` instead of `p-4` for more breathing room)

- [ ] **Grid layout refinements** across all pages using cards:
  - Consistent `gap-8` (32px) instead of current `gap-6` (24px) for more breathing room
  - Cards on homepage, listing, category, and related recipes sections

**Files modified:**
- `src/components/RecipeCard.astro`
- Pages using RecipeCard grid (homepage, listing, category, recipe detail)

**Success criteria:**
- Cards feel premium — clean, well-spaced, with smooth hover interaction
- Image quality shines through without UI clutter
- Cards work well in 1/2/3 column layouts
- Dark mode cards have good contrast and don't feel flat

**Estimated effort:** Small

---

#### Phase 5: Recipe Detail Page — Two-Column Layout + New Components

**Goal**: The biggest structural change. Restructure recipe pages to a two-column layout with sticky ingredient sidebar, add table of contents, and author bio card.

**Tasks and deliverables:**

##### 5a. Component Decomposition

- [ ] **Split `RecipeContent.astro`** into sub-components:
  - `IngredientList.astro`: Ingredient groups with checkboxes, styled as a card. Accepts `ingredientGroups` and `locale` props. Used both in sidebar (desktop) and inline (mobile).
  - `InstructionSteps.astro`: Numbered instruction groups with optional step images. Accepts `instructionGroups` and `locale` props.
  - `NutritionCard.astro`: Nutrition grid display. Accepts `nutrition` prop.
  - Keep `RecipeContent.astro` as a backwards-compatible wrapper that calls sub-components (or remove it and use sub-components directly in page templates).

- [ ] **Ingredient checkbox deduplication**: On desktop, ingredients appear only in the sidebar (not duplicated in main column). On mobile, they appear inline. Use a single source of truth — conditionally render in sidebar or inline based on a CSS approach:
  ```html
  <!-- Sidebar version (hidden on mobile) -->
  <aside class="hidden lg:block">
    <IngredientList ... />
  </aside>
  <!-- Inline version (hidden on desktop) -->
  <div class="lg:hidden">
    <IngredientList ... />
  </div>
  ```
  Note: Checkbox IDs must be unique. Use `sidebar-` and `inline-` prefixes to avoid duplicate IDs.

##### 5b. Two-Column Layout

- [ ] **Recipe page template restructure** (`en/recipes/[...slug].astro` + `fr/recettes/[...slug].astro`):
  ```
  Full-width zone (max-w-content):
    Breadcrumbs
    Hero Image (rounded-2xl, improved height handling)
    Title + Description
    Meta Bar (prep/cook/total, servings, difficulty, impress factor)
    Occasion Tags
    Action Buttons (Jump to Recipe, Print, Share)

  Two-column zone (grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8):
    Main column:
      Table of Contents (collapsible on mobile)
      Blog Prose (<Content /> MDX)
      Instructions (InstructionSteps component)
    Sidebar column (lg:sticky lg:top-[73px] lg:self-start):
      Ingredient List (IngredientList component)
      Nutrition summary (NutritionCard component — compact view)

  Full-width zone (max-w-content):
    Date Night Tips
    Author Bio Card (NEW)
    FAQ Accordion
    Related Recipes Grid
  ```

- [ ] **Sidebar styling**:
  - Background: `bg-white dark:bg-gray-900` with subtle border `border border-gray-100 dark:border-gray-800`
  - Rounded corners: `rounded-xl`
  - Internal padding: `p-5`
  - Section headers: `font-heading text-heading-3 font-bold`
  - Smooth scroll within sidebar if content overflows: `overflow-y-auto max-h-[calc(100vh-89px)]`
  - Print: sidebar content should print inline (not sticky/fixed)

##### 5c. Table of Contents

- [ ] **TableOfContents.astro** — New component:
  - Client-side heading extraction from `.prose` container (h2 and h3)
  - Renders as a bordered card above the prose section
  - Links use smooth scroll to anchors (`scroll-behavior: smooth` already in global CSS)
  - Heading IDs generated by slugifying heading text
  - Active section highlighted via IntersectionObserver (subtle left border accent or bold text)
  - Mobile: collapsed by default in an accordion (`<details>` element), expandable
  - Desktop: always visible, static position (sidebar is already sticky)
  - Skip TOC if fewer than 3 headings
  - Inline `<script is:inline>` for DOM scanning and IntersectionObserver (~2KB)

  ```
  ┌─────────────────────────────────┐
  │  Table of Contents              │
  │  ─────────────────────          │
  │  ● Why This Dish Works          │
  │    ○ The Secret Ingredient      │
  │  ● Step-by-Step Tips            │  ← active section highlighted
  │  ● Wine Pairing Notes           │
  │  ● Make-Ahead Instructions      │
  └─────────────────────────────────┘
  ```

##### 5d. Author Bio Card

- [ ] **AuthorBioCard.astro** — New component:
  - Author photo (circular avatar, `rounded-full w-16 h-16` or similar)
  - Author name in `font-heading`
  - Short bio paragraph (2-3 sentences)
  - "About the author" link to `/en/about/` or `/fr/a-propos/`
  - Optional Instagram link
  - Styled as a subtle card: `bg-gray-50 dark:bg-gray-800 rounded-xl p-6`
  - Placement on recipe pages: after Date Night Tips, before FAQs
  - Reused on the about page as a hero card
  - Author photo asset needed: `src/assets/images/author-victor.jpg`
  - Same photo for both locales, different bio text (from i18n keys)

##### 5e. Recipe Page Visual Refinements

- [ ] **Hero image**: Increase max-height at `lg:` to `max-h-[500px]` (from 450px) for more visual impact
- [ ] **Meta bar**: Refined styling — keep `rounded-xl bg-gray-50 dark:bg-gray-800` but improve icon sizing and spacing
- [ ] **Impress Factor**: Refined heart icons with subtle animation on hover
- [ ] **FAQ accordion**: Improved styling — subtle open/close transition, better spacing
- [ ] **Related recipes**: Use redesigned `RecipeCard` component, add "More Recipes" heading with accent

**Files created:**
- `src/components/IngredientList.astro`
- `src/components/InstructionSteps.astro`
- `src/components/NutritionCard.astro`
- `src/components/TableOfContents.astro`
- `src/components/AuthorBioCard.astro`
- `src/assets/images/author-victor.jpg` (asset needed)

**Files modified:**
- `src/components/RecipeContent.astro` (decomposed or removed)
- `src/pages/en/recipes/[...slug].astro` + `src/pages/fr/recettes/[...slug].astro`
- `src/components/FAQSection.astro` (visual refinement)
- `src/components/RelatedRecipes.astro` (use redesigned cards)
- `src/components/ImpressFactor.astro` (visual refinement)
- `src/components/DateNightTips.astro` (visual refinement)

**New i18n keys:**
```json
{
  "toc": {
    "title": "Table of Contents",
    "collapse": "Hide table of contents",
    "expand": "Show table of contents"
  },
  "author": {
    "bioShort": "Victor creates recipes designed to impress on date night...",
    "aboutLink": "About the author",
    "photoAlt": "Victor, creator of Date My Dish"
  }
}
```

**Success criteria:**
- Two-column layout works flawlessly at `lg:` breakpoint and above
- Sidebar sticks correctly, doesn't overlap footer or extend beyond grid
- Mobile layout maintains current UX quality with ingredients inline
- TOC highlights correct section while scrolling
- Author bio card adds warmth and credibility
- Print layout shows all content in logical single-column flow
- No duplicate checkbox IDs in the DOM
- `scroll-margin-top` on all heading IDs (accounts for sticky nav)

**Estimated effort:** Large

---

#### Phase 6: Recipe Listing + Category Pages

**Goal**: Refresh the recipe browsing experience with better visual hierarchy.

**Tasks and deliverables:**

- [ ] **Recipe listing page** (`en/recipes/index.astro` + `fr/recettes/index.astro`):
  - Refined page heading with descriptive subtitle
  - Category pills: improved styling consistent with homepage categories section
  - Recipe grid: use redesigned `RecipeCard` with `gap-8`
  - Add recipe count display ("Showing 9 recipes" / "9 recettes")
  - Consistent section spacing

- [ ] **Category pages** (`en/recipes/category/[category].astro` + `fr/recettes/categorie/[category].astro`):
  - Same treatment as listing page
  - Active category pill highlighted with `bg-brand-primary text-white`
  - Breadcrumbs reflect the category

- [ ] **Note on pagination**: Not implementing now (only 9 recipes). Design the grid layout to accommodate future pagination (leave space below the grid for pagination controls). Consider adding a `<!-- TODO: Pagination when 15+ recipes -->` comment.

- [ ] **Note on sidebar filters**: Not implementing now per user decision. Category pills at the top remain the filtering mechanism.

**Files modified:**
- `src/pages/en/recipes/index.astro` + `src/pages/fr/recettes/index.astro`
- `src/pages/en/recipes/category/[category].astro` + `src/pages/fr/recettes/categorie/[category].astro`

**Success criteria:**
- Listing pages feel consistent with the redesigned homepage
- Category filtering works correctly with active state
- Grid layout is responsive and uses consistent spacing

**Estimated effort:** Small

---

#### Phase 7: About, Contact, Search, 404 Pages

**Goal**: Apply the refined design system to secondary pages.

**Tasks and deliverables:**

- [ ] **About page** (`en/about.astro` + `fr/a-propos.astro`):
  - Add `AuthorBioCard` as a hero element at the top (photo + name + short bio)
  - Below the bio card, keep the longer prose content with refined typography
  - Consider adding a "Our Favorite Recipes" section at the bottom with 3 recipe cards

- [ ] **Contact page** (`en/contact.astro` + `fr/contact.astro`):
  - Refined typography and spacing
  - Social links styled as icon buttons (consistent with footer)
  - Clean, simple layout — content-first approach (Gordon Ramsay influence)

- [ ] **Search page** (`en/search.astro` + `fr/recherche.astro`):
  - Visual refresh to match new design system
  - Search input styled consistently with search overlay
  - Results layout improved
  - Add note: "Tip: Press Cmd+K to search from anywhere"

- [ ] **404 page** (`404.astro`):
  - Refined typography
  - Consider adding 3 random/featured recipe cards as "Try These Instead" suggestions
  - Maintain bilingual CTAs

**Files modified:**
- `src/pages/en/about.astro` + `src/pages/fr/a-propos.astro`
- `src/pages/en/contact.astro` + `src/pages/fr/contact.astro`
- `src/pages/en/search.astro` + `src/pages/fr/recherche.astro`
- `src/pages/404.astro`

**Success criteria:**
- All secondary pages feel like they belong to the same design system
- About page feels personal and credible with author photo
- Search page provides a consistent experience with the overlay

**Estimated effort:** Small

---

## System-Wide Impact

### Interaction Graph

- **Search overlay** triggers Pagefind JS load → renders results → click navigates to recipe page. Must not interfere with navigation mobile menu toggle.
- **Dark mode toggle** affects all new components — `SearchOverlay`, `TableOfContents`, `IngredientList` (sidebar), `AuthorBioCard`, `NutritionCard` all need `dark:` variants.
- **Mobile menu** migrating from CSS-only to JS-managed affects the hamburger button behavior, the checkbox input removal, and the overlay z-index stacking order. The search overlay and mobile menu need coordinated z-index values (mobile menu: `z-50`, search overlay: `z-[60]`).
- **Print styles** affected by two-column layout — `@media print` must force single-column, hide sidebar, show ingredients inline.

### Error Propagation

- **Pagefind load failure**: Search overlay should show a graceful fallback ("Search unavailable, please try refreshing") rather than a blank overlay.
- **Missing author photo**: `AuthorBioCard` should handle missing image gracefully (show initials avatar or hide photo section).
- **No headings in prose**: `TableOfContents` should not render if fewer than 3 headings are extracted.
- **IntersectionObserver not supported**: TOC active-section highlighting degrades gracefully (all links remain unstyled).

### State Lifecycle Risks

- **Ingredient checkbox state**: Currently stored nowhere (resets on page refresh). No change needed, but document that state is ephemeral.
- **Search overlay open state**: Managed via JS. If user navigates (clicks a result), overlay should close automatically via `navigation` event listener or by relying on full page reload in Astro.
- **Dark mode**: No change to current `localStorage` approach. New components read state from `document.documentElement.classList.contains('dark')`.

### API Surface Parity

- **Language toggle**: Must work correctly on all pages including updated about page. `getAlternateUrl` in `src/i18n/utils.ts` — no changes needed unless new routes are added.
- **RSS feeds**: `en/rss.xml.ts` and `fr/rss.xml.ts` — no changes needed (feed content comes from frontmatter, not layout).
- **JSON-LD schemas**: `RecipeSchema.astro` enriched with author image/URL. `Breadcrumbs.astro` unchanged. Homepage schemas unchanged.

### Integration Test Scenarios

1. **Recipe page desktop**: Load recipe at `lg:` width → verify two-column layout renders, ingredients in sidebar, TOC above prose, author bio below tips. Resize to `md:` → verify collapses to single column, ingredients inline.
2. **Search overlay + dark mode**: Open search overlay in dark mode → verify backdrop, input, results all themed correctly. Type query → verify Pagefind loads and results appear. Press Escape → verify overlay closes and focus returns to nav search icon.
3. **Mobile menu + search**: On mobile, open hamburger menu → verify menu appears. Close menu, click search icon → verify search overlay opens without menu interference. With overlay open, verify body scroll is locked.
4. **Print recipe**: On two-column desktop layout, click Print → verify print output is single-column, ingredients appear inline (not in sidebar position), all `no-print` elements hidden.
5. **Language switch on recipe page**: On EN recipe with two-column layout, click FR toggle → verify FR recipe loads with same two-column layout, French ingredient names, French TOC heading, French author bio.

---

## Acceptance Criteria

### Functional Requirements

- [ ] All pages render correctly in both EN and FR
- [ ] Recipe pages display two-column layout on `lg:` (1024px+) with sticky ingredient sidebar
- [ ] Recipe pages collapse to single column on mobile/tablet (below `lg:`)
- [ ] Table of Contents renders on recipe pages with 3+ prose headings, highlights active section
- [ ] Search overlay opens from nav on all pages, loads Pagefind lazily, shows results
- [ ] Search overlay is keyboard-accessible (focus trap, Escape to close, Cmd/Ctrl+K shortcut)
- [ ] Author bio card appears on recipe pages and about page
- [ ] Footer displays richer structure with category links
- [ ] All new components support dark mode
- [ ] Print layout for recipe pages shows single-column with all content visible
- [ ] No duplicate element IDs on any page
- [ ] All heading anchors work for TOC navigation with proper `scroll-margin-top`

### Non-Functional Requirements

- [ ] WCAG AA compliance: all text passes 4.5:1 contrast for normal text, 3:1 for large text
- [ ] No layout shift (CLS) from two-column layout or search overlay
- [ ] Pagefind JS loads only when search overlay opens (not on page load)
- [ ] TOC script is < 3KB inline
- [ ] LCP not regressed: hero images remain eager-loaded with proper `sizes`
- [ ] Mobile touch targets ≥ 44x44px for all interactive elements
- [ ] Page weight increase < 5KB per page (excluding Pagefind which loads on demand)

### Quality Gates

- [ ] `npm run build` succeeds with no errors
- [ ] `npm run check` passes TypeScript and content validation
- [ ] Visual review on Chrome, Firefox, Safari at 375px, 768px, 1024px, 1440px widths
- [ ] Dark mode visual review at all breakpoints
- [ ] Print preview check for recipe pages
- [ ] Lighthouse performance score ≥ 90 on recipe pages
- [ ] Screen reader walkthrough of search overlay and TOC navigation

---

## Success Metrics

- **Visual quality**: Side-by-side comparison with Pinch of Yum and Gordon Ramsay shows comparable visual polish
- **User engagement**: Recipe pages feel easier to navigate with TOC and sticky ingredients
- **Brand consistency**: All pages feel unified under the same refined design system
- **Performance**: No regression in Core Web Vitals (LCP, CLS, INP)
- **Accessibility**: Zero WCAG AA violations in automated checks

---

## Dependencies & Prerequisites

- **Author photo**: Need `src/assets/images/author-victor.jpg` — optimized headshot/portrait of Victor
- **Author bio text**: Need short bio in both EN and FR for `AuthorBioCard`
- **No external dependencies**: All changes use existing tech stack (Astro, Tailwind, vanilla JS)
- **No new npm packages**: Pagefind already installed, no new build tools needed

---

## Risk Analysis & Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Two-column layout breaks on edge cases (very long ingredient lists, very short prose) | Medium | Medium | Test with existing recipes that have varying content lengths. Set `max-h` + `overflow-y-auto` on sidebar. |
| CSS-only → JS mobile menu migration introduces bugs | Medium | High | Implement JS menu with same visual behavior as current CSS version. Test extensively on mobile. |
| Pagefind lazy-loading in overlay causes perceived delay | Low | Medium | Show loading spinner in overlay while Pagefind initializes. Preload Pagefind on `mouseenter` of search icon. |
| IntersectionObserver TOC tracking flickers on fast scroll | Low | Low | Use `rootMargin` and `threshold` tuning. Debounce active state changes. |
| Dark mode regressions in new components | Medium | Medium | Develop with dark mode on, not as an afterthought. Test both modes in every phase. |
| EN/FR page file duplication leads to inconsistency | High | Medium | Make all structural changes to EN first, then replicate to FR. Use diff to verify parity. |
| Print styles break with two-column layout | Medium | Medium | Add `@media print` rule to force `grid-cols-1` and `position: static` on sidebar. |

---

## Future Considerations

These are explicitly **out of scope** for this redesign but should be designed to accommodate:

- **Newsletter/email capture**: The footer and homepage have designated spaces. When ready, add a `NewsletterCTA.astro` component.
- **Sidebar filters on listing page**: The listing page layout can accommodate a future sidebar. Keep the current category pills approach for now.
- **Pagination**: When recipe count exceeds ~15, implement numbered pagination. Grid layout already supports this.
- **Video embeds**: Recipe content schema supports future `video` field. Layout accommodates video in prose or instruction steps.
- **User ratings/reviews**: The recipe card and detail page can accommodate a star rating. Currently only editorial "Impress Factor".
- **Pinterest images**: Deferred until 30+ recipes per CLAUDE.md guidelines.

---

## Documentation Plan

- Update `CLAUDE.md` with any new conventions established during the redesign (component naming, spacing tokens, dark mode patterns)
- Add comments in `tailwind.config.mjs` explaining the design token choices
- Add JSDoc-style comments to new components explaining their props and usage

---

## Sources & References

### Internal References
- Current layout: `src/layouts/BaseLayout.astro`, `src/layouts/RecipeLayout.astro`
- Current recipe page: `src/pages/en/recipes/[...slug].astro`
- Current recipe content: `src/components/RecipeContent.astro`
- Current navigation: `src/components/Navigation.astro`
- Current footer: `src/components/Footer.astro`
- Current cards: `src/components/RecipeCard.astro`
- Current search: `src/components/SearchBar.astro`
- Tailwind config: `tailwind.config.mjs`
- Global styles: `src/styles/global.css`
- Content schema: `src/content.config.ts`
- i18n translations: `src/i18n/en.json`, `src/i18n/fr.json`
- Institutional learnings: `docs/solutions/ui-bugs/category-tabs-ordering-and-image-height-constraints.md`
- Image optimization: `docs/solutions/performance-issues/oversized-hero-images-optimization.md`
- SEO/accessibility audit: `docs/solutions/performance-issues/seo-performance-accessibility-audit-and-implementation.md`

### External Inspiration
- Pinch of Yum (https://pinchofyum.com/): Warm typography, image-forward cards, TOC pattern, recipe card design, jump-to-recipe UX
- Gordon Ramsay Recipes (https://www.gordonramsay.com/gr/recipes/): Premium minimalism, clean grids, restrained color, content-first approach, professional credibility

### Design Patterns Referenced
- Sticky sidebar for ingredients: Industry standard for recipe blogs (Serious Eats, NYT Cooking, Pinch of Yum)
- Search overlay with Cmd+K: Common in developer docs (Algolia DocSearch, Vercel, Stripe)
- Table of contents with scroll-spy: Common in long-form content (MDN, Wikipedia, Medium)
