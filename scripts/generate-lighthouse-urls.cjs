// scripts/generate-lighthouse-urls.cjs
// Generates URL list for Lighthouse CI
// --mode=all    -> all pages (weekly audit)
// --mode=changed -> only changed content pages + translation pairs (PR check)

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { allDetailRoutes } = require('./lib/date-spot-routes.cjs');

const BASE = 'http://localhost:8788';
const args = process.argv.slice(2);
const mode = args.find(a => a.startsWith('--mode='))?.split('=')[1] || 'all';
const base = args.find(a => a.startsWith('--base='))?.split('=')[1] || 'origin/main';

// --mode=changed: only pages affected by the PR
function generateChangedUrls() {
  const diff = execSync(`git diff --name-only --diff-filter=ACMR ${base}...HEAD`, {
    encoding: 'utf8',
  }).trim();

  if (!diff) return [];

  const changed = diff.split('\n');
  if (!changed.includes('src/content/date-spots.json')) return [];

  // date-spots.json is a single atomic file (no per-record diffing, see
  // scripts/lib/date-spot-routes.cjs), so any change audits every current
  // Date Spot detail page.
  return allDetailRoutes().map((route) => `${BASE}${route}`);
}

// --mode=all: every page on the site
function generateAllUrls() {
  const staticUrls = [
    `${BASE}/en/`,
    `${BASE}/fr/`,
    `${BASE}/en/about/`,
    `${BASE}/fr/a-propos/`,
    `${BASE}/en/contact/`,
    `${BASE}/fr/contact/`,
  ];

  const contentUrls = allDetailRoutes().map((route) => `${BASE}${route}`);

  return [...staticUrls, ...contentUrls];
}

// Main
const urls = mode === 'changed' ? generateChangedUrls() : generateAllUrls();
const outputPath = path.join(__dirname, '..', '.lighthouse-urls.json');
fs.writeFileSync(outputPath, JSON.stringify(urls, null, 2));

console.log(`Mode: ${mode} | Generated ${urls.length} URLs:`);
urls.forEach(url => console.log(`  ${url}`));

// Set GitHub Actions output
if (process.env.GITHUB_OUTPUT) {
  fs.appendFileSync(process.env.GITHUB_OUTPUT, `url_count=${urls.length}\n`);
}
