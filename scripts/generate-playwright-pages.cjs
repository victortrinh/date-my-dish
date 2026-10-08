// scripts/generate-playwright-pages.cjs
// Determines which pages Playwright should test based on git diff.
// --base=<ref>  Git ref to diff against (default: origin/main)
//
// Date Spot routes are read from DATE_SPOT_SOURCE when set (CI builds against
// tests/fixtures/date-spots.json), so the page list matches what was built.
//
// Outputs:
//   .playwright-pages.json  - Array of route paths (e.g., ["/en/", "/en/reviews/villeray/some-spot/"])
//   $GITHUB_OUTPUT           - test_scope=none|changed|sample|full, page_count=N

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { allDetailRoutes, listingRoutes } = require('./lib/date-spot-routes.cjs');

// --- Tier patterns ---

// The live collection or the fixture CI builds against.
const CONTENT_PATTERNS = [
  /^src\/content\/date-spots\.json$/,
  /^tests\/fixtures\/date-spots\.json$/,
];
// Anything that changes what the built site serves, or what the smoke specs
// assert, runs the sample pages (and every spec, since `npx playwright test`
// always runs the whole suite, so a changed tests/smoke/** spec runs too).
const SHARED_PATTERNS = [
  /^src\/components\//,
  /^src\/layouts\//,
  /^src\/pages\//,
  /^src\/i18n\//,
  /^src\/styles\//,
  /^src\/utils\//,
  /^src\/content-contracts\//,
  /^src\/content\.config\.ts$/,
  /^src\/middleware/,
  // Cloudflare runtime: the worker, redirects, headers, and wrangler config
  // shape every response even when no page source changes.
  /^src\/worker\.ts$/,
  /^public\/_redirects$/,
  /^public\/_headers$/,
  /^wrangler\.jsonc?$/,
  // The test suite itself: smoke specs, fixtures, helpers, and the scripts
  // and config that decide what it runs.
  /^tests\//,
  /^playwright\.config\.ts$/,
  /^scripts\/generate-playwright-pages\.cjs$/,
  /^scripts\/lib\/date-spot-routes\.cjs$/,
  /^\.github\/workflows\/playwright-pr-check\.yml$/,
  /^package-lock\.json$/,
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
  const contentTypes = new Set();

  for (const file of changedFiles) {
    if (INFRA_PATTERNS.some(p => p.test(file))) {
      hasInfra = true;
    }
    if (SHARED_PATTERNS.some(p => p.test(file))) {
      hasShared = true;
    }
    if (CONTENT_PATTERNS.some(p => p.test(file))) {
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

function generateChangedPages(contentTypes) {
  const routes = new Set();

  // date-spots.json is a single atomic file: any change could add, edit, or
  // drop any spot, so we cannot isolate which record changed from the git
  // diff alone. Include every current Date Spot detail page plus the
  // listings -- the collection stays small, so this is cheap.
  if (contentTypes.has('date-spots')) {
    allDetailRoutes().forEach(r => routes.add(r));
    listingRoutes().forEach(r => routes.add(r));
  }

  // Add homepage (lists recent posts)
  HOMEPAGE.forEach(r => routes.add(r));

  return [...routes].sort();
}

/** Route list for a scope; an empty list for 'full' means "discover all of dist/". */
function planPages(changedFiles) {
  const { scope, contentTypes } = detectScope(changedFiles);
  let pages = [];
  if (scope === 'changed') pages = generateChangedPages(contentTypes);
  if (scope === 'sample') {
    // A sample run that also touches Date Spot data covers those pages too.
    pages = contentTypes.size > 0
      ? [...new Set([...SAMPLE_PAGES, ...generateChangedPages(contentTypes)])].sort()
      : SAMPLE_PAGES;
  }
  return { scope, pages };
}

// --- Main ---

function main() {
  const args = process.argv.slice(2);
  const base = args.find(a => a.startsWith('--base='))?.split('=')[1] || 'origin/main';

  const diff = execSync(`git diff --name-only --diff-filter=ACMR ${base}...HEAD`, {
    encoding: 'utf8',
  }).trim();

  const changedFiles = diff ? diff.split('\n') : [];
  const { scope, pages } = planPages(changedFiles);

  // Write output file (absent file for 'full' signals "discover all")
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
}

if (require.main === module) main();

module.exports = { detectScope, planPages };
