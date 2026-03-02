# Mobile Performance Improvements

**Date**: 2026-03-02
**Status**: Brainstorm
**Trigger**: Google Search Console AMP notice prompted a review of mobile performance

## Context

Google Search Console showed "We did not find any Accelerated Mobile Pages in your site." Investigation confirmed AMP is not worth implementing — Google removed AMP as a ranking signal in June 2021, and the Astro static site already delivers what AMP was designed to solve. Instead, we identified three concrete mobile performance gaps.

## What We're Building

Three targeted improvements to mobile performance, ordered by expected LCP impact:

### 1. Add `fetchpriority="high"` to Hero Images

**Problem**: Hero images have `loading="eager"` but lack `fetchpriority="high"`. Without it, the browser treats the hero image with the same priority as other resources, delaying LCP.

**Solution**: Add `fetchpriority="high"` to all hero `<Picture>` components:
- `src/pages/en/recipes/[...slug].astro`
- `src/pages/fr/recettes/[...slug].astro`
- `src/pages/en/articles/[...slug].astro`
- `src/pages/fr/articles/[...slug].astro`
- `src/pages/en/index.astro`
- `src/pages/fr/index.astro`

**Expected impact**: 100-500ms LCP improvement on mobile.

### 2. Add Mobile Lighthouse CI Gates

**Problem**: `.lighthouserc.cjs` uses `preset: 'desktop'` only. Mobile performance (CPU throttling, simulated 4G) is never tested in PRs. Issues like large hero images or render-blocking resources may pass desktop checks but fail on mobile.

**Solution**: Add a second Lighthouse collect configuration with mobile settings alongside the existing desktop run. Mobile uses Lighthouse's default throttling (4x CPU slowdown, simulated slow 4G).

**Key decision**: Mobile assertions should use `warn` (not `error`) initially to avoid blocking PRs while we establish baselines. Promote to `error` once scores stabilize.

### 3. Preload Critical Font Files

**Problem**: Current font loading chain: preconnect -> fetch Google Fonts CSS -> discover font file URLs -> fetch fonts. The discovery step adds an extra round-trip (~100-300ms on mobile).

**Solution**: Add `<link rel="preload" as="font">` for the primary body font (Bitter 400) and heading font (Fira Sans 600). This eliminates the CSS discovery step for the most critical fonts.

**Caveat**: Google Fonts URLs contain hashes that change when Google updates font files. Two options:
- **Option A**: Preload the Google Fonts CSS file itself (`rel="preload" as="style"`) — stable URL, smaller win
- **Option B**: Self-host critical fonts — full control over URLs, best performance, but requires manual updates

## Why This Approach

- **No AMP**: AMP provides zero ranking benefit since 2021, requires maintaining restricted page variants, and has no Astro integration. Our static site already outperforms AMP.
- **Incremental**: Each improvement is independent, low-risk, and can be shipped separately.
- **Measurable**: All three directly affect Core Web Vitals (LCP primarily), measurable via Lighthouse and Google Search Console.

## Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| AMP implementation | Skip | No ranking benefit, high maintenance cost |
| Mobile Lighthouse severity | `warn` initially | Establish baselines before blocking PRs |
| Font preloading strategy | TBD in planning | Option A (preload CSS) vs Option B (self-host) |

## Open Questions

None — all questions resolved during brainstorming.

## Not Doing (YAGNI)

- AMP pages
- Service Worker / offline caching
- Real User Monitoring (RUM) — revisit when traffic justifies it
- Critical CSS extraction — Astro + Tailwind already produces minimal CSS
