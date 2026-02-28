# Lighthouse CI Optimization Brainstorm

**Date**: 2026-02-27
**Status**: Brainstorm complete

## What We're Building

Optimize the Lighthouse CI pipeline so PR checks only audit pages affected by the PR (new/changed recipes or articles + their translation pairs), instead of auditing all 26+ pages on every PR. The weekly full-site audit continues to catch regressions across the entire site.

## Why This Approach

- PR Lighthouse currently audits **26 URLs on every PR** regardless of what changed — wasteful and slow
- The URL count grows linearly with each new recipe/article, making it progressively worse
- The weekly audit (`weekly-seo-audit.yml`) already exists and covers the full site every Sunday
- Splitting concerns: PRs validate the content being shipped, weekly audits catch regressions

## Key Decisions

### 1. PR trigger scope: Content-only
- Lighthouse PR check **only runs when content files change** (`src/content/recipes/**`, `src/content/articles/**`)
- Non-content PRs (components, layouts, CSS, config) **skip Lighthouse entirely** — regressions caught by weekly audit
- Uses `paths:` filter on the workflow trigger

### 2. Page selection: Changed files + translation pairs
- Detect changed/added MDX files via `git diff` against base branch
- Resolve each to its URL (recipe or article, EN or FR)
- Also include the translation pair (via `translationSlug` in frontmatter)
- Also include static pages directly affected (e.g., homepage, listing pages) — or skip these for speed

### 3. Implementation: Node script (Approach B)
- Refactor `scripts/generate-lighthouse-urls.cjs` to support two modes:
  - `--mode=all` — generates all URLs (used by weekly audit, same as today)
  - `--mode=changed --base=origin/main` — generates only changed URLs + translation pairs (used by PR check)
- Consolidates the **duplicated URL discovery logic** between `.lighthouserc.cjs` (inline, missing articles) and `generate-lighthouse-urls.cjs`
- Both `.lighthouserc.cjs` and `.lighthouserc-full.cjs` read from the generated JSON file

### 4. PR config also gets articles
- Fix the existing gap: `.lighthouserc.cjs` never included article pages
- With the new approach, this happens naturally — any changed article MDX gets resolved to its URL

### 5. Weekly audit unchanged
- `weekly-seo-audit.yml` continues to audit all pages every Sunday
- Still uses `--mode=all` to generate the full URL list
- Still triggers Claude Code analysis and auto-fix PRs

## Resolved Questions

- **Non-content PRs**: Skip Lighthouse entirely (caught by weekly audit)
- **Translation pairs**: Always audit both the changed file and its translation pair

## Open Questions

None — design is clear enough to proceed to planning.

## Scope Summary

### Files to modify
- `scripts/generate-lighthouse-urls.cjs` — add `--mode=changed` support with translation pair resolution
- `.lighthouserc.cjs` — read from generated JSON instead of inline URL discovery
- `.github/workflows/lighthouse-pr-check.yml` — add `paths:` filter, add URL generation step, handle "no URLs" case

### Files unchanged
- `.lighthouserc-full.cjs` — already reads from generated JSON
- `.github/workflows/weekly-seo-audit.yml` — already works, just ensure it passes `--mode=all`
