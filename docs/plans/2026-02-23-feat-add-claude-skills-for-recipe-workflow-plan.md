---
title: "Add Claude Skills to Optimize Recipe Workflow"
type: feat
status: completed
date: 2026-02-23
---

# Add Claude Skills to Optimize Recipe Workflow

## Overview

Add 3 new Claude Code skills (`.claude/commands/`) to fill workflow gaps: prose writing, recipe validation, and bulk SEO auditing. These complement the existing 5 skills (new-recipe, optimize-image, translate-recipe, seo-audit, deploy) to cover the full content lifecycle.

## Problem Statement / Motivation

Current pain points:
- **Writing MDX blog prose** is the most manual, time-consuming step — 800-1500 words per recipe with H2 sections, internal cross-links, `<Picture>` imports, and keyword integration
- **Broken cross-links** go undetected until manually discovered (we just found 12 broken links from removing the crêpes recipe)
- **SEO auditing** is one recipe at a time — no way to get a bird's-eye view of the entire collection's health
- **No validation** for EN/FR pair consistency, orphaned images, or stale translationSlugs

## Proposed Skills

### 1. `/write-prose` — Generate SEO Blog Prose

**Input:** Recipe slug (e.g., `quinoa-crusted-salmon`)

**Behavior:**
- Reads the EN MDX file and extracts all frontmatter data (ingredients, instructions, FAQs, categories, cuisine)
- Validates frontmatter is "complete" (real ingredients/steps, not placeholders)
- Scans `src/assets/images/recipes/{slug}*` for available images
- Analyzes 2-3 existing recipes for prose patterns (H2 structure, tone, cross-link placement)
- Generates 800-1500 words of SEO blog prose for the EN version only
- Includes `import { Picture } from "astro:assets"` and step image imports, with `<Picture>` components placed at contextually appropriate spots
- Includes 1 category page cross-link + 2 recipe cross-links (prefers recipes with fewer inbound links)
- Writes only the MDX body — never touches frontmatter
- User then runs `/translate-recipe` for the FR version

**Key decisions:**
- **EN only** — generating both languages independently risks divergence; translate-recipe is the better workflow for FR
- **Overwrite protection** — if MDX body is non-empty, show existing content and ask user to confirm before overwriting
- **Image-aware** — discovers images on disk and weaves `<Picture>` components into prose at relevant sections
- **Cross-link validation** — only links to recipes that actually exist in the repo

**Prose structure pattern** (based on existing recipes):
- 5-8 H2 sections
- Opening paragraph hooks the reader (why this recipe matters)
- Technique/ingredient deep-dive sections
- "Serving Suggestions" or "Making It a Complete Meal" section with cross-links
- Tips/variations section
- Natural keyword integration from frontmatter `keywords` array

### 2. `/validate-recipes` — Validate Recipe Collection Integrity

**Input:** None (validates all recipes), or optional single slug

**Checks (two-pass system):**

**Pass 1 — Structural validation:**
- [ ] Every EN recipe has a matching FR file (resolved via `translationSlug` → file exists)
- [ ] Every FR recipe has a matching EN file (bidirectional)
- [ ] All `heroImage` paths resolve to files on disk
- [ ] All `instructionGroups.steps[].image` URLs have corresponding files
- [ ] No orphaned images in `src/assets/images/recipes/` (not referenced by any recipe)
- [ ] All markdown cross-links in MDX bodies point to existing recipes or valid category pages
- [ ] Category cross-links use categories that at least one recipe has in `recipeCategory`

**Pass 2 — Content parity validation (EN/FR pairs):**
- [ ] Same number of ingredient groups
- [ ] Same number of instruction steps per group
- [ ] Same step images on corresponding steps
- [ ] Same FAQ count
- [ ] Same `recipeCategory` values
- [ ] Both have nutrition or both lack nutrition

**Output:** Per-recipe pass/fail table + aggregated issue list sorted by severity.

### 3. `/bulk-audit` — Bulk SEO Audit Scorecard

**Input:** None (audits all recipes)

**Behavior:**
- Runs `npm run build` once at the start
- Iterates over all recipes, running seo-audit logic per recipe:
  - Frontmatter completeness
  - JSON-LD validity (from generated HTML in `dist/`)
  - Hreflang and SEO tags
  - Content quality (word count, H2 count, cross-links)
  - Image optimization (sizes, alt text, count)
  - Image score (0-9 scale from existing seo-audit)
- Produces a summary table:

```
| Recipe             | SEO Score | Image Score | Issues |
|--------------------|-----------|-------------|--------|
| cacio-e-pepe       | 18/20     | 9/9         | None   |
| quinoa-salmon      | 14/20     | 5/9         | Missing 2 step images, prose < 800 words |
```

- Highlights recipes needing attention, sorted by severity (Critical > Important > Nice-to-have)
- Aggregates common issues (e.g., "5 of 9 recipes missing step images")
- Output printed to terminal

## Technical Considerations

### File locations
- `.claude/commands/write-prose.md`
- `.claude/commands/validate-recipes.md`
- `.claude/commands/bulk-audit.md`

### Cross-link selection algorithm for write-prose
1. Get all published recipe slugs and their categories
2. Pick 1 recipe from the same `recipeCategory` as the current recipe
3. Pick 1 recipe from a different category (for variety)
4. Prefer recipes with fewer inbound cross-links (count grep hits across all MDX bodies)
5. Also include 1 category page link (e.g., `/en/recipes/category/dinner/`)
6. Verify all targets exist before including

### Image discovery for write-prose
```
src/assets/images/recipes/{slug}*.{jpg,webp,png}
```
Match hero image (`{slug}.jpg`) and step images (`{slug}-step-*.jpg` or `{slug}-*.{jpg,webp}`). Generate import statements and `<Picture>` components only for images that exist on disk.

### Validate-recipes cross-link parsing
Extract markdown links from MDX bodies using regex: `\[([^\]]+)\]\(([^)]+)\)`
- Recipe links: `/en/recipes/{slug}/` or `/fr/recettes/{slug}/` → resolve slug to file
- Category links: `/en/recipes/category/{cat}/` or `/fr/recettes/categorie/{cat}/` → check `{cat}` exists in any recipe's `recipeCategory`

### Interaction with existing skills
- `/write-prose` feeds into → `/translate-recipe` (for FR version)
- `/validate-recipes` could be called by → `/deploy` (as optional pre-deploy gate)
- `/bulk-audit` is a superset of → `/seo-audit` (single recipe)

## Acceptance Criteria

- [x] `/write-prose <slug>` generates 800-1500 words of EN MDX prose with H2 sections, `<Picture>` imports, and valid cross-links
- [x] `/write-prose` warns before overwriting existing prose content
- [x] `/write-prose` validates frontmatter is complete before generating
- [x] `/validate-recipes` checks all EN/FR pairs, translationSlugs, image files, and cross-links
- [x] `/validate-recipes` reports content parity issues between EN/FR pairs
- [x] `/validate-recipes` detects orphaned images
- [x] `/bulk-audit` runs a single build and audits all recipes
- [x] `/bulk-audit` produces a summary table with scores and issues
- [x] All 3 skills follow the existing `.claude/commands/` format (# Title, ## Input, ## Steps)

## Dependencies & Risks

- **Risk:** write-prose quality depends on Claude understanding the existing prose patterns — mitigation: include 2-3 concrete examples in the skill file
- **Risk:** cross-link regex parsing may miss edge cases in MDX — mitigation: test against all existing recipes
- **Dependency:** bulk-audit depends on `npm run build` completing successfully

## Sources & References

- Existing skills: `.claude/commands/new-recipe.md`, `.claude/commands/seo-audit.md`, `.claude/commands/translate-recipe.md`
- Prose patterns: `src/content/recipes/en/cacio-e-pepe.mdx`, `src/content/recipes/en/quinoa-crusted-salmon.mdx`
- Content schema: `src/content.config.ts`
- i18n utils: `src/i18n/utils.ts`
