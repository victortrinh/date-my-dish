---
title: "feat: Comprehensive SEO Improvement (Content Audit + Programmatic SEO + AI/GEO)"
type: feat
status: active
date: 2026-03-17
origin: docs/brainstorms/2026-03-17-comprehensive-seo-improvement-brainstorm.md
---

# feat: Comprehensive SEO Improvement

## Overview

A phased SEO strategy for Date My Dish covering content-level optimization of all existing pages, programmatic SEO pages to multiply indexable URLs, and AI/GEO optimization to get cited by ChatGPT, Perplexity, and Google AI Overviews. The site has excellent technical SEO infrastructure but near-zero organic rankings due to limited content volume and optimization depth.

## Problem Statement / Motivation

Date My Dish has 12 recipes + 6 articles generating ~90 human visits/month despite strong technical SEO (JSON-LD, sitemaps, Core Web Vitals, `llms.txt`, AI bot access). The gap between bot traffic (3.3k) and human traffic (90) shows crawlers are finding the site but users aren't. The bottleneck is content optimization depth and indexable page count, not technical infrastructure.

With 1-2 new recipes/week via the Notion auto-publish pipeline, the content base will grow steadily. This plan maximizes the SEO value of every page (existing and new) while building new programmatic pages where content density supports them.

## Proposed Solution

Five phases executed sequentially, with Phase 3 running alongside Phase 2:

- **Phase 0**: Create `.agents/product-marketing-context.md` (prerequisite for all SEO skills)
- **Phase 1**: Audit and optimize all 18 existing content pages (12 recipes + 6 articles)
- **Phase 2**: Build 7 programmatic SEO pages (4 occasion + 1 cuisine + 2 enriched categories)
- **Phase 3**: AI/GEO optimization (citation patterns, quick-answer blocks, `llms.txt` enrichment)
- **Phase 4**: Automation upgrades (GEO in auto-publish, reverse linking, GEO audit checks, AI citation monitoring)

## Technical Considerations

### Architecture
- All new pages follow existing EN/FR duplication pattern under `src/pages/en/` and `src/pages/fr/`
- Editorial content for occasion/category pages lives as hardcoded description objects in `.astro` templates (matches existing `occasionDescriptions` pattern in `[occasion].astro:45-52`)
- New cuisine directory requires new route files + `cuisineSlugMap` in `src/i18n/utils.ts`
- Quick-answer blocks: dual approach with a reusable `<QuickAnswer>` Astro component (from frontmatter `summary` field) + prose paragraph in MDX body

### Performance
- No runtime performance impact; all changes are static content and build-time generation
- New pages add to build time but Astro's static generation handles this efficiently
- Image optimization via existing `/optimize-image` workflow

### SEO-Specific
- Thin occasion pages (`celebration`, `quick-meal`) get noindexed via `<meta name="robots" content="noindex">`
- FR cuisine URL: `/fr/recettes/cuisine/` (same segment as EN since "cuisine" is identical in both languages)
- FR cross-links must always use localized category slugs (`souper` not `dinner`, `entree` not `appetizer`)
- All new JSON-LD must use absolute URLs for image fields and array format `[url]`

## System-Wide Impact

- **Interaction graph**: Phase 2 cuisine pages require updates to `src/i18n/utils.ts` (routeMap, cuisineSlugMap), which affects `getAlternateUrl()` used by all pages for hreflang
- **API surface parity**: New occasion/category editorial content must be mirrored in EN and FR simultaneously to maintain hreflang quality
- **State lifecycle risks**: The `seo-auto-optimize.yml` workflow modifies recipe content automatically. Phase 1 manual optimizations could conflict with auto-optimizations if both run in the same week. Coordinate by completing Phase 1 before the next Monday auto-optimize cycle.
- **Integration test scenarios**: After Phase 2, verify all new pages render in Playwright E2E (auto-discovered from `dist/`), pass Lighthouse CI, and appear in sitemap

---

## Implementation Phases

### Phase 0: Product Marketing Context (prerequisite)

Create `.agents/product-marketing-context.md` so the `seo-audit`, `programmatic-seo`, `ai-seo`, and `seo-geo` skills have brand context.

**Tasks:**
- [x] Create `.agents/product-marketing-context.md` pulling from `docs/brand-voice-guide.md`, the About page copy, and CLAUDE.md brand section
- [x] Include: brand positioning (date-night recipe blog), target audience, voice guidelines, competitive differentiation, content pillars

**Files:**
- `.agents/product-marketing-context.md` (new)

**Success criteria:** All four SEO skills detect and use the file without prompting for brand context.

---

### Phase 1: Content-Level SEO Audit & Fixes

Audit and optimize all 12 EN recipes, 6 EN articles, and their FR counterparts.

#### 1.1 Run Baseline Audit

- [ ] Run `/bulk-audit` to get a baseline scorecard before making changes
- [ ] Run `/seo-audit` on each of the 12 EN recipes individually to identify per-page gaps
- [ ] Run `/seo-audit` on each of the 6 EN articles individually
- [ ] Document findings in a checklist per recipe/article

#### 1.2 Frontmatter Optimization

- [ ] Review and enhance `keywords` arrays (target 7-10 long-tail keywords per recipe)
- [ ] Review and enhance `tags` arrays for tag page generation
- [ ] Optimize `description` fields to 150-160 chars with date-night angle CTAs
- [ ] Verify `heroImageAlt` is descriptive (~125 chars, includes dish name)
- [ ] Mirror all frontmatter changes to FR counterparts with Quebec French conventions

**Files (per recipe):**
- `src/content/recipes/en/{slug}.mdx` (frontmatter)
- `src/content/recipes/fr/{slug}.mdx` (frontmatter)

#### 1.3 Internal Cross-Linking

- [ ] Add 2-3 internal cross-links per recipe MDX body to related recipes/articles
- [ ] Add 1-2 internal cross-links per article to related recipes
- [ ] Use absolute paths with trailing slashes: `/en/recipes/{slug}/`, `/en/articles/{slug}/`
- [ ] FR cross-links must use localized slugs: `/fr/recettes/categorie/souper/` (not `dinner`)
- [x] Fix existing inconsistency in FR recipes using `/fr/recettes/categorie/dinner/` instead of `/fr/recettes/categorie/souper/`

#### 1.4 Image Audit

- [x] Audit each recipe for image count (target: 1 hero + 3-5 step images = 5-7 total)
- [x] Identify recipes below the target count (7 recipes need more step images: cauliflower-steak, crispy-vegan-calamari, pork-osso-buco, quinoa-crusted-salmon, brussels-sprouts-salad, gochujang-bucatini, lemon-posset-brulee)
- [ ] Run `/optimize-image` on any new images added
- [ ] Update frontmatter `instructionGroups.steps[].image` for new step images

#### 1.5 E-E-A-T: About Page Enhancement

- [x] Enhance `src/pages/en/about.astro` with specific credentials: years cooking, recipe testing methodology, Montreal food scene connection, date-night expertise origin story
- [ ] Add structured author schema data if not already present
- [x] Update `AuthorBioCard` component's `bioShort` i18n string with stronger credibility signals
- [x] Mirror changes to `src/pages/fr/a-propos.astro` with Quebec French
- [ ] Update `en.json` and `fr.json` i18n keys for any new bio strings

**Files:**
- `src/pages/en/about.astro`
- `src/pages/fr/a-propos.astro`
- `src/i18n/en.json` / `src/i18n/fr.json` (if bio strings change)

#### 1.6 Noindex Thin Occasion Pages

- [x] Add noindex meta tag to occasion pages with fewer than 3 recipes
- [x] Implement in `src/pages/en/recipes/occasion/[occasion].astro` with a recipe count check
- [x] Mirror in `src/pages/fr/recettes/occasion/[occasion].astro`
- [x] Currently affects: `celebration` (1 recipe) and `quick-meal` (1 recipe)

**Files:**
- `src/pages/en/recipes/occasion/[occasion].astro`
- `src/pages/fr/recettes/occasion/[occasion].astro`

#### Phase 1 Success Criteria
- [ ] `/bulk-audit` score improves from baseline
- [ ] All recipes have 7+ keywords and 4+ tags in frontmatter
- [ ] All descriptions are 150-160 chars with CTAs
- [ ] Each recipe has 2-3 internal cross-links
- [ ] About page has specific, verifiable E-E-A-T credentials
- [ ] `npm run check` passes (TypeScript + content schema)
- [ ] Playwright E2E passes

---

### Phase 2: Programmatic SEO Pages

Build new high-quality indexable pages where content density supports them (3+ recipes).

#### 2.1 Enrich Occasion Pages (4 pages)

Expand the existing `occasionDescriptions` object in `[occasion].astro` from 1-sentence descriptions to 2-3 paragraph editorial blocks for the 4 qualifying occasions.

- [ ] Write editorial content for `date-night` (9 recipes) - lead with brand positioning
- [ ] Write editorial content for `entertaining` (7 recipes) - focus on impress-factor
- [ ] Write editorial content for `weeknight` (5 recipes) - focus on speed + quality
- [ ] Write editorial content for `comfort` (3 recipes) - focus on cozy date nights
- [ ] Update template to render expanded descriptions with proper HTML structure (H2, paragraphs)
- [ ] Mirror all content to FR counterparts in `[occasion].astro` with Quebec French voice
- [ ] Add ItemList JSON-LD enhancements if not already complete

**Files:**
- `src/pages/en/recipes/occasion/[occasion].astro` (expand `occasionDescriptions`)
- `src/pages/fr/recettes/occasion/[occasion].astro` (expand FR `occasionDescriptions`)

#### 2.2 Enrich Category Pages (2 pages)

The `[category].astro` template currently has no editorial descriptions (unlike occasion pages). Add a `categoryDescriptions` object matching the occasion page pattern.

- [ ] Add `categoryDescriptions` object to `src/pages/en/recipes/category/[category].astro`
- [ ] Write editorial content for `dinner` (7 recipes)
- [ ] Write editorial content for `appetizer` (3 recipes)
- [ ] Mirror to `src/pages/fr/recettes/categorie/[category].astro` with localized category names
- [ ] Match the template structure from occasion pages (H2, paragraphs, proper semantic HTML)

**Files:**
- `src/pages/en/recipes/category/[category].astro`
- `src/pages/fr/recettes/categorie/[category].astro`

#### 2.3 Build Cuisine Directory (1 page: Italian)

No cuisine route exists. Create the full infrastructure.

- [ ] Add `cuisineSlugMap` to `src/i18n/utils.ts` (e.g., `italian` -> `italien` for FR)
- [ ] Add `cuisine` segment to `routeMap` in `src/i18n/utils.ts` (EN: `cuisine`, FR: `cuisine`)
- [ ] Add `getCuisineLocalizedPath(locale, cuisine)` helper to `src/i18n/utils.ts`
- [ ] Create `src/pages/en/recipes/cuisine/[cuisine].astro` following occasion page pattern
- [ ] Create `src/pages/fr/recettes/cuisine/[cuisine].astro` (FR counterpart)
- [ ] Write editorial content for Italian cuisine (4 recipes: cacio-e-pepe, penne-alla-vodka, pork-osso-buco, beef-ragu)
- [ ] Include ItemList JSON-LD schema
- [ ] Include hreflang via `getAlternateUrl()` (requires routeMap update first)
- [ ] Add cuisine page links to relevant recipe pages ("More Italian Recipes" link)
- [ ] Add i18n keys for cuisine labels to `en.json` / `fr.json`

**Files:**
- `src/i18n/utils.ts` (cuisineSlugMap, routeMap, getCuisineLocalizedPath)
- `src/i18n/en.json` / `src/i18n/fr.json` (cuisine label keys)
- `src/pages/en/recipes/cuisine/[cuisine].astro` (new)
- `src/pages/fr/recettes/cuisine/[cuisine].astro` (new)

#### 2.4 Hub-and-Spoke Internal Linking

- [ ] Add "More [occasion] recipes" links on individual recipe pages that link back to occasion landing pages
- [ ] Add "More [cuisine] recipes" links on Italian recipes linking to the cuisine directory
- [ ] Ensure bidirectional linking: landing pages -> recipes AND recipes -> landing pages

#### Phase 2 Success Criteria
- [ ] All 7 pSEO pages render correctly in both EN and FR
- [ ] hreflang alternates are correct (verify with `getAlternateUrl()`)
- [ ] All pages appear in sitemap
- [ ] ItemList JSON-LD validates on all listing pages
- [ ] Editorial content follows brand voice guide
- [ ] Playwright E2E passes (new pages auto-discovered from `dist/`)
- [ ] Lighthouse CI passes on new pages
- [ ] `npm run check` passes

---

### Phase 3: AI/GEO Optimization

Optimize content for citation by AI engines. Run alongside Phase 2.

#### 3.1 Quick-Answer Summary Blocks

Dual approach: Astro component for visual display + prose paragraph in MDX for AI extraction.

- [ ] Add optional `summary` field to recipe schema in `src/content.config.ts` (string, 40-60 words)
- [ ] Create `src/components/QuickAnswer.astro` component that renders from the `summary` field
- [ ] Add `<QuickAnswer>` to `RecipeLayout.astro` (rendered before the recipe card, after hero)
- [ ] Write 40-60 word summaries for all 12 EN recipes
- [ ] Add matching prose paragraph at top of each recipe MDX body (before first H2)
- [ ] Translate summaries and prose to FR with Quebec French voice
- [ ] Update `/new-recipe` command template to include `summary` field
- [ ] Update `/seo-audit` to check for `summary` field presence

**Files:**
- `src/content.config.ts` (add `summary` field)
- `src/components/QuickAnswer.astro` (new)
- `src/layouts/RecipeLayout.astro` (render QuickAnswer)
- All 24 recipe MDX files (add summary + prose)

#### 3.2 Citation Patterns in Prose

Add sourced claims and attributions to recipe prose for +40% AI citation visibility.

- [ ] Add 1-2 citations per recipe prose (food science sources, chef attributions, technique origins)
- [ ] Example patterns: "According to Marcella Hazan...", "Food scientists at [university] found that...", "This Roman technique dates to..."
- [ ] Add concrete statistics where natural: temperatures, timing benchmarks, nutrition comparisons
- [ ] Follow brand voice: citations should feel natural, not academic
- [ ] Mirror to FR counterparts

**Files:**
- All 24 recipe MDX files (prose body updates)

#### 3.3 FAQ Enhancement

- [ ] Rewrite FAQ answers to be self-contained (each answer makes sense without the question)
- [ ] Target 40-60 words per answer (optimal for AI snippet extraction)
- [ ] Include specific, quotable facts in answers (not vague generalizations)
- [ ] Mirror to FR counterparts

**Files:**
- All 24 recipe MDX files (frontmatter `faqs` arrays)
- All 12 article MDX files (frontmatter `faqs` arrays)

#### 3.4 Enrich `llms.txt`

- [ ] Add per-recipe structured summaries (1-2 sentences each)
- [ ] Group recipes by occasion and cuisine
- [ ] Add relationship data (related recipes within each group)
- [ ] Add metadata per recipe: cuisine, difficulty, prep time, category
- [ ] Include new pSEO pages (occasion, cuisine, category landing pages)
- [ ] Keep EN and FR sections clearly separated

**Files:**
- `src/pages/llms.txt.ts`

#### 3.5 AI Citation Monitoring (Exploration)

- [ ] Research pricing and capabilities of: Otterly, Peec AI, ZipTie, LLMrefs
- [ ] Run manual baseline check: search top 10 recipe names in ChatGPT and Perplexity before Phase 3 changes go live
- [ ] Document baseline results in `data/seo/ai-citation-baseline.md`
- [ ] Select and configure a monitoring tool if budget allows
- [ ] If no tool selected, establish a monthly manual check protocol per the `ai-seo` skill's DIY monitoring guide

**Files:**
- `data/seo/ai-citation-baseline.md` (new)

#### Phase 3 Success Criteria
- [ ] All 12 recipes have `summary` field populated
- [ ] `<QuickAnswer>` component renders on all recipe pages
- [ ] Each recipe has 1-2 sourced citations in prose
- [ ] FAQ answers are self-contained and 40-60 words
- [ ] `llms.txt` includes structured summaries and groupings
- [ ] AI citation baseline is documented
- [ ] `npm run check` passes
- [ ] `/bulk-audit` shows improvement from Phase 1 baseline

---

### Phase 4: Automation Improvements

Upgrade existing workflows so all future content automatically benefits from the SEO/GEO improvements built in Phases 1-3. This ensures the work compounds rather than requiring manual effort per recipe.

#### 4.1 Add GEO Signals to Auto-Publish Prompts

Update the Claude Code prompts in both auto-publish workflows to generate GEO-optimized content from day one.

- [ ] Update `auto-publish-recipe.yml` Claude prompt to:
  - Generate a `summary` field (40-60 words) in frontmatter
  - Add 1-2 sourced citations in prose (food science, chef attributions, technique origins)
  - Write FAQ answers as self-contained, 40-60 word passages
  - Add concrete statistics where natural (temperatures, timing benchmarks)
  - Add a "What is [recipe]?" prose paragraph before the first H2
- [ ] Update `auto-publish-article.yml` Claude prompt with same GEO patterns (citations, self-contained FAQs, statistics)
- [ ] Update `/new-recipe` skill template to include `summary` field and GEO guidelines
- [ ] Update `/new-article` skill template with GEO guidelines

**Files:**
- `.github/workflows/auto-publish-recipe.yml` (Claude prompt section)
- `.github/workflows/auto-publish-article.yml` (Claude prompt section)

#### 4.2 Reverse Internal Linking on New Content Merge

Create a new workflow that, when a new recipe merges to main, automatically adds cross-links from 2-3 related existing recipes back to the new one.

- [ ] Create `.github/workflows/reverse-internal-linking.yml`
- [ ] Trigger: push to main touching `src/content/recipes/en/**/*.mdx` (new files only)
- [ ] Claude Code identifies 2-3 related existing recipes (by cuisine, category, occasion, or tags)
- [ ] Adds a natural cross-link in each related recipe's prose (both EN and FR)
- [ ] Caps at 2-3 reverse links per new recipe to avoid over-linking
- [ ] Opens a PR labeled `seo-reverse-links`
- [ ] Runs `npm run check` before PR creation

**Files:**
- `.github/workflows/reverse-internal-linking.yml` (new)

#### 4.3 Add GEO Checks to Weekly SEO Audit

Expand the `weekly-seo-audit.yml` Claude prompt to audit GEO signals alongside the existing Lighthouse and content quality checks.

- [ ] Add checks for `summary` field presence in recipe frontmatter
- [ ] Add checks for citation patterns in prose (at least 1 sourced claim per recipe)
- [ ] Add checks for FAQ answer length (target 40-60 words, flag if < 30 or > 80)
- [ ] Add checks for concrete statistics presence in prose
- [ ] Add check that `llms.txt` includes all published recipes with summaries
- [ ] Include GEO score in the audit report alongside existing Lighthouse scores

**Files:**
- `.github/workflows/weekly-seo-audit.yml` (Claude prompt section)

#### 4.4 AI Citation Monitoring Script

Create a script that checks whether recipes are being cited by AI engines, runnable manually or on a schedule.

- [ ] Create `scripts/seo/check-ai-citations.mjs`
- [ ] Query Perplexity API (or web search) for top 10 recipe names + "date night" variants
- [ ] Record which AI engines mention/cite datemydish.com
- [ ] Output results to `data/seo/ai-citations-YYYY-MM-DD.json`
- [ ] Optionally create a recurring workflow (monthly) once the baseline is established
- [ ] Add results to the weekly SEO report if data exists

**Files:**
- `scripts/seo/check-ai-citations.mjs` (new)
- `data/seo/ai-citations-*.json` (new, generated)
- Optionally: `.github/workflows/monthly-ai-citation-check.yml` (new)

#### 4.5 Enhanced `llms.txt` (Auto-Enriched at Build Time)

Since `llms.txt.ts` already auto-generates from collections at build time, enrich it to include structured metadata. This is a code change (Phase 3.4), not a workflow change, but it means every new recipe automatically appears with full metadata in `llms.txt`.

- [ ] Ensure `llms.txt.ts` reads `summary`, `recipeCuisine`, `difficulty`, `occasion`, `recipeCategory` from frontmatter
- [ ] Group output by occasion and cuisine
- [ ] Include pSEO landing page URLs (occasion, cuisine, category pages)
- [ ] Verify new recipes appear correctly after auto-publish merge

**Files:**
- `src/pages/llms.txt.ts` (already listed in Phase 3.4)

#### Phase 4 Success Criteria
- [ ] New recipe published via auto-publish includes `summary`, citations, and self-contained FAQs
- [ ] Merging a new recipe triggers reverse linking PR within 10 minutes
- [ ] Weekly SEO audit reports include GEO signal scores
- [ ] AI citation monitoring script runs successfully and outputs data
- [ ] `llms.txt` includes metadata for all recipes automatically

---

## Acceptance Criteria

### Functional Requirements
- [ ] All existing 12 recipes and 6 articles have optimized frontmatter (keywords, tags, descriptions)
- [ ] 4 occasion pages have rich editorial content (EN + FR)
- [ ] 2 category pages have editorial descriptions (EN + FR)
- [ ] 1 cuisine directory page (Italian) exists and renders (EN + FR)
- [ ] Thin occasion pages (celebration, quick-meal) are noindexed
- [ ] About page has specific E-E-A-T credentials
- [ ] Quick-answer blocks appear on all recipe pages
- [ ] `llms.txt` includes structured summaries
- [ ] AI citation baseline is documented
- [ ] Auto-publish generates GEO-optimized content
- [ ] Reverse internal linking workflow is active
- [ ] Weekly audit includes GEO signal checks

### Non-Functional Requirements
- [ ] All pages pass Lighthouse CI thresholds
- [ ] All new pages pass Playwright E2E (4 projects: desktop/mobile x light/dark)
- [ ] `npm run check` passes (TypeScript + content schema)
- [ ] No WCAG 2.2 AA regressions (focus outlines, contrast, aria labels)
- [ ] Build time does not increase by more than 30%

### Quality Gates
- [ ] `/bulk-audit` scorecard shows measurable improvement
- [ ] `/validate-recipes` passes (EN/FR pairs, images, cross-links)
- [ ] hreflang is bidirectional on all new pages
- [ ] JSON-LD validates via Rich Results Test on new page types

## Dependencies & Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Phase 1 conflicts with `seo-auto-optimize.yml` | Medium | Complete Phase 1 before Monday auto-optimize cycle; or temporarily disable the workflow |
| Image gaps in recipes | High (long lead time) | Audit images first in Phase 1; identify gaps early |
| Cuisine directory hreflang breaks | Medium | Update `routeMap` in `utils.ts` before creating page files |
| FR editorial content quality | Medium | Write EN first, translate with `/translate-recipe` conventions |
| `summary` field schema change breaks auto-publish | Low | Field is optional; update `auto-publish-recipe.yml` prompt to include it |

## Sources & References

### Origin
- **Brainstorm document:** [docs/brainstorms/2026-03-17-comprehensive-seo-improvement-brainstorm.md](docs/brainstorms/2026-03-17-comprehensive-seo-improvement-brainstorm.md)
- Key decisions: conservative 3+ recipe threshold, hardcoded editorial content in .astro templates, noindex thin pages, `/fr/recettes/cuisine/` URL segment, dual quick-answer approach (component + prose)

### Internal References
- Occasion page template: `src/pages/en/recipes/occasion/[occasion].astro:45-52` (occasionDescriptions pattern)
- Category page template: `src/pages/en/recipes/category/[category].astro` (no editorial descriptions yet)
- Recipe JSON-LD: `src/components/RecipeSchema.astro`
- llms.txt generator: `src/pages/llms.txt.ts`
- i18n routing: `src/i18n/utils.ts` (routeMap, slugMaps)
- Brand voice: `docs/brand-voice-guide.md`
- SEO report: `data/seo/report.md`
- Past SEO audit: `docs/solutions/performance-issues/seo-performance-accessibility-audit-and-implementation.md`
- GSC structured data fix: `docs/solutions/integration-issues/gsc-recipe-structured-data-schema-compliance.md`
- Growth learnings: `docs/solutions/GROWTH_AND_SEO_LEARNINGS.md`

### Skills
- `seo-audit` — page-level auditing (Phase 1)
- `programmatic-seo` — pSEO page patterns (Phase 2)
- `ai-seo` — GEO optimization techniques (Phase 3)
- `seo-geo` — combined SEO + GEO workflow (Phase 3)
