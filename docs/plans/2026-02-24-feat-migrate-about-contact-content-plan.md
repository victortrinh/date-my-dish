---
title: "feat: Migrate About & Contact Content from WordPress + Social Media Cleanup"
type: feat
status: completed
date: 2026-02-24
---

# Migrate About & Contact Content from WordPress + Social Media Cleanup

## Overview

Migrate enriched content from the live WordPress site (datemydish.com) into the Astro about and contact pages (EN + FR), while performing a site-wide social media cleanup: update Instagram handle from `datemydish` → `datemydishdotcom`, remove all Pinterest references, and remove email references.

## Problem Statement / Motivation

The current Astro about page is minimal compared to the WordPress version — missing Victor's Montreal background, food culture story, and cooking philosophy. The contact page references an email that doesn't exist (`hello@datemydish.com`) and a Pinterest account with no content. The Instagram handle is wrong everywhere (`datemydish` instead of `datemydishdotcom`). These issues create a broken user experience and inaccurate structured data for search engines.

## Proposed Solution

### Phase 1: About Page Enrichment (EN + FR)

Expand the about page prose with content adapted from the WordPress site:

**New content sections (keeping existing structure + adding):**
1. **Welcome / Intro** — Victor as creator of Date My Dish (keep existing, refine)
2. **Montreal Food Culture Background** — Growing up in Montreal surrounded by food culture, bilingual household (NEW)
3. **Why "Date My Dish"?** — Gap in romantic home cooking resources, cooking for someone as expression of care (expand existing)
4. **What You'll Find Here** — Romantic recipes, cooking techniques, date night planning tips, wine pairings, seasonal inspiration, thoroughly tested recipes (expand existing bullet list)
5. **Closing** — Thank you + invitation to explore (keep existing, refine)

**WordPress source content to adapt (NOT copy verbatim — rewrite to match site tone):**
- Victor's passion for cooking evolved into a comprehensive resource
- Growing up in Montreal surrounded by food culture developed appreciation for cuisine connecting people
- Noticed gap in resources focused on romantic home cooking for date nights
- Cooking for someone = "one of the most genuine expressions of care and affection"
- Prioritizes effort and intention over perfection

**Files:**
- `src/pages/en/about.astro` — Enriched English prose
- `src/pages/fr/a-propos.astro` — Quebec French adaptation (not literal translation)

**SEO meta descriptions (under 160 chars):**
- EN: `"Meet Victor, the Montreal home cook behind Date My Dish. Romantic recipes, date night tips, and cooking inspiration for unforgettable evenings together."`
- FR: `"Découvrez Victor, le cuisinier montréalais derrière Date My Dish. Recettes romantiques, conseils pour soirées en amoureux et inspiration culinaire."`

### Phase 2: Contact Page Update (EN + FR)

Replace current content with Instagram-only contact + categorized reach-out topics.

**Structure:**
1. Opening paragraph — welcoming message, community-focused
2. **How to connect** — Instagram only (`@datemydishdotcom`), with brief note about DMs being the best way to reach out
3. **What you can reach out about** — Categorized list:
   - Recipe questions (substitutions, techniques, modifications)
   - Date night planning (menu ideas, wine pairings, atmosphere tips)
   - Collaboration & media inquiries (partnerships, press, features)
   - Feedback & suggestions (recipe experiences, new dish ideas)

**Removed:**
- Email (`hello@datemydish.com`) — doesn't exist
- Pinterest link — empty account
- Pinterest SVG icon

**Visual treatment:** Keep simple `<ul>` within `.prose` context (no cards/grid). YAGNI — matches existing design patterns.

**Files:**
- `src/pages/en/contact.astro` — Updated English content
- `src/pages/fr/contact.astro` — Quebec French adaptation

**SEO meta descriptions (under 160 chars):**
- EN: `"Connect with Victor from Date My Dish on Instagram. Recipe questions, date night planning ideas, collaborations, and feedback — let's create something special."`
- FR: `"Rejoignez Victor de Date My Dish sur Instagram. Questions sur les recettes, idées de soirées, collaborations et suggestions — créons quelque chose de spécial."`

### Phase 3: Site-Wide Social Media Cleanup

**Instagram URL update** (`instagram.com/datemydish` → `instagram.com/datemydishdotcom`):

| File | Line(s) | Change |
|------|---------|--------|
| `src/pages/en/contact.astro` | ~37 | Update href + display text |
| `src/pages/fr/contact.astro` | ~37 | Update href + display text |
| `src/components/Footer.astro` | ~45 | Update href |
| `src/pages/en/index.astro` | ~52 | Update `sameAs` JSON-LD |
| `src/pages/fr/index.astro` | ~52 | Update `sameAs` JSON-LD |

**Pinterest removal:**

| File | Line(s) | Change |
|------|---------|--------|
| `src/pages/en/contact.astro` | ~38 | Remove Pinterest link |
| `src/pages/fr/contact.astro` | ~38 | Remove Pinterest link |
| `src/components/Footer.astro` | ~50-54 | Remove Pinterest icon + link |
| `src/pages/en/index.astro` | ~53 | Remove from `sameAs` array |
| `src/pages/fr/index.astro` | ~53 | Remove from `sameAs` array |
| `src/components/SEOHead.astro` | ~84-86 | Remove `pin:media` and `pin:description` meta tags |

**Footer ARIA label fix** (per CLAUDE.md convention #8):
- Add i18n keys: `footer.instagramLabel` → "Follow us on Instagram" (EN) / "Suivez-nous sur Instagram" (FR)
- Replace hardcoded `aria-label="Instagram"` with `t(locale, "footer.instagramLabel")`

**Files for i18n updates:**
- `src/i18n/en.json` — Add `footer.instagramLabel`
- `src/i18n/fr.json` — Add `footer.instagramLabel`

### Phase 4: WordPress Redirect Coverage

Add 301 redirects for old WordPress about/contact URLs in `public/_redirects`:

```
/about-date-my-dish/ /en/about/ 301
/contact/ /en/contact/ 301
```

Note: `/contact/` may conflict with the Astro contact page at `/en/contact/` and `/fr/contact/`. Need to verify that Cloudflare Pages processes `_redirects` before Astro routes. Since the WordPress URL was `/contact/` (no locale prefix) and Astro uses `/en/contact/` and `/fr/contact/`, there should be no conflict.

## Technical Considerations

- **No new components needed** — all changes are content updates to existing files
- **No schema changes** — `pinterestImage` field stays in content schema (optional, deferred to 30+ recipes)
- **Dark mode** — all content stays within `.prose` class, dark mode styles apply automatically
- **Hreflang** — already handled by `getAlternateUrl()` route mapping, no changes needed
- **RecipeSchema** — author URL points to about page via dynamic locale-aware path, unaffected by content changes
- **Print** — about/contact pages already print correctly via existing print stylesheet
- **Instagram URL consistency** — standardize on `https://www.instagram.com/datemydishdotcom` (with `www.`) across all locations

## Acceptance Criteria

- [x] About page (EN) has enriched content: Montreal background, cooking philosophy, expanded "What You'll Find Here"
- [x] About page (FR) has Quebec French adaptation matching EN structure
- [x] Contact page (EN) shows Instagram only (`@datemydishdotcom`), no email, no Pinterest
- [x] Contact page (FR) matches EN structure in Quebec French
- [x] Footer shows Instagram icon only (no Pinterest), linking to `instagram.com/datemydishdotcom`
- [x] Footer ARIA label uses `t(locale, "footer.instagramLabel")` instead of hardcoded string
- [x] Homepage JSON-LD `sameAs` contains only Instagram URL (no Pinterest) on both EN and FR
- [x] `SEOHead.astro` no longer emits `pin:media` or `pin:description` meta tags
- [x] Meta descriptions updated on about (EN/FR) and contact (EN/FR) pages — under 160 chars each
- [x] `_redirects` includes `/about-date-my-dish/ /en/about/ 301`
- [x] All internal links in new content use locale-prefixed paths with trailing slashes
- [x] `npm run build` succeeds with no errors
- [x] `npm run check` passes TypeScript validation

## Dependencies & Risks

- **Low risk**: All changes are content/configuration — no new components, no schema changes
- **Pinterest Rich Pin meta removal**: Affects all pages (via SEOHead), but since there's no Pinterest content, this is a no-op in practice
- **Single contact channel**: Removing email leaves Instagram DMs as the only contact method. This is the user's explicit decision.

## File Change Summary

| File | Type of Change |
|------|---------------|
| `src/pages/en/about.astro` | Content enrichment + meta description |
| `src/pages/fr/a-propos.astro` | Content enrichment + meta description (QC French) |
| `src/pages/en/contact.astro` | Content rewrite + meta description |
| `src/pages/fr/contact.astro` | Content rewrite + meta description (QC French) |
| `src/components/Footer.astro` | Remove Pinterest, update Instagram, fix ARIA |
| `src/components/SEOHead.astro` | Remove Pinterest Rich Pin meta tags |
| `src/pages/en/index.astro` | Update JSON-LD `sameAs` |
| `src/pages/fr/index.astro` | Update JSON-LD `sameAs` |
| `src/i18n/en.json` | Add `footer.instagramLabel` |
| `src/i18n/fr.json` | Add `footer.instagramLabel` |
| `public/_redirects` | Add WordPress about/contact 301s |

## Sources

- WordPress about page: `https://datemydish.com/about-date-my-dish/`
- WordPress contact page: `https://datemydish.com/contact/`
- CLAUDE.md lesson #8: ARIA labels must be i18n'd
- `docs/solutions/ui-bugs/wcag-2-2-aa-accessibility-remediation.md` — ARIA label patterns
- `docs/solutions/performance-issues/seo-performance-accessibility-audit-and-implementation.md` — JSON-LD patterns
