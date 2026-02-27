// scripts/seo/fetch-gsc-rankings.mjs
// Fetches ranking data from Google Search Console API.
// Queries the Search Analytics API with ["page", "query"] dimensions
// for a trailing 7-day window ending 3 days ago.
//
// Usage:
//   GSC_SERVICE_ACCOUNT_KEY=<base64> SITE_URL=sc-domain:datemydish.com node scripts/seo/fetch-gsc-rankings.mjs

import { writeFileSync, mkdirSync } from "fs";
import { google } from "googleapis";

const OUTPUT_FILE = "data/seo/gsc-data.json";
const SITE_URL_DEFAULT = "sc-domain:datemydish.com";
const { GSC_SERVICE_ACCOUNT_KEY, SITE_URL = SITE_URL_DEFAULT } = process.env;

// ---------------------------------------------------------------------------
// Date helpers
// ---------------------------------------------------------------------------
function formatDate(date) {
  return date.toISOString().split("T")[0];
}

function getDateRange() {
  const end = new Date();
  end.setDate(end.getDate() - 3); // GSC has 2-3 day delay
  const start = new Date(end);
  start.setDate(start.getDate() - 7);
  return { start: formatDate(start), end: formatDate(end) };
}

// ---------------------------------------------------------------------------
// URL normalization
// ---------------------------------------------------------------------------
function urlToPath(fullUrl) {
  try {
    const url = new URL(fullUrl);
    let path = url.pathname.toLowerCase();
    if (!path.endsWith("/")) path += "/";
    return path;
  } catch {
    return fullUrl;
  }
}

// ---------------------------------------------------------------------------
// GSC API
// ---------------------------------------------------------------------------
async function fetchGscData() {
  if (!GSC_SERVICE_ACCOUNT_KEY) {
    console.warn("GSC_SERVICE_ACCOUNT_KEY not set — skipping GSC fetch");
    return null;
  }

  let credentials;
  try {
    credentials = JSON.parse(
      Buffer.from(GSC_SERVICE_ACCOUNT_KEY, "base64").toString("utf-8")
    );
  } catch (err) {
    console.error("Failed to parse GSC_SERVICE_ACCOUNT_KEY:", err.message);
    return null;
  }

  const auth = new google.auth.JWT({
    email: credentials.client_email,
    key: credentials.private_key,
    scopes: ["https://www.googleapis.com/auth/webmasters.readonly"],
  });

  const searchconsole = google.searchconsole({ version: "v1", auth });
  const { start, end } = getDateRange();

  console.log(`Fetching GSC data for ${SITE_URL}`);
  console.log(`Date range: ${start} to ${end}`);

  let response;
  try {
    response = await searchconsole.searchanalytics.query({
      siteUrl: SITE_URL,
      requestBody: {
        startDate: start,
        endDate: end,
        dimensions: ["page", "query"],
        rowLimit: 5000,
      },
    });
  } catch (err) {
    console.error("GSC API error:", err.message);
    return null;
  }

  const rows = response.data.rows || [];
  console.log(`GSC returned ${rows.length} rows`);

  // Group by page URL path
  const pages = {};
  for (const row of rows) {
    const [pageUrl, keyword] = row.keys;
    const path = urlToPath(pageUrl);

    if (!pages[path]) {
      pages[path] = { queries: [], totalClicks: 0, totalImpressions: 0 };
    }

    pages[path].queries.push({
      keyword,
      avgPosition: Math.round(row.position * 10) / 10,
      clicks: row.clicks,
      impressions: row.impressions,
      ctr: Math.round(row.ctr * 1000) / 1000,
    });
    pages[path].totalClicks += row.clicks;
    pages[path].totalImpressions += row.impressions;
  }

  return { pages, dateRange: { start, end }, rowCount: rows.length };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  const result = await fetchGscData();

  mkdirSync("data/seo", { recursive: true });
  writeFileSync(OUTPUT_FILE, JSON.stringify(result, null, 2) + "\n");

  if (result) {
    const pageCount = Object.keys(result.pages).length;
    console.log(`GSC data: ${pageCount} pages, ${result.rowCount} keyword-page pairs`);
  } else {
    console.log("GSC data: null (skipped or failed)");
  }
  console.log(`Written to ${OUTPUT_FILE}`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
