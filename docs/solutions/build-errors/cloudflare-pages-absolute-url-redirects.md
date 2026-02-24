---
title: "Cloudflare Pages Rejects Absolute URLs in _redirects File"
problem_type: build-errors
component: deployment
symptoms:
  - "Cloudflare Pages deployment fails due to invalid _redirects rules"
  - "Absolute URL format rejected in Cloudflare Pages _redirects file"
  - "www-to-apex redirect rule using absolute URLs causes deployment failure"
date_solved: 2026-02-23
severity: medium
tags:
  - cloudflare-pages
  - redirects
  - deployment
  - www-redirect
  - dns
  - astro
tech_stack:
  - Astro 5
  - Cloudflare Pages
  - TypeScript
---

# Cloudflare Pages Rejects Absolute URLs in _redirects File

## Problem Symptom

Cloudflare Pages deployment failed because the `public/_redirects` file contained an absolute URL redirect rule. The original file had:

```
# www to apex
https://www.datemydish.com/*  https://datemydish.com/:splat  301
```

Cloudflare Pages silently rejects or errors on absolute URL patterns in `_redirects`. Only relative paths are supported.

## Root Cause

Cloudflare Pages' `_redirects` file format has strict limitations: it only accepts **relative URL paths**, not absolute URLs with full domain names. The www-to-apex redirect is fundamentally a DNS-level concern, not an application-level routing concern, and cannot be handled within the `_redirects` file.

Key constraint: `_redirects` format is `<source-path> <destination-path> <status-code>`, where both source and destination must be relative paths starting with `/`.

## Investigation Steps

1. **Identified the failure**: Cloudflare Pages deployment rejected the `_redirects` file containing absolute URLs
2. **Researched Cloudflare Pages `_redirects` format**: Confirmed only relative paths are supported (e.g., `/old-path /new-path 301`)
3. **Evaluated redirect approaches**: Recognized that www-to-apex redirects belong at the DNS level using a CNAME record, not application-level routing
4. **Applied the fix**: Removed the absolute URL rule and documented the correct DNS-based approach

## Working Solution

**Before** (broken):
```
# Cloudflare Pages redirects
# Format: from  to  status

# www to apex
https://www.datemydish.com/*  https://datemydish.com/:splat  301

# Root to English (static fallback for non-JS clients)
/  /en/  302
```

**After** (fixed — commit `e3a6574`):
```
# Cloudflare Pages redirects
# Format: from  to  status

# www to apex — handle via Cloudflare DNS (CNAME redirect) instead of _redirects

# Root to English (static fallback for non-JS clients)
/  /en/  302
```

The www-to-apex redirect is configured in the Cloudflare dashboard via DNS CNAME record + redirect rule.

## Why This Works

1. **Complies with Cloudflare Pages constraints**: All remaining rules use relative paths only
2. **Correct separation of concerns**: www-to-apex is handled at the DNS layer where subdomain routing belongs
3. **Preserves necessary redirects**: Application-level redirects (WordPress URLs to new recipe paths, root to `/en/`) remain intact
4. **Deployment succeeds**: Without the rejected absolute URL rule, Cloudflare Pages deploys successfully

## Prevention Strategies

### _redirects Format Rules

```
# CORRECT — relative paths only
/old-recipe/         /en/recipes/new-recipe/         301
/about               /en/about/                       302

# INCORRECT — these will fail
https://example.com/*       https://new.com/:splat  301   # absolute URL
www.example.com/*           example.com/:splat      301   # domain pattern
```

### DNS-Level vs Application-Level Redirect Decision

| Redirect Type | Where to Configure | Why |
|---|---|---|
| www to apex domain | Cloudflare DNS + Redirect Rule | Must happen before request reaches app |
| HTTP to HTTPS | Automatic (Cloudflare handles it) | No config needed |
| Legacy URL paths | `_redirects` file | Version-controlled with content |
| Locale fallback | `_redirects` file | Application routing logic |

### Pre-Deployment Validation

Before committing changes to `_redirects`, check for absolute URLs:

```bash
# Quick check for absolute URLs in _redirects
grep -E "https?://" public/_redirects
# Should return nothing — any match is an error
```

## Related Documentation

- [Migration Plan — Phase 7: Deployment](../plans/2026-02-23-feat-wordpress-to-astro-migration-plan.md) — References DNS configuration and www-to-apex handling
- [Recipe Migration Plan — Redirect Rules](../plans/2026-02-23-feat-migrate-recipes-with-images-plan.md) — Lists all 9 WordPress recipe redirect rules
- [`public/_redirects`](../../public/_redirects) — Current redirect rules (relative paths only)
- [`public/_headers`](../../public/_headers) — Companion Cloudflare configuration for cache/security headers
- [`.claude/commands/deploy.md`](../../.claude/commands/deploy.md) — Deployment workflow with post-deploy redirect verification
