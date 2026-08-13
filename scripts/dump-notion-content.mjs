// scripts/dump-notion-content.mjs
// Usage: node scripts/dump-notion-content.mjs <recipe-number>
// Fetches and prints the Notion page content for a given recipe/article/review number.

import { createNotionApi } from "./notion-utils.mjs";

const DATABASE_PAGE_ID = "9ce95183503543d68450194d1010824b";

function getDecoText(dec) {
  if (!dec) return "";
  return dec
    .map((d) => {
      let text = d[0];
      const anns = d[1] || [];
      for (const ann of anns) {
        if (ann[0] === "b") text = "**" + text + "**";
        if (ann[0] === "i") text = "*" + text + "*";
        if (ann[0] === "a") text = "[" + text + "](" + ann[1] + ")";
      }
      return text;
    })
    .join("");
}

function printBlock(blockMap, id, indent = 0) {
  const rec = blockMap[id];
  const b = rec?.value?.value || rec?.value;
  if (!b) return;
  const type = b.type;
  const text = getDecoText(b.properties?.title);
  const prefix = "  ".repeat(indent);

  if (type === "image") {
    const src =
      b.format?.display_source || b.properties?.source?.[0]?.[0] || "";
    const shortSrc = src.split("/").pop()?.substring(0, 60) || "no-src";
    console.log(prefix + "[IMAGE] " + shortSrc);
  } else {
    console.log(prefix + "[" + type.toUpperCase() + "] " + text);
  }

  if (b.content) {
    for (const cid of b.content) {
      printBlock(blockMap, cid, indent + 1);
    }
  }
}

async function main() {
  const recipeNum = process.argv[2];
  if (!recipeNum) {
    console.error(
      "Usage: node scripts/dump-notion-content.mjs <recipe-number>"
    );
    process.exit(1);
  }

  const api = createNotionApi();

  // Fetch database
  const recordMap = await api.getPage(DATABASE_PAGE_ID, {
    signFileUrls: false,
  });
  const collectionId = Object.keys(recordMap.collection)[0];
  const viewId = Object.keys(recordMap.collection_view)[0];

  const collData = await api.getCollectionData(collectionId, viewId);
  const collRecord = collData.recordMap?.collection?.[collectionId];
  const collValue = collRecord?.value?.value || collRecord?.value;
  const schema = collValue?.schema;

  const lookup = {};
  for (const [propId, def] of Object.entries(schema)) {
    lookup[def.name] = propId;
  }

  const blockIds =
    collData.result?.reducerResults?.collection_group_results?.blockIds || [];
  const blockMap = collData.recordMap?.block || {};

  // Find the page
  let foundId = null;
  for (const blockId of blockIds) {
    const blockRecord = blockMap[blockId];
    const block = blockRecord?.value?.value || blockRecord?.value;
    if (!block || block.type !== "page") continue;

    const num = block.properties?.[lookup["Recipe #"]]?.[0]?.[0];
    if (num === recipeNum) {
      const title = block.properties?.title?.[0]?.[0] || "untitled";
      console.log(
        "Found #" + recipeNum + ": " + title + "\nPage ID: " + blockId + "\n"
      );
      foundId = blockId;
      break;
    }
  }

  if (!foundId) {
    console.error(
      "Recipe/article #" + recipeNum + " not found in Notion database."
    );
    process.exit(1);
  }

  // Fetch page content
  const pageRecordMap = await api.getPage(foundId, { signFileUrls: false });
  const pageBlock =
    pageRecordMap.block[foundId]?.value?.value ||
    pageRecordMap.block[foundId]?.value;
  const childIds = pageBlock?.content || [];

  console.log("--- Content blocks (" + childIds.length + ") ---\n");

  for (const childId of childIds) {
    printBlock(pageRecordMap.block, childId);
  }
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
