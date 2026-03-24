// scripts/fetch-notion-recipe.mjs
// Fetches the next recipe to publish from a public Notion database using
// notion-client (unofficial API, no auth needed for public pages).
//
// Previously output two files:
//   - notion-recipe-selection.json  (recipe metadata + mode)
//   - notion-recipe-content.json    (structured content blocks + FAQs + images + DB columns)
//
// Now outputs a single pending file:
//   - notion/pending-recipe.json    (combined pending schema for scheduled task pickup)
//   - $GITHUB_OUTPUT                (found, mode, recipe_num)
//
// Usage:
//   node scripts/fetch-notion-recipe.mjs

import { NotionAPI } from "notion-client";
import { writeFileSync } from "fs";
import {
  withRetry,
  writeGitHubOutput,
  readPublishedJson,
  buildSchemaLookup,
  getRowProperty,
  groupListItems,
  traverseBlocks,
  extractFaqs,
  downloadImage,
} from "./notion-utils.mjs";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
const DATABASE_PAGE_ID = "9ce95183503543d68450194d1010824b";
const PENDING_FILE = "notion/pending-recipe.json";

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  console.log("=== Fetch Notion Recipe ===\n");

  const api = new NotionAPI();

  // Step 1: Fetch the database page to discover collection + view IDs
  console.log("Step 1: Fetching database page...");
  const recordMap = await withRetry(
    () => api.getPage(DATABASE_PAGE_ID, { signFileUrls: false }),
    "getPage(database)"
  );

  // Extract collection ID
  const collectionIds = Object.keys(recordMap.collection || {});
  if (collectionIds.length === 0) {
    console.error(
      "[ERROR] No collection found. Is the Notion page still public?"
    );
    process.exit(1);
  }
  const collectionId = collectionIds[0];

  // Get the first collection view ID
  const viewIds = Object.keys(recordMap.collection_view || {});
  if (viewIds.length === 0) {
    console.error("[ERROR] No collection views found.");
    process.exit(1);
  }
  const viewId = viewIds[0];

  console.log(`  Collection ID: ${collectionId}`);
  console.log(`  View ID: ${viewId}`);

  // Step 2: Fetch full collection data with rows
  console.log("\nStep 2: Fetching collection data...");
  const collData = await withRetry(
    () => api.getCollectionData(collectionId, viewId),
    "getCollectionData"
  );

  // Extract schema from the double-nested structure: .value.value
  const collRecord = collData.recordMap?.collection?.[collectionId];
  const collValue = collRecord?.value?.value || collRecord?.value;
  const schema = collValue?.schema;

  if (!schema) {
    console.error(
      "[ERROR] Could not extract collection schema. The internal API structure may have changed."
    );
    process.exit(1);
  }

  const schemaLookup = buildSchemaLookup(schema);
  const schemaNames = Object.values(schema).map((s) => s.name);
  console.log(`  Schema properties: ${schemaNames.join(", ")}`);

  // Verify required properties
  const required = ["Status", "Post Type", "Recipe #"];
  for (const req of required) {
    if (!schemaLookup[req]) {
      console.error(
        `[ERROR] Missing property "${req}" in schema. Available: ${schemaNames.join(", ")}`
      );
      process.exit(1);
    }
  }

  // Get row block IDs
  const blockIds =
    collData.result?.reducerResults?.collection_group_results?.blockIds || [];
  const blockMap = collData.recordMap?.block || {};

  console.log(`  Found ${blockIds.length} rows\n`);

  // Step 3: Parse rows and extract properties
  console.log("Step 3: Parsing collection rows...");
  const rows = [];
  for (const blockId of blockIds) {
    // Internal API: block data is at .value.value (double-nested)
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
    const lastEdited = block.last_edited_time;

    // Extract recipe-specific database columns
    const cookTime = getRowProperty(block, "Cook Time", schemaLookup);
    const prepTime = getRowProperty(block, "Prep Time", schemaLookup);
    const totalTime = getRowProperty(block, "Total Time", schemaLookup);
    const difficultyRaw = getRowProperty(block, "Difficulty", schemaLookup);
    const servingsRaw = getRowProperty(block, "Servings", schemaLookup);
    const category = getRowProperty(block, "Category", schemaLookup);

    const recipeNum = parseInt(recipeNumRaw, 10);
    if (isNaN(recipeNum) || recipeNum === 0) continue;

    rows.push({
      pageId: blockId,
      recipeNum,
      title: String(title).trim(),
      status: String(status).trim(),
      postType: String(postType).trim(),
      lastEditedTime: lastEdited,
      cookTime: String(cookTime).trim(),
      prepTime: String(prepTime).trim(),
      totalTime: String(totalTime).trim(),
      difficulty: String(difficultyRaw).trim().toLowerCase(),
      servings: parseInt(servingsRaw, 10) || null,
      category: String(category).trim(),
    });
  }

  console.log(`  Parsed ${rows.length} valid rows\n`);

  // Step 4: Filter for Ready to Publish + Recipes
  console.log("Step 4: Filtering recipes...");
  const readyRecipes = rows.filter(
    (r) => r.status === "Ready to Publish" && r.postType === "Recipes"
  );
  console.log(
    `  ${readyRecipes.length} recipes with "Ready to Publish" + "Recipes"\n`
  );

  // Step 5: Cross-reference published.json
  console.log("Step 5: Cross-referencing published.json...");
  const published = readPublishedJson();

  const unpublished = readyRecipes
    .filter((a) => !published.entries[String(a.recipeNum)])
    .sort((a, b) => a.recipeNum - b.recipeNum);

  console.log(`  ${unpublished.length} unpublished recipes`);

  let selected = null;
  let mode = "publish";

  if (unpublished.length > 0) {
    selected = unpublished[0];
    mode = "publish";
    console.log(
      `  Selected for publish: #${selected.recipeNum} - ${selected.title}\n`
    );
  } else {
    // Check for stale recipes (edited since last sync)
    console.log("  No unpublished recipes. Checking for stale recipes...");
    const stale = readyRecipes
      .filter((a) => {
        const entry = published.entries[String(a.recipeNum)];
        if (!entry) return false;
        const syncDate = new Date(entry.lastSyncedDate + "T23:59:59Z");
        const editDate = new Date(a.lastEditedTime);
        return editDate > syncDate;
      })
      .sort((a, b) => a.recipeNum - b.recipeNum);

    console.log(`  ${stale.length} stale recipes`);

    if (stale.length === 0) {
      console.log("\nNo new or updated recipes found. Exiting.");
      writeGitHubOutput("found", "false");
      process.exit(0);
    }

    selected = stale[0];
    mode = "update";
    console.log(
      `  Selected for update: #${selected.recipeNum} - ${selected.title}\n`
    );
  }

  // Step 6: Fetch the selected recipe's page blocks
  console.log("Step 6: Fetching recipe page blocks...");
  const pageRecordMap = await withRetry(
    () => api.getPage(selected.pageId, { signFileUrls: true }),
    "getPage(recipe)"
  );

  // Walk the block tree with recursive traversal (depth-limited to 3)
  const pageBlockRecord = pageRecordMap.block[selected.pageId];
  const pageBlock = pageBlockRecord?.value?.value || pageBlockRecord?.value;
  if (!pageBlock) {
    console.error("[ERROR] Could not find page block for selected recipe.");
    process.exit(1);
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

  const imageCount = blocks.filter((b) => b.type === "image").length;
  console.log(`  ${blocks.length} content blocks`);
  console.log(`  ${faqs.length} FAQs extracted`);
  console.log(`  ${imageCount} images found\n`);

  // Step 7: Download images
  console.log("Step 7: Downloading images...");
  let heroImage = null;
  let imgIndex = 0;

  for (const block of blocks) {
    if (block.type === "image" && block.url) {
      imgIndex++;
      const ext = block.url.match(/\.(png|jpg|jpeg|webp|gif)/i)?.[1] || "png";
      const isHero = heroImage === null;
      const filename = isHero ? `hero.${ext}` : `img-${imgIndex}.${ext}`;
      const localPath = await downloadImage(block.url, filename);

      if (localPath) {
        block.localPath = localPath;
        if (isHero) {
          heroImage = { localPath, caption: block.caption };
        }
      }
    }
  }

  // Hero image validation: required for recipes
  if (!heroImage) {
    console.log(
      "\n  [WARN] No hero image found in recipe page. Skipping this recipe."
    );
    writeGitHubOutput("found", "false");
    process.exit(0);
  }

  // Step 8: Write pending file
  console.log("\nStep 8: Writing pending file...");

  const existingSlug =
    mode === "update"
      ? published.entries[String(selected.recipeNum)]?.slug || null
      : null;

  // Build images array from downloaded blocks
  const images = blocks
    .filter((b) => b.type === "image" && b.localPath)
    .map((b, idx) => ({
      localPath: b.localPath,
      caption: b.caption || "",
      isHero: idx === 0 && b.localPath === heroImage?.localPath,
    }));

  const pendingJson = {
    source: "notion",
    fetchedAt: new Date().toISOString(),
    notionPageId: selected.pageId,
    title: selected.title,
    mode,
    existingSlug,
    recipeNum: selected.recipeNum,
    lastEditedTime: new Date(selected.lastEditedTime).toISOString(),
    // Recipe-specific metadata from Notion DB columns
    cookTime: selected.cookTime,
    prepTime: selected.prepTime,
    totalTime: selected.totalTime,
    difficulty: selected.difficulty,
    servings: selected.servings,
    category: selected.category,
    heroImage,
    images,
    blocks,
    faqs,
  };

  writeFileSync(PENDING_FILE, JSON.stringify(pendingJson, null, 2) + "\n");

  console.log(`  ${PENDING_FILE} written`);

  // Validate output
  if (!pendingJson.title || blocks.length === 0) {
    console.error("[ERROR] Output validation failed: empty title or blocks.");
    process.exit(1);
  }

  // Step 9: Write GitHub Actions output
  console.log("\nStep 9: Writing GITHUB_OUTPUT...");
  writeGitHubOutput("found", "true");
  writeGitHubOutput("mode", mode);
  writeGitHubOutput("recipe_num", String(selected.recipeNum));

  console.log(
    `\n=== Done! Mode: ${mode} | #${selected.recipeNum} - ${selected.title} ===`
  );
}

main().catch((err) => {
  console.error(`\n[FATAL] ${err.message}`);
  if (err.stack) console.error(err.stack);
  process.exit(1);
});
