---
title: Claude Configuration Optimization with Accumulated Learnings
date: 2026-02-27
module: claude-config
problem_type: documentation-debt
severity: high
symptoms:
  - /new-recipe and /optimize-image output URL strings for step images instead of image() imports
  - Articles content type (4 EN/FR pairs) completely absent from CLAUDE.md
  - 11 GitHub Actions workflows undocumented -- risk of accidental deletion
  - /validate-recipes, /seo-audit, /bulk-audit only cover recipes, not articles
  - Article routes, privacy-policy, terms-of-service missing from i18n route table
  - No /new-article or /translate-article commands exist
  - Playwright and Lighthouse testing infrastructure undocumented
  - Lessons learned stale at 16 entries despite new discoveries
root_cause: >
  The project evolved significantly after CLAUDE.md and command files were initially
  written. Articles content type, Notion auto-publishing, SEO automation, social media
  posting, and Playwright testing were all added but never reflected in the Claude
  configuration files. Two commands also had an active schema mismatch bug where
  step images were shown as URL strings instead of Astro image() imports.
status: resolved
tags:
  - claude-config
  - documentation
  - articles
  - schema-validation
  - commands
  - ci-cd
  - astro-image
---

# Claude Configuration Optimization with Accumulated Learnings

## Problem

Every Claude session starts cold. CLAUDE.md and the `.claude/commands/` files are the sole source of truth for how to work in this codebase. When they fall behind the actual project state:

1. **Active bugs**: `/new-recipe` and `/optimize-image` produced URL strings (`/images/recipes/{slug}-step-1.jpg`) for step images, but `HowToStepSchema` in `src/content.config.ts:40-43` uses `image: image().optional()` -- an Astro image() import requiring relative paths. Scaffolded recipes would fail validation.

2. **Invisible content type**: Articles (4 EN/FR pairs, own schema at `content.config.ts:81-105`, own layout, components, routes) were completely absent from CLAUDE.md. Any refactor could break articles unknowingly.

3. **Undocumented automation**: 11 GitHub Actions workflows existed but weren't mentioned. Someone could delete `data/seo/`, `notion/published.json`, or `data/social-posts-log.json` thinking they were unused.

4. **Validation blind spots**: `/validate-recipes`, `/seo-audit`, and `/bulk-audit` only covered recipes. Articles had zero validation tooling.

5. **Missing commands**: No `/new-article` or `/translate-article` commands existed despite the article content type being live.

## Investigation Steps

### Step 1: Inventory all Claude config files

Found 1 CLAUDE.md, 8 existing commands in `.claude/commands/`, and 7 solution docs in `docs/solutions/`.

### Step 2: Cross-reference with actual codebase

Compared what's documented vs what exists:
- `src/content.config.ts` -- Article schema defined but not in CLAUDE.md
- `src/i18n/utils.ts` -- `getArticleLocalizedPath()` exists but not documented
- `.github/workflows/` -- 11 workflow files, zero mentioned in CLAUDE.md
- `tests/` -- Playwright config, fixtures, 4 test projects, all undocumented
- `ArticleLayout.astro`, `ArticleCard.astro`, `ArticleSchema.astro` -- all exist

### Step 3: Identify the schema bug

The `HowToStepSchema` at `content.config.ts:40-43`:
```typescript
const HowToStepSchema = z.object({
  text: z.string(),
  image: image().optional(),
});
```

But `/new-recipe` line 69 showed:
```yaml
image: "/images/recipes/{slug}-step-1.jpg"  # URL string -- WRONG
```

And `/optimize-image` line 59 had the same URL string pattern.

### Step 4: Brainstorm and plan

Used `docs/brainstorms/2026-02-24-claude-md-comprehensive-update-brainstorm.md` as foundation. Created a 3-phase plan covering bug fixes, CLAUDE.md updates, and command updates/creation.

## Root Cause

Documentation debt accumulated as features shipped without updating the Claude configuration files. The step image bug originated from the initial command authoring before the schema was finalized to use Astro `image()` imports.

## Solution

### Phase 1: Fix Active Bugs

**`/new-recipe` step image fix:**
```yaml
# Before (WRONG):
image: "/images/recipes/{slug}-step-1.jpg"

# After (CORRECT):
image: "../../../assets/images/recipes/{slug}-step-1.jpg"
```

Also fixed the explanatory text from "URL strings" to "image() imports".

**`/optimize-image` step image fix:**
Same URL-to-relative-path fix for the frontmatter output template.

### Phase 2: Update CLAUDE.md (274 -> 349 lines, under 350 limit)

Added 8 new documentation sections:

1. **Article Schema Quick-Reference** -- Required/optional fields table, `ArticleCategorySchema` enum values, data flow
2. **Layout Hierarchy Update** -- `ArticleLayout.astro` with `contentType` prop
3. **Route Mapping** -- Articles, privacy-policy, terms-of-service routes
4. **i18n Functions** -- `getArticleLocalizedPath()`
5. **JSON-LD Types** -- `BlogPosting + FAQPage` for articles
6. **CI/CD & Automation Pipelines** -- All 11 workflows with key files marked "do not delete"
7. **Testing Infrastructure** -- Playwright (4 projects) + Lighthouse
8. **Lessons Learned 17-20** -- Article-specific gotchas

### Phase 3: Update/Create Commands

**Extended 5 existing commands:**
- `/validate-recipes` -> `/validate-content` -- Added article structural validation (Pass 3) and content parity checks (Pass 4)
- `/seo-audit` -- Added article detection and 18-point scoring rubric (vs 24 for recipes)
- `/bulk-audit` -- Added separate articles table with 18-point scoring
- `/deploy` -- Added article EN/FR pair validation to pre-deploy checks
- `/optimize-image` -- Added recipe/article context detection and separate image directories

**Created 2 new commands:**
- `/new-article` -- Scaffolds EN+FR MDX pair with article-specific frontmatter, category enum, FAQ placeholders
- `/translate-article` -- Translates articles EN<->FR (simpler than recipes: no ingredients, no measurements)

## Prevention Strategies

1. **When adding a new content type**: Update CLAUDE.md schema section, extend all validation/audit commands, create scaffolding and translation commands
2. **When adding GitHub Actions workflows**: Document in CLAUDE.md CI/CD section with key files marked "do not delete"
3. **When modifying content schemas**: Cross-check all command templates that generate frontmatter -- they must match `src/content.config.ts`
4. **CLAUDE.md size budget**: Keep under 350 lines. Use tables for structured data, reference `docs/solutions/` for details instead of inlining

## Files Modified

| File | Change |
|------|--------|
| `CLAUDE.md` | Major update (274 -> 349 lines) |
| `.claude/commands/new-recipe.md` | Bug fix: URL strings -> image() imports |
| `.claude/commands/optimize-image.md` | Bug fix + article image support |
| `.claude/commands/validate-recipes.md` | Extended for articles (Pass 3 + 4) |
| `.claude/commands/seo-audit.md` | Article detection + 18-point rubric |
| `.claude/commands/bulk-audit.md` | Separate articles table |
| `.claude/commands/deploy.md` | Article EN/FR pair validation |
| `.claude/commands/new-article.md` | **NEW** -- Article scaffolding |
| `.claude/commands/translate-article.md` | **NEW** -- Article translation |

## Cross-References

- **Brainstorm**: `docs/brainstorms/2026-02-24-claude-md-comprehensive-update-brainstorm.md`
- **Plan**: `docs/plans/2026-02-27-refactor-claude-config-optimization-with-learnings-plan.md`
- **PR**: #35
- **Related solution**: `docs/solutions/integration-issues/social-media-auto-posting-instagram-pinterest.md` (one of the undocumented workflows)
- **Schema source of truth**: `src/content.config.ts` (HowToStepSchema lines 40-43, article schema lines 81-105)

## Key Takeaway

Claude configuration files are living documentation. Every feature addition should include a "documentation pass" that updates CLAUDE.md, extends relevant commands, and creates new commands if a new content type or workflow is introduced. The step image bug persisted for multiple sessions because no validation compared command templates against the actual Zod schema.
