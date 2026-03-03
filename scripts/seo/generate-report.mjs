// scripts/seo/generate-report.mjs
// Merges GSC + SERP data into a versioned snapshot JSON and generates
// a markdown report for the weekly GitHub Issue.
//
// Usage:
//   node scripts/seo/generate-report.mjs

import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from "fs";
import { join } from "path";
import { execSync } from "child_process";

const DATA_DIR = "data/seo";
const KEYWORDS_FILE = join(DATA_DIR, "derived-keywords.json");
const GSC_FILE = join(DATA_DIR, "gsc-data.json");
const SERP_FILE = join(DATA_DIR, "serp-data.json");
const REPORT_FILE = join(DATA_DIR, "report.md");
const OPTIMIZE_LOG_FILE = join(DATA_DIR, "optimization-log.json");

// ---------------------------------------------------------------------------
// Configuration constants
// ---------------------------------------------------------------------------
const TREND_WINDOW = 12; // Load up to 12 historical snapshots (~3 months)
const TREND_MIN_SNAPSHOTS = 3; // Minimum snapshots to show trend analysis
const CONTENT_GAP_MIN_IMPRESSIONS = 5;
const CONTENT_GAP_MIN_GSC_ROWS = 20;
const CONTENT_GAP_MIN_WORDS = 3;
const BRANDED_TERMS = ["datemydish", "date my dish"];
const FRENCH_INDICATORS = ["recette", "comment", "faire", "meilleur", "meilleure", "avec", "pour"];

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

/**
 * Load the most recent N snapshot files, excluding today's date.
 * Returns array sorted newest-first (index 0 = most recent previous snapshot).
 */
function loadSnapshots(maxCount = TREND_WINDOW) {
  if (!existsSync(DATA_DIR)) return [];

  const today = todayString();
  const files = readdirSync(DATA_DIR)
    .filter((f) => f.match(/^rankings-\d{4}-\d{2}-\d{2}\.json$/))
    .filter((f) => !f.includes(today)) // Exclude current date to avoid self-comparison
    .sort()
    .reverse()
    .slice(0, maxCount);

  return files
    .map((f) => readJson(join(DATA_DIR, f)))
    .filter((s) => s !== null);
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
// Multi-week trend analysis
// ---------------------------------------------------------------------------

/**
 * Compute multi-week trends for pages across an array of snapshots.
 * Snapshots should be newest-first. Returns trends keyed by page path.
 */
function computeTrends(currentSnapshot, historicalSnapshots) {
  if (historicalSnapshots.length < TREND_MIN_SNAPSHOTS - 1) return null;

  // Build timeline: current + historical, ordered oldest-first for trend computation
  const timeline = [...historicalSnapshots].reverse();
  timeline.push(currentSnapshot);

  const trends = {};

  for (const path of Object.keys(currentSnapshot.pages)) {
    const positions = [];
    for (const snap of timeline) {
      const page = snap.pages[path];
      const best = getBestPosition(page?.gsc);
      if (best) {
        positions.push({
          date: snap.generatedAt.split("T")[0],
          position: best.avgPosition,
          keyword: best.keyword,
        });
      }
    }

    if (positions.length < TREND_MIN_SNAPSHOTS) continue;

    // Compute rolling average (last 4 data points or all if fewer)
    const recentPositions = positions.slice(-4).map((p) => p.position);
    const rollingAvg =
      recentPositions.reduce((sum, p) => sum + p, 0) / recentPositions.length;

    // Compute trend direction based on consecutive movements
    const deltas = [];
    for (let i = 1; i < positions.length; i++) {
      deltas.push(positions[i - 1].position - positions[i].position); // positive = improved
    }

    // Count consecutive improving/declining weeks from the most recent
    let consecutiveImproving = 0;
    let consecutiveDeclining = 0;
    for (let i = deltas.length - 1; i >= 0; i--) {
      if (deltas[i] > 0) {
        consecutiveImproving++;
        if (consecutiveDeclining > 0) break;
      } else if (deltas[i] < 0) {
        consecutiveDeclining++;
        if (consecutiveImproving > 0) break;
      } else {
        break;
      }
    }

    let direction;
    if (consecutiveImproving >= 3) direction = "improving";
    else if (consecutiveDeclining >= 3) direction = "declining";
    else if (
      deltas.length >= 3 &&
      deltas.some((d) => d > 2) &&
      deltas.some((d) => d < -2)
    )
      direction = "volatile";
    else direction = "stable";

    // Position velocity: average weekly position change (positive = improving)
    const velocity =
      deltas.length > 0
        ? deltas.reduce((sum, d) => sum + d, 0) / deltas.length
        : 0;

    trends[path] = {
      dataPoints: positions.length,
      currentPosition: positions[positions.length - 1].position,
      rollingAvg: Math.round(rollingAvg * 10) / 10,
      direction,
      velocity: Math.round(velocity * 10) / 10,
      consecutiveImproving,
      consecutiveDeclining,
      topKeyword: positions[positions.length - 1].keyword,
    };
  }

  return Object.keys(trends).length > 0 ? trends : null;
}

/**
 * Compute SERP position trends across snapshots.
 * Returns trends keyed by keyword.
 */
function computeSerpTrends(currentSnapshot, historicalSnapshots) {
  if (historicalSnapshots.length < TREND_MIN_SNAPSHOTS - 1) return null;

  const timeline = [...historicalSnapshots].reverse();
  timeline.push(currentSnapshot);

  const trends = {};

  // Only track keywords that have a position in the current snapshot
  for (const [keyword, currentResult] of Object.entries(
    currentSnapshot.serpResults
  )) {
    if (!currentResult?.position) continue;

    const positions = [];
    for (const snap of timeline) {
      const result = snap.serpResults?.[keyword];
      if (result?.position) {
        positions.push({
          date: snap.generatedAt.split("T")[0],
          position: result.position,
        });
      }
    }

    if (positions.length < TREND_MIN_SNAPSHOTS) continue;

    const first = positions[0].position;
    const last = positions[positions.length - 1].position;
    const totalChange = first - last; // positive = improved

    trends[keyword] = {
      dataPoints: positions.length,
      currentPosition: last,
      firstPosition: first,
      totalChange: Math.round(totalChange * 10) / 10,
      positions: positions.map((p) => `${p.date}: #${p.position}`),
    };
  }

  return Object.keys(trends).length > 0 ? trends : null;
}

// ---------------------------------------------------------------------------
// Impact tracking
// ---------------------------------------------------------------------------

function loadOptimizationLog() {
  return readJson(OPTIMIZE_LOG_FILE) || [];
}

/**
 * For optimization log entries missing mergedAt, try to query GitHub API.
 * Silently skips if gh CLI is not available or API fails.
 */
function enrichOptimizationLog(log) {
  let updated = false;
  for (const entry of log) {
    if (entry.mergedAt || !entry.prNumber) continue;
    try {
      const result = execSync(
        `gh api repos/{owner}/{repo}/pulls/${entry.prNumber} --jq '.merged_at'`,
        { encoding: "utf-8", timeout: 10000, stdio: ["pipe", "pipe", "pipe"] }
      ).trim();
      if (result && result !== "null") {
        entry.mergedAt = result;
        updated = true;
      }
    } catch {
      // gh CLI not available or API error — skip silently
    }
  }
  if (updated) {
    try {
      writeFileSync(OPTIMIZE_LOG_FILE, JSON.stringify(log, null, 2) + "\n");
    } catch {
      // Write failed — non-critical
    }
  }
  return log;
}

/**
 * Compute impact of past optimizations by comparing positions at optimization
 * time vs. current positions.
 */
function computeOptimizationImpact(log, currentSnapshot) {
  const twoWeeksMs = 14 * 24 * 60 * 60 * 1000;
  const fourWeeksMs = 28 * 24 * 60 * 60 * 1000;
  const now = Date.now();

  const impacts = [];

  for (const entry of log) {
    if (!entry.mergedAt) continue;
    const mergedTime = new Date(entry.mergedAt).getTime();
    const weeksSinceMerge = Math.round((now - mergedTime) / (7 * 24 * 60 * 60 * 1000));

    for (const page of entry.pages || []) {
      const currentPage = currentSnapshot.pages[page.path];
      const currentBest = getBestPosition(currentPage?.gsc);
      const prevPosition =
        page.positionAtTime?.gsc || page.positionAtTime?.serp || null;

      if (!prevPosition || !currentBest) continue;

      const delta = prevPosition - currentBest.avgPosition; // positive = improved

      let status;
      if (now - mergedTime < twoWeeksMs) {
        status = "too early";
      } else if (delta >= 3) {
        status = "improved";
      } else if (delta <= -3) {
        status = "declined";
      } else {
        status = "stable";
      }

      const window =
        now - mergedTime >= fourWeeksMs ? "settled" : "early signal";

      impacts.push({
        path: page.path,
        actions: page.actions,
        prNumber: entry.prNumber,
        mergedAt: entry.mergedAt.split("T")[0],
        weeksSinceMerge,
        previousPosition: prevPosition,
        currentPosition: currentBest.avgPosition,
        delta: Math.round(delta * 10) / 10,
        status,
        window,
      });
    }
  }

  return impacts;
}

// ---------------------------------------------------------------------------
// Content gap analysis
// ---------------------------------------------------------------------------

function analyzeContentGaps(gscData, derivedKeywords) {
  if (!gscData?.pages) return [];

  // Count total GSC rows
  let totalRows = 0;
  for (const page of Object.values(gscData.pages)) {
    totalRows += page.queries?.length || 0;
  }
  if (totalRows < CONTENT_GAP_MIN_GSC_ROWS) return [];

  // Build set of known content paths (recipe/article pages)
  const contentPaths = new Set();
  if (derivedKeywords) {
    for (const kw of derivedKeywords) {
      contentPaths.add(kw.url);
    }
  }

  // Build set of known keywords from existing content
  const knownKeywords = new Set();
  if (derivedKeywords) {
    for (const kw of derivedKeywords) {
      knownKeywords.add(kw.keyword.toLowerCase());
    }
  }

  const gaps = [];

  for (const [path, data] of Object.entries(gscData.pages)) {
    // Only look at non-content pages (homepage, category pages, listing pages)
    if (contentPaths.has(path)) continue;

    for (const query of data.queries || []) {
      const keyword = query.keyword.toLowerCase();

      // Apply noise filters
      if (query.impressions < CONTENT_GAP_MIN_IMPRESSIONS) continue;
      if (keyword.split(/\s+/).length < CONTENT_GAP_MIN_WORDS) continue;
      if (BRANDED_TERMS.some((term) => keyword.includes(term))) continue;
      if (
        FRENCH_INDICATORS.some(
          (indicator) =>
            keyword.startsWith(indicator + " ") ||
            keyword.includes(" " + indicator + " ")
        )
      )
        continue;

      // Check if any existing content already covers this query
      const alreadyCovered = [...knownKeywords].some(
        (known) => keyword.includes(known) || known.includes(keyword)
      );
      if (alreadyCovered) continue;

      // Suggest content type
      let suggestedType = "needs review";
      if (/recipe|how to cook|how to make/.test(keyword)) {
        suggestedType = "recipe";
      } else if (/how to|what is|guide|tips|best way/.test(keyword)) {
        suggestedType = "article";
      }

      gaps.push({
        keyword: query.keyword,
        impressions: query.impressions,
        avgPosition: query.avgPosition,
        receivingPage: path,
        suggestedType,
      });
    }
  }

  return gaps.sort((a, b) => b.impressions - a.impressions);
}

// ---------------------------------------------------------------------------
// GSC health check
// ---------------------------------------------------------------------------

/**
 * Check if GSC has historically returned data. If it has before but is
 * null now, that's a warning sign.
 */
function checkGscHealth(currentGscData, historicalSnapshots) {
  const hasCurrentGsc = currentGscData !== null;
  const hadPreviousGsc = historicalSnapshots.some((snap) =>
    Object.values(snap.pages || {}).some((p) => p.gsc !== null)
  );
  return { hasCurrentGsc, hadPreviousGsc };
}

// ---------------------------------------------------------------------------
// Report generation
// ---------------------------------------------------------------------------
function generateReport(
  snapshot,
  previous,
  { trends, serpTrends, optimizationImpacts, contentGaps, gscHealth, snapshotCount }
) {
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

  // GSC health warning
  if (gscHealth?.hadPreviousGsc && !gscHealth?.hasCurrentGsc) {
    lines.push(
      "> ⚠️ **GSC Data Missing** — Google Search Console previously returned data but returned null this week."
    );
    lines.push(
      "> Check that the service account still has access and the Search Console API is enabled."
    );
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

  // Multi-week trends (GSC-based)
  if (trends) {
    const trendEntries = Object.entries(trends)
      .filter(([, t]) => t.direction !== "stable")
      .sort(([, a], [, b]) => Math.abs(b.velocity) - Math.abs(a.velocity));

    if (trendEntries.length > 0) {
      lines.push("## Multi-Week Trends");
      lines.push("");
      lines.push(
        "Position trends based on Search Console data across multiple weekly snapshots."
      );
      lines.push("");
      lines.push(
        "| Page | Keyword | Current | Avg (4wk) | Direction | Velocity | Weeks |"
      );
      lines.push(
        "|------|---------|---------|-----------|-----------|----------|-------|"
      );

      for (const [path, t] of trendEntries.slice(0, 15)) {
        const dirIcon =
          t.direction === "improving"
            ? "📈"
            : t.direction === "declining"
              ? "📉"
              : "📊";
        const weeks =
          t.consecutiveImproving > 0
            ? `${t.consecutiveImproving}w ↑`
            : t.consecutiveDeclining > 0
              ? `${t.consecutiveDeclining}w ↓`
              : "—";
        const vel = t.velocity > 0 ? `+${t.velocity}` : `${t.velocity}`;
        lines.push(
          `| ${path} | ${t.topKeyword} | ${t.currentPosition} | ${t.rollingAvg} | ${dirIcon} ${t.direction} | ${vel}/wk | ${weeks} |`
        );
      }
      lines.push("");
    }
  } else if (snapshotCount < TREND_MIN_SNAPSHOTS) {
    lines.push("## Multi-Week Trends");
    lines.push("");
    lines.push(
      `> Trend analysis available after ${TREND_MIN_SNAPSHOTS}+ weekly snapshots. Currently: ${snapshotCount}.`
    );
    lines.push("");
  }

  // SERP position trends
  if (serpTrends) {
    const serpEntries = Object.entries(serpTrends).sort(
      ([, a], [, b]) => Math.abs(b.totalChange) - Math.abs(a.totalChange)
    );

    if (serpEntries.length > 0) {
      lines.push("## SERP Position Trends (Live Snapshot)");
      lines.push("");
      lines.push(
        "Position changes in live Google SERPs across weekly snapshots."
      );
      lines.push("");
      lines.push(
        "| Keyword | Current | First Seen | Total Change | Data Points |"
      );
      lines.push(
        "|---------|---------|------------|-------------|-------------|"
      );

      for (const [kw, t] of serpEntries.slice(0, 15)) {
        const change =
          t.totalChange > 0 ? `+${t.totalChange}` : `${t.totalChange}`;
        lines.push(
          `| ${kw} | #${t.currentPosition} | #${t.firstPosition} | ${change} | ${t.dataPoints} |`
        );
      }
      lines.push("");
    }
  }

  // Auto-optimize impact tracking
  if (optimizationImpacts && optimizationImpacts.length > 0) {
    lines.push("## Auto-Optimize Impact");
    lines.push("");
    lines.push(
      "Tracking ranking changes for pages modified by auto-optimize PRs."
    );
    lines.push(
      "*Note: Correlation, not causation — multiple factors affect rankings.*"
    );
    lines.push("");
    lines.push(
      "| Page | PR | Merged | Before | After | Change | Status | Window |"
    );
    lines.push(
      "|------|----|--------|--------|-------|--------|--------|--------|"
    );

    for (const impact of optimizationImpacts) {
      const change =
        impact.delta > 0 ? `+${impact.delta}` : `${impact.delta}`;
      const statusIcon =
        impact.status === "improved"
          ? "✅"
          : impact.status === "declined"
            ? "❌"
            : impact.status === "too early"
              ? "⏳"
              : "➖";
      lines.push(
        `| ${impact.path} | #${impact.prNumber || "?"} | ${impact.mergedAt} | ${impact.previousPosition} | ${impact.currentPosition} | ${change} | ${statusIcon} ${impact.status} | ${impact.window} |`
      );
    }
    lines.push("");
  }

  // Content gap opportunities
  if (contentGaps && contentGaps.length > 0) {
    lines.push("## Content Gap Opportunities");
    lines.push("");
    lines.push(
      "Queries where the site appears in search results but has no dedicated content page."
    );
    lines.push("");
    lines.push(
      "| Query | Impressions | Position | Receiving Page | Suggested Type |"
    );
    lines.push(
      "|-------|-------------|----------|----------------|----------------|"
    );

    for (const gap of contentGaps.slice(0, 15)) {
      lines.push(
        `| ${gap.keyword} | ${gap.impressions} | ${gap.avgPosition} | ${gap.receivingPage} | ${gap.suggestedType} |`
      );
    }
    lines.push("");
  } else if (hasGsc) {
    // Count total GSC rows to show threshold message
    let gscRowCount = 0;
    for (const page of Object.values(snapshot.pages)) {
      gscRowCount += page.gsc?.queries?.length || 0;
    }
    if (gscRowCount < CONTENT_GAP_MIN_GSC_ROWS) {
      lines.push("## Content Gap Opportunities");
      lines.push("");
      lines.push(
        `> Content gap analysis requires ${CONTENT_GAP_MIN_GSC_ROWS}+ GSC query rows. Currently: ${gscRowCount}.`
      );
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
  lines.push(
    "*Generated automatically by [weekly-seo-ranking](../../.github/workflows/weekly-seo-ranking.yml)*"
  );
  lines.push("");
  lines.push(
    "> **Note:** If both `automated-seo` and `seo-auto-optimize` PRs are open, merge the audit PR first to avoid conflicts."
  );

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

  // Load historical snapshots for trend analysis and delta comparison
  const snapshots = loadSnapshots(TREND_WINDOW);
  const previous = snapshots.length > 0 ? snapshots[0] : null;
  const snapshotCount = snapshots.length + 1; // Include the current one being built

  if (previous) {
    console.log(
      `Found ${snapshots.length} historical snapshot(s), most recent from ${previous.generatedAt}`
    );
  } else {
    console.log("No previous snapshots found — this is the first run");
  }

  // Build snapshot
  const snapshot = buildSnapshot(keywords, gscData, serpData);
  const snapshotFile = join(DATA_DIR, `rankings-${todayString()}.json`);

  // Compute enhanced analytics
  const trends = computeTrends(snapshot, snapshots);
  const serpTrends = computeSerpTrends(snapshot, snapshots);
  const gscHealth = checkGscHealth(gscData, snapshots);

  // Load and enrich optimization log for impact tracking
  const optimizationLog = enrichOptimizationLog(loadOptimizationLog());
  const optimizationImpacts = computeOptimizationImpact(
    optimizationLog,
    snapshot
  );

  // Content gap analysis
  const contentGaps = analyzeContentGaps(gscData, keywords);

  // Generate markdown report
  const report = generateReport(snapshot, previous, {
    trends,
    serpTrends,
    optimizationImpacts,
    contentGaps,
    gscHealth,
    snapshotCount,
  });

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
