// scripts/notion-utils.mjs
// Shared utilities for all fetch-notion-*.mjs scripts.
// Import from here instead of duplicating these functions in each script.

import {
  readFileSync,
  writeFileSync,
  existsSync,
  mkdirSync,
  appendFileSync,
} from "fs";
import { join } from "path";

// ---------------------------------------------------------------------------
// Shared constants
// ---------------------------------------------------------------------------
export const IMAGE_DIR = "/tmp/notion-images";
export const MAX_RETRIES = 3;
export const RETRY_BASE_MS = 1000;
export const PUBLISHED_JSON = "notion/published.json";
export const MAX_BLOCK_DEPTH = 3;

// ---------------------------------------------------------------------------
// General helpers
// ---------------------------------------------------------------------------
export function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function withRetry(fn, label) {
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

export function writeGitHubOutput(key, value) {
  const outputFile = process.env.GITHUB_OUTPUT;
  if (outputFile) {
    appendFileSync(outputFile, `${key}=${value}\n`);
  }
  console.log(`  ${key}=${value}`);
}

export function readPublishedJson() {
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
export function buildSchemaLookup(schema) {
  const lookup = {};
  for (const [propId, def] of Object.entries(schema)) {
    lookup[def.name] = propId;
  }
  return lookup;
}

export function getRowProperty(row, propName, schemaLookup) {
  if (propName === "title") {
    return row.properties?.title?.[0]?.[0] || "";
  }
  const propId = schemaLookup[propName];
  if (!propId) return "";
  return row.properties?.[propId]?.[0]?.[0] || "";
}

// ---------------------------------------------------------------------------
// Notion block -> structured JSON conversion
// ---------------------------------------------------------------------------
export function decorationToMarkdown(decorations) {
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

export function blockToStructured(block) {
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
export function groupListItems(blocks) {
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
// Recursive block traversal (depth-limited)
// ---------------------------------------------------------------------------
export function traverseBlocks(blockMap, childIds, signedUrls, depth = 0) {
  const results = [];
  if (depth >= MAX_BLOCK_DEPTH || !childIds) return results;

  for (const childId of childIds) {
    const childRecord = blockMap[childId];
    const child = childRecord?.value?.value || childRecord?.value;
    if (!child) continue;

    const structured = blockToStructured(child);
    if (structured) {
      if (structured.type === "image" && structured.url) {
        const signedUrl = signedUrls?.[childId] || structured.url;
        structured.url = signedUrl;
      }
      results.push(structured);
    }

    // Recurse into nested children (toggle content, callout children, etc.)
    if (child.content) {
      const nested = traverseBlocks(
        blockMap,
        child.content,
        signedUrls,
        depth + 1
      );
      results.push(...nested);
    }
  }

  return results;
}

// ---------------------------------------------------------------------------
// FAQ extraction
// ---------------------------------------------------------------------------
export function extractFaqs(blocks) {
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
export async function downloadImage(url, filename) {
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
