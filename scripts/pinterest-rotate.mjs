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
// Images are resolved from the repo's own src/assets/images/ source files
// and uploaded as bytes (image_base64), not by URL. Pins used to store the
// deployed, content-hashed dist URL and post that URL straight to Pinterest;
// by the time a pin's scheduled date arrived the image could easily have
// been re-optimized under a new hash, leaving the stored URL 404ing. See
// scripts/lib/content-images.mjs (resolveLocalAsset) for the resolution.
//
// Usage:
//   node scripts/pinterest-rotate.mjs
//   node scripts/pinterest-rotate.mjs --dry-run   # resolve + log only, no API calls
//
// Rate limits: max 5 pins per run, 10s delay between posts.

import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";
import matter from "gray-matter";
import {
  buildContentUrl,
  contentDir,
  boardIdForType,
  resolveLocalAsset,
  readImageAsBase64,
} from "./lib/content-images.mjs";

const LOG_FILE = "data/social-posts-log.json";
const MAX_PINS_PER_RUN = 5;
const DELAY_BETWEEN_POSTS_MS = 10_000;
const MAX_PIN_ATTEMPTS = 5;
const DRY_RUN = process.argv.includes("--dry-run");

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
async function postToPinterest(boardId, image, title, description, link, altText) {
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
      media_source: {
        source_type: "image_base64",
        content_type: image.contentType,
        data: image.data,
      },
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
// GitHub issue on failure (dedupe: one issue on first failure, one on final
// give-up, never one per retry)
// ---------------------------------------------------------------------------
async function issueAlreadyOpen(title) {
  try {
    const { execFileSync } = await import("child_process");
    const out = execFileSync(
      "gh",
      ["issue", "list", "--search", `"${title}" in:title`, "--state", "open", "--json", "number"],
      { encoding: "utf-8" }
    );
    return JSON.parse(out).length > 0;
  } catch (err) {
    console.error("Failed to check for existing issue:", err.message);
    return false; // best-effort: fall through and create rather than silently skip
  }
}

async function createFailureIssue(slug, type, identifier, error, { abandoned = false } = {}) {
  const title = `Pinterest pin rotation failed: ${slug} (${type}) ${identifier}`;

  if (await issueAlreadyOpen(title)) {
    console.log(`  Issue already open for ${identifier}, skipping duplicate`);
    return;
  }

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
    abandoned
      ? `This pin has failed ${MAX_PIN_ATTEMPTS} times and will no longer be retried automatically. Fix the underlying issue and manually reset its status to "pending" in data/social-posts-log.json to retry.`
      : `The pin will be retried on a later cron run with backoff.`,
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
      const assetPath = resolveLocalAsset({
        type,
        slug,
        imageSrc: pin.imageSrc,
        imageFile: pin.imageFile,
      });
      const altText = pin.altText || getHeroImageAlt(type, slug);
      const image = await readImageAsBase64(assetPath);

      if (DRY_RUN) {
        console.log(`  [dry-run] Resolved ${assetPath} -> ${image.contentType}, ${image.data.length} b64 chars`);
      } else {
        const pinId = await postToPinterest(boardId, image, pin.title, pin.description, url, altText);
        pin.id = pinId;
        pin.postedAt = new Date().toISOString();
        pin.status = "posted";
      }
    } catch (err) {
      console.error(`  Failed: ${err.message}`);

      if (DRY_RUN) {
        // Don't mutate pin state in a dry run.
      } else {
        const attempts = (pin.attempts || 0) + 1;
        pin.attempts = attempts;
        pin.error = err.message;
        pin.failedAt = new Date().toISOString();

        if (attempts >= MAX_PIN_ATTEMPTS) {
          pin.status = "abandoned";
          console.log(`  Abandoning ${identifier} after ${attempts} failed attempts`);
          await createFailureIssue(slug, type, identifier, err, { abandoned: true });
        } else {
          pin.status = "pending";
          // Linear backoff: push the retry further out each time so a
          // persistently broken pin doesn't eat the daily budget every day.
          pin.scheduledFor = new Date(Date.now() + attempts * 86_400_000).toISOString();
          if (attempts === 1) {
            await createFailureIssue(slug, type, identifier, err);
          }
        }
      }
    }

    if (!DRY_RUN) writeLog(log); // save after each pin in case of crash
    postsThisRun++;

    if (!DRY_RUN && postsThisRun < Math.min(duePins.length, MAX_PINS_PER_RUN)) {
      console.log(`  Waiting ${DELAY_BETWEEN_POSTS_MS / 1000}s...`);
      await new Promise((r) => setTimeout(r, DELAY_BETWEEN_POSTS_MS));
    }
  }

  console.log(`\nDone. ${DRY_RUN ? "Dry-run processed" : "Posted"} ${postsThisRun} pin(s).`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
