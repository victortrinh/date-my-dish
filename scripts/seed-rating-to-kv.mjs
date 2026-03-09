/**
 * Seed a rating for a recipe slug directly into Cloudflare KV.
 *
 * Usage:
 *   node scripts/seed-rating-to-kv.mjs <slug> <averageRating> <ratingCount>
 *
 * Example:
 *   node scripts/seed-rating-to-kv.mjs cacio-e-pepe 4.8 42
 *
 * Requires environment variables:
 *   CF_ACCOUNT_ID, CF_API_TOKEN, CF_KV_NAMESPACE_ID
 *
 * Skips if the slug already has a rating in KV (won't overwrite live data).
 */

const [slug, avgStr, countStr] = process.argv.slice(2);

if (!slug || !avgStr || !countStr) {
  console.error(
    "Usage: node scripts/seed-rating-to-kv.mjs <slug> <averageRating> <ratingCount>",
  );
  process.exit(1);
}

const averageRating = parseFloat(avgStr);
const ratingCount = parseInt(countStr, 10);

if (isNaN(averageRating) || isNaN(ratingCount) || ratingCount < 1) {
  console.error("[seed-rating] Invalid rating values");
  process.exit(1);
}

const accountId = process.env.CF_ACCOUNT_ID;
const apiToken = process.env.CF_API_TOKEN;
const namespaceId = process.env.CF_KV_NAMESPACE_ID;

if (!accountId || !apiToken || !namespaceId) {
  console.error("[seed-rating] Missing CF_ACCOUNT_ID, CF_API_TOKEN, or CF_KV_NAMESPACE_ID");
  process.exit(1);
}

const baseUrl = `https://api.cloudflare.com/client/v4/accounts/${accountId}/storage/kv/namespaces/${namespaceId}`;
const headers = {
  Authorization: `Bearer ${apiToken}`,
  "Content-Type": "application/json",
};

const key = `rating:${slug}`;

// Check if rating already exists
const checkRes = await fetch(`${baseUrl}/values/${encodeURIComponent(key)}`, {
  headers: { Authorization: `Bearer ${apiToken}` },
});

if (checkRes.ok) {
  const existing = await checkRes.text();
  if (existing && existing !== "null") {
    console.log(`[seed-rating] ${slug} already has a rating in KV, skipping`);
    process.exit(0);
  }
}

// Write seed data (store as total + count so live ratings accumulate correctly)
const total = Math.round(averageRating * ratingCount * 10) / 10;
const data = JSON.stringify({ total, count: ratingCount });

const putRes = await fetch(`${baseUrl}/values/${encodeURIComponent(key)}`, {
  method: "PUT",
  headers: { Authorization: `Bearer ${apiToken}` },
  body: data,
});

if (!putRes.ok) {
  const err = await putRes.text();
  console.error(`[seed-rating] Failed to seed ${slug}:`, err);
  process.exit(1);
}

console.log(`[seed-rating] Seeded ${slug}: ${averageRating}/5 (${ratingCount} ratings)`);
