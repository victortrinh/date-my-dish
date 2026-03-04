# Add Pinterest Profile Link Throughout App

**Date:** 2026-03-04
**Status:** Ready for planning

## What We're Building

Add the Pinterest profile link (`https://pinterest.com/datemydish`) to the site now that automated Pinterest posting is active. Currently only Instagram has a profile link; Pinterest needs the same treatment.

## Where It Goes

### 1. Footer (`Footer.astro`)
- Add Pinterest icon next to the existing Instagram icon
- Same styling pattern: inline SVG, hover effects, translated aria-label
- Pinterest URL: `https://pinterest.com/datemydish`

### 2. Contact Pages (`/en/contact.astro`, `/fr/contact.astro`)
- Add Pinterest as a contact/follow channel alongside Instagram DMs
- Keep Instagram as primary contact method; Pinterest is a "follow us" addition

### 3. Homepage JSON-LD Schema (`/en/index.astro`, `/fr/index.astro`)
- Add Pinterest URL to the `sameAs` array in Organization structured data
- Currently only Instagram is listed

## Key Decisions

- **Pinterest username:** `datemydish`
- **Icon placement:** Next to Instagram in footer (not separated)
- **No centralized social config needed** -- only 2 platforms, hardcoded is fine (YAGNI)
- **Same i18n pattern** as Instagram: add `footer.pinterestLabel` translation keys

## Changes Required

| File | Change |
|------|--------|
| `src/components/Footer.astro` | Add Pinterest SVG icon + link next to Instagram |
| `src/i18n/en.json` | Add `footer.pinterestLabel` key |
| `src/i18n/fr.json` | Add `footer.pinterestLabel` key |
| `src/pages/en/contact.astro` | Add Pinterest mention |
| `src/pages/fr/contact.astro` | Add Pinterest mention |
| `src/pages/en/index.astro` | Add Pinterest to `sameAs` in JSON-LD |
| `src/pages/fr/index.astro` | Add Pinterest to `sameAs` in JSON-LD |

## Open Questions

None -- scope is well-defined.
