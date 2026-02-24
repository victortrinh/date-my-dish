# Brainstorm: Comprehensive CLAUDE.md Update

**Date:** 2026-02-24
**Status:** Ready for planning

## What We're Building

A comprehensive CLAUDE.md rewrite (~250-300 lines) that gives future Claude Code sessions full project awareness without needing to explore the codebase first. The current 48-line CLAUDE.md covers basics but misses architecture, conventions, slash commands, workflows, lessons learned, and has a factual error (step images described as URL strings but are actually `image()` imports).

## Why This Approach

**Comprehensive with inline references** was chosen over minimal/focused approaches because:
- Every Claude session starts cold -- the more context in CLAUDE.md, the fewer exploratory reads needed
- Inline summaries of lessons prevent repeating past mistakes (7 documented solutions)
- Workflow guidance makes sessions proactive (knowing to run /seo-audit after /write-prose)
- Schema quick-reference saves a file read on every recipe task

The trade-off (longer context consumption) is worth it because the project has well-established patterns that shouldn't be rediscovered each session.

## Key Decisions

1. **Scope**: Comprehensive (~250-300 lines) covering all major areas
2. **Lessons learned**: Inline 1-line summaries, not just directory pointers
3. **Slash commands**: Listed with workflow guidance (recommended sequences)
4. **Schema reference**: Inline quick-reference table of all frontmatter fields
5. **Fix factual error**: Step images use `image()` not URL strings

## Proposed CLAUDE.md Structure

### Section 1: Project Overview (keep existing, minor tweaks)
- Tech stack, hosting, key commands

### Section 2: Architecture & Conventions
- Component patterns (all take `locale: Locale` prop, TypeScript interfaces for Props)
- Layout hierarchy (BaseLayout -> RecipeLayout)
- Path aliases (@components/*, @layouts/*, @i18n/*, @assets/*, @utils/*)
- Client-side JS patterns (vanilla JS, IIFE, `is:inline`, no frameworks)
- Data flow for recipes (getCollection -> filter by lang -> extract slug -> render)

### Section 3: Content Schema Quick-Reference
- All frontmatter fields with types and constraints
- Sub-schemas (IngredientGroup, InstructionGroup, HowToStep, Nutrition, FAQ, DateNightTips)
- **Corrected**: step images are `image()` imports, not URL strings

### Section 4: Content Structure (expand existing)
- Recipe inventory (9 EN + 9 FR pairs)
- MDX body conventions (800-1500 words, 5-8 H2s, Picture imports)
- EN/FR share images, only alt text translated

### Section 5: Image Guidelines (keep existing, minor corrections)

### Section 6: i18n Details
- Route translation map (existing + expanded)
- Category slug map (canonical -> en/fr)
- Quebec French terminology rules
- Key functions: t(), getLocaleFromUrl(), getRecipeLocalizedPath(), getCategoryLocalizedPath()
- EN/FR pages are duplicated (not generated from shared template)

### Section 7: Brand & Accessibility
- Colors with accessible text variants (brand-accent-text #7D631C for WCAG AA)
- Fonts (existing)
- Dark mode: class strategy, neutral palette, Pagefind CSS overrides
- Accessibility: skip-to-content, focus-visible, focus traps, aria-labels, reduced-motion

### Section 8: SEO & Structured Data
- JSON-LD types: Recipe, FAQPage, BreadcrumbList, WebSite+Organization (homepage), ItemList (listings)
- Meta: canonical, hreflang, OG, Twitter
- robots.txt allows AI crawlers
- llms.txt endpoint exists

### Section 9: Slash Commands & Workflows
- All 8 commands with 1-line descriptions
- Recommended workflows:
  - New recipe: /new-recipe -> add images -> /optimize-image -> /write-prose -> /translate-recipe -> /seo-audit -> /deploy
  - Audit: /bulk-audit -> fix issues -> /validate-recipes -> /deploy
  - Translation: /translate-recipe -> /validate-recipes

### Section 10: Deploy & Infrastructure
- Cloudflare Pages via Wrangler
- _headers (security + cache rules)
- _redirects (relative paths only -- Cloudflare rejects absolute URLs)
- Auto-deploy on push to main

### Section 11: Lessons Learned (from docs/solutions/)
1-line summaries of key gotchas:
- Cloudflare _redirects only accepts relative paths (use DNS for www-to-apex)
- Always run /optimize-image on new images (past heroes were 700KB+)
- Pagefind UI needs explicit dark mode CSS overrides (`:root.dark` selector)
- Font changes require loading all needed weights in Google Fonts link
- Category tab ordering needs explicit priority array (Set insertion is non-deterministic)
- Accessible color tokens: never use brand-accent for text, use brand-accent-text (#7D631C)
- Focus traps needed in SearchOverlay and mobile Navigation

## Open Questions

None -- all key decisions resolved through brainstorming dialogue.
