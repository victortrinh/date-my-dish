---
title: "Auto-publish Notion articles via GitHub Actions"
date: 2026-02-27
status: complete
---

# Auto-Publish Notion Articles via GitHub Actions

## What We're Building

A weekly GitHub Actions workflow that automatically publishes 1 article per week from Notion to the blog. The workflow queries the Notion API for "Ready to Publish" articles, uses `claude-code-action` to generate full EN+FR MDX article pairs (rewritten prose, frontmatter, translated content), downloads and optimizes Notion images, and creates a PR that auto-merges after CI passes.

## Why This Approach

- **Notion API (live sync)** over git-based detection: always reflects the latest Notion state without manual re-exports
- **claude-code-action** over standalone scripts: simplest to build, leverages the existing `weekly-seo-audit.yml` pattern that already demonstrates Claude making repo changes via PR
- **1 article per week** pacing: gives each article time to index in Google, sustainable cadence, ~10 weeks of backlog content
- **Auto-merge after CI** over manual review: fully hands-off pipeline — build, Lighthouse, and Playwright checks act as quality gates
- **Notion images as-is** over AI-generated: extract and optimize (resize/webp) the existing watercolor illustrations from Notion pages

## Key Decisions

1. **Source of truth: Notion API** — Query the Notion database directly for articles with "Ready to Publish" status. Requires `NOTION_API_TOKEN` and `NOTION_DATABASE_ID` as GitHub secrets. The user already has a Notion integration token.

2. **AI engine: claude-code-action** — Same pattern as `weekly-seo-audit.yml`. Claude handles: EN MDX prose rewriting (800-1500 words, SEO-optimized), FR translation (Quebec French conventions), frontmatter generation (schema-compliant), FAQ expansion, article category mapping.

3. **Tracking: published.json** — The existing `notion/published.json` file tracks which Notion articles have been converted. Keyed by Notion `Recipe #` field. Prevents duplicate publishing.

4. **Selection order: oldest unpublished first** — Pick the lowest `Recipe #` among "Ready to Publish" articles not in `published.json`. Predictable, FIFO ordering.

5. **Image handling: download + optimize** — Download images from Notion page, convert to webp, resize (hero: 1200px max, <200KB), place in `src/assets/images/articles/`.

6. **Schedule: weekly cron** — Run every Monday. Also supports manual `workflow_dispatch` trigger for on-demand publishing.

7. **PR strategy: auto-merge** — Create PR with `automated-article` label, enable auto-merge. Existing CI checks (build, Lighthouse, Playwright) serve as quality gates.

8. **Scope: articles only** — This workflow handles informative articles (Post Type: "Informative Posts"). Recipes have a different schema and conversion process.

## What's NOT Included (YAGNI)

- No recipe auto-publishing (different schema, different workflow)
- No Notion webhook integration (cron is sufficient for weekly cadence)
- No content scheduling/queue management (simple FIFO from Notion status)
- No rollback mechanism (revert the PR if needed)
- No social media posting for articles (can be added later, separate concern)
- No updating existing articles (publish-only for now; update support is a future enhancement)

## Open Questions

_None — all resolved during brainstorming._

## Resolved Questions

1. **AI vs scripted?** → Use Claude via claude-code-action (fully AI-powered)
2. **Source detection?** → Notion API live sync (not git-based folder watching)
3. **Publishing pace?** → 1 article per week
4. **Image handling?** → Use Notion images as-is, optimize automatically
5. **PR strategy?** → Auto-merge after CI passes
6. **Notion API access?** → User already has integration token

## Reference

- Existing pattern: `.github/workflows/weekly-seo-audit.yml` (claude-code-action + cron + PR creation)
- Article schema: `src/content.config.ts:81-103`
- Published tracking: `notion/published.json`
- Example articles: `src/content/articles/en/wok-hei-at-home.mdx`, `src/content/articles/fr/wok-hei-a-la-maison.mdx`
- 10 unpublished "Ready to Publish" articles remaining in Notion backlog
