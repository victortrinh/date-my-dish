// scripts/notion-story/parse.mjs
//
// Free-form Notion page bodies -> an ordered list of sections, each a
// heading and the blocks under it (paragraphs, quotes, lists, tables,
// images). Nothing is reworded, merged or dropped: every block keeps its
// exact text, and author notes are labelled rather than removed, so the
// Importer agent and the PR can show all of it.

import { mapHeading, isEditorialSection } from "./headings.mjs";

/**
 * @typedef {import("./notion.mjs").PageNode} PageNode
 * @typedef {{ alt: string, file: string, url: string, source: string, blockId: string }} SourceImage
 * @typedef {{ kind: "paragraph" | "quote" | "subheading" | "todo" | "code", text: string, note?: true, checked?: boolean }
 *   | { kind: "list", style: "bulleted" | "numbered", items: string[] }
 *   | { kind: "table", header: boolean, rows: string[][] }
 *   | { kind: "callout", lines: string[], note?: true }
 *   | { kind: "image", image: SourceImage }} SourceBlock
 * @typedef {{ heading: string | null, level: number, section: string | null, label: string | null, blocks: SourceBlock[] }} SourceSection
 */

// "[PULL QUOTE NEEDED. Recorded speech only.]", "[ANSWER NEEDED.]": an
// author's placeholder for a slot that has no content yet.
const PLACEHOLDER = /^\[[^\]]*\]$/;
// The callout authors use for notes that must not ship.
const INTERNAL = /^internal\b/i;
// "Meta title:    Moccione, Villeray: ...  (45/60)"
const METADATA_LINE = /^([A-Z][A-Za-z0-9 #/()-]*?):\s+(.*)$/;

/**
 * The author's metadata code block ("URL:", "Slug:", "Meta title:", ...).
 * Continuation lines are indented; character-count notes like "(45/60)"
 * are the author's own tallies and are dropped from the value.
 * @param {string} text
 * @returns {Record<string, string> | null} null when the block is not key-value metadata
 */
export function parseMetadata(text) {
  const metadata = {};
  let key = null;
  let matched = 0;
  for (const line of String(text).split("\n")) {
    const match = line.match(METADATA_LINE);
    if (match && !/^\s/.test(line)) {
      key = match[1].trim();
      metadata[key] = match[2].trim();
      matched += 1;
    } else if (key && line.trim()) {
      metadata[key] = `${metadata[key]} ${line.trim()}`;
    }
  }
  if (matched < 2) return null;
  for (const [k, value] of Object.entries(metadata)) metadata[k] = value.replace(/\s*\(\d+\/[\d-]+\)\s*$/, "").trim();
  return metadata;
}

const isPlaceholder = (text) => PLACEHOLDER.test(text.trim());

/**
 * @param {PageNode[]} nodes output of notion.mjs pageTree()
 * @returns {{ metadata: Record<string, string>, sections: SourceSection[], images: SourceImage[] }}
 */
export function parseBody(nodes) {
  /** @type {Record<string, string>} */
  let metadata = {};
  /** @type {SourceSection[]} */
  const sections = [{ heading: null, level: 0, section: null, label: null, blocks: [] }];
  /** @type {SourceImage[]} */
  const images = [];
  const current = () => sections[sections.length - 1];
  // An image directly after an alt-text list item (no image of its own) takes that item as its alt.
  let pendingAlt = null;

  const addImage = (node, alt) => {
    const image = { alt: (alt ?? node.text ?? "").trim(), file: node.file ?? "", url: node.url ?? "", source: node.source ?? "", blockId: node.id };
    images.push(image);
    current().blocks.push({ kind: "image", image });
  };

  const addListItem = (style, text) => {
    const last = current().blocks.at(-1);
    if (last?.kind === "list" && last.style === style) last.items.push(text);
    else current().blocks.push({ kind: "list", style, items: [text] });
  };

  const visit = (node) => {
    const text = node.text.trim();
    const wasPending = pendingAlt;
    pendingAlt = null;
    switch (node.type) {
      case "header":
      case "sub_header": {
        const level = node.type === "header" ? 1 : 2;
        const placement = mapHeading(text, level);
        sections.push({ heading: text, level, section: placement?.section ?? null, label: placement?.label ?? null, blocks: [] });
        return;
      }
      case "sub_sub_header":
        current().blocks.push({ kind: "subheading", text });
        return;
      case "divider":
        return;
      case "code": {
        const parsed = parseMetadata(node.text);
        if (parsed && Object.keys(metadata).length === 0) metadata = parsed;
        else current().blocks.push({ kind: "code", text: node.text, note: true });
        return;
      }
      case "table":
        current().blocks.push({ kind: "table", header: Boolean(node.header), rows: node.rows ?? [] });
        return;
      case "image":
        addImage(node, wasPending);
        return;
      case "callout": {
        const lines = [text, ...node.children.map((child) => child.text.trim())].filter(Boolean);
        const block = { kind: "callout", lines };
        if (INTERNAL.test(lines[0] ?? "")) block.note = true;
        current().blocks.push(block);
        return;
      }
      case "bulleted_list":
      case "numbered_list": {
        const style = node.type === "bulleted_list" ? "bulleted" : "numbered";
        if (text) addListItem(style, text);
        const childImages = node.children.filter((child) => child.type === "image");
        childImages.forEach((child, index) => addImage(child, index === 0 ? text : child.text));
        for (const child of node.children.filter((c) => c.type !== "image")) visit(child);
        if (childImages.length === 0 && text) pendingAlt = text;
        return;
      }
      case "to_do":
        if (text) current().blocks.push({ kind: "todo", text, checked: Boolean(node.checked) });
        return;
      case "quote":
      case "text":
      default: {
        if (text) {
          const block = { kind: node.type === "quote" ? "quote" : "paragraph", text };
          if (isPlaceholder(text)) block.note = true;
          current().blocks.push(block);
        }
        // Toggles, columns and synced blocks keep their children in order.
        for (const child of node.children) visit(child);
      }
    }
  };

  for (const node of nodes) visit(node);
  const result = sections.filter((section, index) => index > 0 || section.blocks.length > 0);
  return { metadata, sections: result, images };
}

/** Headings the map does not know, for the agent to place and the PR to list. */
export function unmappedHeadings(sections) {
  return sections.filter((section) => section.heading && !section.section).map((section) => section.heading);
}

/**
 * Every piece of reader-facing Notion text a published sentence may be
 * traced back to: headings, paragraphs, quotes, list items, table cells and
 * metadata values. Author notes (INTERNAL callouts, bracketed placeholders)
 * and editorial sections (alt text, internal links, checklists) are left
 * out, so text lifted from them fails the Verbatim Check.
 * @param {{ metadata?: Record<string, string>, sections: SourceSection[] }} source
 * @param {{ proseCellsOnly?: boolean }} [options] proseCellsOnly: from tables, only body cells of four words or
 *   more (the prose, not the labels), for listing Unplaced Text without noise
 * @returns {string[]}
 */
export function sourceTexts(source, options = {}) {
  const texts = Object.entries(source.metadata ?? {})
    .filter(([key]) => !/^(url|slug)$/i.test(key))
    .map(([, value]) => value);
  for (const section of source.sections) {
    if (isEditorialSection(section.section)) continue;
    if (section.heading) texts.push(section.heading);
    for (const block of section.blocks) {
      if ("note" in block && block.note) continue;
      if (block.kind === "list") texts.push(...block.items);
      else if (block.kind === "table") {
        for (const [index, row] of block.rows.entries()) {
          const cells = row.filter(Boolean);
          if (options.proseCellsOnly) {
            if (!(block.header && index === 0)) texts.push(...cells.filter((cell) => cell.split(/\s+/).length >= 4));
          } else texts.push(...cells, cells.join(" "));
        }
      }
      else if (block.kind === "callout") texts.push(...block.lines);
      else if (block.kind !== "image" && block.kind !== "code") texts.push(block.text);
    }
  }
  return texts.filter((text) => text && !isPlaceholder(text));
}

/** The source's headings (H1 to H3), for the "H2 as a question" allowance. */
export function sourceHeadings(source) {
  return source.sections.flatMap((section) => [
    ...(section.heading && !isEditorialSection(section.section) ? [section.heading] : []),
    ...section.blocks.filter((block) => block.kind === "subheading").map((block) => /** @type {{ text: string }} */ (block).text),
  ]);
}
