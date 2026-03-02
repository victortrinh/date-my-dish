---
title: "feat: Mobile Performance Improvements"
type: feat
status: completed
date: 2026-03-02
origin: docs/brainstorms/2026-03-02-mobile-performance-improvements-brainstorm.md
---

# feat: Mobile Performance Improvements

## Overview

Three targeted, independent improvements to mobile LCP (Largest Contentful Paint) performance, prompted by a Google Search Console AMP review. AMP was rejected as unnecessary (see brainstorm). Instead, we address concrete gaps: missing `fetchpriority` on hero images, desktop-only Lighthouse CI, and a font loading round-trip.

## Problem Statement / Motivation

1. **Hero images lack `fetchpriority="high"`** — The browser treats hero images with the same priority as other eager resources, delaying LCP by an estimated 100-500ms on mobile.
2. **Lighthouse CI is desktop-only** — Mobile performance regressions (CPU throttling, slow 4G) are invisible in PR checks. Only Playwright smoke tests cover mobile, and they don't measure performance metrics.
3. **Google Fonts has an extra round-trip** — The browser must fetch the Google Fonts CSS to discover font file URLs before downloading them. Preloading the CSS eliminates this discovery step (~100-300ms on mobile).

## Proposed Solution

### Phase 1: Add `fetchpriority="high"` to Hero Images

Add `fetchpriority="high"` to all 6 hero `<Picture>` components:

| File | Line |
|------|------|
| `src/pages/en/index.astro` | ~75 |
| `src/pages/fr/index.astro` | ~75 |
| `src/pages/en/recipes/[...slug].astro` | ~95 |
| `src/pages/fr/recettes/[...slug].astro` | ~95 |
| `src/pages/en/articles/[...slug].astro` | ~77 |
| `src/pages/fr/articles/[...slug].astro` | ~77 |

**Verification step**: After adding the attribute, run `npm run build` and grep `dist/` for `fetchpriority` to confirm Astro's `<Picture>` component passes it through to the rendered `<img>` tag. If Astro strips it, fall back to a raw `<img>` with `getImage()`.

```bash
npm run build && grep -r 'fetchpriority' dist/ | head -5
```

### Phase 2: Preload Google Fonts CSS

In `src/layouts/BaseLayout.astro` (line ~50), add a preload hint **before** the existing stylesheet link:

```html
<!-- Existing -->
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />

<!-- NEW: Preload the CSS to eliminate discovery round-trip -->
<link rel="preload" href="https://fonts.googleapis.com/css2?family=Bitter:wght@400;500;600;700&family=Caveat:wght@400;700&family=Fira+Sans:wght@600;700&display=swap" as="style" />

<!-- Existing stylesheet (unchanged) -->
<link href="https://fonts.googleapis.com/css2?family=Bitter:wght@400;500;600;700&family=Caveat:wght@400;700&family=Fira+Sans:wght@600;700&display=swap" rel="stylesheet" />
```

**Key decisions** (see brainstorm: `docs/brainstorms/2026-03-02-mobile-performance-improvements-brainstorm.md`):
- **Option A chosen** (preload CSS) over Option B (self-host fonts) — simpler, no maintenance burden, stable URL
- **No `crossorigin`** on the preload `<link>` — the existing `<link rel="stylesheet">` does not have `crossorigin`, and mismatching CORS modes would cause a double download, making performance worse
- **Keep existing `preconnect`** — still useful for the `fonts.gstatic.com` connection (font files), and removing it is a regression risk if the preload is ever reverted

### Phase 3: Add Mobile Lighthouse CI Gates

**Architecture**: Two separate LHCI steps in the workflow (desktop + mobile), using separate config files. The URL generation script (`scripts/generate-lighthouse-urls.cjs`) is unchanged — only the Lighthouse settings differ.

#### 3a. Create `.lighthouserc-mobile.cjs`

New file based on `.lighthouserc.cjs` with these differences:

```javascript
settings: {
  chromeFlags: '--no-sandbox --disable-dev-shm-usage',
  // No preset = Lighthouse mobile default (4x CPU throttle, simulated slow 4G)
},
assert: {
  assertions: {
    'categories:seo': ['warn', { minScore: 0.9 }],
    'categories:accessibility': ['warn', { minScore: 0.9 }],
    'categories:performance': ['warn', { minScore: 0.8 }],   // Lower than desktop (0.9)
    'categories:best-practices': ['warn', { minScore: 0.8 }], // Lower than desktop (0.9)
    'cumulative-layout-shift': ['warn', { maxNumericValue: 0.1, aggregationMethod: 'median' }],
  },
},
```

**Threshold rationale**: Mobile scores are inherently lower due to CPU/network throttling. Starting at 0.8 for performance avoids perpetual noise warnings. All assertions are `warn` (not `error`) initially per brainstorm decision.

#### 3b. Create `.lighthouserc-mobile-full.cjs`

Weekly audit mobile variant — same relaxed thresholds as `.lighthouserc-full.cjs` but without the `preset: 'desktop'`:

```javascript
settings: {
  chromeFlags: '--no-sandbox --disable-dev-shm-usage',
  // No preset = mobile default
},
assert: {
  assertions: {
    'categories:seo': ['warn', { minScore: 0.9 }],
    'categories:accessibility': ['warn', { minScore: 0.9 }],
    'categories:performance': ['warn', { minScore: 0.75 }],     // Relaxed for weekly
    'categories:best-practices': ['warn', { minScore: 0.75 }],
    'is-crawlable': 'off',
    'uses-long-cache-ttl': 'off',
    'redirects-http': 'off',
    'csp-xss': 'off',
  },
},
```

#### 3c. Update `.github/workflows/lighthouse-pr-check.yml`

Add a second LHCI run step after the existing desktop run:

```yaml
- name: Run Lighthouse CI (Mobile)
  if: steps.urls.outputs.url_count > 0
  uses: treosh/lighthouse-ci-action@v12
  with:
    configPath: ./.lighthouserc-mobile.cjs
  env:
    LHCI_GITHUB_APP_TOKEN: ${{ secrets.LHCI_GITHUB_APP_TOKEN }}
```

Update the PR comment step to render **two tables** with "Desktop" and "Mobile" headers. Each table follows the existing format (`URL | Perf | A11y | Best Practices | SEO | Report`).

#### 3d. Update `.github/workflows/weekly-seo-audit.yml`

Add a second LHCI step using `.lighthouserc-mobile-full.cjs`. Increase workflow timeout from 45 to 60 minutes to accommodate doubled Lighthouse runs.

## Technical Considerations

### Bandwidth Contention
Font CSS preloading and hero image `fetchpriority` both compete for early bandwidth. On slow mobile connections, this could be net-neutral if font files and hero image download concurrently. However:
- The font CSS is tiny (~1-2KB) — it adds negligible bandwidth pressure
- `fetchpriority="high"` gives the hero image explicit priority over other fetches
- Net effect should be positive: faster font discovery + prioritized hero image

### CI Time Impact
Adding mobile Lighthouse doubles the audit time per URL. For PR checks (typically 2-6 changed URLs), this adds ~30-60 seconds. For weekly full audits (40+ URLs), this could add 10-15 minutes. Mitigations:
- Increase weekly workflow timeout to 60 minutes
- PR timeout is already sufficient (15 min) for the small URL sets

### Astro `<Picture>` Pass-through
Astro's `<Picture>` component should forward standard HTML attributes like `fetchpriority` to the rendered `<img>`. This must be verified after build (Phase 1 verification step).

## Acceptance Criteria

- [x] All 6 hero `<Picture>` components have `fetchpriority="high"`
- [x] Built HTML in `dist/` contains `fetchpriority="high"` on hero `<img>` tags
- [x] `BaseLayout.astro` has `<link rel="preload" as="style">` for Google Fonts CSS (no `crossorigin`)
- [ ] No duplicate Google Fonts CSS requests in browser DevTools Network tab
- [x] `.lighthouserc-mobile.cjs` exists with mobile-appropriate thresholds (perf: 0.8, all `warn`)
- [x] `.lighthouserc-mobile-full.cjs` exists for weekly audits
- [x] `lighthouse-pr-check.yml` runs both desktop and mobile LHCI steps
- [x] PR comment shows separate Desktop and Mobile score tables
- [x] `weekly-seo-audit.yml` runs both desktop and mobile audits with increased timeout
- [x] `npm run build` succeeds with no errors
- [x] `npm run check` passes
- [ ] Existing Playwright tests pass (no regressions)

## Success Metrics

- **LCP improvement**: Measurable via Lighthouse mobile audit (baseline established after Phase 3)
- **No regressions**: Desktop Lighthouse scores remain stable
- **Mobile visibility**: PR comments show mobile scores for every content change

## Dependencies & Risks

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| Astro strips `fetchpriority` | Low | Verify in built output; fall back to raw `<img>` if needed |
| Font preload causes double download | Low | Match CORS mode (no `crossorigin` on preload) |
| Mobile Lighthouse scores are very low | Medium | All assertions are `warn` initially — no PR blocking |
| CI timeout exceeded (weekly audit) | Medium | Increase timeout to 60 minutes |
| Bandwidth contention on slow mobile | Low | Font CSS is tiny (~1-2KB); `fetchpriority` wins priority contest |

## Implementation Order

1. **Phase 1** (fetchpriority) — lowest risk, most straightforward, immediate LCP benefit
2. **Phase 2** (font preload) — medium risk, needs double-download verification
3. **Phase 3** (mobile Lighthouse CI) — largest scope, benefits from having Phase 1-2 already in place for better baseline scores

Each phase is independent and can be shipped separately.

## Not Doing (YAGNI)

Per brainstorm decision:
- AMP pages — no ranking benefit since 2021
- Service Worker / offline caching — premature for current traffic
- Real User Monitoring (RUM) — revisit when traffic justifies it
- Critical CSS extraction — Astro + Tailwind already minimal
- Self-hosted fonts — maintenance burden not justified by marginal gain over CSS preload

## Sources & References

### Origin

- **Brainstorm document:** [docs/brainstorms/2026-03-02-mobile-performance-improvements-brainstorm.md](docs/brainstorms/2026-03-02-mobile-performance-improvements-brainstorm.md) — Key decisions: skip AMP, `warn` for mobile assertions, preload CSS (not self-host)

### Internal References

- Hero image pattern: `src/pages/en/recipes/[...slug].astro:95`
- Font loading: `src/layouts/BaseLayout.astro:48-50`
- Lighthouse PR config: `.lighthouserc.cjs`
- Lighthouse weekly config: `.lighthouserc-full.cjs`
- PR workflow: `.github/workflows/lighthouse-pr-check.yml`
- Weekly workflow: `.github/workflows/weekly-seo-audit.yml`
- URL generation: `scripts/generate-lighthouse-urls.cjs`
- Image optimization lessons: `docs/solutions/performance-issues/oversized-hero-images-optimization.md`
- Font loading lessons: `docs/solutions/ui-bugs/typography-system-font-swap-gotchas.md`
- Performance audit lessons: `docs/solutions/performance-issues/seo-performance-accessibility-audit-and-implementation.md`
