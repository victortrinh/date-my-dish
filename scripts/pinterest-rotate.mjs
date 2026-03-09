// scripts/pinterest-rotate.mjs
// Posts scheduled Pinterest pin variants that are due.
// Reads data/social-posts-log.json, finds pending pins with scheduledFor <= now,
// posts them via Pinterest API, and updates the log.
//
// Usage:
//   node scripts/pinterest-rotate.mjs
//
// Rate limits: max 5 pins per run, 10s delay between posts.

import { readFileSync, writeFileSync, readdirSync, existsSync } from "fs";
import { join, basename } from "path";
import matter from "gray-matter";

const SITE_URL = "https://datemydish.com";
const RECIPES_DIR = "src/content/recipes";
const LOG_FILE = "data/social-posts-log.json";
const MAX_PINS_PER_RUN = 5;
const DELAY_BETWEEN_POSTS_MS = 10_000;
const FETCH_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (compatible; DateMyDishBot/1.0; +https://datemydish.com)",
};

const { PINTEREST_ACCESS_TOKEN, PINTEREST_BOARD_ID } = process.env;

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
// Hero image URL resolution (from live JSON-LD)
// ---------------------------------------------------------------------------
async function resolveHeroImageUrl(slug) {
  const url = `${SITE_URL}/en/recipes/${slug}/`;
  const res = await fetch(url, { headers: FETCH_HEADERS });

  if (!res.ok) {
    throw new Error(
      `Failed to fetch ${url}: HTTP ${res.status} ${res.statusText}`
    );
  }

  const html = await res.text();
  const match = html.match(
    /<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/
  );
  if (!match) throw new Error(`No JSON-LD found on ${url}`);

  const jsonLd = JSON.parse(match[1]);
  const image = Array.isArray(jsonLd.image) ? jsonLd.image[0] : jsonLd.image;
  if (!image) throw new Error(`No image in JSON-LD on ${url}`);

  return image;
}

// ---------------------------------------------------------------------------
// Get heroImageAlt from recipe frontmatter
// ---------------------------------------------------------------------------
function getHeroImageAlt(slug) {
  const filePath = join(RECIPES_DIR, "en", `${slug}.mdx`);
  if (!existsSync(filePath)) return "";
  const raw = readFileSync(filePath, "utf-8");
  const { data } = matter(raw);
  return data.heroImageAlt || "";
}

// ---------------------------------------------------------------------------
// Pinterest API v5
// ---------------------------------------------------------------------------
async function postToPinterest(imageUrl, title, description, link, altText) {
  if (!PINTEREST_ACCESS_TOKEN || !PINTEREST_BOARD_ID) {
    throw new Error("Missing PINTEREST_ACCESS_TOKEN or PINTEREST_BOARD_ID");
  }

  console.log(`  Posting pin: "${title.slice(0, 60)}..."`);

  const res = await fetch("https://api.pinterest.com/v5/pins", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${PINTEREST_ACCESS_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      board_id: PINTEREST_BOARD_ID,
      title: title.slice(0, 100),
      description: description.slice(0, 800),
      link,
      alt_text: (altText || "").slice(0, 500),
      media_source: {
        source_type: "image_url",
        url: imageUrl,
      },
    }),
  });

  if (res.status === 429) {
    const retryAfter = res.headers.get("Retry-After");
    throw new Error(`Pinterest rate limited. Retry after ${retryAfter}s`);
  }

  const data = await res.json();

  if (!res.ok) {
    throw new Error(
      `Pinterest API error ${data.code || res.status}: ${data.message || JSON.stringify(data)}`
    );
  }

  console.log(`  Pin created: ${data.id}`);
  return data.id;
}

// ---------------------------------------------------------------------------
// Create GitHub issue on failure
// ---------------------------------------------------------------------------
async function createFailureIssue(slug, variant, error) {
  const title = `Pinterest pin rotation failed: ${slug} variant ${variant}`;
  const body = [
    `## Pinterest Pin Rotation Failure`,
    ``,
    `| Field | Value |`,
    `|-------|-------|`,
    `| **Recipe** | \`${slug}\` |`,
    `| **Variant** | ${variant} |`,
    `| **Error** | ${error.message} |`,
    `| **Timestamp** | ${new Date().toISOString()} |`,
    ``,
    `### Error Details`,
    `\`\`\``,
    `${error.stack || error.message}`,
    `\`\`\``,
    ``,
    `### Recovery`,
    `The pin will be retried on the next cron run.`,
  ].join("\n");

  try {
    const { execSync } = await import("child_process");
    execSync(
      `gh issue create --title "${title}" --body "${body.replace(/"/g, '\\"')}" --label "social-media-failure"`,
      { stdio: "inherit" }
    );
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

  // Collect all due pins across all recipes
  const duePins = [];

  for (const [slug, entry] of Object.entries(log)) {
    const pins = entry.pinterest?.pins;
    if (!pins) continue;

    for (const pin of pins) {
      if (pin.status !== "pending") continue;
      if (!pin.scheduledFor) continue;
      if (new Date(pin.scheduledFor) > now) continue;

      duePins.push({ slug, pin });
    }
  }

  if (duePins.length === 0) {
    console.log("No pending pins due for posting.");
    return;
  }

  console.log(`Found ${duePins.length} pins due for posting (max ${MAX_PINS_PER_RUN} per run)`);

  for (const { slug, pin } of duePins.slice(0, MAX_PINS_PER_RUN)) {
    console.log(`\nPosting ${slug} variant ${pin.variant}...`);

    try {
      const heroImageUrl = await resolveHeroImageUrl(slug);
      const altText = getHeroImageAlt(slug);
      const recipeUrl = `${SITE_URL}/en/recipes/${slug}/`;

      const pinId = await postToPinterest(
        heroImageUrl,
        pin.title,
        pin.description,
        recipeUrl,
        altText
      );

      pin.id = pinId;
      pin.postedAt = new Date().toISOString();
      pin.status = "posted";
    } catch (err) {
      console.error(`  Failed: ${err.message}`);
      pin.status = "failed";
      pin.error = err.message;
      pin.failedAt = new Date().toISOString();
      await createFailureIssue(slug, pin.variant, err);
    }

    // Save after each pin in case of crash
    writeLog(log);
    postsThisRun++;

    // Rate limit delay (skip after last pin)
    if (postsThisRun < Math.min(duePins.length, MAX_PINS_PER_RUN)) {
      console.log(`  Waiting ${DELAY_BETWEEN_POSTS_MS / 1000}s...`);
      await new Promise((r) => setTimeout(r, DELAY_BETWEEN_POSTS_MS));
    }
  }

  // Retry failed pins (set back to pending for next run)
  for (const [slug, entry] of Object.entries(log)) {
    const pins = entry.pinterest?.pins;
    if (!pins) continue;
    for (const pin of pins) {
      if (pin.status === "failed") {
        console.log(`Resetting failed pin ${slug} variant ${pin.variant} to pending for retry`);
        pin.status = "pending";
        delete pin.error;
        delete pin.failedAt;
      }
    }
  }
  writeLog(log);

  console.log(`\nDone. Posted ${postsThisRun} pins.`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
