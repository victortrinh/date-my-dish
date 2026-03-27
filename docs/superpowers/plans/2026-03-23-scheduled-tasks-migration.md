# Scheduled Tasks Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate 8 GitHub Actions workflows from ANTHROPIC_API_KEY (pay-as-you-go) to Claude Code scheduled remote agents (Claude Max subscription), eliminating API costs.

**Architecture:** Hybrid approach: GH Actions handle external API calls (Notion, Pinterest, Instagram, Cloudflare KV), scheduled remote agents handle all Claude-powered content generation. File-based handoff via `notion/pending-*.json` files committed to main.

**Tech Stack:** GitHub Actions, Claude Code RemoteTrigger API, Node.js scripts, Astro content schemas (Zod)

**Spec:** `docs/superpowers/specs/2026-03-23-scheduled-tasks-migration-design.md`

---

## Phase 1: Prerequisites & Schema Changes

### Task 1: Verify remote agent environment capabilities

**Files:**
- None (manual verification)

- [ ] **Step 1: Connect GitHub for remote agents**

Run `/web-setup` in Claude Code CLI to connect GitHub credentials, or install the Claude GitHub App at https://claude.ai/code/onboarding?magic=github-app-setup. This allows remote agents to clone the repo and create PRs.

- [ ] **Step 2: Create a test scheduled task**

Use `RemoteTrigger` to create a one-time test task that verifies the environment:

```
Prompt: "Run the following checks and report results:
1. node --version
2. npm --version
3. which convert || echo 'ImageMagick not available'
4. which npx sharp-cli || echo 'sharp-cli not available'
5. git log --oneline -5 (verify full history, not shallow clone)
6. npm ci && echo 'npm ci succeeded' (in the repo root)
7. npm run check && echo 'check passed' || echo 'check failed - investigate'
Report each result clearly."
```

Run it with "Run Now" and review the output. Note any missing capabilities.

- [ ] **Step 3: Document environment findings**

Based on test results, note:
- If ImageMagick is missing: `/optimize-image` skill may need to use `sharp` instead
- If `npm run check` fails due to missing `data/ratings.json`: proceed to Task 2
- If git history is shallow: scheduled task prompts need `git fetch --unshallow` as first step

---

### Task 2: Ensure data/ratings.json availability

**Files:**
- Check: `data/ratings.json` (may or may not exist in repo)
- Check: `scripts/fetch-ratings.mjs`
- Modify: `.github/workflows/weekly-seo-ranking.yml` (if ratings.json needs periodic commit)

- [ ] **Step 1: Check if ratings.json is in the repo**

```bash
ls -la data/ratings.json
cat .gitignore | grep ratings
```

- [ ] **Step 2: Check if npm run check requires it**

```bash
# Remove or rename the file temporarily
mv data/ratings.json data/ratings.json.bak 2>/dev/null
npm run check
# Restore
mv data/ratings.json.bak data/ratings.json 2>/dev/null
```

- [ ] **Step 3: If check fails without ratings.json, commit it to the repo**

Option A: Remove from `.gitignore` and commit the current file.
Option B: Add a step to `weekly-seo-ranking.yml` that commits `data/ratings.json` after fetching.

Choose the simplest approach. If the file changes frequently, option B is better.

- [ ] **Step 4: Commit**

```bash
git add data/ratings.json .gitignore
git commit -m "chore: track ratings.json in repo for remote agent compatibility"
```

---

### Task 3: Add socialCaption to content schemas

**Files:**
- Modify: `src/content.config.ts:46-90` (recipe schema)
- Modify: `src/content.config.ts:92-114` (article schema)
- Modify: `src/content.config.ts:116-171` (review schema)

- [ ] **Step 1: Add socialCaption schema to recipe collection**

In `src/content.config.ts`, add after the existing optional fields in the recipe schema (around line 87, before `faqs`):

```typescript
socialCaption: z.object({
  instagram: z.string().optional(),
  pinterest: z.string().optional(),
}).optional(),
```

- [ ] **Step 2: Add same schema to article collection**

Add the same `socialCaption` field to the article schema (around line 112).

- [ ] **Step 3: Add same schema to review collection**

Add the same `socialCaption` field to the review schema (around line 168).

- [ ] **Step 4: Verify schema compiles**

```bash
npm run check
```

Expected: PASS (no existing content has `socialCaption`, and the field is optional)

- [ ] **Step 5: Commit**

```bash
git add src/content.config.ts
git commit -m "feat: add socialCaption field to recipe, article, and review schemas"
```

---

## Phase 2: Modify Existing Scripts

### Task 4: Modify fetch-notion-recipe.mjs to output pending JSON

**Files:**
- Modify: `scripts/fetch-notion-recipe.mjs` (336 lines)

The current script outputs two files (`notion-recipe-selection.json`, `notion-recipe-content.json`) and GitHub Actions output variables. It needs to instead write a single `notion/pending-recipe.json` combining both, plus commit downloaded images.

- [ ] **Step 1: Read the current script output logic**

Read `scripts/fetch-notion-recipe.mjs` lines 277-336 to understand current output format.

- [ ] **Step 2: Modify output to write pending-recipe.json**

Replace the two-file output (lines ~277-325) with a single `notion/pending-recipe.json` write:

```javascript
// Replace the existing output section with:
const pendingData = {
  source: "notion",
  fetchedAt: new Date().toISOString(),
  notionPageId: selectedRecipe.pageId,
  title: selectedRecipe.title,
  recipeNum: selectedRecipe.recipeNum,
  mode: selectedRecipe.mode,
  existingSlug: selectedRecipe.existingSlug || null,
  lastEditedTime: selectedRecipe.lastEditedTime,
  times: selectedRecipe.times,
  difficulty: selectedRecipe.difficulty,
  servings: selectedRecipe.servings,
  category: selectedRecipe.category,
  heroImage: selectedRecipe.heroImage,
  blocks: blocks,
  faqs: faqs,
  images: downloadedImages.map(img => ({
    localPath: img.localPath,  // path relative to repo root in src/assets/images/
    caption: img.caption || "",
    isHero: img.isHero || false,
  })),
};

fs.writeFileSync("notion/pending-recipe.json", JSON.stringify(pendingData, null, 2));
console.log("Wrote notion/pending-recipe.json");
```

Keep the GitHub Actions output variables (`found`, `mode`, `recipe_num`) so the slimmed workflow can still check them.

- [ ] **Step 3: Ensure images are downloaded to src/assets/images/recipes/**

Verify the image download section (lines ~246-274) saves to `src/assets/images/recipes/` (not `/tmp/`). The GH Action will `git add` these.

- [ ] **Step 4: Test locally**

```bash
# Dry run - this will fail without Notion access, but verify the script parses
node scripts/fetch-notion-recipe.mjs --dry-run 2>&1 || echo "Expected: fails without Notion"
```

- [ ] **Step 5: Commit**

```bash
git add scripts/fetch-notion-recipe.mjs
git commit -m "refactor: fetch-notion-recipe outputs single pending-recipe.json"
```

---

### Task 5: Modify fetch-notion-article.mjs to output pending JSON

**Files:**
- Modify: `scripts/fetch-notion-article.mjs`

Same pattern as Task 4 but for articles.

- [ ] **Step 1: Read the current article script**

Read `scripts/fetch-notion-article.mjs` to understand its output format.

- [ ] **Step 2: Modify output to write pending-article.json**

Apply the same transformation: merge selection + content into `notion/pending-article.json` with the pending file schema. Articles don't have `times`, `difficulty`, `servings`, `category` but have different fields. Preserve article-specific fields.

- [ ] **Step 3: Commit**

```bash
git add scripts/fetch-notion-article.mjs
git commit -m "refactor: fetch-notion-article outputs single pending-article.json"
```

---

### Task 6: Modify fetch-notion-review script (if exists) or create it

**Files:**
- Check: `scripts/fetch-notion-review.mjs` (may not exist yet)
- Modify or Create as needed

- [ ] **Step 1: Check if review fetch script exists**

```bash
ls scripts/fetch-notion-review.mjs 2>/dev/null || echo "Does not exist"
```

- [ ] **Step 2: If exists, apply same pending-file pattern as Tasks 4-5**

Output to `notion/pending-review.json` with review-specific fields (restaurantName, neighborhood, address, cuisine, priceRange, etc.).

- [ ] **Step 3: If doesn't exist, check how auto-publish-review.yml currently fetches**

Read `.github/workflows/auto-publish-review.yml` lines 45-51 to see what script it calls. Create or modify accordingly.

- [ ] **Step 4: Commit**

```bash
git add scripts/fetch-notion-review.mjs
git commit -m "refactor: fetch-notion-review outputs single pending-review.json"
```

---

### Task 7: Modify social-post.mjs to use frontmatter captions

**Files:**
- Modify: `scripts/social-post.mjs` (621 lines)

Remove the `@anthropic-ai/sdk` dependency and Claude Haiku API call (lines 12, 131-218). Replace with reading `socialCaption` from MDX frontmatter, falling back to a template.

- [ ] **Step 1: Read the current caption generation logic**

Read `scripts/social-post.mjs` lines 131-218 to understand the Claude API call and its output format.

- [ ] **Step 2: Remove Anthropic SDK import**

Delete line 12:
```javascript
// DELETE: import Anthropic from "@anthropic-ai/sdk";
```

- [ ] **Step 3: Replace generateCaptions function**

Replace the Claude API call (lines ~131-218) with frontmatter reading + template fallback:

```javascript
async function generateCaptions(enData, frData) {
  // Check if socialCaption exists in frontmatter
  if (enData.socialCaption) {
    const sc = enData.socialCaption;
    return {
      instagram_caption: sc.instagram || buildInstagramTemplate(enData, frData),
      pinterest_title: sc.pinterest ? sc.pinterest.split('\n')[0] : enData.title,
      pinterest_description: sc.pinterest || buildPinterestTemplate(enData),
      // For pin variants, reuse the main pinterest caption
      pinterest_title_v2: enData.title,
      pinterest_description_v2: sc.pinterest || buildPinterestTemplate(enData),
      pinterest_title_v3: enData.title,
      pinterest_description_v3: sc.pinterest || buildPinterestTemplate(enData),
    };
  }

  // Fallback: generate from title + description (no Claude API needed)
  // Note: pin rotation quality degrades for pre-migration recipes (identical variants)
  return {
    instagram_caption: buildInstagramTemplate(enData, frData),
    pinterest_title: enData.title,
    pinterest_description: buildPinterestTemplate(enData),
    pinterest_title_v2: enData.title,
    pinterest_description_v2: buildPinterestTemplate(enData),
    pinterest_title_v3: enData.title,
    pinterest_description_v3: buildPinterestTemplate(enData),
  };
}

function buildInstagramTemplate(enData, frData) {
  const tags = (enData.tags || []).map(t => `#${t.replace(/\s+/g, '')}`).join(' ');
  const frTitle = frData ? `\n${frData.title}` : '';
  return `${enData.title}${frTitle}\n\n${enData.description}\n\nFull recipe on datemydish.com\n\n${tags}`;
}

function buildPinterestTemplate(data) {
  return `${data.description} Get the full recipe at datemydish.com!`;
}
```

- [ ] **Step 4: Remove ANTHROPIC_API_KEY from env var reads**

In the environment variables section (lines ~27-35), remove the `ANTHROPIC_API_KEY` reference.

- [ ] **Step 5: Read the frontmatter parsing function**

Read the existing `parseRecipeFrontmatter` function (lines ~52-57) to ensure it can extract `socialCaption`. If it uses gray-matter or similar, `socialCaption` should be available automatically.

- [ ] **Step 6: Verify the script still works with existing recipes (no socialCaption)**

```bash
# Test with an existing recipe that has no socialCaption
node scripts/social-post.mjs --dry-run src/content/recipes/en/cacio-e-pepe.mdx 2>&1 || echo "Check for issues"
```

- [ ] **Step 7: Remove @anthropic-ai/sdk package**

Check if any other file imports this package. If not, remove it:

```bash
grep -r "anthropic-ai/sdk" scripts/ src/ --include="*.mjs" --include="*.js" --include="*.ts" | grep -v social-post.mjs
# If no results, remove the package:
npm uninstall @anthropic-ai/sdk
```

- [ ] **Step 8: Commit**

```bash
git add scripts/social-post.mjs package.json package-lock.json
git commit -m "refactor: social-post reads captions from frontmatter, removes Claude API dependency"
```

---

## Phase 3: Slim Down GitHub Actions Workflows

### Task 8: Slim auto-publish-recipe.yml to Notion fetch only

**Files:**
- Modify: `.github/workflows/auto-publish-recipe.yml` (386 lines)

Replace the 386-line workflow with a slim ~40-line version that only fetches from Notion and commits pending files.

- [ ] **Step 1: Read the current workflow**

Read `.github/workflows/auto-publish-recipe.yml` to understand the full structure.

- [ ] **Step 2: Rewrite the workflow**

Replace the entire file with:

```yaml
name: Fetch Pending Recipe from Notion
on:
  schedule:
    - cron: '0 1 * * 4'  # Thursday 1AM UTC (2h before scheduled task)
  workflow_dispatch:

concurrency:
  group: fetch-recipe
  cancel-in-progress: false

permissions:
  contents: write

env:
  NOTION_DB_PAGE: "9ce95183503543d68450194d1010824b"

jobs:
  fetch:
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      - uses: actions/checkout@v6

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      - run: npm ci

      - name: Fetch from Notion
        run: node scripts/fetch-notion-recipe.mjs
        env:
          NOTION_TOKEN: ${{ secrets.NOTION_TOKEN }}

      - name: Commit pending file if created
        run: |
          if [ -f notion/pending-recipe.json ]; then
            git config user.name "github-actions[bot]"
            git config user.email "github-actions[bot]@users.noreply.github.com"
            git add notion/pending-recipe.json notion/published.json "src/assets/images/recipes/**"
            git commit -m "chore: fetch pending recipe from Notion" || echo "No changes to commit"
            git push
          else
            echo "No recipe ready to publish"
          fi
```

- [ ] **Step 3: Verify YAML syntax**

```bash
python3 -c "import yaml; yaml.safe_load(open('.github/workflows/auto-publish-recipe.yml'))" && echo "Valid YAML"
```

- [ ] **Step 4: Commit**

```bash
git add .github/workflows/auto-publish-recipe.yml
git commit -m "refactor: slim auto-publish-recipe to Notion fetch only (Claude moves to scheduled task)"
```

---

### Task 9: Slim auto-publish-article.yml to Notion fetch only

**Files:**
- Modify: `.github/workflows/auto-publish-article.yml` (338 lines)

Same pattern as Task 8 but for articles.

- [ ] **Step 1: Rewrite the workflow**

Replace with slim version: cron `'0 1 * * 1'` (Monday 1AM UTC), fetch from Notion, commit `notion/pending-article.json`.

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/auto-publish-article.yml
git commit -m "refactor: slim auto-publish-article to Notion fetch only"
```

---

### Task 10: Slim auto-publish-review.yml to Notion fetch only

**Files:**
- Modify: `.github/workflows/auto-publish-review.yml` (360 lines)

Same pattern as Task 8 but for reviews.

- [ ] **Step 1: Rewrite the workflow**

Replace with slim version: cron `'0 1 * * 3'` (Wednesday 1AM UTC), fetch from Notion, commit `notion/pending-review.json`.

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/auto-publish-review.yml
git commit -m "refactor: slim auto-publish-review to Notion fetch only"
```

---

### Task 11: Create post-merge-kv-seed.yml

**Files:**
- Create: `.github/workflows/post-merge-kv-seed.yml`

This new workflow seeds Cloudflare KV with initial ratings when a recipe PR is merged. Previously, this was done inside the Claude prompt in `auto-publish-recipe.yml`.

- [ ] **Step 1: Create the workflow**

```yaml
name: Seed Rating to KV on Recipe Merge
on:
  pull_request:
    types: [closed]
    paths:
      - 'src/content/recipes/en/**/*.mdx'

jobs:
  seed:
    if: github.event.pull_request.merged == true
    runs-on: ubuntu-latest
    timeout-minutes: 5
    steps:
      - uses: actions/checkout@v6

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      - run: npm ci

      - name: Find new recipe slugs and seed ratings
        run: |
          # Get the list of added recipe files in this PR
          ADDED_FILES=$(git diff --name-only --diff-filter=A HEAD~1 HEAD -- 'src/content/recipes/en/**/*.mdx' || echo "")

          for file in $ADDED_FILES; do
            slug=$(basename "$file" .mdx)
            echo "Seeding rating for: $slug"
            node scripts/seed-rating-to-kv.mjs "$slug" 4.8 42

            # Also seed French version
            fr_slug=$(grep 'translationSlug:' "$file" | head -1 | sed 's/.*translationSlug: *"\(.*\)"/\1/' | tr -d '"' | tr -d ' ')
            if [ -n "$fr_slug" ]; then
              echo "Seeding FR rating for: $fr_slug"
              node scripts/seed-rating-to-kv.mjs "$fr_slug" 4.8 42
            fi
          done
        env:
          CF_ACCOUNT_ID: ${{ secrets.CF_ACCOUNT_ID }}
          CF_API_TOKEN: ${{ secrets.CF_API_TOKEN }}
          CF_KV_NAMESPACE_ID: ${{ secrets.CF_KV_NAMESPACE_ID }}
```

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/post-merge-kv-seed.yml
git commit -m "feat: add post-merge KV seed workflow for recipe ratings"
```

---

### Task 12: Slim weekly-seo-audit.yml (keep Lighthouse, remove Claude)

**Files:**
- Modify: `.github/workflows/weekly-seo-audit.yml` (215 lines)

Keep the Lighthouse CI runs (lines 47-75), remove the Claude analysis step (lines 87-158), add a step to commit Lighthouse results to `data/lighthouse/`.

- [ ] **Step 1: Read the current workflow in full**

Read `.github/workflows/weekly-seo-audit.yml` to understand all steps.

- [ ] **Step 2: Modify the workflow**

Keep:
- Trigger (Sun 3AM UTC cron)
- Checkout, setup, build, Astro cache
- Lighthouse CI desktop + mobile runs
- Save lighthouse results

Remove:
- Close stale PR step (scheduled task handles this)
- Claude Code SEO analysis step (lines 87-158)
- Build verification after Claude changes
- PR creation step

Add:
- Commit Lighthouse results to `data/lighthouse/` and push to main

```yaml
      - name: Commit Lighthouse results
        run: |
          mkdir -p data/lighthouse
          cp lighthouse-manifest.json data/lighthouse/lighthouse-$(date +%Y-%m-%d).json
          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"
          git add data/lighthouse/
          git commit -m "chore: save Lighthouse results for $(date +%Y-%m-%d)" || echo "No changes"
          git push
```

- [ ] **Step 3: Add data/lighthouse/ to .gitignore exceptions if needed**

Check if `data/` is gitignored. If so, add `!data/lighthouse/`.

- [ ] **Step 4: Commit**

```bash
git add .github/workflows/weekly-seo-audit.yml
git commit -m "refactor: slim weekly-seo-audit to Lighthouse only (Claude moves to scheduled task)"
```

---

### Task 13: Update social posting workflows to remove ANTHROPIC_API_KEY

**Files:**
- Modify: `.github/workflows/social-post-on-deploy.yml` (line 55)
- Modify: `.github/workflows/social-backfill.yml` (line 48)

- [ ] **Step 1: Remove ANTHROPIC_API_KEY from social-post-on-deploy.yml**

In `.github/workflows/social-post-on-deploy.yml`, remove the line:
```yaml
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
```

- [ ] **Step 2: Remove ANTHROPIC_API_KEY from social-backfill.yml**

In `.github/workflows/social-backfill.yml`, remove the line:
```yaml
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
```

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/social-post-on-deploy.yml .github/workflows/social-backfill.yml
git commit -m "refactor: remove ANTHROPIC_API_KEY from social posting workflows"
```

---

### Task 14: Delete fully replaced workflows

**Files:**
- Delete: `.github/workflows/seo-auto-optimize.yml`
- Delete: `.github/workflows/reverse-internal-linking.yml`

- [ ] **Step 1: Delete the workflows**

```bash
git rm .github/workflows/seo-auto-optimize.yml .github/workflows/reverse-internal-linking.yml
```

- [ ] **Step 2: Commit**

```bash
git commit -m "chore: delete seo-auto-optimize and reverse-internal-linking (moved to scheduled tasks)"
```

---

## Phase 4: Create Scheduled Tasks

All scheduled tasks use the `RemoteTrigger` tool with `action: "create"`. Each needs a fresh UUID for `events[].data.uuid`. Use `claude-code-default` environment (id: `env_015N1h8xMvzHg7PAJhmo8dvb`). Default model: `claude-sonnet-4-6`.

### Task 15: Create publish-recipe scheduled task

**Files:**
- None (API call to create remote trigger)

- [ ] **Step 1: Create the scheduled task**

Use `RemoteTrigger` with `action: "create"`:

```json
{
  "name": "publish-recipe",
  "cron_expression": "0 3 * * 4",
  "enabled": true,
  "job_config": {
    "ccr": {
      "environment_id": "env_015N1h8xMvzHg7PAJhmo8dvb",
      "session_context": {
        "model": "claude-sonnet-4-6",
        "sources": [
          {"git_repository": {"url": "https://github.com/victortrinh/date-my-dish"}}
        ],
        "allowed_tools": ["Bash", "Read", "Write", "Edit", "Glob", "Grep"]
      },
      "events": [
        {"data": {
          "uuid": "<generate-fresh-uuid>",
          "session_id": "",
          "type": "user",
          "parent_tool_use_id": null,
          "message": {"content": "You are a content publishing agent for Date My Dish.\n\n## Setup\n1. Check if `notion/pending-recipe.json` exists. If not, exit with message \"No pending recipe.\"\n2. Read the pending file. Check the `fetchedAt` timestamp. If older than 7 days, note this in the PR body: \"Note: this content was fetched {N} days ago.\"\n3. Close any open PRs labeled \"auto-publish\": gh pr list --label auto-publish --state open --json number -q '.[].number' | xargs -I {} gh pr close {} --comment \"Superseded by newer content.\"\n4. Read CLAUDE.md to understand the project.\n5. Read `docs/brand-voice-guide.md` for tone calibration.\n\n## Content Generation\n6. Use /new-recipe to scaffold EN/FR MDX files.\n7. Fill in all frontmatter fields from the Notion data. Do NOT add a `summary` field (it is not in the schema).\n8. The pending file's `images` array contains repo-relative paths (e.g., `src/assets/images/recipes/{slug}.jpg`). Use these paths directly in frontmatter `heroImage` and `instructionGroups.steps[].image` fields. Map ALL images to instruction steps, not just a subset.\n9. Use /optimize-image on the downloaded images (they are already in `src/assets/images/recipes/`).\n10. Generate a socialCaption (instagram + pinterest) and include in frontmatter.\n\n## Writing the Prose (CRITICAL)\n11. Before writing, read the `blocks` array in the pending JSON carefully. This is the author's original content from Notion with their voice, stories, tips, and personality. USE THIS as the foundation for the prose.\n12. Read 2 existing recipes for structure reference: `src/content/recipes/en/cacio-e-pepe.mdx` and `src/content/recipes/en/penne-alla-vodka.mdx`. Match their H2 structure, image placement, cross-linking patterns, and voice.\n13. Use /write-prose to generate the EN blog body (800-1500 words). The prose MUST:\n    - Incorporate the Notion content's personality, anecdotes, shopping notes, expert tips, and specific advice\n    - Use 6-7 H2 sections (not 5) matching established patterns\n    - Place ALL available images (5-7) throughout the body, not just 3-4\n    - Write variations as flowing prose paragraphs, NOT bold-label lists\n    - Use first person where natural (\"This is my go-to\", \"I won't budge on\")\n    - Match the cheeky & confident tone from the brand voice guide\n    - Avoid a redundant \"What is X?\" section that repeats the opening paragraph\n14. Use /translate-recipe to create the FR version.\n15. Use /humanizer on all generated copy (EN and FR prose, descriptions, FAQs, social captions).\n16. Run /seo-audit on the new recipe.\n\n## Cleanup\n17. Remove notion/pending-recipe.json and update notion/published.json.\n18. Create a PR titled \"feat(recipe): add {recipe-name}\" labeled \"auto-publish\" with all changes.", "role": "user"}
        }}
      ]
    }
  }
}
```

- [ ] **Step 2: Record the trigger ID**

Save the returned trigger ID. Link: `https://claude.ai/code/scheduled/{TRIGGER_ID}`

- [ ] **Step 3: Test with "Run Now"**

If there is a `notion/pending-recipe.json` on main, run the task to verify it works end-to-end. If not, create a test pending file first, or verify the no-op behavior (exits cleanly when no pending file).

---

### Task 16: Create publish-article scheduled task

**Files:**
- None (API call)

- [ ] **Step 1: Create the scheduled task**

Same structure as Task 15, with:
- `name`: `"publish-article"`
- `cron_expression`: `"0 3 * * 1"` (Monday 3AM UTC)
- Prompt adapted for articles: check `notion/pending-article.json`, use `/new-article`, `/translate-article`, etc.

- [ ] **Step 2: Record trigger ID and test**

---

### Task 17: Create publish-review scheduled task

**Files:**
- None (API call)

- [ ] **Step 1: Create the scheduled task**

Same structure as Task 15, with:
- `name`: `"publish-review"`
- `cron_expression`: `"0 3 * * 3"` (Wednesday 3AM UTC)
- Prompt adapted for reviews: check `notion/pending-review.json`, use review-specific content schema fields (restaurantName, neighborhood, address, cuisine, priceRange, dateScore, reviewCategory, bestFor, costPerPerson, dishHighlights, dateTypeFit).

- [ ] **Step 2: Record trigger ID and test**

---

### Task 18: Create weekly-seo-audit scheduled task

**Files:**
- None (API call)

- [ ] **Step 1: Create the scheduled task**

```json
{
  "name": "weekly-seo-audit",
  "cron_expression": "0 5 * * 0",
  "enabled": true,
  ...
  "message": {"content": "You are an SEO audit agent for Date My Dish.\n\n1. Read CLAUDE.md for project context.\n2. Check if data/lighthouse/ has recent results. If so, review them for performance issues.\n3. Run /bulk-audit on all content.\n4. If issues are found, fix them.\n5. If any changes were made, create a PR titled \"fix(seo): weekly audit fixes - {date}\".\n6. If no issues found, exit with message \"All content passed audit.\"", "role": "user"}
}
```

Schedule: Sunday 5AM UTC (2 hours after Lighthouse GH Action at 3AM).

- [ ] **Step 2: Record trigger ID and test**

---

### Task 19: Create weekly-seo-optimize scheduled task

**Files:**
- None (API call)

- [ ] **Step 1: Create the scheduled task**

```json
{
  "name": "weekly-seo-optimize",
  "cron_expression": "0 10 * * 1",
  "enabled": true,
  ...
  "message": {"content": "You are an SEO optimization agent for Date My Dish.\n\n1. Read CLAUDE.md for project context.\n2. Check git log for changes to data/seo/ in the last 48 hours. If none, exit.\n3. Read the latest ranking data from data/seo/.\n4. Identify underperforming content (declining rankings, low CTR).\n5. Optimize meta descriptions, titles, and content for those pages.\n6. Use /humanizer on any rewritten copy.\n7. Create a PR titled \"fix(seo): optimize underperforming content - {date}\".", "role": "user"}
}
```

Schedule: Monday 10AM UTC (2 hours after weekly-seo-ranking at 8AM).

- [ ] **Step 2: Record trigger ID and test**

---

### Task 20: Create daily-internal-linking scheduled task

**Files:**
- None (API call)

- [ ] **Step 1: Create the scheduled task**

```json
{
  "name": "daily-internal-linking",
  "cron_expression": "0 5 * * *",
  "enabled": true,
  ...
  "message": {"content": "You are an internal linking agent for Date My Dish.\n\n1. Read CLAUDE.md for project context.\n2. Check git log for new content merged in the last 24 hours. If none, exit.\n3. Scan all existing recipes, articles, and reviews for opportunities to link to the new content.\n4. Add natural internal links where relevant (max 2-3 per existing page).\n5. Use /humanizer on any rewritten sentences.\n6. Create a PR titled \"fix(seo): add internal links for new content - {date}\".", "role": "user"}
}
```

Schedule: Daily 5AM UTC.

- [ ] **Step 2: Record trigger ID and test**

---

## Phase 5: Verification & Cleanup

### Task 21: End-to-end verification

- [ ] **Step 1: Verify no workflow uses ANTHROPIC_API_KEY**

```bash
grep -r "ANTHROPIC_API_KEY" .github/workflows/
```

Expected: No results.

- [ ] **Step 2: Verify all scheduled tasks are listed**

Use `RemoteTrigger` with `action: "list"` to confirm all 6 tasks exist:
- publish-recipe (Thu 3AM UTC)
- publish-article (Mon 3AM UTC)
- publish-review (Wed 3AM UTC)
- weekly-seo-audit (Sun 5AM UTC)
- weekly-seo-optimize (Mon 10AM UTC)
- daily-internal-linking (Daily 5AM UTC)

- [ ] **Step 3: Run each scheduled task manually**

Use `RemoteTrigger` with `action: "run"` for each task. Verify:
- Content publishing tasks: exit cleanly if no pending file (no-op)
- SEO/linking tasks: exit cleanly if no recent changes (no-op)

- [ ] **Step 4: Test a full publish cycle**

Manually trigger the Notion fetch GH Action (`workflow_dispatch`), wait for it to commit a pending file, then run the corresponding scheduled task. Verify the PR is created correctly.

- [ ] **Step 5: Verify social posting still works**

Check that `scripts/social-post.mjs` works without `ANTHROPIC_API_KEY` by running a dry-run against an existing recipe.

---

### Task 22: Document trigger IDs and notify user to remove API key

- [ ] **Step 1: Create a summary of all trigger IDs**

List all scheduled tasks with their IDs and management URLs:
```
publish-recipe: https://claude.ai/code/scheduled/{ID}
publish-article: https://claude.ai/code/scheduled/{ID}
...
```

- [ ] **Step 2: Final commit with any remaining changes**

```bash
git add -A
git commit -m "chore: complete migration from ANTHROPIC_API_KEY to Claude Code scheduled tasks"
```

- [ ] **Step 3: Remind user to remove ANTHROPIC_API_KEY**

After verifying everything works, the user should remove `ANTHROPIC_API_KEY` from GitHub repository secrets at:
`https://github.com/victortrinh/date-my-dish/settings/secrets/actions`

This is a manual step. Keep the secret for 30 days as a rollback safety net before deleting.
