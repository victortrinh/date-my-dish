// scripts/seo/generate-report.mjs
// Merges GSC + SERP data into a versioned snapshot JSON and generates
// a markdown report for the weekly GitHub Issue.
//
// Usage:
//   node scripts/seo/generate-report.mjs

import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from "fs";
import { join } from "path";

const DATA_DIR = "data/seo";
const KEYWORDS_FILE = join(DATA_DIR, "derived-keywords.json");
const GSC_FILE = join(DATA_DIR, "gsc-data.json");
const SERP_FILE = join(DATA_DIR, "serp-data.json");
const REPORT_FILE = join(DATA_DIR, "report.md");

// ---------------------------------------------------------------------------
// File helpers
// ---------------------------------------------------------------------------
function readJson(path) {
  if (!existsSync(path)) return null;
  const raw = readFileSync(path, "utf-8");
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function findPreviousSnapshot() {
  if (!existsSync(DATA_DIR)) return null;

  const files = readdirSync(DATA_DIR)
    .filter((f) => f.match(/^rankings-\d{4}-\d{2}-\d{2}\.json$/))
    .sort()
    .reverse();

  if (files.length === 0) return null;
  return readJson(join(DATA_DIR, files[0]));
}

function todayString() {
  return new Date().toISOString().split("T")[0];
}

// ---------------------------------------------------------------------------
// Snapshot assembly
// ---------------------------------------------------------------------------
function buildSnapshot(keywords, gscData, serpData) {
  const pages = {};

  // Add GSC data
  if (gscData?.pages) {
    for (const [path, data] of Object.entries(gscData.pages)) {
      pages[path] = { gsc: data, serp: null };
    }
  }

  // Map keywords to pages for SERP data linkage
  const keywordToUrl = {};
  if (keywords) {
    for (const kw of keywords) {
      keywordToUrl[kw.keyword] = kw.url;
    }
  }

  // Add SERP results to pages
  if (serpData?.results) {
    for (const [keyword, result] of Object.entries(serpData.results)) {
      if (!result) continue;
      const url = keywordToUrl[keyword];
      if (url) {
        if (!pages[url]) pages[url] = { gsc: null, serp: null };
        // Store SERP position directly on the page for the primary keyword
        if (!pages[url].serp) {
          pages[url].serp = { primaryKeyword: keyword, ...result };
        }
      }
    }
  }

  return {
    version: 1,
    generatedAt: new Date().toISOString(),
    dateRange: gscData?.dateRange || { start: "N/A", end: "N/A" },
    config: {
      serpLocale: "en",
      serpCountry: "ca",
      keywordLimit: keywords?.length || 0,
    },
    derivedKeywords: keywords || [],
    pages,
    serpResults: serpData?.results || {},
    errors: serpData?.errors || [],
  };
}

// ---------------------------------------------------------------------------
// Delta calculation
// ---------------------------------------------------------------------------
function computeDeltas(current, previous) {
  if (!previous?.pages) return null;

  const deltas = {};

  for (const [path, pageData] of Object.entries(current.pages)) {
    const prevPage = previous.pages[path];
    if (!prevPage?.gsc || !pageData?.gsc) continue;

    // Compare best (lowest) position for each page
    const currentBest = getBestPosition(pageData.gsc);
    const prevBest = getBestPosition(prevPage.gsc);

    if (currentBest !== null && prevBest !== null) {
      deltas[path] = {
        currentPosition: currentBest.avgPosition,
        previousPosition: prevBest.avgPosition,
        positionDelta: prevBest.avgPosition - currentBest.avgPosition, // positive = improved
        currentClicks: pageData.gsc.totalClicks,
        previousClicks: prevPage.gsc.totalClicks,
        topKeyword: currentBest.keyword,
      };
    }
  }

  return deltas;
}

function getBestPosition(gscData) {
  if (!gscData?.queries?.length) return null;
  return gscData.queries.reduce((best, q) =>
    best === null || q.avgPosition < best.avgPosition ? q : best,
    null
  );
}

// ---------------------------------------------------------------------------
// Report generation
// ---------------------------------------------------------------------------
function generateReport(snapshot, previous) {
  const lines = [];
  const deltas = computeDeltas(snapshot, previous);
  const isFirstRun = !previous;
  const hasGsc = Object.values(snapshot.pages).some((p) => p.gsc !== null);
  const hasSerp = Object.keys(snapshot.serpResults).length > 0;

  // Header
  lines.push(`# SEO Ranking Report — ${todayString()}`);
  lines.push("");

  // Data maturity banner
  if (isFirstRun) {
    lines.push("> **Baseline Report** — This is the first ranking snapshot. Delta tracking begins next week.");
    lines.push("> GSC data may be sparse for the first 2-4 weeks on a newer property.");
    lines.push("");
  }

  // Data sources status
  lines.push("## Data Sources");
  lines.push("");
  lines.push(`| Source | Status |`);
  lines.push(`|--------|--------|`);
  lines.push(`| Google Search Console | ${hasGsc ? "OK" : "No data / skipped"} |`);
  lines.push(`| Serper.dev SERP | ${hasSerp ? "OK" : "No data / skipped"} |`);
  lines.push(`| Date Range | ${snapshot.dateRange.start} to ${snapshot.dateRange.end} |`);
  lines.push(`| Keywords Tracked | ${snapshot.derivedKeywords.length} |`);
  lines.push("");

  // Top Movers (improved positions)
  if (deltas && Object.keys(deltas).length > 0) {
    const movers = Object.entries(deltas)
      .filter(([, d]) => d.positionDelta > 0)
      .sort(([, a], [, b]) => b.positionDelta - a.positionDelta)
      .slice(0, 10);

    if (movers.length > 0) {
      lines.push("## Top Movers (Improved)");
      lines.push("");
      lines.push("| Page | Keyword | Position | Change |");
      lines.push("|------|---------|----------|--------|");
      for (const [path, d] of movers) {
        const arrow = `${d.previousPosition.toFixed(1)} → ${d.currentPosition.toFixed(1)}`;
        lines.push(`| ${path} | ${d.topKeyword} | ${arrow} | +${d.positionDelta.toFixed(1)} |`);
      }
      lines.push("");
    }

    // Declining pages
    const declining = Object.entries(deltas)
      .filter(([, d]) => d.positionDelta < -2) // dropped more than 2 positions
      .sort(([, a], [, b]) => a.positionDelta - b.positionDelta)
      .slice(0, 10);

    if (declining.length > 0) {
      lines.push("## Declining Pages");
      lines.push("");
      lines.push("| Page | Keyword | Position | Change |");
      lines.push("|------|---------|----------|--------|");
      for (const [path, d] of declining) {
        const arrow = `${d.previousPosition.toFixed(1)} → ${d.currentPosition.toFixed(1)}`;
        lines.push(`| ${path} | ${d.topKeyword} | ${arrow} | ${d.positionDelta.toFixed(1)} |`);
      }
      lines.push("");
    }
  }

  // Per-page summary table
  if (hasGsc) {
    const pageEntries = Object.entries(snapshot.pages)
      .filter(([, p]) => p.gsc !== null)
      .sort(([, a], [, b]) => (b.gsc?.totalClicks || 0) - (a.gsc?.totalClicks || 0));

    if (pageEntries.length > 0) {
      lines.push("## Per-Page Summary");
      lines.push("");
      lines.push("| Page | Top Keyword | Avg Position | Clicks | Impressions | CTR |");
      lines.push("|------|-------------|-------------|--------|-------------|-----|");

      for (const [path, data] of pageEntries) {
        const best = getBestPosition(data.gsc);
        if (!best) continue;
        const ctrPct = (best.ctr * 100).toFixed(1);
        lines.push(
          `| ${path} | ${best.keyword} | ${best.avgPosition} | ${data.gsc.totalClicks} | ${data.gsc.totalImpressions} | ${ctrPct}% |`
        );
      }
      lines.push("");
    }
  }

  // Striking distance opportunities
  if (hasGsc) {
    const strikingDistance = [];
    for (const [path, data] of Object.entries(snapshot.pages)) {
      if (!data.gsc?.queries) continue;
      for (const q of data.gsc.queries) {
        if (q.avgPosition >= 4 && q.avgPosition <= 20 && q.impressions >= 10) {
          strikingDistance.push({ path, ...q });
        }
      }
    }

    if (strikingDistance.length > 0) {
      strikingDistance.sort((a, b) => a.avgPosition - b.avgPosition);

      lines.push("## Striking Distance (Position 4-20, ≥10 Impressions)");
      lines.push("");
      lines.push("These keywords are close to page 1 — small optimizations could yield significant traffic.");
      lines.push("");
      lines.push("| Page | Keyword | Position | Impressions | CTR |");
      lines.push("|------|---------|----------|-------------|-----|");

      for (const item of strikingDistance.slice(0, 15)) {
        const ctrPct = (item.ctr * 100).toFixed(1);
        lines.push(
          `| ${item.path} | ${item.keyword} | ${item.avgPosition} | ${item.impressions} | ${ctrPct}% |`
        );
      }
      lines.push("");
    }
  }

  // Competitor snapshot
  if (hasSerp) {
    const domainCounts = {};
    for (const result of Object.values(snapshot.serpResults)) {
      if (!result?.topCompetitors) continue;
      for (const comp of result.topCompetitors) {
        domainCounts[comp.domain] = (domainCounts[comp.domain] || 0) + 1;
      }
    }

    const topDomains = Object.entries(domainCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10);

    if (topDomains.length > 0) {
      lines.push("## Competitor Snapshot");
      lines.push("");
      lines.push("Top domains appearing across your tracked keywords:");
      lines.push("");
      lines.push("| Domain | Keywords Ranking For |");
      lines.push("|--------|---------------------|");
      for (const [domain, count] of topDomains) {
        lines.push(`| ${domain} | ${count} |`);
      }
      lines.push("");
    }

    // Our SERP positions
    const ourPositions = Object.entries(snapshot.serpResults)
      .filter(([, r]) => r?.position)
      .sort(([, a], [, b]) => a.position - b.position);

    if (ourPositions.length > 0) {
      lines.push("## Our SERP Positions");
      lines.push("");
      lines.push("| Keyword | Position | Featured |");
      lines.push("|---------|----------|----------|");
      for (const [kw, data] of ourPositions) {
        lines.push(`| ${kw} | ${data.position} | ${data.featured ? "Yes" : "No"} |`);
      }
      lines.push("");
    }
  }

  // Errors
  if (snapshot.errors.length > 0) {
    lines.push("## Errors");
    lines.push("");
    for (const err of snapshot.errors) {
      lines.push(`- **${err.keyword}**: ${err.error}`);
    }
    lines.push("");
  }

  // Footer
  lines.push("---");
  lines.push(`*Generated automatically by [weekly-seo-ranking](../../.github/workflows/weekly-seo-ranking.yml)*`);

  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  const keywords = readJson(KEYWORDS_FILE);
  const gscData = readJson(GSC_FILE);
  const serpData = readJson(SERP_FILE);

  // Check if we have any data at all
  const hasGsc = gscData !== null;
  const hasSerp = serpData !== null && serpData?.results && Object.keys(serpData.results).length > 0;

  if (!hasGsc && !hasSerp) {
    console.error("Both GSC and SERP data are empty/null — nothing to report.");
    console.error("Create a failure issue instead of an empty snapshot.");

    // Write a failure report for the issue
    const failureReport = [
      "# SEO Ranking Report — FAILED",
      "",
      `**Date**: ${todayString()}`,
      "",
      "Both data sources (Google Search Console and Serper.dev) returned no data.",
      "This could mean:",
      "- API credentials are misconfigured",
      "- The site is too new for GSC data",
      "- Rate limits were hit",
      "",
      "Check the workflow logs for details.",
    ].join("\n");

    mkdirSync(DATA_DIR, { recursive: true });
    writeFileSync(REPORT_FILE, failureReport);
    console.log(`Failure report written to ${REPORT_FILE}`);

    // Signal failure to the workflow (non-zero exit)
    process.exit(1);
  }

  // Load previous snapshot for delta comparison
  const previous = findPreviousSnapshot();
  if (previous) {
    console.log(`Found previous snapshot from ${previous.generatedAt}`);
  } else {
    console.log("No previous snapshot found — this is the first run");
  }

  // Build snapshot
  const snapshot = buildSnapshot(keywords, gscData, serpData);
  const snapshotFile = join(DATA_DIR, `rankings-${todayString()}.json`);

  // Generate markdown report
  const report = generateReport(snapshot, previous);

  // Write files
  mkdirSync(DATA_DIR, { recursive: true });
  writeFileSync(snapshotFile, JSON.stringify(snapshot, null, 2) + "\n");
  writeFileSync(REPORT_FILE, report);

  const pageCount = Object.keys(snapshot.pages).length;
  console.log(`\nSnapshot: ${pageCount} pages written to ${snapshotFile}`);
  console.log(`Report: written to ${REPORT_FILE}`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
