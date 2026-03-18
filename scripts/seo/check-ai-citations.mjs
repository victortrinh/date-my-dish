#!/usr/bin/env node
/**
 * AI Citation Monitoring Script
 *
 * Checks whether Date My Dish recipes are being cited by AI search engines.
 * Uses Serper.dev API to search for recipe names and check if datemydish.com
 * appears in AI-generated answers or organic results.
 *
 * Usage:
 *   node scripts/seo/check-ai-citations.mjs
 *
 * Requires:
 *   SERPER_API_KEY environment variable (same key used by fetch-serp-rankings.mjs)
 *
 * Output:
 *   data/seo/ai-citations-YYYY-MM-DD.json
 */

import { readFileSync, writeFileSync, readdirSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, "..", "..");
const recipesDir = join(rootDir, "src", "content", "recipes", "en");
const outputDir = join(rootDir, "data", "seo");

const SERPER_API_KEY = process.env.SERPER_API_KEY;
const SITE_DOMAIN = "datemydish.com";

// Rate limiting
const DELAY_MS = 1500;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function getRecipeTitles() {
  const files = readdirSync(recipesDir).filter((f) => f.endsWith(".mdx"));
  return files.map((file) => {
    const content = readFileSync(join(recipesDir, file), "utf-8");
    const titleMatch = content.match(/^title:\s*"(.+?)"/m);
    const slug = file.replace(".mdx", "");
    return {
      slug,
      title: titleMatch ? titleMatch[1] : slug,
    };
  });
}

async function searchSerper(query) {
  if (!SERPER_API_KEY) return null;

  const response = await fetch("https://google.serper.dev/search", {
    method: "POST",
    headers: {
      "X-API-KEY": SERPER_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      q: query,
      gl: "ca",
      hl: "en",
      num: 10,
    }),
  });

  if (!response.ok) {
    console.error(`Serper API error for "${query}": ${response.status}`);
    return null;
  }

  return response.json();
}

function checkForSiteMention(serpData) {
  if (!serpData) return { found: false, sources: [] };

  const sources = [];

  // Check AI overview / knowledge graph
  if (serpData.knowledgeGraph) {
    const kg = JSON.stringify(serpData.knowledgeGraph).toLowerCase();
    if (kg.includes(SITE_DOMAIN)) {
      sources.push("knowledge_graph");
    }
  }

  // Check AI overview
  if (serpData.answerBox) {
    const ab = JSON.stringify(serpData.answerBox).toLowerCase();
    if (ab.includes(SITE_DOMAIN)) {
      sources.push("answer_box");
    }
  }

  // Check organic results
  if (serpData.organic) {
    for (const result of serpData.organic) {
      if (result.link && result.link.includes(SITE_DOMAIN)) {
        sources.push(`organic_position_${serpData.organic.indexOf(result) + 1}`);
      }
    }
  }

  // Check "People Also Ask"
  if (serpData.peopleAlsoAsk) {
    for (const paa of serpData.peopleAlsoAsk) {
      if (paa.link && paa.link.includes(SITE_DOMAIN)) {
        sources.push("people_also_ask");
      }
    }
  }

  return {
    found: sources.length > 0,
    sources,
  };
}

async function main() {
  const recipes = getRecipeTitles();
  console.log(`Checking AI citations for ${recipes.length} recipes...\n`);

  if (!SERPER_API_KEY) {
    console.log("No SERPER_API_KEY set. Running in dry-run mode (listing queries only).\n");
  }

  const results = [];
  const queries = [];

  // Generate search queries
  for (const recipe of recipes) {
    queries.push({
      slug: recipe.slug,
      title: recipe.title,
      query: `${recipe.title} recipe`,
      type: "recipe_name",
    });
    queries.push({
      slug: recipe.slug,
      title: recipe.title,
      query: `how to make ${recipe.title}`,
      type: "how_to",
    });
  }

  // Also check brand queries
  queries.push({
    slug: "_brand",
    title: "Brand",
    query: "date my dish recipes",
    type: "brand",
  });
  queries.push({
    slug: "_brand",
    title: "Brand",
    query: "date night recipes romantic dinner",
    type: "brand_category",
  });

  if (!SERPER_API_KEY) {
    console.log("Queries that would be checked:");
    for (const q of queries) {
      console.log(`  - "${q.query}" (${q.type})`);
    }
    console.log(`\nTotal: ${queries.length} queries`);
    console.log("Set SERPER_API_KEY to run actual checks.");
    return;
  }

  for (const q of queries) {
    process.stdout.write(`Checking: "${q.query}"... `);
    const serpData = await searchSerper(q.query);
    const citation = checkForSiteMention(serpData);

    results.push({
      slug: q.slug,
      title: q.title,
      query: q.query,
      type: q.type,
      found: citation.found,
      sources: citation.sources,
    });

    if (citation.found) {
      console.log(`FOUND in: ${citation.sources.join(", ")}`);
    } else {
      console.log("not found");
    }

    await sleep(DELAY_MS);
  }

  // Summary
  const found = results.filter((r) => r.found);
  const recipesFound = [...new Set(found.map((r) => r.slug))];

  console.log("\n--- Summary ---");
  console.log(`Total queries: ${results.length}`);
  console.log(`Citations found: ${found.length}`);
  console.log(`Recipes with citations: ${recipesFound.length}/${recipes.length}`);

  if (found.length > 0) {
    console.log("\nCitations:");
    for (const r of found) {
      console.log(`  ${r.title}: "${r.query}" -> ${r.sources.join(", ")}`);
    }
  }

  // Write output
  const today = new Date().toISOString().split("T")[0];
  const output = {
    date: today,
    totalQueries: results.length,
    citationsFound: found.length,
    recipesWithCitations: recipesFound.length,
    totalRecipes: recipes.length,
    results,
  };

  mkdirSync(outputDir, { recursive: true });
  const outputPath = join(outputDir, `ai-citations-${today}.json`);
  writeFileSync(outputPath, JSON.stringify(output, null, 2));
  console.log(`\nResults saved to: ${outputPath}`);
}

main().catch(console.error);
