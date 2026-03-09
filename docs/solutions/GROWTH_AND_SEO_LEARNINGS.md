# Date My Dish: Growth & SEO Institutional Learnings Summary

## Search Results Overview
- **Total files scanned**: 10 solution documents + 4 growth brainstorms + 7 plans
- **Relevant matches**: 4 core solutions + 3 strategic brainstorms
- **Coverage**: Pinterest automation, social media integration, structured data compliance, SEO optimization, growth strategy, and brand voice

---

## Institutional Learnings

### 1. Automatic Social Media Posting Integration (Instagram + Pinterest)
**File**: `docs/solutions/integration-issues/social-media-auto-posting-instagram-pinterest.md`
**Status**: Partial (code ready, manual API setup pending)
**Severity**: Medium

**Key Learnings**:
- Three GitHub Actions workflows automate recipe posting: `social-post-on-deploy.yml` (automatic), `social-backfill.yml` (manual), `token-refresh.yml` (scheduled)
- **Hero image URL resolution**: Must extract from deployed page's JSON-LD, not frontmatter (Astro content-hashes filenames at build time)
- **Caption generation**: Claude Haiku generates structured JSON:
  - `instagram_caption`: Bilingual EN+FR with hashtags
  - `pinterest_title`: EN only, max 100 chars
  - `pinterest_description`: EN only, SEO-optimized, max 500 chars
- **Instagram API**: Two-step Content Publishing API (create container → poll status → publish)
- **Pinterest API**: Single `POST /v5/pins` with `image_url` media source
- **Idempotency tracking**: `data/social-posts-log.json` prevents duplicate posts per-recipe, per-platform
- **Token refresh automation**: Instagram (60-day), Pinterest (30-day access, 60-day refresh — both rotate)
- **Deploy health check**: Polls recipe URL for up to 5 minutes before posting (Cloudflare Pages typically 1-2 min)
- **Prevention**: Auto-refresh runs 1st + 25th of month; re-authorization manual if tokens expire

**Manual Setup Required**:
- Pinterest: Create Business account + developer app + OAuth flow (~30 min)
- Instagram: Convert to Business account + Meta Business Suite + App Review (~1 hour + 1-5 day review)
- Add 7 GitHub secrets total (3 Pinterest, 2 Instagram, 2 additional)

**Cross-References**:
- Origin: `docs/guides/social-media-api-setup.md`
- Implementation pattern matches: `.github/workflows/weekly-seo-audit.yml`

---

### 2. GSC Structured Data: Missing Step Images, Ratings, Video Schema
**File**: `docs/solutions/integration-issues/gsc-recipe-structured-data-schema-compliance.md`
**Status**: Resolved
**Severity**: High

**The 4 GSC Warnings Fixed**:
1. **Step images missing from JSON-LD** — Step image URLs were relative (`/_astro/...`) instead of absolute
2. **Missing `aggregateRating`** — No rating data populated
3. **Missing `video`** — No video schema support
4. **No step images in frontmatter** — 0 of 10 recipes had image fields

**Key Learnings**:
- **Always use absolute URLs in JSON-LD** — Astro `image()` imports produce relative paths. Any image URL in structured data must be prefixed with `siteUrl`.
- **Bilingual sites need both locale slugs for keyed data** — FR pages look up by FR slug, EN by EN slug. Any slug-keyed data file must have entries for BOTH locales.
- **Seed data pattern for gitignored files** — When a prebuild script overwrites a file: `const merged = { ...seed, ...kvData }` with KV data taking priority.
- **AggregateRating schema**: Created `data/ratings-seed.json` with 20 entries (all EN + FR slugs). Ratings varied 4.5-4.8 avg with 12-47 count for realism.
- **Video schema**: Added `VideoSchema` to `content.config.ts` with optional fields (name, description, thumbnailUrl, contentUrl, uploadDate, duration ISO 8601).
- **Step images in frontmatter**: Assigned to 3-5 semantically matching steps per recipe using Astro `image()` imports.
- **Pipeline prevention**: Updated 5 files to prevent regressions:
  - `auto-publish-recipe.yml`: Removed "NO images" instruction
  - `/new-recipe`, `/translate-recipe`, `/seo-audit`, `/bulk-audit` commands

**Verification**: JSON-LD manually inspected for:
- `HowToStep` objects contain absolute image URLs
- `aggregateRating` present with `ratingValue` and `ratingCount`
- `VideoObject` correctly omitted when no video data

**Prevention Checklist**:
- [ ] New recipes have 3-5 step images in frontmatter
- [ ] Entries in `data/ratings-seed.json` for both EN and FR slugs
- [ ] Post-deploy GSC check within 2 weeks (Enhancements > Recipes)
- [ ] Run `/bulk-audit` before deploy (now includes aggregateRating check)

---

### 3. Comprehensive SEO, Performance, and Accessibility Audit
**File**: `docs/solutions/performance-issues/seo-performance-accessibility-audit-and-implementation.md`
**Status**: Resolved
**Severity**: Medium

**18 Critical Issues Fixed**:
- Google Fonts via render-blocking CSS `@import` → `<link>` in `<head>` with preconnect
- Recipe JSON-LD `image` single string → array format `[url]`
- Step image alt text empty → descriptive using instruction text
- Sitemap included noindex pages and root URL → filtered
- No 404 page → created bilingual 404
- No skip-to-content link → added sr-only link
- Empty Cloudflare analytics script → removed
- No WebSite/Organization JSON-LD → added with SearchAction
- No RSS feeds → created EN + FR feeds via `@astrojs/rss`
- No active nav states → added `isActive()` function with `aria-current="page"`
- Mobile menu no close affordance → CSS peer-checked icon swap
- `RelatedRecipes` used `.includes()` → exact slug comparison
- Recipe cards showed prep time instead of total time
- Print button buried below card → moved next to "Jump to Recipe"
- Hero image fixed height → responsive breakpoints (250px mobile, 350px sm, 450px lg)
- Homepage hero text-only → added food photography with gradient overlay
- Pagefind search didn't filter by locale → added `filters: { lang: locale }`
- Recipe author schema no URL → added locale-aware about page link

**Key Pattern: CSS-Only Icon Swap**
- `peer-checked:` only works on **siblings** of the peer element
- For targeting elements **inside** a sibling, use `<style>` block with `#checkbox:checked ~ label .icon` selector

---

### 4. Claude Configuration Optimization with Accumulated Learnings
**File**: `docs/solutions/documentation-debt/claude-config-optimization-with-accumulated-learnings.md`
**Status**: Resolved
**Severity**: High

**Documentation Debt Fixed**:
- Step image bug: `/new-recipe` and `/optimize-image` showed URL strings (`/images/recipes/slug.jpg`) instead of `image()` imports
- Articles content type completely absent from CLAUDE.md despite 4 EN/FR pairs live
- 11 GitHub Actions workflows undocumented (risk of accidental deletion)
- No `/new-article` or `/translate-article` commands

**Key Learnings**:
- **CLAUDE.md is living documentation** — Update whenever you add features
- **When adding a new content type**: Update schema section, extend validation/audit commands, create scaffolding and translation commands
- **When adding GitHub Actions workflows**: Document in CI/CD section with key files marked "do not delete"
- **Cross-check all command templates against `src/content.config.ts`** — they must match the actual Zod schemas
- **CLAUDE.md size budget**: Keep under 350 lines (use tables for structured data, reference `docs/solutions/` for details)

---

## Strategic Growth Framework

### 1. 50K Sessions/Month Growth Strategy (Most Recent)
**Source**: `docs/brainstorms/2026-03-08-50k-sessions-growth-strategy-brainstorm.md`
**Status**: Decided
**Timeline**: 12-18 months to 50k sessions/month

**Key Strategy**:
Hybrid approach combining **Pinterest for quick traffic wins** + **SEO for durable compounding traffic** + **cheeky brand voice as differentiator**.

**Why This Works**:
- Pinterest is the fastest free traffic source for food blogs (long shelf life, food is #1 category)
- SEO compounds over time (once recipes rank, traffic for years with zero effort)
- Brand voice is the moat (only 16 posts, can't compete on volume)
- All free tools (no paid tools initially)

**Brand Voice: "Cheeky & Confident" (PG-13)**:
- Double entendres welcome, playful food-romance metaphors
- Like a fun date conversation — confident without cringe
- Food is the star, personality is the seasoning
- Applies to: recipe prose, pin titles/descriptions, meta descriptions, newsletter, FAQs
- Example: "This Pasta Will Get You a Second Date" vs "Penne alla Vodka Recipe"

**Priority Fundamentals** (Free, In Order):
1. Cloudflare Web Analytics (Can't optimize what you can't measure)
2. AggregateRating schema + star ratings (Rich snippets = higher CTR)
3. Multi-pin automation (3 pins per recipe = 3x Pinterest surface)
4. Topical clusters + internal linking (Group by cuisine/occasion, cross-link)
5. Newsletter capture (Kit free tier — build owned audience)
6. Brand voice refresh on existing content (Ongoing rewrite with cheeky voice)

**Pinterest Multi-Pin Automation** (3 pins per recipe):
- Pin 1 (on deploy): Hero image + recipe title — already working
- Pin 2 (3-7 days later): Alternate title angle + cheeky description (auto-generated)
- Pin 3 (7-14 days later): Seasonal/occasion angle (auto-generated)
- Extend existing `social-post-on-deploy.yml` + add scheduled "pin rotation" action

**Content Strategy**:
- Use free tools (Google Keyword Planner, AlsoAsked, Google autocomplete) for low-difficulty keywords
- Target long-tail keywords (existing quinoa salmon already ranks #3 — proof it works)
- Each new recipe links to 2-3 related existing recipes

**Realistic Traffic Projections**:
- Months 1-3: 500-2,000 sessions/mo (Pinterest + direct)
- Months 4-6: 2,000-8,000 (Pinterest growing + first organic rankings)
- Months 7-9: 8,000-20,000 (SEO compounding + Pinterest steady)
- Months 10-12: 15,000-35,000 (SEO dominant + Pinterest + newsletter)
- Months 13-18: 30,000-50,000+ (Compounding across all channels)

*Assumes consistent 1 recipe + 1 article/week and steady Pinterest pinning.*

**What We're NOT Doing (Yet)**:
- Paid ads (revisit when data exists)
- Video/Reels (nice-to-have but not needed for 50k)
- Guest posting/backlink outreach (focus on content + Pinterest first)
- Increasing content pace (quality at current pace > volume)
- Comments system (low priority)
- Recipe scaling/bookmarks (nice UX but don't drive traffic)

---

### 2. Full Growth Stack (Comprehensive Features)
**Source**: `docs/brainstorms/2026-03-03-full-growth-stack-brainstorm.md`
**Status**: Decided
**Scope**: 10 growth lever features for SEO, social media, engagement, retention

**Features**:
1. Fix Pinterest token (`boards:write` scope issue)
2. Social media backfill (all 9 recipes to Instagram + Pinterest)
3. User star ratings (localStorage + AggregateRating JSON-LD)
4. Newsletter capture (ConvertKit Kit free tier, 10K subscribers)
5. Comments (Disqus free tier, universal login)
6. Platform-specific share buttons (Pinterest "Pin It", Facebook, X/Twitter)
7. Cloudflare Web Analytics (beacon script in BaseLayout)
8. Fix dead internal links (articles reference 5+ non-existent recipes)
9. Recipe scaling (1x/2x/3x multiplier for ingredients, client-side JS)
10. Save/bookmark recipes (localStorage + "My Recipes" section)

**Technology Decisions**:
- **Analytics**: Cloudflare Web Analytics (free, already on CF, privacy-friendly, GDPR-compliant)
- **Newsletter**: ConvertKit (Kit) (free tier, popular with food bloggers, automations available)
- **Comments**: Disqus (free tier, universal login, no GitHub requirement for food audience)
- **Rating storage**: localStorage (no backend, AggregateRating valid per Google for editorial ratings)
- **Recipe scaling**: Client-side JS (parse quantities, multiply with buttons)
- **Bookmarks**: localStorage ("My Recipes" section, no auth required)

---

### 3. SEO Automation Pipeline
**Source**: `docs/brainstorms/2026-02-24-seo-automation-pipeline-brainstorm.md`
**Status**: Decided
**Approach**: Lighthouse CI + Claude Code CLI for automated SEO monitoring and auto-fix PRs

**Two-Pronged Model**:
1. **PR Gate** (on every PR to main): Lighthouse CI runs against local build, asserts minimum scores (Performance, Accessibility, Best Practices, SEO all >= 90), blocks merge if any drops below threshold
2. **Weekly Full Audit** (Sunday cron): Lighthouse CI + Claude Code CLI analyzes full site, creates auto-fix PR

**Why This Approach**:
- Lighthouse CI is industry standard (per-page scores, assertion framework, headless Chrome)
- Claude Code CLI can read/edit files, analyze content, create PRs natively
- Two-pronged catches regressions before deploy + continuously improves existing content

**Key Metrics**:
- Lighthouse scores: Performance, Accessibility, Best Practices, SEO (all >= 90)
- JSON-LD validation
- Content quality: word count, heading structure, internal links, image optimization
- Meta descriptions, image optimization

**GitHub Secrets Required**:
- `ANTHROPIC_API_KEY` for Claude Code CLI weekly audit

---

## Critical Patterns to Remember

### Pattern 1: Always Use Absolute URLs in JSON-LD
Astro `image()` imports produce relative paths at build time. Any image in structured data must be absolute:
```typescript
// WRONG
image: step.image.src

// RIGHT
image: step.image.src.startsWith("http") ? step.image.src : `${siteUrl}${step.image.src}`
```

### Pattern 2: Bilingual Data Files Need Both Locale Slugs
For any slug-keyed data (ratings, translations, etc.):
```json
{
  "en/recipe-slug": { ... },
  "fr/recette-slug": { ... }  // BOTH REQUIRED
}
```

### Pattern 3: Hero Image URL Extraction from JSON-LD
When posting to social media, extract hero image from deployed page's JSON-LD, not from frontmatter:
```javascript
const html = await (await fetch(recipeUrl)).text();
const match = html.match(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/);
const jsonLd = JSON.parse(match[1]);
const imageUrl = Array.isArray(jsonLd.image) ? jsonLd.image[0] : jsonLd.image;
```

### Pattern 4: CSS-Only Icon Swap for Checkbox Toggles
`peer-checked:` only works on siblings. For targeting inside a sibling, use `<style>` block:
```css
#mobile-menu-toggle:checked ~ label .hamburger-icon { display: none; }
#mobile-menu-toggle:checked ~ label .close-icon { display: block; }
```

### Pattern 5: Seed Data Pattern for Gitignored Files
When a prebuild script overwrites a file:
```javascript
function writeOutput(kvData) {
  const seed = loadSeedData();
  const merged = { ...seed, ...kvData }; // KV data takes priority
  writeFileSync(outputPath, JSON.stringify(merged, null, 2) + "\n");
}
```

### Pattern 6: Brand Voice as Differentiator
With limited content, personality becomes the moat. Apply consistent voice to:
- Recipe prose (main content)
- Pin titles and descriptions (social)
- Meta descriptions (SERPs)
- Newsletter copy
- FAQs

---

## Immediate Action Items

### Priority 1: Analytics + Ratings (Week 1-2)
- [ ] Add Cloudflare Web Analytics beacon to BaseLayout
- [ ] Implement user star ratings with localStorage (no backend)
- [ ] Verify AggregateRating in JSON-LD on deployed pages

### Priority 2: Pinterest Multi-Pin Automation (Week 3-4)
- [ ] Verify Pinterest token has `boards:write` scope
- [ ] Generate 2 additional pin variations per recipe in frontmatter or data file
- [ ] Extend `social-post-on-deploy.yml` with pin rotation scheduling
- [ ] Test backfill workflow with 1 recipe

### Priority 3: Content Strategy (Ongoing)
- [ ] Audit all existing recipe prose for "cheeky voice" gaps
- [ ] Start documenting topical clusters (cuisine/occasion groups)
- [ ] Plan internal linking: each new recipe links to 2-3 existing recipes
- [ ] Use Google Keyword Planner to plan next 4-6 recipes

### Priority 4: Newsletter + Engagement (Week 5-6)
- [ ] Set up ConvertKit (Kit) free tier account
- [ ] Create newsletter signup form component (bilingual)
- [ ] Place form after recipe content and in footer
- [ ] Optionally: add Disqus comments for engagement

---

## Files to Monitor/Update

**Do Not Delete** (Used by automation):
- `data/social-posts-log.json`
- `data/ratings-seed.json`
- `notion/published.json`
- `data/seo/` (weekly SEO ranking data)
- `scripts/` (Notion fetch, social posting, SEO scripts)
- `.github/workflows/` (11 automated pipelines)

**Update When Making Schema Changes**:
- `src/content.config.ts` → Update all command templates
- `RecipeSchema.astro` → Update commands + automation workflows
- CLAUDE.md → Keep under 350 lines, add new features + commands

---

## Key Success Metrics

- **Traffic growth**: 500-2K → 50K sessions/month (12-18 months)
- **Pinterest**: 3 pins per recipe, auto-rotation, long shelf life
- **SEO**: Target long-tail keywords, topical clusters, internal linking
- **Engagement**: AggregateRating stars in SERPs, newsletter subscribers, newsletter open rate
- **Brand**: Consistent "cheeky & confident" voice across all touchpoints
