// scripts/pinterest-rotate.mjs
// Posts scheduled Pinterest pin variants/images that are due.
// Reads data/social-posts-log.json, finds pending pins with scheduledFor <= now,
// posts them via Pinterest API, and updates the log.
//
// Content-type aware: each log entry may carry a `type` field ("recipe",
// "article", or "review") added by social-post.mjs. Entries without a `type`
// field predate this change and are treated as recipes (their original type).
//
// This script only ever creates new pins for pins already marked "pending"
// in the log. It never edits or re-posts a pin that already has status
// "posted". Editing live pins is a separate, manual tool
// (scripts/pinterest-update-pins.mjs).
//
// Usage:
//   node scripts/pinterest-rotate.mjs
//
// Rate limits: max 5 pins per run, 10s delay between posts.

import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";
import matter from "gray-matter";
import {
  buildContentUrl,
  contentDir,
  boardIdForType,
  fetchLiveHtml,
  discoverImagesFromHtml,
} from "./lib/content-images.mjs";

const LOG_FILE = "data/social-posts-log.json";
const MAX_PINS_PER_RUN = 5;
const DELAY_BETWEEN_POSTS_MS = 10_000;

const { PINTEREST_ACCESS_TOKEN } = process.env;

// ---------------------------------------------------------------------------
// Log helpers
// ---------------------------------------------------------------------------
function readLog() {
  if (!existsSync(LOG_FILE)) return {};
  return JSON.parse(readFileSync(LOG_FILE, "utf-8"));
}

function writeLog(log) {
  writeFileSync(LOG_FILE, JSON.stringify(log, null, 2) + "\n");
}

// ---------------------------------------------------------------------------
// Legacy hero resolution (for old pending pins that don't carry imageSrc)
// ---------------------------------------------------------------------------
async function resolveLegacyHeroImageUrl(type, slug) {
  const url = buildContentUrl(type, slug);
  const html = await fetchLiveHtml(url);
  const images = discoverImagesFromHtml(html, {});
  const hero = images.find((i) => i.isHero);
  if (!hero) throw new Error(`No hero image found on ${url}`);
  return hero.src;
}

function getHeroImageAlt(type, slug) {
  const filePath = join(contentDir(type, "en"), `${slug}.mdx`);
  if (!existsSync(filePath)) return "";
  const raw = readFileSync(filePath, "utf-8");
  const { data } = matter(raw);
  return data.heroImageAlt || "";
}

// ---------------------------------------------------------------------------
// Pinterest API v5
// ---------------------------------------------------------------------------
async function postToPinterest(boardId, imageUrl, title, description, link, altText) {
  if (!PINTEREST_ACCESS_TOKEN || !boardId) {
    throw new Error("Missing PINTEREST_ACCESS_TOKEN or board ID for this content type");
  }

  console.log(`  Posting pin: "${title.slice(0, 60)}..."`);

  const res = await fetch("https://api.pinterest.com/v5/pins", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${PINTEREST_ACCESS_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      board_id: boardId,
      title: title.slice(0, 100),
      description: description.slice(0, 800),
      link,
      alt_text: (altText || "").slice(0, 500),
      media_source: { source_type: "image_url", url: imageUrl },
    }),
  });

  if (res.status === 429) {
    const retryAfter = res.headers.get("Retry-After");
    throw new Error(`Pinterest rate limited. Retry after ${retryAfter}s`);
  }

  const data = await res.json();
  if (!res.ok) {
    throw new Error(`Pinterest API error ${data.code || res.status}: ${data.message || JSON.stringify(data)}`);
  }

  console.log(`  Pin created: ${data.id}`);
  return data.id;
}

// ---------------------------------------------------------------------------
// Create GitHub issue on failure
// ---------------------------------------------------------------------------
async function createFailureIssue(slug, type, identifier, error) {
  const title = `Pinterest pin rotation failed: ${slug} (${type}) ${identifier}`;
  const body = [
    `## Pinterest Pin Rotation Failure`,
    ``,
    `| Field | Value |`,
    `|-------|-------|`,
    `| **Content** | \`${slug}\` (${type}) |`,
    `| **Pin** | ${identifier} |`,
    `| **Error** | ${error.message} |`,
    `| **Timestamp** | ${new Date().toISOString()} |`,
    ``,
    `### Error Details`,
    "```",
    `${error.stack || error.message}`,
    "```",
    ``,
    `### Recovery`,
    `The pin will be retried on the next cron run.`,
  ].join("\n");

  try {
    const { execFileSync } = await import("child_process");
    const { writeFileSync, unlinkSync } = await import("fs");
    const { tmpdir } = await import("os");
    const { join: joinPath } = await import("path");
    const bodyFile = joinPath(tmpdir(), `gh-issue-body-${Date.now()}.md`);
    writeFileSync(bodyFile, body);
    try {
      execFileSync(
        "gh",
        ["issue", "create", "--title", title, "--body-file", bodyFile, "--label", "social-media-failure"],
        { stdio: "inherit" }
      );
    } finally {
      unlinkSync(bodyFile);
    }
  } catch (issueErr) {
    console.error("Failed to create GitHub issue:", issueErr.message);
  }
}

// ---------------------------------------------------------------------------
// Main: find and post due pin variants
// ---------------------------------------------------------------------------
async function main() {
  const log = readLog();
  const now = new Date();
  let postsThisRun = 0;

  const duePins = [];
  for (const [slug, entry] of Object.entries(log)) {
    const type = entry.type || "recipe"; // pre-existing entries predate the `type` field
    const pins = entry.pinterest?.pins;
    if (!pins) continue;

    for (const pin of pins) {
      if (pin.status !== "pending") continue;
      if (!pin.scheduledFor) continue;
      if (new Date(pin.scheduledFor) > now) continue;
      duePins.push({ slug, type, pin });
    }
  }

  if (duePins.length === 0) {
    console.log("No pending pins due for posting.");
    return;
  }

  console.log(`Found ${duePins.length} pin(s) due for posting (max ${MAX_PINS_PER_RUN} per run)`);

  for (const { slug, type, pin } of duePins.slice(0, MAX_PINS_PER_RUN)) {
    const identifier = pin.imageKey || `variant ${pin.variant}`;
    console.log(`\nPosting ${slug} (${type}) ${identifier}...`);

    try {
      const boardId = boardIdForType(type);
      const url = buildContentUrl(type, slug);
      // New-style pins store their own image; legacy pins re-resolve the hero live.
      const imageUrl = pin.imageSrc || (await resolveLegacyHeroImageUrl(type, slug));
      const altText = pin.altText || getHeroImageAlt(type, slug);

      const pinId = await postToPinterest(boardId, imageUrl, pin.title, pin.description, url, altText);

      pin.id = pinId;
      pin.postedAt = new Date().toISOString();
      pin.status = "posted";
    } catch (err) {
      console.error(`  Failed: ${err.message}`);
      pin.status = "failed";
      pin.error = err.message;
      pin.failedAt = new Date().toISOString();
      await createFailureIssue(slug, type, identifier, err);
    }

    writeLog(log); // save after each pin in case of crash
    postsThisRun++;

    if (postsThisRun < Math.min(duePins.length, MAX_PINS_PER_RUN)) {
      console.log(`  Waiting ${DELAY_BETWEEN_POSTS_MS / 1000}s...`);
      await new Promise((r) => setTimeout(r, DELAY_BETWEEN_POSTS_MS));
    }
  }

  // Retry failed pins (set back to pending for next run)
  for (const entry of Object.values(log)) {
    const pins = entry.pinterest?.pins;
    if (!pins) continue;
    for (const pin of pins) {
      if (pin.status === "failed") {
        console.log(`Resetting failed pin (${pin.imageKey || "variant " + pin.variant}) to pending for retry`);
        pin.status = "pending";
        if (!pin.scheduledFor) pin.scheduledFor = new Date().toISOString();
        delete pin.error;
        delete pin.failedAt;
      }
    }
  }
  writeLog(log);

  console.log(`\nDone. Posted ${postsThisRun} pin(s).`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
