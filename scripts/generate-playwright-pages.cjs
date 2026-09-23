// scripts/generate-playwright-pages.cjs
// Determines which pages Playwright should test based on git diff.
// --base=<ref>  Git ref to diff against (default: origin/main)
//
// Outputs:
//   .playwright-pages.json  - Array of route paths (e.g., ["/en/", "/en/recipes/cacio-e-pepe/"])
//   $GITHUB_OUTPUT           - test_scope=none|changed|sample|full, page_count=N

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { allDetailRoutes, listingRoutes } = require('./lib/date-spot-routes.cjs');

const args = process.argv.slice(2);
const base = args.find(a => a.startsWith('--base='))?.split('=')[1] || 'origin/main';

// --- Tier patterns ---

const CONTENT_PATTERN = /^src\/content\/date-spots\.json$/;
const SHARED_PATTERNS = [
  /^src\/components\//,
  /^src\/layouts\//,
  /^src\/pages\//,
  /^src\/i18n\//,
  /^src\/styles\//,
];
const INFRA_PATTERNS = [
  /^package\.json$/,
  /^astro\.config/,
  /^tailwind\.config/,
  /^tsconfig/,
];

// --- Representative sample pages for shared/component changes ---

const SAMPLE_PAGES = [
  '/en/',
  '/fr/',
  '/en/reviews/',
  '/fr/critiques/',
  '/en/about/',
  '/fr/a-propos/',
];

// --- Homepage pages to add when content changes ---

const HOMEPAGE = ['/en/', '/fr/'];

// --- Tier detection ---

function detectScope(changedFiles) {
  let hasContent = false;
  let hasShared = false;
  let hasInfra = false;
  let contentTypes = new Set();

  for (const file of changedFiles) {
    if (INFRA_PATTERNS.some(p => p.test(file))) {
      hasInfra = true;
    }
    if (SHARED_PATTERNS.some(p => p.test(file))) {
      hasShared = true;
    }
    if (CONTENT_PATTERN.test(file)) {
      hasContent = true;
      contentTypes.add('date-spots');
    }
  }

  // Highest blast radius wins
  if (hasInfra) return { scope: 'full', contentTypes };
  if (hasShared) return { scope: 'sample', contentTypes };
  if (hasContent) return { scope: 'changed', contentTypes };
  return { scope: 'none', contentTypes };
}

// --- Page generation per scope ---

function generateChangedPages(changedFiles, contentTypes) {
  const routes = new Set();

  // date-spots.json is a single atomic file: any change could add, edit, or
  // drop any spot, so (unlike the retired per-file MDX diffing) we cannot
  // isolate which record changed from the git diff alone. Include every
  // current Date Spot detail page plus the listings -- the collection stays
  // small, so this is cheap.
  if (contentTypes.has('date-spots')) {
    allDetailRoutes().forEach(r => routes.add(r));
    listingRoutes().forEach(r => routes.add(r));
  }

  // Add homepage (merges recent posts from both collections)
  HOMEPAGE.forEach(r => routes.add(r));

  return [...routes].sort();
}

// --- Main ---

const diff = execSync(`git diff --name-only --diff-filter=ACMR ${base}...HEAD`, {
  encoding: 'utf8',
}).trim();

const changedFiles = diff ? diff.split('\n') : [];
const { scope, contentTypes } = detectScope(changedFiles);

let pages;
switch (scope) {
  case 'none':
    pages = [];
    break;
  case 'changed':
    pages = generateChangedPages(changedFiles, contentTypes);
    break;
  case 'sample':
    pages = SAMPLE_PAGES;
    break;
  case 'full':
    pages = []; // Empty means "use full dist/ discovery" in discover-pages.ts
    break;
}

// Write output file (empty array for 'full' signals "discover all")
const outputPath = path.join(__dirname, '..', '.playwright-pages.json');
if (scope === 'full') {
  // Delete file so discover-pages.ts falls back to full discovery
  try { fs.unlinkSync(outputPath); } catch {}
} else {
  fs.writeFileSync(outputPath, JSON.stringify(pages, null, 2));
}

console.log(`Scope: ${scope} | Pages: ${scope === 'full' ? 'all (dist/ discovery)' : pages.length}`);
if (pages.length > 0) {
  pages.forEach(p => console.log(`  ${p}`));
}

// Set GitHub Actions outputs
if (process.env.GITHUB_OUTPUT) {
  fs.appendFileSync(process.env.GITHUB_OUTPUT, `test_scope=${scope}\n`);
  fs.appendFileSync(process.env.GITHUB_OUTPUT, `page_count=${scope === 'full' ? 'all' : pages.length}\n`);
}
