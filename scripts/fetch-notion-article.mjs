// scripts/fetch-notion-article.mjs
// Fetches the next article to publish from a public Notion database using
// notion-client (unofficial API, no auth needed for public pages).
//
// Outputs:
//   - notion-article-selection.json  (article metadata + mode)
//   - notion-article-content.json    (structured content blocks + FAQs + images)
//   - $GITHUB_OUTPUT                 (found, mode, recipe_num)
//
// Usage:
//   node scripts/fetch-notion-article.mjs

import { NotionAPI } from "notion-client";
import {
  readFileSync,
  writeFileSync,
  existsSync,
  mkdirSync,
  appendFileSync,
} from "fs";
import { join } from "path";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
const DATABASE_PAGE_ID = "9ce95183503543d68450194d1010824b";
const PUBLISHED_JSON = "notion/published.json";
const IMAGE_DIR = "/tmp/notion-images";
const SELECTION_FILE = "notion-article-selection.json";
const CONTENT_FILE = "notion-article-content.json";
const MAX_RETRIES = 3;
const RETRY_BASE_MS = 1000;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function withRetry(fn, label) {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (attempt === MAX_RETRIES) {
        console.error(`[ERROR] ${label} failed after ${MAX_RETRIES} attempts`);
        throw err;
      }
      const delay = RETRY_BASE_MS * Math.pow(2, attempt - 1);
      console.log(
        `[WARN] ${label} attempt ${attempt} failed: ${err.message}. Retrying in ${delay}ms...`
      );
      await sleep(delay);
    }
  }
}

function writeGitHubOutput(key, value) {
  const outputFile = process.env.GITHUB_OUTPUT;
  if (outputFile) {
    appendFileSync(outputFile, `${key}=${value}\n`);
  }
  console.log(`  ${key}=${value}`);
}

function readPublishedJson() {
  if (!existsSync(PUBLISHED_JSON)) return { version: 1, entries: {} };
  return JSON.parse(readFileSync(PUBLISHED_JSON, "utf-8"));
}

// ---------------------------------------------------------------------------
// Schema-based property extraction for notion-client's internal API
//
// The internal API returns data at recordMap.collection[id].value.value and
// recordMap.block[id].value.value (double-nested). Property IDs are random
// 4-char keys (e.g., "]?xo") mapped via the collection schema.
// ---------------------------------------------------------------------------
function buildSchemaLookup(schema) {
  const lookup = {};
  for (const [propId, def] of Object.entries(schema)) {
    lookup[def.name] = propId;
  }
  return lookup;
}

function getRowProperty(row, propName, schemaLookup) {
  if (propName === "title") {
    return row.properties?.title?.[0]?.[0] || "";
  }
  const propId = schemaLookup[propName];
  if (!propId) return "";
  return row.properties?.[propId]?.[0]?.[0] || "";
}

// ---------------------------------------------------------------------------
// Notion block → structured JSON conversion
// ---------------------------------------------------------------------------
function decorationToMarkdown(decorations) {
  if (!decorations) return "";
  return decorations
    .map((dec) => {
      const text = dec[0];
      const annotations = dec[1] || [];
      let result = text;
      for (const ann of annotations) {
        if (ann[0] === "b") result = `**${result}**`;
        if (ann[0] === "i") result = `*${result}*`;
        if (ann[0] === "c") result = "`" + result + "`";
        if (ann[0] === "a") result = `[${result}](${ann[1]})`;
      }
      return result;
    })
    .join("");
}

function blockToStructured(block) {
  const type = block.type;
  const props = block.properties || {};
  const titleDec = props.title;
  const text = titleDec ? decorationToMarkdown(titleDec) : "";

  switch (type) {
    case "text":
      return text ? { type: "paragraph", text } : null;
    case "header":
      return { type: "heading", level: 1, text };
    case "sub_header":
      return { type: "heading", level: 2, text };
    case "sub_sub_header":
      return { type: "heading", level: 3, text };
    case "bulleted_list":
      return { type: "list_item", style: "unordered", text };
    case "numbered_list":
      return { type: "list_item", style: "ordered", text };
    case "image": {
      const source =
        block.format?.display_source ||
        (props.source && props.source[0]?.[0]) ||
        null;
      const caption = props.caption
        ? decorationToMarkdown(props.caption)
        : null;
      return { type: "image", url: source, caption };
    }
    case "callout": {
      const icon = block.format?.page_icon || "";
      return { type: "callout", icon, text };
    }
    case "quote":
      return { type: "quote", text };
    case "divider":
      return { type: "divider" };
    case "to_do":
      return { type: "paragraph", text: `- ${text}` };
    case "toggle":
      return { type: "toggle", text };
    default:
      if (text) return { type: "paragraph", text };
      return null;
  }
}

// Group consecutive list_item blocks into list blocks
function groupListItems(blocks) {
  const result = [];
  let currentList = null;

  for (const block of blocks) {
    if (block && block.type === "list_item") {
      if (currentList && currentList.style === block.style) {
        currentList.items.push(block.text);
      } else {
        if (currentList) result.push(currentList);
        currentList = {
          type: "list",
          style: block.style,
          items: [block.text],
        };
      }
    } else {
      if (currentList) {
        result.push(currentList);
        currentList = null;
      }
      if (block) result.push(block);
    }
  }
  if (currentList) result.push(currentList);
  return result;
}

// ---------------------------------------------------------------------------
// FAQ extraction
// ---------------------------------------------------------------------------
function extractFaqs(blocks) {
  const faqStart = blocks.findIndex(
    (b) => b.type === "heading" && /faq|frequently asked/i.test(b.text)
  );

  if (faqStart === -1) return [];

  const faqBlocks = blocks.slice(faqStart + 1);
  const faqs = [];
  let currentQ = null;
  let currentA = [];

  for (const block of faqBlocks) {
    if (block.type === "heading") break;
    const text = block.text || (block.items ? block.items.join(", ") : "");

    const qMatch =
      text.match(/^\*\*Q:\s*(.+?)\*\*$/) || text.match(/^Q:\s*(.+)/);
    if (qMatch) {
      if (currentQ) {
        faqs.push({ question: currentQ, answer: currentA.join(" ").trim() });
      }
      currentQ = qMatch[1].trim();
      currentA = [];
    } else if (currentQ && text) {
      currentA.push(text);
    }
  }
  if (currentQ) {
    faqs.push({ question: currentQ, answer: currentA.join(" ").trim() });
  }

  return faqs;
}

// ---------------------------------------------------------------------------
// Image download
// ---------------------------------------------------------------------------
async function downloadImage(url, filename) {
  if (!url) return null;
  mkdirSync(IMAGE_DIR, { recursive: true });
  const outPath = join(IMAGE_DIR, filename);

  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.log(`[WARN] Failed to download image: ${res.status} ${url}`);
      return null;
    }
    const buffer = Buffer.from(await res.arrayBuffer());
    writeFileSync(outPath, buffer);
    console.log(`  Downloaded image: ${outPath} (${buffer.length} bytes)`);
    return outPath;
  } catch (err) {
    console.log(`[WARN] Image download error: ${err.message}`);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  console.log("=== Fetch Notion Article ===\n");

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

    const recipeNum = parseInt(recipeNumRaw, 10);
    if (isNaN(recipeNum) || recipeNum === 0) continue;

    rows.push({
      pageId: blockId,
      recipeNum,
      title: String(title).trim(),
      status: String(status).trim(),
      postType: String(postType).trim(),
      lastEditedTime: lastEdited,
    });
  }

  console.log(`  Parsed ${rows.length} valid rows\n`);

  // Step 4: Filter for Ready to Publish + Informative Posts
  console.log("Step 4: Filtering articles...");
  const readyArticles = rows.filter(
    (r) =>
      r.status === "Ready to Publish" && r.postType === "Informative Posts"
  );
  console.log(
    `  ${readyArticles.length} articles with "Ready to Publish" + "Informative Posts"\n`
  );

  // Step 5: Cross-reference published.json
  console.log("Step 5: Cross-referencing published.json...");
  const published = readPublishedJson();

  const unpublished = readyArticles
    .filter((a) => !published.entries[String(a.recipeNum)])
    .sort((a, b) => a.recipeNum - b.recipeNum);

  console.log(`  ${unpublished.length} unpublished articles`);

  let selected = null;
  let mode = "publish";

  if (unpublished.length > 0) {
    selected = unpublished[0];
    mode = "publish";
    console.log(
      `  Selected for publish: #${selected.recipeNum} - ${selected.title}\n`
    );
  } else {
    // Check for stale articles (edited since last sync)
    console.log("  No unpublished articles. Checking for stale articles...");
    const stale = readyArticles
      .filter((a) => {
        const entry = published.entries[String(a.recipeNum)];
        if (!entry) return false;
        const syncDate = new Date(entry.lastSyncedDate + "T23:59:59Z");
        const editDate = new Date(a.lastEditedTime);
        return editDate > syncDate;
      })
      .sort((a, b) => a.recipeNum - b.recipeNum);

    console.log(`  ${stale.length} stale articles`);

    if (stale.length === 0) {
      console.log("\nNo new or updated articles found. Exiting.");
      writeGitHubOutput("found", "false");
      process.exit(0);
    }

    selected = stale[0];
    mode = "update";
    console.log(
      `  Selected for update: #${selected.recipeNum} - ${selected.title}\n`
    );
  }

  // Step 6: Fetch the selected article's page blocks
  console.log("Step 6: Fetching article page blocks...");
  const pageRecordMap = await withRetry(
    () => api.getPage(selected.pageId, { signFileUrls: true }),
    "getPage(article)"
  );

  // Walk the block tree - also handle double-nested structure
  const pageBlockRecord = pageRecordMap.block[selected.pageId];
  const pageBlock =
    pageBlockRecord?.value?.value || pageBlockRecord?.value;
  if (!pageBlock) {
    console.error("[ERROR] Could not find page block for selected article.");
    process.exit(1);
  }

  const childIds = pageBlock.content || [];
  const rawBlocks = [];

  for (const childId of childIds) {
    const childRecord = pageRecordMap.block[childId];
    const child = childRecord?.value?.value || childRecord?.value;
    if (!child) continue;

    const structured = blockToStructured(child);
    if (structured) {
      if (structured.type === "image" && structured.url) {
        const signedUrl =
          pageRecordMap.signed_urls?.[childId] || structured.url;
        structured.url = signedUrl;
      }
      rawBlocks.push(structured);
    }

    // Handle nested children (e.g., toggle content, callout children)
    if (child.content) {
      for (const nestedId of child.content) {
        const nestedRecord = pageRecordMap.block[nestedId];
        const nested = nestedRecord?.value?.value || nestedRecord?.value;
        if (!nested) continue;
        const nestedStructured = blockToStructured(nested);
        if (nestedStructured) rawBlocks.push(nestedStructured);
      }
    }
  }

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

  if (!heroImage) {
    console.log(
      "  [WARN] No hero image found. Claude will need to handle this."
    );
  }

  // Step 8: Write output files
  console.log("\nStep 8: Writing output files...");

  const existingSlug =
    mode === "update"
      ? published.entries[String(selected.recipeNum)]?.slug || null
      : null;

  const selectionJson = {
    pageId: selected.pageId,
    recipeNum: selected.recipeNum,
    title: selected.title,
    mode,
    existingSlug,
  };

  const contentJson = {
    pageId: selected.pageId,
    title: selected.title,
    recipeNum: selected.recipeNum,
    lastEditedTime: new Date(selected.lastEditedTime).toISOString(),
    heroImage,
    blocks,
    faqs,
  };

  writeFileSync(SELECTION_FILE, JSON.stringify(selectionJson, null, 2) + "\n");
  writeFileSync(CONTENT_FILE, JSON.stringify(contentJson, null, 2) + "\n");

  console.log(`  ${SELECTION_FILE} written`);
  console.log(`  ${CONTENT_FILE} written`);

  // Validate output
  if (!selectionJson.title || blocks.length === 0) {
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
