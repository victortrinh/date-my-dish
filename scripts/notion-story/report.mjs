// scripts/notion-story/report.mjs
//
// When an import is blocked, nothing on the site changes: the Importer
// opens a `notion-story` issue saying what blocked it, or updates the open
// one for the same row so a weekly retry never piles up duplicates.

import { execFileSync } from "node:child_process";

export const FAILURE_LABEL = "notion-story";

/**
 * @param {{ number?: number | null, title?: string } | null} row
 */
export function failureTitle(row) {
  return row?.number ? `Notion import blocked: #${row.number} ${row.title ?? ""}`.trim() : "Notion import blocked";
}

/**
 * @param {{ number?: number | null, title?: string, pageId?: string } | null} row
 * @param {string[]} problems
 * @param {string} [today] YYYY-MM-DD
 */
export function failureBody(row, problems, today = new Date().toISOString().slice(0, 10)) {
  return [
    `The Importer could not import ${row?.number ? `Notion row #${row.number}, "${row.title}"` : "from the Notion database"} on ${today}.`,
    "",
    "Nothing on the site changed. Notion is read-only for DMD, so the fix is one of:",
    "",
    "- an edit Victor makes in Notion (the next run picks it up), or",
    "- a change to the importer or the heading map in this repository.",
    "",
    "## What blocked it",
    "",
    ...problems.map((problem) => `- [ ] ${problem}`),
    "",
    ...(row?.pageId ? [`Notion page: https://www.notion.so/${row.pageId.replace(/-/g, "")}`, ""] : []),
  ].join("\n");
}

/** @param {string[]} args @param {string} [input] */
const gh = (args, input) => execFileSync("gh", args, { encoding: "utf8", input });

/**
 * Open a `notion-story` issue, or update the open one with the same title.
 * @param {{ title: string, body: string }} issue
 * @param {(args: string[], input?: string) => string} [run] runs `gh` (injected in tests)
 * @returns {{ action: "created" | "updated", number?: number }}
 */
export function openOrUpdateFailureIssue({ title, body }, run = gh) {
  const open = JSON.parse(run(["issue", "list", "--label", FAILURE_LABEL, "--state", "open", "--limit", "100", "--json", "number,title"]) || "[]");
  const existing = open.find((issue) => issue.title === title);
  if (existing) {
    run(["issue", "edit", String(existing.number), "--body-file", "-"], body);
    run(["issue", "comment", String(existing.number), "--body", "Still blocked on the latest Importer run. The description above is current."]);
    return { action: "updated", number: existing.number };
  }
  run(["issue", "create", "--title", title, "--label", FAILURE_LABEL, "--body-file", "-"], body);
  return { action: "created" };
}
