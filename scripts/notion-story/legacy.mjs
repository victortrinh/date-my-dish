// scripts/notion-story/legacy.mjs
//
// The seven reviews published before the rework already have a French
// version, written and approved by Victor, in src/content/reviews/fr/. Their
// FR is not translated again: the Importer fits that text into the new
// sections (docs/editorial-publishing-system.md, "French"). This module reads
// the old EN and FR MDX into plain text blocks so the Verbatim Check can run
// with the FR MDX as its source.
//
// `next` copies the blocks into the post's source snapshot (`legacy`), so the
// check keeps working once the old MDX files are retired.

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import matter from "gray-matter";

export const LEGACY_REVIEWS_DIR = "src/content/reviews";

// Notion row number -> the old review's file name (same in en/ and fr/).
export const LEGACY_REVIEWS = Object.freeze({
  53: "mckiernan-montreal",
  55: "moccione-montreal",
  80: "hoogan-et-beaufort-montreal",
  81: "othym-montreal",
  82: "oncle-lee-kao-montreal",
  83: "giwa-verdun-montreal",
  84: "ile-flottante-montreal",
});

// Frontmatter that is reader text on the old page. Keywords, tags, social
// captions, scores and file paths are not.
const TEXT_FRONTMATTER = new Set([
  "title", "description", "heroImageAlt", "restaurantName", "neighborhood", "address", "cuisine",
  "bestFor", "costPerPerson", "reservationTip", "dishHighlights", "dateTypeFit", "faqs",
]);

/** @param {unknown} value @returns {string[]} */
function strings(value) {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(strings);
  if (value && typeof value === "object") return Object.values(value).flatMap(strings);
  return [];
}

/**
 * The reader text of an old review MDX file, one entry per block
 * (paragraph, heading, list item, table cell, frontmatter value).
 * @param {string} mdx
 * @returns {{ texts: string[], headings: string[] }}
 */
export function legacyTexts(mdx) {
  const { data, content } = matter(mdx);
  const texts = Object.entries(data).filter(([key]) => TEXT_FRONTMATTER.has(key)).flatMap(([, value]) => strings(value));
  const headings = [];
  const body = content
    .replace(/^import .*$/gm, "")
    .replace(/<[A-Z][\s\S]*?\/>/g, "") // <Picture ... /> and other self-closing components
    .replace(/<\/?[A-Za-z][^>]*>/g, "");
  for (const block of body.split(/\n\s*\n/)) {
    // Lists, tables and headings are one entry per line; a paragraph is one entry.
    const lines = /^\s*([-*]\s|\d+\.\s|\||#)/m.test(block) ? block.split("\n") : [block.replace(/\n/g, " ")];
    for (const rawLine of lines) {
      let line = rawLine.trim();
      if (!line || /^\|?\s*:?-{3,}/.test(line)) continue;
      const heading = line.match(/^#{1,6}\s+(.*)$/);
      if (heading) {
        headings.push(heading[1].trim());
        texts.push(heading[1].trim());
        continue;
      }
      if (line.startsWith("|")) {
        texts.push(...line.split("|").map((cell) => cell.trim()).filter(Boolean));
        continue;
      }
      line = line.replace(/^([-*]|\d+\.)\s+/, "").replace(/\*\*|__/g, "").replace(/(^|\s)[*_]([^*_]+)[*_]/g, "$1$2");
      if (line) texts.push(line);
    }
  }
  return { texts: texts.map((text) => text.trim()).filter(Boolean), headings };
}

/**
 * The old EN and FR text of a pre-rework review, or null when the row is not
 * one of the seven (or its files are gone).
 * @param {number | string | undefined} number Notion row number
 * @param {string} [dir]
 * @returns {{ name: string, en: { texts: string[], headings: string[] }, fr: { texts: string[], headings: string[] } } | null}
 */
export function readLegacyReview(number, dir = LEGACY_REVIEWS_DIR) {
  const name = LEGACY_REVIEWS[/** @type {keyof typeof LEGACY_REVIEWS} */ (Number(number))];
  if (!name) return null;
  const en = join(dir, "en", `${name}.mdx`);
  const fr = join(dir, "fr", `${name}.mdx`);
  if (!existsSync(en) || !existsSync(fr)) return null;
  return { name, en: legacyTexts(readFileSync(en, "utf8")), fr: legacyTexts(readFileSync(fr, "utf8")) };
}
