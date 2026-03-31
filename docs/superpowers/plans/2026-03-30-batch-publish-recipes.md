# Batch Publish All Notion Recipes — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fetch all 4 unpublished "Ready to Publish" recipes from Notion and generate complete EN+FR MDX pairs with images, prose, and translations in a single PR.

**Architecture:** Write a one-time batch fetch script that downloads all 4 recipes' content and images from Notion. Then process each recipe through the existing skill pipeline (`/new-recipe` → `/write-prose` → `/translate-recipe` → `/optimize-image` → `/humanizer`) using parallel subagents. Update `published.json` and create a single PR.

**Tech Stack:** Node.js (notion-client), Astro MDX, existing slash command skills

**Recipes to publish:**
| # | Title |
|---|-------|
| 63 | Lamb Meatballs with Gochujang Glaze + Kabocha Purée (Peanut Crunch) |
| 65 | 3-Day Aged Miso Duck Breast (Shatter-Crisp Skin) |
| 66 | Pâte à Choux Recipe (Foolproof Choux Pastry for Cream Puffs + Gougères) |
| 73 | Chocolate Tofu Pudding with Candied Cacao Nibs + Banana |

---

### Task 1: Write and run batch fetch script

**Files:**
- Create: `scripts/fetch-notion-recipes-batch.mjs`
- Modify: `notion/published.json` (not yet — just read)

This script is a one-time utility. It fetches ALL 4 unpublished recipes from Notion (blocks, images, metadata) and writes individual pending files.

- [ ] **Step 1: Create the batch fetch script**

```javascript
// scripts/fetch-notion-recipes-batch.mjs
// One-time batch fetch: downloads ALL unpublished "Ready to Publish" recipes
// Writes: notion/pending-recipe-{num}.json + images to src/assets/images/recipes/

import { NotionAPI } from "notion-client";
import { writeFileSync } from "fs";
import {
  withRetry,
  readPublishedJson,
  buildSchemaLookup,
  getRowProperty,
  groupListItems,
  traverseBlocks,
  extractFaqs,
  downloadImage,
  slugify,
} from "./notion-utils.mjs";

const DATABASE_PAGE_ID = "9ce95183503543d68450194d1010824b";

async function main() {
  console.log("=== Batch Fetch Notion Recipes ===\n");

  const api = new NotionAPI();

  // Step 1-2: Discover database
  console.log("Step 1: Fetching database page...");
  const recordMap = await withRetry(
    () => api.getPage(DATABASE_PAGE_ID, { signFileUrls: false }),
    "getPage(database)"
  );

  const collectionId = Object.keys(recordMap.collection || {})[0];
  const viewId = Object.keys(recordMap.collection_view || {})[0];
  if (!collectionId || !viewId) {
    console.error("[ERROR] No collection/view found.");
    process.exit(1);
  }

  // Step 3: Fetch collection data
  console.log("Step 2: Fetching collection data...");
  const collData = await withRetry(
    () => api.getCollectionData(collectionId, viewId),
    "getCollectionData"
  );

  const collRecord = collData.recordMap?.collection?.[collectionId];
  const collValue = collRecord?.value?.value || collRecord?.value;
  const schema = collValue?.schema;
  if (!schema) {
    console.error("[ERROR] Could not extract schema.");
    process.exit(1);
  }

  const schemaLookup = buildSchemaLookup(schema);
  const blockIds =
    collData.result?.reducerResults?.collection_group_results?.blockIds || [];
  const blockMap = collData.recordMap?.block || {};

  // Step 4: Parse rows
  console.log("Step 3: Parsing rows...");
  const rows = [];
  for (const blockId of blockIds) {
    const blockRecord = blockMap[blockId];
    const block = blockRecord?.value?.value || blockRecord?.value;
    if (!block || block.type !== "page") continue;

    const status = getRowProperty(block, "Status", schemaLookup);
    const postType = getRowProperty(block, "Post Type", schemaLookup);
    const recipeNumRaw = getRowProperty(block, "Recipe #", schemaLookup);
    const title =
      getRowProperty(block, "Post Title", schemaLookup) ||
      block.properties?.title?.[0]?.[0] ||
      "";

    const recipeNum = parseInt(recipeNumRaw, 10);
    if (isNaN(recipeNum) || recipeNum === 0) continue;

    rows.push({
      pageId: blockId,
      recipeNum,
      title: String(title).trim(),
      status: String(status).trim(),
      postType: String(postType).trim(),
      lastEditedTime: block.last_edited_time,
      cookTime: String(getRowProperty(block, "Cook Time", schemaLookup)).trim(),
      prepTime: String(getRowProperty(block, "Prep Time", schemaLookup)).trim(),
      totalTime: String(
        getRowProperty(block, "Total Time", schemaLookup)
      ).trim(),
      difficulty: String(
        getRowProperty(block, "Difficulty", schemaLookup)
      ).trim().toLowerCase(),
      servings:
        parseInt(getRowProperty(block, "Servings", schemaLookup), 10) || null,
      category: String(
        getRowProperty(block, "Category", schemaLookup)
      ).trim(),
    });
  }

  // Step 5: Filter unpublished ready recipes
  const readyRecipes = rows.filter(
    (r) => r.status === "Ready to Publish" && r.postType === "Recipes"
  );
  const published = readPublishedJson();
  const unpublished = readyRecipes
    .filter((a) => !published.entries[String(a.recipeNum)])
    .sort((a, b) => a.recipeNum - b.recipeNum);

  console.log(`Found ${unpublished.length} unpublished recipes:\n`);
  unpublished.forEach((r) => console.log(`  #${r.recipeNum} - ${r.title}`));

  if (unpublished.length === 0) {
    console.log("\nNo unpublished recipes. Exiting.");
    process.exit(0);
  }

  // Step 6: Fetch each recipe's content + images
  for (const recipe of unpublished) {
    console.log(`\n--- Processing #${recipe.recipeNum}: ${recipe.title} ---`);

    // Fetch page blocks
    console.log("  Fetching page blocks...");
    const pageRecordMap = await withRetry(
      () => api.getPage(recipe.pageId, { signFileUrls: true }),
      `getPage(#${recipe.recipeNum})`
    );

    const pageBlockRecord = pageRecordMap.block[recipe.pageId];
    const pageBlock = pageBlockRecord?.value?.value || pageBlockRecord?.value;
    if (!pageBlock) {
      console.error(`  [ERROR] Could not find page block. Skipping.`);
      continue;
    }

    const childIds = pageBlock.content || [];
    const rawBlocks = traverseBlocks(
      pageRecordMap.block,
      childIds,
      pageRecordMap.signed_urls,
      0
    );
    const blocks = groupListItems(rawBlocks);
    const faqs = extractFaqs(blocks);

    console.log(`  ${blocks.length} blocks, ${faqs.length} FAQs`);

    // Download images
    console.log("  Downloading images...");
    const slug = slugify(recipe.title);
    const imageDir = "src/assets/images/recipes";
    let heroImage = null;
    let stepIndex = 0;

    for (const block of blocks) {
      if (block.type === "image" && block.url) {
        const ext =
          block.url.match(/\.(png|jpg|jpeg|webp|gif)/i)?.[1] || "jpg";
        const isHero = heroImage === null;
        const filename = isHero
          ? `${slug}.${ext}`
          : `${slug}-step-${++stepIndex}.${ext}`;
        const localPath = await downloadImage(block.url, filename, imageDir);

        if (localPath) {
          block.localPath = localPath;
          if (isHero) {
            heroImage = { localPath, caption: block.caption };
          }
        }
      }
    }

    if (!heroImage) {
      console.log(`  [WARN] No hero image found. Skipping #${recipe.recipeNum}.`);
      continue;
    }

    // Build images array
    const images = blocks
      .filter((b) => b.type === "image" && b.localPath)
      .map((b, idx) => ({
        localPath: b.localPath,
        caption: b.caption || "",
        isHero: idx === 0 && b.localPath === heroImage?.localPath,
      }));

    // Write pending file
    const pendingFile = `notion/pending-recipe-${recipe.recipeNum}.json`;
    const pendingJson = {
      source: "notion",
      fetchedAt: new Date().toISOString(),
      notionPageId: recipe.pageId,
      title: recipe.title,
      mode: "publish",
      existingSlug: null,
      recipeNum: recipe.recipeNum,
      lastEditedTime: new Date(recipe.lastEditedTime).toISOString(),
      cookTime: recipe.cookTime,
      prepTime: recipe.prepTime,
      totalTime: recipe.totalTime,
      difficulty: recipe.difficulty,
      servings: recipe.servings,
      category: recipe.category,
      heroImage,
      images,
      blocks,
      faqs,
    };

    writeFileSync(pendingFile, JSON.stringify(pendingJson, null, 2) + "\n");
    console.log(`  Written: ${pendingFile}`);
  }

  console.log("\n=== Batch fetch complete! ===");
}

main().catch((err) => {
  console.error(`\n[FATAL] ${err.message}`);
  if (err.stack) console.error(err.stack);
  process.exit(1);
});
```

- [ ] **Step 2: Run the batch fetch script**

Run: `node scripts/fetch-notion-recipes-batch.mjs`

Expected: 4 pending files created in `notion/`:
- `notion/pending-recipe-63.json`
- `notion/pending-recipe-65.json`
- `notion/pending-recipe-66.json`
- `notion/pending-recipe-73.json`

Plus images downloaded to `src/assets/images/recipes/`.

- [ ] **Step 3: Verify all pending files and images exist**

Run: `ls notion/pending-recipe-*.json && ls src/assets/images/recipes/ | grep -E "(lamb-meatballs|miso-duck|pate-a-choux|chocolate-tofu)"`

Expected: 4 JSON files and at least 4 hero images.

- [ ] **Step 4: Commit the fetched data**

```bash
git add notion/pending-recipe-*.json src/assets/images/recipes/
git commit -m "chore: batch fetch 4 pending recipes from Notion"
```

---

### Task 2: Process Recipe #63 — Lamb Meatballs with Gochujang Glaze

**Files:**
- Read: `notion/pending-recipe-63.json`
- Create: `src/content/recipes/en/{slug}.mdx`
- Create: `src/content/recipes/fr/{slug-fr}.mdx`
- Modify: images in `src/assets/images/recipes/`

This task uses the existing slash command pipeline. The subagent should:

- [ ] **Step 1: Read the pending file to understand the recipe**

Read `notion/pending-recipe-63.json` to extract: title, ingredients, instructions, times, difficulty, servings, category, FAQs, images.

- [ ] **Step 2: Run `/optimize-image` on the downloaded images**

Invoke the `/optimize-image` skill on all images matching the recipe slug in `src/assets/images/recipes/`. This resizes and compresses them per project standards (hero max 1200px/<200KB, steps max 900px/<150KB).

- [ ] **Step 3: Run `/new-recipe` to scaffold the EN+FR MDX pair**

Invoke the `/new-recipe` skill with the recipe name. Fill in ALL frontmatter fields from the pending file data:
- `publishDate: 2026-03-30`
- Times, difficulty, servings, category from Notion DB columns
- Ingredients and instructions from the Notion blocks
- FAQs from extracted FAQ data
- Hero image and step image paths from downloaded images
- Generate: description (max 160 chars), keywords, tags, occasion, impressFactor, dateNightTips, nutrition, socialCaption

**Important:** The pending file contains raw Notion blocks. The subagent must parse ingredient lists and instruction steps from these blocks to populate `ingredientGroups` and `instructionGroups` in frontmatter.

- [ ] **Step 4: Run `/write-prose` to generate EN blog body**

Invoke `/write-prose` with the recipe slug. This generates 800-1500 words of SEO-optimized prose with `<Picture>` components for available images and internal cross-links.

- [ ] **Step 5: Run `/humanizer` on the EN recipe**

Invoke `/humanizer` on the EN MDX file to remove AI writing patterns from the generated prose.

- [ ] **Step 6: Run `/translate-recipe` to create FR version**

Invoke `/translate-recipe` with the EN recipe slug. This creates the French MDX file with Quebec French conventions, translated frontmatter, and translated prose.

- [ ] **Step 7: Run `/humanizer` on the FR recipe**

Invoke `/humanizer` on the FR MDX file to clean up the French translation.

- [ ] **Step 8: Validate with astro check**

Run: `npx astro check 2>&1 | tail -20`

Expected: No errors related to the new recipe files.

- [ ] **Step 9: Commit**

```bash
git add src/content/recipes/en/ src/content/recipes/fr/ src/assets/images/recipes/
git commit -m "feat: add lamb meatballs with gochujang glaze recipe (EN+FR)"
```

---

### Task 3: Process Recipe #65 — 3-Day Aged Miso Duck Breast

**Files:**
- Read: `notion/pending-recipe-65.json`
- Create: `src/content/recipes/en/{slug}.mdx`
- Create: `src/content/recipes/fr/{slug-fr}.mdx`
- Modify: images in `src/assets/images/recipes/`

Same pipeline as Task 2. The subagent should:

- [ ] **Step 1: Read the pending file**

Read `notion/pending-recipe-65.json` to extract all recipe data.

- [ ] **Step 2: Run `/optimize-image` on the downloaded images**

Optimize all images matching this recipe's slug in `src/assets/images/recipes/`.

- [ ] **Step 3: Run `/new-recipe` to scaffold EN+FR MDX pair**

Invoke `/new-recipe` with the recipe name. Fill ALL frontmatter from pending file. Set `publishDate: 2026-03-30`. Parse Notion blocks for ingredients and instructions.

- [ ] **Step 4: Run `/write-prose` to generate EN blog body**

Invoke `/write-prose` with the recipe slug.

- [ ] **Step 5: Run `/humanizer` on the EN recipe**

- [ ] **Step 6: Run `/translate-recipe` to create FR version**

- [ ] **Step 7: Run `/humanizer` on the FR recipe**

- [ ] **Step 8: Validate with astro check**

Run: `npx astro check 2>&1 | tail -20`

- [ ] **Step 9: Commit**

```bash
git add src/content/recipes/en/ src/content/recipes/fr/ src/assets/images/recipes/
git commit -m "feat: add 3-day aged miso duck breast recipe (EN+FR)"
```

---

### Task 4: Process Recipe #66 — Pâte à Choux

**Files:**
- Read: `notion/pending-recipe-66.json`
- Create: `src/content/recipes/en/{slug}.mdx`
- Create: `src/content/recipes/fr/{slug-fr}.mdx`
- Modify: images in `src/assets/images/recipes/`

Same pipeline as Task 2. The subagent should:

- [ ] **Step 1: Read the pending file**

Read `notion/pending-recipe-66.json` to extract all recipe data.

- [ ] **Step 2: Run `/optimize-image` on the downloaded images**

- [ ] **Step 3: Run `/new-recipe` to scaffold EN+FR MDX pair**

Invoke `/new-recipe` with the recipe name. Fill ALL frontmatter from pending file. Set `publishDate: 2026-03-30`.

- [ ] **Step 4: Run `/write-prose` to generate EN blog body**

- [ ] **Step 5: Run `/humanizer` on the EN recipe**

- [ ] **Step 6: Run `/translate-recipe` to create FR version**

- [ ] **Step 7: Run `/humanizer` on the FR recipe**

- [ ] **Step 8: Validate with astro check**

Run: `npx astro check 2>&1 | tail -20`

- [ ] **Step 9: Commit**

```bash
git add src/content/recipes/en/ src/content/recipes/fr/ src/assets/images/recipes/
git commit -m "feat: add pâte à choux recipe (EN+FR)"
```

---

### Task 5: Process Recipe #73 — Chocolate Tofu Pudding

**Files:**
- Read: `notion/pending-recipe-73.json`
- Create: `src/content/recipes/en/{slug}.mdx`
- Create: `src/content/recipes/fr/{slug-fr}.mdx`
- Modify: images in `src/assets/images/recipes/`

Same pipeline as Task 2. The subagent should:

- [ ] **Step 1: Read the pending file**

Read `notion/pending-recipe-73.json` to extract all recipe data.

- [ ] **Step 2: Run `/optimize-image` on the downloaded images**

- [ ] **Step 3: Run `/new-recipe` to scaffold EN+FR MDX pair**

Invoke `/new-recipe` with the recipe name. Fill ALL frontmatter from pending file. Set `publishDate: 2026-03-30`.

- [ ] **Step 4: Run `/write-prose` to generate EN blog body**

- [ ] **Step 5: Run `/humanizer` on the EN recipe**

- [ ] **Step 6: Run `/translate-recipe` to create FR version**

- [ ] **Step 7: Run `/humanizer` on the FR recipe**

- [ ] **Step 8: Validate with astro check**

Run: `npx astro check 2>&1 | tail -20`

- [ ] **Step 9: Commit**

```bash
git add src/content/recipes/en/ src/content/recipes/fr/ src/assets/images/recipes/
git commit -m "feat: add chocolate tofu pudding recipe (EN+FR)"
```

---

### Task 6: Update published.json, cleanup, and final validation

**Files:**
- Modify: `notion/published.json`
- Delete: `notion/pending-recipe-63.json`, `notion/pending-recipe-65.json`, `notion/pending-recipe-66.json`, `notion/pending-recipe-73.json`
- Delete: `scripts/fetch-notion-recipes-batch.mjs`

- [ ] **Step 1: Update published.json with all 4 recipes**

Read the current `notion/published.json` and add entries for each recipe. Get the EN slug from each recipe's MDX file. Example entry format:

```json
{
  "63": {
    "notionTitle": "Lamb Meatballs with Gochujang Glaze + Kabocha Purée (Peanut Crunch)",
    "slug": "lamb-meatballs-gochujang-glaze",
    "type": "recipe",
    "publishedDate": "2026-03-30",
    "lastSyncedDate": "2026-03-30",
    "status": "published"
  }
}
```

Do this for all 4 recipes (#63, #65, #66, #73), using the actual slugs from the generated MDX files.

- [ ] **Step 2: Delete pending files**

```bash
rm notion/pending-recipe-63.json notion/pending-recipe-65.json notion/pending-recipe-66.json notion/pending-recipe-73.json
```

- [ ] **Step 3: Delete the batch fetch script**

```bash
rm scripts/fetch-notion-recipes-batch.mjs
```

- [ ] **Step 4: Run full build to validate**

Run: `npm run build 2>&1 | tail -30`

Expected: Build succeeds with no errors. All new recipe pages generated.

- [ ] **Step 5: Commit cleanup**

```bash
git add notion/published.json
git rm notion/pending-recipe-*.json scripts/fetch-notion-recipes-batch.mjs
git commit -m "chore: update published.json and cleanup pending files"
```

---

### Task 7: Create PR

- [ ] **Step 1: Push branch and create PR**

```bash
git push -u origin feature/all-recipes
```

Then create PR targeting `main` with title "feat: batch publish 4 new recipes from Notion" and body summarizing the 4 recipes added.

---

## Execution Notes

- **Tasks 2-5 can run in parallel** as subagents in isolated worktrees. They are fully independent.
- **Task 1 must complete before Tasks 2-5 start** (they depend on the pending files and images).
- **Task 6 must run after Tasks 2-5 complete** (needs the generated slugs).
- **Task 7 runs last.**
- Each recipe subagent gets a complete, self-contained task: read pending JSON → optimize images → scaffold → write prose → humanize → translate → humanize → validate → commit.
