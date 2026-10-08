// scripts/notion-story/rows.mjs
//
// Which Notion rows need work: eligible rows that were never imported
// (new), published rows whose Notion last-edited time moved since the last
// sync (updated), and rows that resolve to the same venue as another
// (duplicate, flagged and never published twice).

import { isEligible, venueKey } from "./fields.mjs";

/**
 * @typedef {ReturnType<typeof import("./notion.mjs").rowFromBlock>} Row
 * @typedef {{ notionTitle?: string, slug: string, type?: string, pageId?: string, notionLastEdited?: number,
 *   publishedDate?: string, lastSyncedDate?: string, status?: string }} PublishedEntry
 * @typedef {{ row: Row, state: "new" | "updated" | "unchanged" | "duplicate", key: string, duplicateOf?: number[], entry?: PublishedEntry }} Work
 */

/** @param {Row[]} rows */
export function eligibleRows(rows) {
  return rows.filter(isEligible).sort((a, b) => (a.number ?? Infinity) - (b.number ?? Infinity));
}

/**
 * Groups of eligible rows that resolve to the same venue.
 * @param {Row[]} rows
 * @returns {{ key: string, numbers: number[] }[]}
 */
export function findDuplicates(rows) {
  const byKey = new Map();
  for (const row of eligibleRows(rows)) {
    const key = venueKey(row.title);
    byKey.set(key, [...(byKey.get(key) ?? []), row]);
  }
  return [...byKey.entries()]
    .filter(([, group]) => group.length > 1)
    .map(([key, group]) => ({ key, numbers: group.map((row) => row.number) }));
}

/** When the row was last synced, in ms since the epoch. */
function syncedAt(entry) {
  if (Number.isFinite(entry.notionLastEdited)) return entry.notionLastEdited;
  // Entries from before the importer carry only a date: count the whole day.
  return entry.lastSyncedDate ? Date.parse(`${entry.lastSyncedDate}T23:59:59.999Z`) : 0;
}

/**
 * @param {Row[]} rows every database row
 * @param {{ entries: Record<string, PublishedEntry> }} published notion/published.json
 * @returns {Work[]} eligible rows in Recipe # order, each with its state
 */
export function classifyRows(rows, published) {
  const duplicates = findDuplicates(rows);
  return eligibleRows(rows).map((row) => {
    const key = venueKey(row.title);
    const group = duplicates.find((dup) => dup.key === key);
    const entry = row.number === null ? undefined : published.entries?.[String(row.number)];
    if (group) {
      // The row already live keeps its page; any other row for that venue is held back.
      const live = group.numbers.find((number) => published.entries?.[String(number)]);
      if (live !== row.number) return { row, key, entry, state: "duplicate", duplicateOf: group.numbers.filter((n) => n !== row.number) };
    }
    if (!entry) return { row, key, state: "new" };
    const edited = Number(row.lastEditedTime ?? 0);
    return { row, key, entry, state: edited > syncedAt(entry) ? "updated" : "unchanged" };
  });
}

/**
 * The next row to import: new rows first, then updated ones, lowest
 * Recipe # first, skipping rows that already have an open import PR.
 * @param {Work[]} work
 * @param {Set<number>} [skip] Recipe #s with an open import PR
 */
export function nextWork(work, skip = new Set()) {
  const pending = work.filter((item) => !skip.has(/** @type {number} */ (item.row.number)));
  return pending.find((item) => item.state === "new") ?? pending.find((item) => item.state === "updated") ?? null;
}
