# SEO Automation Pipeline Brainstorm

**Date**: 2026-02-24
**Status**: Decided
**Feature**: Automated SEO metrics gathering, scoring, and auto-fix PR creation via GitHub Actions

## What We're Building

A two-pronged GitHub Actions pipeline that continuously monitors and improves SEO scores across every page of Date My Dish:

1. **PR Gate (on every PR to main)**: Lighthouse CI runs against a local build, asserts minimum scores (Performance, Accessibility, Best Practices, SEO all >= 90), and blocks merge if any score drops below threshold.

2. **Weekly Full Audit (cron schedule)**: Lighthouse CI scans all pages for scores, then Claude Code CLI analyzes the full site — JSON-LD validation, content quality (word count, heading structure, internal links, image optimization), and structured data completeness. Claude Code creates an auto-fix PR with aggressive fixes for everything it can improve.

## Why This Approach

### Lighthouse CI + Claude Code CLI

- **Lighthouse CI** is the industry standard for automated web quality scoring. It has built-in assertion support (pass/fail thresholds), runs headless Chrome in CI, and produces per-page scores across all 4 Lighthouse categories.
- **Claude Code CLI** (official GitHub Action) can read/edit files, analyze content, and create PRs natively. It can leverage existing slash command knowledge from the repo's CLAUDE.md and `.claude/commands/` — no need to rebuild audit logic from scratch.
- **Two-pronged model** catches regressions before deploy (PR gate) AND continuously improves existing content (weekly audit + auto-fix PR).

### Rejected Alternatives

- **Unlighthouse**: Simpler site-wide scanning but less CI maturity and assertion framework support.
- **PageSpeed Insights API**: Simplest setup, but can only test deployed pages (not PR previews), no assertion framework, and rate limits could be an issue at scale.
- **Anthropic API directly**: Cheaper per token but requires custom scripting for file editing and PR creation. Claude Code CLI handles this natively.
- **Report-only / manual fixes**: User explicitly wants aggressive auto-fix PRs, not just reports.

## Key Decisions

1. **Full-stack metrics**: Lighthouse scores (all 4 categories) + JSON-LD validation + content quality analysis (word count, headings, links, images)
2. **Aggressive auto-fixes**: Claude Code will attempt to fix everything it can — content rewrites, schema corrections, meta description improvements, image optimization suggestions — and create a PR. User reviews before merge.
3. **Two triggers**: PR gate (Lighthouse CI only, fast) + weekly cron (full audit with Claude Code, creates PR)
4. **Claude Code CLI in GitHub Actions**: Uses the official action, stores Anthropic API key in GitHub Secrets
5. **Minimum score thresholds**: 90+ on all Lighthouse categories (Performance, Accessibility, Best Practices, SEO)

## Technical Shape

### GitHub Secrets Required
- `ANTHROPIC_API_KEY` — For Claude Code CLI in the weekly audit workflow

### Workflow 1: `lighthouse-pr-check.yml` (on PR to main)
- Trigger: `pull_request` targeting `main`
- Steps: Build site -> Run Lighthouse CI against local server -> Assert scores >= 90 -> Report in PR comment
- Dependencies: `@lhci/cli`, headless Chrome
- No Anthropic API usage (free, fast)

### Workflow 2: `weekly-seo-audit.yml` (cron: Sunday night)
- Trigger: `schedule` (e.g., `cron: '0 3 * * 0'` — 3 AM UTC Sunday)
- Steps:
  1. Build site
  2. Run Lighthouse CI on all pages, collect scores
  3. Run Claude Code CLI with a prompt that includes Lighthouse results
  4. Claude Code analyzes: JSON-LD schemas, content quality, meta tags, image optimization, internal linking
  5. Claude Code makes fixes and creates a PR
- Dependencies: `@lhci/cli`, `claude-code` GitHub Action, headless Chrome

### Lighthouse CI Configuration (`.lighthouserc.js`)
- URLs: All recipe pages (EN + FR), homepage, about, contact, category pages
- Assertions: Performance >= 90, Accessibility >= 90, Best Practices >= 90, SEO >= 90
- Collect: Run 3 times per URL (median for stability)
- Upload: Temporary public storage (free LHCI server) or local JSON

### Claude Code Prompt Shape (weekly audit)
- Input: Lighthouse scores JSON + list of pages below threshold
- Tasks: Validate JSON-LD, check content quality, check meta descriptions, verify internal links, check image optimization
- Output: Auto-fix PR with changes + PR description listing all issues found and fixes applied
- Model: Claude Sonnet (cost-effective for automated runs) or Opus for complex content rewrites

## Scope & Constraints

- **Pages to audit**: All recipe pages (EN + FR), homepage (EN + FR), about (EN + FR), contact (EN + FR), category pages, recipe listing pages
- **Cost consideration**: Claude Code CLI usage on weekly schedule — estimate ~$2-5 per run depending on site size and fix complexity
- **Chrome in CI**: GitHub Actions runners include Chrome, but may need explicit setup via `actions/setup-chrome` or Puppeteer
- **Build time**: Full build + Lighthouse audit across all pages could take 5-10 minutes
- **PR noise**: Weekly PRs could be noisy if many issues exist initially. Consider batching or only creating PR when score improvements are possible.

## Open Questions

None — all key decisions have been made through the brainstorm dialogue.

## Success Criteria

1. Every PR to main gets Lighthouse scores reported as a check
2. PRs that drop any Lighthouse category below 90 are blocked from merging
3. Weekly audit catches content quality issues and creates actionable auto-fix PRs
4. Over time, all pages achieve 95+ scores across all Lighthouse categories
5. JSON-LD is validated automatically — no more manual Google Rich Results Test checks
6. Reduced manual SEO audit time (currently done via slash commands)
