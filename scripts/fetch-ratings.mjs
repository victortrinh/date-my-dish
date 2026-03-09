/**
 * Build-time script to fetch all ratings from Cloudflare KV and write to data/ratings.json.
 * Runs as `prebuild` script in package.json.
 *
 * Requires environment variables:
 * - CF_ACCOUNT_ID: Cloudflare account ID
 * - CF_API_TOKEN: Cloudflare API token with Workers KV read access
 * - CF_KV_NAMESPACE_ID: The KV namespace ID for RATINGS
 *
 * If any env var is missing, writes an empty object (safe for first build).
 */

import { writeFileSync, mkdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outputPath = join(__dirname, "..", "data", "ratings.json");

const accountId = process.env.CF_ACCOUNT_ID;
const apiToken = process.env.CF_API_TOKEN;
const namespaceId = process.env.CF_KV_NAMESPACE_ID;

async function fetchRatings() {
  if (!accountId || !apiToken || !namespaceId) {
    console.log(
      "[fetch-ratings] Missing CF env vars, writing empty ratings.json",
    );
    writeOutput({});
    return;
  }

  const baseUrl = `https://api.cloudflare.com/client/v4/accounts/${accountId}/storage/kv/namespaces/${namespaceId}`;
  const headers = { Authorization: `Bearer ${apiToken}` };

  try {
    // List all keys with "rating:" prefix
    let cursor;
    const keys = [];
    do {
      const url = new URL(`${baseUrl}/keys`);
      url.searchParams.set("prefix", "rating:");
      url.searchParams.set("limit", "1000");
      if (cursor) url.searchParams.set("cursor", cursor);

      const res = await fetch(url.toString(), { headers });
      const json = await res.json();

      if (!json.success) {
        console.error("[fetch-ratings] API error:", json.errors);
        writeOutput({});
        return;
      }

      keys.push(...json.result);
      cursor = json.result_info?.cursor;
    } while (cursor);

    // Fetch each rating value
    const ratings = {};
    for (const key of keys) {
      const slug = key.name.replace("rating:", "");
      const res = await fetch(`${baseUrl}/values/${encodeURIComponent(key.name)}`, { headers });
      const data = await res.json();

      if (data && data.total && data.count) {
        ratings[slug] = {
          averageRating:
            Math.round((data.total / data.count) * 10) / 10,
          ratingCount: data.count,
        };
      }
    }

    console.log(
      `[fetch-ratings] Fetched ratings for ${Object.keys(ratings).length} recipes`,
    );
    writeOutput(ratings);
  } catch (err) {
    console.error("[fetch-ratings] Error fetching ratings:", err.message);
    writeOutput({});
  }
}

function writeOutput(ratings) {
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, JSON.stringify(ratings, null, 2) + "\n");
  console.log(`[fetch-ratings] Wrote ${outputPath} (${Object.keys(ratings).length} ratings from KV)`);
}

fetchRatings();
