# Fix Pinterest Workflow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix Pinterest caption quality (remove URLs, humanize copy), fix deploy detection for missed recipes, and update all 33 live pins.

**Architecture:** Fix `social-post.mjs` caption generation to stop embedding URLs and produce distinct variant titles. Add log cross-reference to deploy workflow so unposted recipes are caught. Write humanized `socialCaption.pinterest` for all 14 EN recipes. Regenerate `social-posts-log.json` with new captions and update live pins via existing update script.

**Tech Stack:** Node.js scripts (ESM), GitHub Actions YAML, MDX frontmatter, Pinterest API v5

---

### Task 1: Fix `buildPinterestTemplate()` in `social-post.mjs`

**Files:**
- Modify: `scripts/social-post.mjs:163-165`

- [ ] **Step 1: Remove URL suffix from `buildPinterestTemplate()`**

In `scripts/social-post.mjs`, replace the `buildPinterestTemplate` function:

```js
// Before (line 163-165):
function buildPinterestTemplate(data) {
  return `${data.description} Get the full recipe at datemydish.com!`;
}

// After:
function buildPinterestTemplate(data) {
  return data.description;
}
```

- [ ] **Step 2: Commit**

```bash
git add scripts/social-post.mjs
git commit -m "fix(pinterest): remove URL suffix from template fallback description"
```

---

### Task 2: Fix `generateCaptions()` in `social-post.mjs`

**Files:**
- Modify: `scripts/social-post.mjs:129-155`

- [ ] **Step 1: Replace `generateCaptions()` with distinct variant titles**

Replace the entire `generateCaptions` function (lines 129-155) with:

```js
async function generateCaptions(enData, frData) {
  const baseDescription = enData.socialCaption?.pinterest || buildPinterestTemplate(enData);
  const baseTitle = enData.socialCaption?.pinterest
    ? enData.socialCaption.pinterest.split('\n')[0].slice(0, 100)
    : enData.title;

  // Variant titles: different hooks for Pinterest algorithm variety
  const timeMatch = enData.totalTime?.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
  const hours = timeMatch?.[1] ? parseInt(timeMatch[1]) : 0;
  const mins = timeMatch?.[2] ? parseInt(timeMatch[2]) : 0;
  const totalMins = hours * 60 + mins;
  const timeStr = totalMins > 0 ? `${totalMins}-Minute` : null;

  const cuisine = enData.recipeCuisine || "Homemade";
  const category = enData.recipeCategory?.[0] || "Recipe";
  const categoryLabel = category.charAt(0).toUpperCase() + category.slice(1);

  const v2Title = timeStr
    ? `${timeStr} ${cuisine} ${categoryLabel}`
    : `${cuisine} ${enData.title}`;
  const v3Title = `Easy ${enData.title} for Date Night`;

  return {
    instagram_caption: enData.socialCaption?.instagram || buildInstagramTemplate(enData, frData),
    pinterest_title: baseTitle,
    pinterest_description: baseDescription,
    pinterest_title_v2: v2Title.slice(0, 100),
    pinterest_description_v2: baseDescription,
    pinterest_title_v3: v3Title.slice(0, 100),
    pinterest_description_v3: baseDescription,
  };
}
```

Key changes from original:
- All 3 variants share the same URL-free description (from `socialCaption.pinterest` or fallback)
- Variant 1: uses `socialCaption.pinterest` first line or recipe title
- Variant 2: time + cuisine + category angle (e.g., "165-Minute Italian Dinner")
- Variant 3: "Easy {title} for Date Night" angle
- `totalTime` parsing handles hours+minutes (e.g., `PT2H45M` = 165 minutes, `PT4H` = 240 minutes)

- [ ] **Step 2: Verify the script parses without syntax errors**

```bash
node --check scripts/social-post.mjs 2>&1 || echo "ESM syntax check not supported, verify manually by reading the file"
```

- [ ] **Step 3: Commit**

```bash
git add scripts/social-post.mjs
git commit -m "fix(pinterest): generate distinct variant titles without URLs in descriptions"
```

---

### Task 3: Fix deploy workflow detection

**Files:**
- Modify: `.github/workflows/social-post-on-deploy.yml:38-51`

- [ ] **Step 1: Replace the detect step with log cross-reference**

Replace the `Detect new recipes` step (lines 38-51) with:

```yaml
      - name: Detect new recipes
        id: detect
        run: |
          NEW_RECIPES=$(git diff --name-only --diff-filter=A HEAD~1 -- 'src/content/recipes/en/*.mdx' || true)

          UNPOSTED=$(node -e "
            const fs = require('fs');
            const log = JSON.parse(fs.readFileSync('data/social-posts-log.json'));
            const recipes = fs.readdirSync('src/content/recipes/en')
              .filter(f => f.endsWith('.mdx'))
              .map(f => f.replace('.mdx',''));
            const missing = recipes.filter(r => !log[r]);
            if (missing.length) {
              console.log(missing.map(r => 'src/content/recipes/en/' + r + '.mdx').join('\n'));
            }
          ")

          ALL_NEW=$(echo -e "${NEW_RECIPES}\n${UNPOSTED}" | sort -u | grep -v '^$' || true)

          if [ -z "$ALL_NEW" ]; then
            echo "count=0" >> $GITHUB_OUTPUT
            echo "recipes=" >> $GITHUB_OUTPUT
          else
            echo "recipes<<EOF" >> $GITHUB_OUTPUT
            echo "$ALL_NEW" >> $GITHUB_OUTPUT
            echo "EOF" >> $GITHUB_OUTPUT
            echo "count=$(echo "$ALL_NEW" | wc -l | tr -d ' ')" >> $GITHUB_OUTPUT
          fi
          echo "Detected recipes to post: $ALL_NEW"
```

Note: The inline Node.js uses `require()` (CJS) because it runs via `node -e` in the shell step, not as an ESM module. This is fine since it only uses built-in `fs` module.

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/social-post-on-deploy.yml
git commit -m "fix(pinterest): detect unposted recipes via log cross-reference in deploy workflow"
```

---

### Task 4: Write `socialCaption.pinterest` for all 14 EN recipes

**Files:**
- Modify: `src/content/recipes/en/beef-ragu-pappardelle.mdx`
- Modify: `src/content/recipes/en/brussels-sprouts-salad.mdx`
- Modify: `src/content/recipes/en/cacio-e-pepe.mdx`
- Modify: `src/content/recipes/en/cauliflower-steak-with-romesco-sauce.mdx`
- Modify: `src/content/recipes/en/crispy-vegan-calamari.mdx`
- Modify: `src/content/recipes/en/gochujang-kimchi-seafood-bucatini.mdx`
- Modify: `src/content/recipes/en/lemon-posset-brulee.mdx`
- Modify: `src/content/recipes/en/miso-udon-carbonara.mdx` (review existing)
- Modify: `src/content/recipes/en/northern-thai-beef-tartare.mdx`
- Modify: `src/content/recipes/en/penne-alla-vodka.mdx`
- Modify: `src/content/recipes/en/pork-osso-buco.mdx`
- Modify: `src/content/recipes/en/quinoa-crusted-salmon.mdx`
- Modify: `src/content/recipes/en/vietnamese-pickled-vegetables.mdx`
- Modify: `src/content/recipes/en/zucchini-eggplant-chips.mdx`

- [ ] **Step 1: Add `socialCaption.pinterest` to each EN recipe frontmatter**

For each recipe, add a `socialCaption` block (or add `pinterest` to existing block) in the YAML frontmatter. Place it after `nutrition` / before `faqs` to match the existing pattern in `miso-udon-carbonara.mdx`.

Caption guidelines (from spec):
- 150-300 characters
- No URLs
- Recipe-specific: mention key ingredients, technique, or time
- Date My Dish brand voice (cheeky, confident)
- No em-dashes

Write captions for these 13 recipes (miso-udon-carbonara already has one, review it for quality):

| Slug | Title | Time | Cuisine | Category |
|------|-------|------|---------|----------|
| beef-ragu-pappardelle | Slow-Cooked Beef Ragu with Pappardelle Pasta | PT2H45M | Italian | dinner |
| brussels-sprouts-salad | Brussels Sprouts Salad with Crispy Leaves and Fish Sauce Vinaigrette | PT35M | Southeast Asian | appetizer |
| cacio-e-pepe | Authentic Cacio e Pepe (Roman Cheese and Pepper Pasta) | PT25M | Italian | dinner |
| cauliflower-steak-with-romesco-sauce | Roasted Cauliflower Steaks with Smoky Romesco Sauce | PT40M | Spanish | dinner |
| crispy-vegan-calamari | Crispy Vegan Calamari with King Oyster Mushrooms | PT30M | Mediterranean | appetizer |
| gochujang-kimchi-seafood-bucatini | Spicy Gochujang-Kimchi Seafood Bucatini | PT45M | Korean-Italian | dinner |
| lemon-posset-brulee | Lemon Posset Brulee (Easy 3-Ingredient No-Bake Dessert) | PT4H25M | British | dessert |
| northern-thai-beef-tartare | Northern Thai Beef Tartare Recipe | PT15M | Thai | appetizer |
| penne-alla-vodka | Creamy Penne alla Vodka with Italian Sausage | PT40M | Italian | dinner |
| pork-osso-buco | Pork Osso Buco with Creamy Polenta | PT4H | Italian | dinner |
| quinoa-crusted-salmon | Quinoa-Crusted Salmon with Spicy Orange Miso Sauce | PT40M | Nikkei | dinner |
| vietnamese-pickled-vegetables | Vietnamese Pickled Vegetables (Do Chua) | PT15M | Vietnamese | side-dish |
| zucchini-eggplant-chips | Crispy Zucchini and Eggplant Chips with Sparkling Water Batter | PT30M | Mediterranean | appetizer |

Reference caption (miso-udon-carbonara, already written):
```
"Miso udon carbonara recipe (silky, no-cream): thick chewy udon in a glossy egg yolk and cheese sauce with white miso and crispy bacon. Ready in 20 minutes. The best date night noodle bowl for two."
```

For recipes that don't have a `socialCaption` block at all, add the full block:
```yaml
socialCaption:
  pinterest: "Your caption here"
```

For miso-udon-carbonara which already has both `instagram` and `pinterest`, just review the existing `pinterest` value and update if needed.

- [ ] **Step 2: Run `/humanizer` on all 14 pinterest captions**

After writing all captions, run the `/humanizer` skill on each caption to strip AI patterns. Apply fixes directly to the frontmatter.

- [ ] **Step 3: Verify build passes with updated frontmatter**

```bash
npm run check
```

Expected: No errors. The `socialCaption` field is optional in the schema and already supports `pinterest` as an optional string.

- [ ] **Step 4: Commit**

```bash
git add src/content/recipes/en/*.mdx
git commit -m "feat(pinterest): add humanized socialCaption.pinterest to all 14 EN recipes"
```

---

### Task 5: Regenerate `social-posts-log.json`

**Files:**
- Modify: `data/social-posts-log.json`

- [ ] **Step 1: Write a one-shot regeneration script**

Create a temporary script `scripts/regenerate-pin-descriptions.mjs`:

```js
// scripts/regenerate-pin-descriptions.mjs
// One-shot script to regenerate pin descriptions and titles from frontmatter.
// Preserves post history (id, postedAt, status, scheduledFor, variant).
// Run: node scripts/regenerate-pin-descriptions.mjs

import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";
import matter from "gray-matter";

const RECIPES_DIR = "src/content/recipes";
const LOG_FILE = "data/social-posts-log.json";

function getRecipeData(slug) {
  const filePath = join(RECIPES_DIR, "en", `${slug}.mdx`);
  if (!existsSync(filePath)) return null;
  return matter(readFileSync(filePath, "utf-8")).data;
}

function generateTitles(data) {
  const baseTitle = data.socialCaption?.pinterest
    ? data.socialCaption.pinterest.split("\n")[0].slice(0, 100)
    : data.title;

  const timeMatch = data.totalTime?.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
  const hours = timeMatch?.[1] ? parseInt(timeMatch[1]) : 0;
  const mins = timeMatch?.[2] ? parseInt(timeMatch[2]) : 0;
  const totalMins = hours * 60 + mins;
  const timeStr = totalMins > 0 ? `${totalMins}-Minute` : null;

  const cuisine = data.recipeCuisine || "Homemade";
  const category = data.recipeCategory?.[0] || "Recipe";
  const categoryLabel = category.charAt(0).toUpperCase() + category.slice(1);

  const v2Title = timeStr
    ? `${timeStr} ${cuisine} ${categoryLabel}`
    : `${cuisine} ${data.title}`;
  const v3Title = `Easy ${data.title} for Date Night`;

  return {
    v1: baseTitle,
    v2: v2Title.slice(0, 100),
    v3: v3Title.slice(0, 100),
  };
}

const log = JSON.parse(readFileSync(LOG_FILE, "utf-8"));
let updated = 0;

for (const [slug, entry] of Object.entries(log)) {
  if (!entry.pinterest?.pins) continue;

  const data = getRecipeData(slug);
  if (!data) {
    console.log(`SKIP ${slug}: no recipe file found`);
    continue;
  }

  const description = data.socialCaption?.pinterest || data.description;
  const titles = generateTitles(data);

  for (const pin of entry.pinterest.pins) {
    const oldDesc = pin.description;
    const oldTitle = pin.title;

    if (pin.variant === 1) pin.title = titles.v1;
    if (pin.variant === 2) pin.title = titles.v2;
    if (pin.variant === 3) pin.title = titles.v3;
    pin.description = description;

    if (oldDesc !== pin.description || oldTitle !== pin.title) {
      console.log(`${slug} v${pin.variant}: title "${oldTitle}" -> "${pin.title}"`);
      updated++;
    }
  }
}

writeFileSync(LOG_FILE, JSON.stringify(log, null, 2) + "\n");
console.log(`\nDone. Updated ${updated} pin entries.`);
```

- [ ] **Step 2: Run the regeneration script**

```bash
node scripts/regenerate-pin-descriptions.mjs
```

Expected output: ~33 pin entries updated (11 recipes x 3 variants), showing old -> new titles.

- [ ] **Step 3: Verify no URLs remain in the log**

```bash
node -e "const log=JSON.parse(require('fs').readFileSync('data/social-posts-log.json','utf-8')); for(const [s,e] of Object.entries(log)){if(!e.pinterest?.pins)continue;for(const p of e.pinterest.pins){if(p.description.includes('http')){console.log('URL FOUND:',s,'v'+p.variant);}}}" && echo "No URLs found - OK"
```

Expected: "No URLs found - OK"

- [ ] **Step 4: Delete the temporary script**

```bash
rm scripts/regenerate-pin-descriptions.mjs
```

- [ ] **Step 5: Commit**

```bash
git add data/social-posts-log.json
git commit -m "fix(pinterest): regenerate pin descriptions and titles from humanized frontmatter captions"
```

---

### Task 6: Update live Pinterest pins

**Files:** None modified (API calls only)

- [ ] **Step 1: Dry-run the update script to preview changes**

Run locally (requires `PINTEREST_ACCESS_TOKEN` env var):

```bash
PINTEREST_ACCESS_TOKEN=<token> node scripts/pinterest-update-pins.mjs --update-description --dry-run
```

Or trigger via GitHub Actions:

```bash
gh workflow run pinterest-update-pins.yml -f dry_run=true -f update_type=description
```

Review the output to confirm all 33 pins show the new descriptions and titles.

- [ ] **Step 2: Run the actual update**

```bash
PINTEREST_ACCESS_TOKEN=<token> node scripts/pinterest-update-pins.mjs --update-description
```

Or via GitHub Actions:

```bash
gh workflow run pinterest-update-pins.yml -f update_type=description
```

Expected: 33 pins updated. The script has 10s delays between API calls (~5-6 minutes total).

- [ ] **Step 3: Commit updated log if timestamps were added**

```bash
git add data/social-posts-log.json
git diff --cached --quiet || git commit -m "chore: update social posts log after Pinterest pin description updates"
```

---

### Task 7: Backfill 3 missing recipes

**Files:** None modified (workflow dispatch)

This task runs AFTER all changes are merged to main.

- [ ] **Step 1: Merge the fix/pinterest branch to main**

Create a PR and merge.

- [ ] **Step 2: Trigger the backfill workflow**

```bash
gh workflow run social-backfill.yml -f platform=pinterest -f recipes_per_run=3
```

Posts `miso-udon-carbonara`, `northern-thai-beef-tartare`, `pork-osso-buco` using their frontmatter captions.

- [ ] **Step 3: Verify backfill completed**

```bash
gh run list --workflow=social-backfill.yml --limit=1
```

Expected: Most recent run shows `success`.

- [ ] **Step 4: Merge the backfill log PR**

The backfill workflow creates a PR with the updated `social-posts-log.json`. Merge it.
