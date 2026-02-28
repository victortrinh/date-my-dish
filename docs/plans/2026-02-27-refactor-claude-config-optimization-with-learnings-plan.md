---
title: "Optimize Claude Configuration with Accumulated Learnings"
type: refactor
status: completed
date: 2026-02-27
origin: docs/brainstorms/2026-02-24-claude-md-comprehensive-update-brainstorm.md
---

# Optimize Claude Configuration with Accumulated Learnings

## Overview

Update CLAUDE.md, all 8 `.claude/commands/*.md` files, and create 2 new article commands to reflect the project's current state. The project has evolved significantly since these files were written -- articles content type, Notion auto-publishing, SEO automation, social media posting, and Playwright testing all exist but are undocumented. Two commands also have an active bug (step images shown as URL strings instead of `image()` imports).

## Problem Statement / Motivation

Every Claude session starts cold. The CLAUDE.md and command files are the sole source of truth for how to work in this codebase. When they're outdated or wrong:

1. **Active bugs**: `/new-recipe` and `/optimize-image` output URL strings for step images, but the schema uses `image()` imports. Scaffolded recipes fail validation.
2. **Invisible content type**: Articles (4 EN/FR pairs, own schema, layout, components, routes) are completely absent from CLAUDE.md. Any refactor or feature could break articles unknowingly.
3. **Undocumented automation**: 11 GitHub Actions workflows (Notion publishing, SEO tracking, social posting, Playwright, Lighthouse) exist but aren't mentioned. Someone could delete `data/seo/` or `notion/published.json` thinking they're unused.
4. **Validation blind spots**: `/validate-recipes`, `/seo-audit`, and `/bulk-audit` only cover recipes. Articles have zero validation tooling.
5. **Missing routes**: Articles, privacy-policy, and terms-of-service routes aren't in the i18n mapping table.

## Proposed Solution

Three phases: fix bugs, update CLAUDE.md, update/create commands.

---

## Phase 1: Fix Active Bugs in Commands

### 1.1 Fix `/new-recipe` step image schema

**File**: `.claude/commands/new-recipe.md`

**Line 69** -- Change URL string to `image()` import path:
```yaml
# Before (WRONG):
image: "/images/recipes/{slug}-step-1.jpg"  # Optional: URL for step photo

# After (CORRECT):
image: "../../../assets/images/recipes/{slug}-step-1.jpg"  # Optional: step photo (Astro image() import)
```

**Lines 100-102** -- Fix the explanatory text:
```markdown
# Before (WRONG):
Step images are URL strings (not Astro `image()` imports). They appear in:

# After (CORRECT):
Step images use Astro `image()` imports (relative paths from the MDX file). They appear in:
```

### 1.2 Fix `/optimize-image` step image frontmatter output

**File**: `.claude/commands/optimize-image.md`

**Line 59** -- Change URL string to relative import path:
```yaml
# Before (WRONG):
image: "/images/recipes/{recipe-slug}-step-1.jpg"

# After (CORRECT):
image: "../../../assets/images/recipes/{recipe-slug}-step-1.jpg"
```

---

## Phase 2: Update CLAUDE.md

### 2.1 Add Article Content Type Documentation

Add a new section **"Article Schema Quick-Reference"** after the existing Recipe schema section.

**Required fields:**

| Field | Type | Constraint |
|-------|------|------------|
| `title` | string | Article title |
| `lang` | enum | `"en"` or `"fr"` |
| `translationSlug` | string | Slug of the paired translation |
| `description` | string | Max 160 chars (SEO meta) |
| `publishDate` | date | YYYY-MM-DD (coerced) |
| `heroImage` | image() | Relative import path |
| `heroImageAlt` | string | Descriptive, ~125 chars |
| `keywords` | string[] | SEO keywords |
| `articleCategory` | enum | See values below |
| `faqs` | array | Min 1. `{ question, answer }` |

**Optional fields:**

| Field | Type | Notes |
|-------|------|-------|
| `author` | string | Defaults to `"Victor"` |
| `updatedDate` | date | YYYY-MM-DD |
| `tags` | string[] | e.g., `["technique", "beginner"]` |
| `readingTime` | number | Minutes |
| `relatedRecipes` | string[] | Recipe slugs (EN) for cross-linking |

**ArticleCategory enum values:**
`cooking-techniques`, `food-science`, `guides`, `ingredients`, `kitchen-tips`, `drinks`

**Article data flow:**
```
getCollection("articles") -> filter by article.data.lang === locale
-> extract slug: article.id.replace(/^(en|fr)\//, "")
-> render(article) returns { Content }
```

**Article images:** `src/assets/images/articles/` (separate from recipe images)

**Cross-content linking:** Articles can reference recipes via `relatedRecipes` field. The `ArticleRelatedRecipes.astro` component renders these as recipe cards.

### 2.2 Update Layout Hierarchy

Add `ArticleLayout.astro` and document `contentType` prop:

```
BaseLayout.astro -- Root HTML shell (accepts contentType?: "recipe" | "article")
  RecipeLayout.astro -- ogType="article", contentType="recipe"
  ArticleLayout.astro -- ogType="article", contentType="article"
```

### 2.3 Update Route Mapping Table

Add missing routes:

| EN | FR |
|----|----|
| `/en/articles/` | `/fr/articles/` |
| `/en/privacy-policy/` | `/fr/politique-de-confidentialite/` |
| `/en/terms-of-service/` | `/fr/conditions-dutilisation/` |

### 2.4 Update Key i18n Functions

Add `getArticleLocalizedPath(locale, slug)` to the list.

### 2.5 Update JSON-LD Types

Add: **BlogPosting + FAQPage** -- On every article page (via `ArticleSchema.astro`)

### 2.6 Add CI/CD & Automation Pipelines Section

New top-level section documenting all 11 workflows:

**Content Publishing:**
- `auto-publish-recipe.yml` -- Thursdays 3AM UTC, fetches from Notion, Claude generates EN+FR MDX + images, creates PR
- `auto-publish-article.yml` -- Mondays 3AM UTC, same pipeline for articles
- `social-post-on-deploy.yml` -- Auto-posts new recipes to Instagram/Pinterest on deploy
- `social-backfill.yml` -- Manual trigger to backfill social posts for older recipes
- `token-refresh.yml` -- Refreshes OAuth tokens (Pinterest 30d, Instagram 60d) on 1st + 25th of month

**SEO Monitoring:**
- `weekly-seo-ranking.yml` -- Mondays 8AM UTC, fetches GSC + SERP data to `data/seo/`
- `seo-auto-optimize.yml` -- Triggers on ranking data push, Claude optimizes underperforming content
- `weekly-seo-audit.yml` -- Sundays 3AM UTC, Lighthouse CI audit of all pages

**Quality Gates:**
- `playwright-pr-check.yml` -- E2E smoke tests on PRs (4 projects: desktop-light/dark, mobile-light/dark)
- `lighthouse-pr-check.yml` -- Performance checks on PRs
- `auto-merge.yml` -- Auto-merges Renovate dependency updates

**Key files:**
- `notion/published.json` -- Tracks published Notion content (do not delete)
- `data/seo/` -- Weekly ranking snapshots (do not delete)
- `data/social-posts-log.json` -- Social media idempotency log
- `scripts/fetch-notion-recipe.mjs` / `scripts/fetch-notion-article.mjs` -- Notion fetch scripts
- `scripts/seo/` -- SEO ranking and reporting scripts
- `scripts/social-post.mjs` -- Social media posting script

### 2.7 Add Testing Infrastructure Section

```
- Playwright E2E: `npx playwright test` (auto-discovers all pages from dist/)
- Lighthouse CI: `.lighthouserc.cjs` (PR checks), `.lighthouserc-full.cjs` (full audit)
- Tests directory: `tests/` with custom dark mode fixture at `tests/fixtures.ts`
- 4 test projects: desktop-light, desktop-dark, mobile-light, mobile-dark
```

### 2.8 Update Content Structure Section

Add:
- Article files live in `src/content/articles/{en,fr}/`
- Articles use `BlogPosting` JSON-LD (not `Recipe`)
- Homepage merges recipes + articles into "recent posts" sorted by `publishDate`
- Article components: `ArticleCard.astro`, `ArticleRelatedRecipes.astro`, `ArticleSchema.astro`

### 2.9 Update Slash Commands Table

Add new commands and update workflows:

| Command | Purpose |
|---------|---------|
| `/new-article` | Scaffold EN+FR MDX pair with article frontmatter template |
| `/translate-article` | Translate article EN<->FR |

Update recommended workflows:
- **New article**: `/new-article` -> add hero image -> `/optimize-image` -> write prose -> `/translate-article` -> `/seo-audit` -> `/deploy`
- **Audit & fix**: `/bulk-audit` -> fix issues -> `/validate-recipes` (covers articles too) -> `/deploy`

### 2.10 Add Lessons Learned Entries

Add new entries for article-related learnings:
- 17: Articles use `image()` imports for hero images, same as recipes (not URL strings)
- 18: `relatedRecipes` in article frontmatter must reference valid EN recipe slugs
- 19: Homepage merges recipes + articles -- schema changes to either collection can break the homepage
- 20: Article routes use `/articles/` in both EN and FR (no localization needed for this segment)

---

## Phase 3: Update and Create Commands

### 3.1 Extend `/validate-recipes` to cover articles

**File**: `.claude/commands/validate-recipes.md`

Add after the existing recipe validation passes:

**Pass 3 -- Article Structural Validation:**
- Article EN/FR pair matching (same pattern as recipes)
- Article image existence in `src/assets/images/articles/`
- `relatedRecipes` slug resolution (verify each referenced slug exists as an EN recipe)
- Orphaned article images

**Pass 4 -- Article Content Parity (EN/FR pairs):**
- Same count of FAQs
- Same `articleCategory` value
- Same `relatedRecipes` entries
- Same `tags` values

**Cross-Content Link Validation:**
- Recipe links in articles resolve to existing recipes
- Article links in recipes resolve to existing articles

### 3.2 Extend `/seo-audit` for articles

**File**: `.claude/commands/seo-audit.md`

Add article detection: if the input is an article slug (found in `src/content/articles/en/`), use adapted scoring:

**Article Scoring (18 points):**
- Frontmatter Completeness (5 pts): required fields, description <= 160, >= 1 FAQ, translation pair
- JSON-LD Validity (5 pts): BlogPosting schema, FAQPage, BreadcrumbList
- Content Quality (5 pts): >= 800 words, >= 3 H2s, internal links, translation pair
- Image (3 pts): hero present + optimized (2), descriptive alt text (1)

### 3.3 Extend `/bulk-audit` for articles

**File**: `.claude/commands/bulk-audit.md`

Add a second table for articles after the recipe table. Report separate averages and a combined summary.

### 3.4 Update `/deploy` to validate articles

**File**: `.claude/commands/deploy.md`

Add to pre-deploy checks (step 1):
- Verify all article MDX files have matching EN/FR pairs (check `translationSlug` references)

### 3.5 Update `/optimize-image` for article awareness

**File**: `.claude/commands/optimize-image.md`

Add:
- Ask whether the image is for a recipe or article if not obvious from context
- Article images go to `src/assets/images/articles/` (not `src/assets/images/recipes/`)
- Articles only need hero images (no step images)

### 3.6 Create `/new-article` command

**File**: `.claude/commands/new-article.md`

Scaffold EN+FR MDX pair with article-specific frontmatter:
- Prompt for: title (EN+FR), description, `articleCategory` (from enum), keywords, related recipe slugs
- Generate EN file at `src/content/articles/en/{slug}.mdx`
- Generate FR file at `src/content/articles/fr/{slug-fr}.mdx`
- Include `relatedRecipes` lookup against existing recipe slugs
- Placeholder FAQ entries
- MDX body with article-appropriate H2 structure (not recipe-centric)
- Run `npx astro check` to validate

### 3.7 Create `/translate-article` command

**File**: `.claude/commands/translate-article.md`

Similar to `/translate-recipe` but simpler:
- No ingredient measurement conversions needed
- No instruction step handling
- Correct paths: `src/content/articles/{locale}/`
- Translate: title, description, keywords, FAQs, MDX body prose, alt text
- Keep same hero image, same `relatedRecipes` slugs
- Quebec French conventions still apply for prose
- Bidirectional `translationSlug` matching
- Run `npx astro check` to validate

---

## Acceptance Criteria

### Phase 1 (Bug Fixes)
- [x] `/new-recipe` template uses `image()` import paths for step images, not URL strings
- [x] `/optimize-image` output uses `image()` import paths for step images
- [x] Explanatory text in `/new-recipe` correctly describes step images as `image()` imports

### Phase 2 (CLAUDE.md)
- [x] Article schema documented with all required/optional fields table
- [x] `ArticleCategorySchema` enum values listed
- [x] Article data flow documented
- [x] Layout hierarchy includes `ArticleLayout.astro` and `contentType` prop
- [x] Route mapping includes articles, privacy-policy, terms-of-service
- [x] `getArticleLocalizedPath()` listed in i18n functions
- [x] `BlogPosting + FAQPage` listed in JSON-LD types
- [x] CI/CD & Automation section documents all 11 workflows
- [x] Testing infrastructure section documents Playwright + Lighthouse
- [x] Slash commands table includes `/new-article` and `/translate-article`
- [x] Updated workflows section includes article lifecycle
- [x] New lessons learned entries added (17-20)

### Phase 3 (Commands)
- [x] `/validate-recipes` validates article pairs, images, cross-links, and `relatedRecipes` resolution
- [x] `/seo-audit` detects article vs recipe and applies correct scoring rubric
- [x] `/bulk-audit` includes articles in report with separate table
- [x] `/deploy` validates article EN/FR pairs in pre-deploy checks
- [x] `/optimize-image` handles article images (different target directory)
- [x] `/new-article` scaffolds correct EN+FR MDX pair with article schema
- [x] `/translate-article` translates articles with correct paths and fields
- [ ] All updated/new commands pass a manual test run

### Quality Gate
- [x] `npm run check` passes after all changes (0 errors, 0 warnings)
- [x] CLAUDE.md stays under 350 lines (349 lines)

## Dependencies & Risks

**No external dependencies.** All changes are to Markdown files in `.claude/commands/` and `CLAUDE.md`.

**Risk: CLAUDE.md size.** Adding articles, automation, and testing could push past 350 lines. Mitigation: keep descriptions to 1-2 lines each, use tables for structured data, reference `docs/solutions/` for details instead of inlining.

**Risk: Command scope creep.** Extending 5 commands and creating 2 new ones is significant. Mitigation: phase the work -- fix bugs first, then CLAUDE.md, then commands in priority order.

## Sources & References

- **Origin brainstorm:** [docs/brainstorms/2026-02-24-claude-md-comprehensive-update-brainstorm.md](docs/brainstorms/2026-02-24-claude-md-comprehensive-update-brainstorm.md) -- comprehensive CLAUDE.md rewrite scope and section structure. Key decisions: comprehensive with inline references, schema quick-reference tables, workflow guidance.
- Article schema: `src/content.config.ts:81-105`
- i18n utilities: `src/i18n/utils.ts` (routeMap lines 54-80, getArticleLocalizedPath lines 106-111)
- Step image schema (source of truth): `src/content.config.ts:40-43` (HowToStepSchema uses `image()`)
- GitHub Actions workflows: `.github/workflows/` (11 files)
- Existing solutions: `docs/solutions/` (7 documents, 16 lessons already in CLAUDE.md)
