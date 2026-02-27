// scripts/seo/fetch-serp-rankings.mjs
// Fetches actual SERP positions from Serper.dev for derived keywords.
// Runs queries sequentially with 200ms delay to respect rate limits.
//
// Usage:
//   SERPER_API_KEY=<key> node scripts/seo/fetch-serp-rankings.mjs

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";

const KEYWORDS_FILE = "data/seo/derived-keywords.json";
const OUTPUT_FILE = "data/seo/serp-data.json";
const SERPER_URL = "https://google.serper.dev/search";
const DELAY_MS = 200;
const OUR_DOMAIN = "datemydish.com";

const { SERPER_API_KEY } = process.env;

// ---------------------------------------------------------------------------
// Serper.dev API
// ---------------------------------------------------------------------------
async function querySerpForKeyword(keyword) {
  const res = await fetch(SERPER_URL, {
    method: "POST",
    headers: {
      "X-API-KEY": SERPER_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      q: keyword,
      gl: "ca",
      hl: "en",
      num: 10,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Serper API error ${res.status}: ${text}`);
  }

  return res.json();
}

function parseSerpResult(data) {
  const organic = data.organic || [];

  // Find our position
  let ourPosition = null;
  for (let i = 0; i < organic.length; i++) {
    if (organic[i].link && organic[i].link.includes(OUR_DOMAIN)) {
      ourPosition = organic[i].position || i + 1;
      break;
    }
  }

  // Check for featured snippet
  const featured =
    data.answerBox?.link?.includes(OUR_DOMAIN) ||
    data.knowledgeGraph?.website?.includes(OUR_DOMAIN) ||
    false;

  // Top competitors (other domains in top 10)
  const topCompetitors = [];
  const seenDomains = new Set();
  for (const result of organic) {
    try {
      const domain = new URL(result.link).hostname.replace(/^www\./, "");
      if (domain !== OUR_DOMAIN && !seenDomains.has(domain)) {
        seenDomains.add(domain);
        topCompetitors.push({
          domain,
          position: result.position || organic.indexOf(result) + 1,
        });
      }
    } catch {
      // Skip malformed URLs
    }
  }

  return {
    position: ourPosition,
    featured,
    topCompetitors: topCompetitors.slice(0, 5),
  };
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  if (!SERPER_API_KEY) {
    console.warn("SERPER_API_KEY not set — skipping SERP fetch");
    mkdirSync("data/seo", { recursive: true });
    writeFileSync(OUTPUT_FILE, JSON.stringify(null, null, 2) + "\n");
    console.log("Written null to", OUTPUT_FILE);
    return;
  }

  if (!existsSync(KEYWORDS_FILE)) {
    console.error(`Keywords file not found: ${KEYWORDS_FILE}`);
    console.error("Run derive-keywords.mjs first");
    process.exit(1);
  }

  const keywords = JSON.parse(readFileSync(KEYWORDS_FILE, "utf-8"));
  console.log(`Querying Serper.dev for ${keywords.length} keywords...`);

  const results = {};
  const errors = [];
  let processed = 0;

  for (const entry of keywords) {
    try {
      const data = await querySerpForKeyword(entry.keyword);
      results[entry.keyword] = parseSerpResult(data);
      processed++;

      if (processed % 10 === 0) {
        console.log(`  Processed ${processed}/${keywords.length}`);
      }
    } catch (err) {
      console.error(`  Error for "${entry.keyword}": ${err.message}`);
      errors.push({ keyword: entry.keyword, error: err.message });
      results[entry.keyword] = null;
    }

    // Rate limit delay
    if (keywords.indexOf(entry) < keywords.length - 1) {
      await sleep(DELAY_MS);
    }
  }

  const output = { results, errors, queriedAt: new Date().toISOString() };

  mkdirSync("data/seo", { recursive: true });
  writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2) + "\n");

  const withPosition = Object.values(results).filter((r) => r?.position).length;
  console.log(`\nSERP data: ${processed} keywords queried, ${withPosition} with our position found`);
  if (errors.length > 0) {
    console.log(`Errors: ${errors.length}`);
  }
  console.log(`Written to ${OUTPUT_FILE}`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
