// scripts/pinterest-update-pins.mjs
// Updates existing Pinterest pins via PATCH API v5.
// Can update link, title, description, and alt_text on already-posted pins.
//
// Usage:
//   node scripts/pinterest-update-pins.mjs                    # Update all pins
//   node scripts/pinterest-update-pins.mjs --slug=cacio-e-pepe # Update specific recipe
//   node scripts/pinterest-update-pins.mjs --dry-run           # Preview changes without API calls
//   node scripts/pinterest-update-pins.mjs --update-link       # Only update destination URLs
//   node scripts/pinterest-update-pins.mjs --update-description # Only update descriptions

import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";
import matter from "gray-matter";

const SITE_URL = "https://datemydish.com";
const RECIPES_DIR = "src/content/recipes";
const LOG_FILE = "data/social-posts-log.json";
const DELAY_BETWEEN_CALLS_MS = 10_000;

const { PINTEREST_ACCESS_TOKEN } = process.env;

// ---------------------------------------------------------------------------
// CLI args
// ---------------------------------------------------------------------------
const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");
const UPDATE_LINK = args.includes("--update-link") || (!args.includes("--update-description"));
const UPDATE_DESCRIPTION = args.includes("--update-description") || (!args.includes("--update-link"));
const slugArg = args.find((a) => a.startsWith("--slug="));
const TARGET_SLUG = slugArg ? slugArg.split("=")[1] : null;

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
// Get recipe frontmatter
// ---------------------------------------------------------------------------
function getRecipeData(slug) {
  const filePath = join(RECIPES_DIR, "en", `${slug}.mdx`);
  if (!existsSync(filePath)) return null;
  const raw = readFileSync(filePath, "utf-8");
  const { data } = matter(raw);
  return data;
}

// ---------------------------------------------------------------------------
// Pinterest API v5 - Update pin
// ---------------------------------------------------------------------------
async function updatePin(pinId, updates) {
  if (!PINTEREST_ACCESS_TOKEN) {
    throw new Error("Missing PINTEREST_ACCESS_TOKEN");
  }

  const res = await fetch(`https://api.pinterest.com/v5/pins/${pinId}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${PINTEREST_ACCESS_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(updates),
  });

  if (res.status === 429) {
    const retryAfter = res.headers.get("Retry-After") || "60";
    throw new Error(`Pinterest rate limited. Retry after ${retryAfter}s`);
  }

  const data = await res.json();

  if (!res.ok) {
    throw new Error(
      `Pinterest API error ${data.code || res.status}: ${data.message || JSON.stringify(data)}`
    );
  }

  return data;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  const log = readLog();
  let updatedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  const slugs = TARGET_SLUG ? [TARGET_SLUG] : Object.keys(log);

  console.log(`Pinterest Pin Update${DRY_RUN ? " (DRY RUN)" : ""}`);
  console.log(`Updating: ${UPDATE_LINK ? "links" : ""}${UPDATE_LINK && UPDATE_DESCRIPTION ? " + " : ""}${UPDATE_DESCRIPTION ? "descriptions" : ""}`);
  console.log(`Recipes: ${TARGET_SLUG || "all"} (${slugs.length} total)\n`);

  for (const slug of slugs) {
    const entry = log[slug];
    if (!entry?.pinterest?.pins) {
      skippedCount++;
      continue;
    }

    const recipeData = getRecipeData(slug);
    const recipeUrl = `${SITE_URL}/en/recipes/${slug}/`;

    for (const pin of entry.pinterest.pins) {
      if (pin.status !== "posted" || !pin.id) {
        continue;
      }

      const updates = {};

      if (UPDATE_LINK) {
        updates.link = recipeUrl;
      }

      if (UPDATE_DESCRIPTION && pin.description) {
        updates.description = pin.description.slice(0, 800);
      }

      if (UPDATE_DESCRIPTION && pin.title) {
        updates.title = pin.title.slice(0, 100);
      }

      if (recipeData?.heroImageAlt) {
        updates.alt_text = recipeData.heroImageAlt.slice(0, 500);
      }

      if (Object.keys(updates).length === 0) {
        continue;
      }

      console.log(`${slug} variant ${pin.variant} (${pin.id}):`);
      console.log(`  Updates: ${JSON.stringify(updates).slice(0, 200)}`);

      if (DRY_RUN) {
        console.log("  [DRY RUN] Skipping API call\n");
        updatedCount++;
        continue;
      }

      try {
        await updatePin(pin.id, updates);
        pin.updatedAt = new Date().toISOString();
        console.log("  Updated successfully\n");
        updatedCount++;
      } catch (err) {
        console.error(`  Error: ${err.message}\n`);
        pin.updateError = err.message;
        pin.updateFailedAt = new Date().toISOString();
        errorCount++;
      }

      // Save after each update
      writeLog(log);

      // Rate limit delay
      await new Promise((r) => setTimeout(r, DELAY_BETWEEN_CALLS_MS));
    }
  }

  console.log(`\nDone. Updated: ${updatedCount}, Skipped: ${skippedCount}, Errors: ${errorCount}`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
