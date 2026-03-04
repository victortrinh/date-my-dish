---
title: "feat: Add Pinterest profile link throughout site"
type: feat
status: completed
date: 2026-03-04
origin: docs/brainstorms/2026-03-04-pinterest-profile-link-brainstorm.md
---

# feat: Add Pinterest profile link throughout site

Add the Pinterest profile link (`https://www.pinterest.com/datemydish`) to the footer, contact pages, and homepage JSON-LD schema — matching the existing Instagram pattern exactly.

## Acceptance Criteria

- [x] Pinterest icon appears next to Instagram in footer on all pages
- [x] Pinterest mentioned on EN + FR contact pages
- [x] Pinterest URL added to `sameAs` in Organization JSON-LD on both homepages
- [x] i18n keys added for `footer.pinterestLabel` in EN + FR
- [x] All links use `target="_blank" rel="noopener noreferrer"`
- [x] Accessible: aria-label via `t(locale, key)`, inherits existing focus styles

## MVP

### 1. `src/i18n/en.json` — Add translation key

```json
"pinterestLabel": "Follow us on Pinterest"
```

Add inside the `footer` object, after `instagramLabel`.

### 2. `src/i18n/fr.json` — Add translation key

```json
"pinterestLabel": "Suivez-nous sur Pinterest"
```

Add inside the `footer` object, after `instagramLabel`.

### 3. `src/components/Footer.astro` — Add Pinterest icon link

Add a second `<a>` inside the `<div class="mt-4 flex gap-3">` container, after the Instagram link. Same classes, same pattern. Reuse the Pinterest SVG path from `SocialShareButtons.astro`:

```html
<a href="https://www.pinterest.com/datemydish" target="_blank" rel="noopener noreferrer" class="rounded-lg p-2 text-gray-500 no-underline transition-colors hover:bg-gray-100 hover:text-brand-primary dark:text-neutral-400 dark:hover:bg-neutral-800" aria-label={t(locale, "footer.pinterestLabel")}>
  <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 0C5.373 0 0 5.373 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738a.36.36 0 01.083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.632-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0z"/>
  </svg>
</a>
```

### 4. `src/pages/en/contact.astro` — Add Pinterest mention

After the Instagram link (line ~41), add:

```html
<p>You can also find us on <a href="https://www.pinterest.com/datemydish" target="_blank" rel="noopener noreferrer">Pinterest — @datemydish</a> for recipe inspiration and boards.</p>
```

### 5. `src/pages/fr/contact.astro` — Add Pinterest mention

After the Instagram link (line ~43), add:

```html
<p>Vous pouvez aussi nous retrouver sur <a href="https://www.pinterest.com/datemydish" target="_blank" rel="noopener noreferrer">Pinterest — @datemydish</a> pour de l'inspiration et des tableaux de recettes.</p>
```

### 6. `src/pages/en/index.astro` — Add to sameAs

```javascript
sameAs: [
  "https://www.instagram.com/datemydishdotcom",
  "https://www.pinterest.com/datemydish",
],
```

### 7. `src/pages/fr/index.astro` — Same change as EN

```javascript
sameAs: [
  "https://www.instagram.com/datemydishdotcom",
  "https://www.pinterest.com/datemydish",
],
```

## Context

- Pinterest SVG already exists in `SocialShareButtons.astro` (lines 25-27) — reuse the path data
- Footer container already has `gap-3` so spacing is automatic
- Focus styles inherited from global CSS (terracotta light, gold dark)
- No centralized social config needed — only 2 platforms (see brainstorm: YAGNI decision)
- ARIA labels must use `t(locale, key)` per CLAUDE.md accessibility rules

## Sources

- **Origin brainstorm:** [docs/brainstorms/2026-03-04-pinterest-profile-link-brainstorm.md](docs/brainstorms/2026-03-04-pinterest-profile-link-brainstorm.md)
- Existing pattern: `src/components/Footer.astro:46-53` (Instagram link)
- Pinterest SVG source: `src/components/SocialShareButtons.astro:25-27`
- Accessibility learnings: `docs/solutions/ui-bugs/wcag-2-2-aa-accessibility-remediation.md`
