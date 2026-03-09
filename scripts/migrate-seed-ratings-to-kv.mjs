/**
 * One-time migration: seed all entries from data/ratings-seed.json into Cloudflare KV.
 * Skips slugs that already have live ratings in KV.
 *
 * Usage:
 *   CF_ACCOUNT_ID=xxx CF_API_TOKEN=xxx CF_KV_NAMESPACE_ID=xxx node scripts/migrate-seed-ratings-to-kv.mjs
 *
 * After running, verify with:
 *   node scripts/fetch-ratings.mjs
 *
 * Then delete data/ratings-seed.json and remove references to it.
 */

import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { execFileSync } from "child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const seedPath = join(__dirname, "..", "data", "ratings-seed.json");
const seedScript = join(__dirname, "seed-rating-to-kv.mjs");

const accountId = process.env.CF_ACCOUNT_ID;
const apiToken = process.env.CF_API_TOKEN;
const namespaceId = process.env.CF_KV_NAMESPACE_ID;

if (!accountId || !apiToken || !namespaceId) {
  console.error("[migrate] Missing CF_ACCOUNT_ID, CF_API_TOKEN, or CF_KV_NAMESPACE_ID");
  process.exit(1);
}

const seed = JSON.parse(readFileSync(seedPath, "utf-8"));
const slugs = Object.keys(seed);

console.log(`[migrate] Migrating ${slugs.length} entries from ratings-seed.json to KV...\n`);

let seeded = 0;
let skipped = 0;
let failed = 0;

for (const slug of slugs) {
  const { averageRating, ratingCount } = seed[slug];
  try {
    const output = execFileSync(
      "node",
      [seedScript, slug, String(averageRating), String(ratingCount)],
      {
        env: { ...process.env, CF_ACCOUNT_ID: accountId, CF_API_TOKEN: apiToken, CF_KV_NAMESPACE_ID: namespaceId },
        encoding: "utf-8",
      },
    );
    console.log(output.trim());
    if (output.includes("skipping")) {
      skipped++;
    } else {
      seeded++;
    }
  } catch (err) {
    console.error(`[migrate] Failed to seed ${slug}:`, err.message);
    failed++;
  }
}

console.log(`\n[migrate] Done: ${seeded} seeded, ${skipped} skipped (already in KV), ${failed} failed`);

if (failed === 0) {
  console.log("[migrate] All entries migrated successfully.");
  console.log("[migrate] You can now delete data/ratings-seed.json");
}
