// scripts/venue-maintenance-reminders.mjs
//
// Produces a maintenance reminder checklist for Date Spots whose facts are
// due a recheck. This script never edits content: it only reports what
// Victor should revisit and, when GH_TOKEN and GITHUB_REPOSITORY are set,
// opens or updates a single tracking issue.
//
// Usage:
//   node scripts/venue-maintenance-reminders.mjs [--dry-run]

import { readFileSync } from "fs";
import { dueForRecheck } from "./notion-story/maintenance.mjs";

const ISSUE_TITLE = "Venue maintenance reminders";
const ISSUE_LABEL = "venue-maintenance";

function buildBody(due, today) {
  if (due.length === 0) {
    return `No Date Spot is due for a recheck as of ${today}. Nothing to do.`;
  }
  const lines = [
    `As of ${today}, these Date Spots are due for a fact recheck.`,
    "",
    "For each one: revisit or re-verify the facts, then in its Notion Story bump",
    "`Last checked` and, if anything material changed, add a dated Material",
    "update in both locales. Republish through the normal Notion Story PR flow",
    "-- this issue never edits content itself.",
    "",
    ...due.map((spot) => `- [ ] **${spot.name}** (\`${spot.id}\`) -- last checked ${spot.lastChecked}. ${spot.reason}.`),
  ];
  return lines.join("\n");
}

async function upsertIssue(body) {
  const token = process.env.GH_TOKEN;
  const repo = process.env.GITHUB_REPOSITORY;
  if (!token || !repo) {
    console.log("[INFO] GH_TOKEN/GITHUB_REPOSITORY not set; skipping issue upsert.");
    return;
  }
  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "User-Agent": "date-my-dish-venue-maintenance",
  };
  const searchRes = await fetch(
    `https://api.github.com/search/issues?q=${encodeURIComponent(`repo:${repo} in:title "${ISSUE_TITLE}" is:issue is:open`)}`,
    { headers }
  );
  const searchJson = await searchRes.json();
  const existing = searchJson.items?.[0];

  if (existing) {
    await fetch(`https://api.github.com/repos/${repo}/issues/${existing.number}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ body }),
    });
    console.log(`Updated issue #${existing.number}`);
  } else {
    const createRes = await fetch(`https://api.github.com/repos/${repo}/issues`, {
      method: "POST",
      headers,
      body: JSON.stringify({ title: ISSUE_TITLE, body, labels: [ISSUE_LABEL] }),
    });
    const created = await createRes.json();
    console.log(`Created issue #${created.number}`);
  }
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const spots = JSON.parse(readFileSync("src/content/date-spots.json", "utf-8"));
  const today = new Date().toISOString().slice(0, 10);
  const due = dueForRecheck(spots, today);
  const body = buildBody(due, today);

  console.log(body);

  if (!dryRun) await upsertIssue(body);
}

main().catch((err) => {
  console.error(`[FATAL] ${err.message}`);
  process.exitCode = 1;
});
