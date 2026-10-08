// scripts/generate-lighthouse-urls.cjs
// Generates URL list for Lighthouse CI
// --mode=all    -> all pages (weekly audit)
// --mode=changed -> only changed content pages + translation pairs
// --mode=post-types -> one built page per post type (PR check)

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

// --mode=post-types: one built English page per post type (PR check). Reads
// dist/client after `npm run build`, so it follows the real routes (reviews
// nest under the neighbourhood) and works on the acceptance fixtures CI builds
// with DATE_SPOT_SOURCE / CONTRIBUTOR_RECIPE_SOURCE / EXTENDED_PROFILE_SOURCE.
const POST_TYPES = [
  ['review', /^en\/reviews\/[^/]+\/[^/]+\/index\.html$/],
  ['date spot', /^en\/date-spots\/(?!category\/|neighbourhood\/)[^/]+\/index\.html$/],
  ['chef', /^en\/chefs\/[^/]+\/index\.html$/],
  ['recipe card', /^en\/recipe-cards\/[^/]+\/index\.html$/],
];

function generatePostTypeUrls() {
  const dist = path.join(__dirname, '..', 'dist', 'client');
  if (!fs.existsSync(dist)) throw new Error('dist/client not found: run `npm run build` first');
  const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const p = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(p) : [path.relative(dist, p).split(path.sep).join('/')];
  });
  const files = walk(dist).sort();
  const urls = [];
  const size = (f) => fs.statSync(path.join(dist, f)).size;
  for (const [type, pattern] of POST_TYPES) {
    // The heaviest page of each type is the worst case for the budgets.
    const file = files.filter((f) => pattern.test(f)).sort((a, b) => size(b) - size(a))[0];
    if (file) urls.push(`${BASE}/${file.replace(/index\.html$/, '')}`);
    else console.warn(`No built ${type} page found; skipping`);
  }
  return urls;
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
const urls = mode === 'changed' ? generateChangedUrls()
  : mode === 'post-types' ? generatePostTypeUrls()
  : generateAllUrls();
const outputPath = path.join(__dirname, '..', '.lighthouse-urls.json');
fs.writeFileSync(outputPath, JSON.stringify(urls, null, 2));

console.log(`Mode: ${mode} | Generated ${urls.length} URLs:`);
urls.forEach(url => console.log(`  ${url}`));

// Set GitHub Actions output
if (process.env.GITHUB_OUTPUT) {
  fs.appendFileSync(process.env.GITHUB_OUTPUT, `url_count=${urls.length}\n`);
}
