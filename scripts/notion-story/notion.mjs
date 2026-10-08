// scripts/notion-story/notion.mjs
//
// Read-only access to the public Notion database through notion-client's
// unauthenticated endpoints (createNotionApi() sets the browser User-Agent
// Cloudflare needs; there is no token). Nothing here writes to Notion.

import { createNotionApi, withRetry } from "../notion-utils.mjs";
import { DATABASE_PAGE_ID, PROPERTIES } from "./fields.mjs";

/** notion-client returns records as value or value.value depending on the endpoint. */
const unwrap = (record) => record?.value?.value ?? record?.value ?? null;

/** Plain text of a Notion rich-text property: [["Hello ", [["b"]]], ["world"]]. */
export function plainText(decorations) {
  return (decorations ?? []).map((dec) => dec[0]).join("");
}

/** Links carried by a rich-text property, so a source link is never lost. */
function linksOf(decorations) {
  return (decorations ?? [])
    .flatMap((dec) => (dec[1] ?? []).filter((ann) => ann[0] === "a").map((ann) => ({ text: dec[0], url: ann[1] })));
}

/** A date property: [["‣", [["d", { start_date: "2026-09-01" }]]]]. */
function dateOf(decorations) {
  for (const dec of decorations ?? []) {
    for (const ann of dec[1] ?? []) if (ann[0] === "d" && ann[1]?.start_date) return ann[1].start_date;
  }
  return null;
}

/**
 * One database row as plain values.
 * @param {string} pageId
 * @param {Record<string, any>} block the row's page block
 * @param {Record<string, { name: string, type: string }>} schema the collection schema
 */
export function rowFromBlock(pageId, block, schema) {
  const byName = {};
  for (const [id, def] of Object.entries(schema)) byName[def.name] = { id, type: def.type };
  const raw = (name) => (name === PROPERTIES.title ? block.properties?.title : block.properties?.[byName[name]?.id]);
  const text = (name) => plainText(raw(name)).trim();
  const number = Number.parseInt(text(PROPERTIES.number), 10);
  return {
    pageId,
    number: Number.isFinite(number) ? number : null,
    title: text(PROPERTIES.title),
    postType: text(PROPERTIES.postType),
    status: text(PROPERTIES.status),
    borough: text(PROPERTIES.borough) || null,
    publishDate: dateOf(raw(PROPERTIES.publishDate)),
    lastEditedTime: block.last_edited_time ?? null,
  };
}

/**
 * Every row of the database, eligible or not. Filtering happens in code.
 * @param {ReturnType<typeof createNotionApi>} [api]
 */
export async function fetchRows(api = createNotionApi()) {
  const recordMap = await withRetry(() => api.getPage(DATABASE_PAGE_ID, { signFileUrls: false }), "getPage(database)");
  const collectionId = Object.keys(recordMap.collection ?? {})[0];
  if (!collectionId) throw new Error("No collection found. Is the Notion database still public?");
  // Saved views may carry filters (for example "Ready to Write"); prefer one without.
  const views = Object.entries(recordMap.collection_view ?? {}).map(([id, record]) => ({ id, view: unwrap(record) }));
  const view = views.find(({ view: v }) => v?.type === "table" && !v?.format?.property_filters && !v?.query2?.filter) ?? views[0];
  if (!view) throw new Error("No collection views found.");

  const data = await withRetry(() => api.getCollectionData(collectionId, view.id, undefined, { limit: 9999 }), "getCollectionData");
  const schema = unwrap(data.recordMap?.collection?.[collectionId])?.schema;
  if (!schema) throw new Error("Could not read the collection schema. The internal API may have changed.");
  const blockIds = data.result?.reducerResults?.collection_group_results?.blockIds ?? [];
  return blockIds
    .map((id) => ({ id, block: unwrap(data.recordMap.block?.[id]) }))
    .filter(({ block }) => block?.type === "page")
    .map(({ id, block }) => rowFromBlock(id, block, schema));
}

/**
 * The page body as a tree of plain nodes.
 * @param {Record<string, any>} recordMap
 * @param {string} pageId
 * @returns {{ lastEditedTime: number | null, nodes: PageNode[] }}
 *
 * @typedef {{ id: string, type: string, text: string, links?: { text: string, url: string }[], rows?: string[][],
 *   header?: boolean, source?: string, url?: string, file?: string, checked?: boolean, children: PageNode[] }} PageNode
 */
export function pageTree(recordMap, pageId) {
  const signed = recordMap.signed_urls ?? {};
  const get = (id) => unwrap(recordMap.block?.[id]);
  const toNode = (id) => {
    const block = get(id);
    if (!block || block.alive === false) return null;
    const title = block.properties?.title;
    /** @type {PageNode} */
    const node = { id, type: block.type, text: plainText(title), children: [] };
    const links = linksOf(title);
    if (links.length) node.links = links;
    if (block.type === "table") {
      const order = block.format?.table_block_column_order ?? [];
      node.header = Boolean(block.format?.table_block_column_header);
      node.rows = (block.content ?? []).map(get).filter(Boolean).map((row) => order.map((col) => plainText(row.properties?.[col]).trim()));
      return node;
    }
    if (block.type === "image") {
      const source = block.format?.display_source ?? plainText(block.properties?.source) ?? "";
      node.source = source;
      node.url = signed[id] ?? signed[source] ?? source;
      node.file = plainText(block.properties?.title) || source.split("/").pop()?.split("?")[0] || "";
      node.text = plainText(block.properties?.caption);
    }
    if (block.type === "to_do") node.checked = plainText(block.properties?.checked) === "Yes";
    node.children = (block.content ?? []).map(toNode).filter(Boolean);
    return node;
  };
  const page = get(pageId);
  if (!page) throw new Error(`Page ${pageId} is missing from the record map.`);
  return { lastEditedTime: page.last_edited_time ?? null, nodes: (page.content ?? []).map(toNode).filter(Boolean) };
}

/**
 * @param {string} pageId
 * @param {ReturnType<typeof createNotionApi>} [api]
 */
export async function fetchPage(pageId, api = createNotionApi()) {
  const recordMap = await withRetry(() => api.getPage(pageId, { signFileUrls: true }), `getPage(${pageId})`);
  return pageTree(recordMap, pageId);
}
