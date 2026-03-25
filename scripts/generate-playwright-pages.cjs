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

const args = process.argv.slice(2);
const base = args.find(a => a.startsWith('--base='))?.split('=')[1] || 'origin/main';

// --- Tier patterns ---

const CONTENT_PATTERN = /^src\/content\/(recipes|articles)\/(en|fr)\/.+\.mdx$/;
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
  '/en/recipes/',
  '/fr/recettes/',
  '/en/articles/',
  '/fr/articles/',
  '/en/recipes/cacio-e-pepe/',
  '/fr/recettes/cacio-e-pepe/',
  '/en/articles/cooking-oils-guide/',
  '/fr/articles/guide-huiles-de-cuisson/',
  '/en/recipes/cuisine/italian/',
  '/fr/recettes/cuisine/italien/',
  '/en/about/',
  '/fr/a-propos/',
];

// --- Listing and homepage pages to add when content changes ---

const HOMEPAGE = ['/en/', '/fr/'];
const RECIPE_LISTINGS = ['/en/recipes/', '/fr/recettes/'];
const ARTICLE_LISTINGS = ['/en/articles/', '/fr/articles/'];

// --- Helpers (mirrored from generate-lighthouse-urls.cjs) ---

function contentFileToRoute(filePath) {
  const match = filePath.match(/src\/content\/(recipes|articles)\/(en|fr)\/(.+)\.mdx$/);
  if (!match) return null;
  const [, type, locale, slug] = match;
  if (type === 'recipes') {
    return locale === 'en' ? `/en/recipes/${slug}/` : `/fr/recettes/${slug}/`;
  }
  return `/${locale}/articles/${slug}/`;
}

function getTranslationSlug(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const fmMatch = content.match(/^---\n([\s\S]*?)\n---/);
    if (!fmMatch) return null;
    const slugMatch = fmMatch[1].match(/^translationSlug:\s*["']?([^"'\n]+)["']?/m);
    return slugMatch ? slugMatch[1].trim() : null;
  } catch {
    return null;
  }
}

function getTranslationFilePath(filePath, translationSlug) {
  const match = filePath.match(/src\/content\/(recipes|articles)\/(en|fr)\//);
  if (!match) return null;
  const [, type, locale] = match;
  const otherLocale = locale === 'en' ? 'fr' : 'en';
  return `src/content/${type}/${otherLocale}/${translationSlug}.mdx`;
}

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
    const contentMatch = file.match(CONTENT_PATTERN);
    if (contentMatch) {
      hasContent = true;
      contentTypes.add(contentMatch[1]); // 'recipes' or 'articles'
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

  // Add affected content pages + translation pairs
  const contentFiles = changedFiles.filter(f => CONTENT_PATTERN.test(f));
  for (const file of contentFiles) {
    const route = contentFileToRoute(file);
    if (route) routes.add(route);

    const absPath = path.join(__dirname, '..', file);
    const translationSlug = getTranslationSlug(absPath);
    if (translationSlug) {
      const pairPath = getTranslationFilePath(file, translationSlug);
      if (pairPath) {
        const pairAbsPath = path.join(__dirname, '..', pairPath);
        if (fs.existsSync(pairAbsPath)) {
          const pairRoute = contentFileToRoute(pairPath);
          if (pairRoute) routes.add(pairRoute);
        }
      }
    }
  }

  // Add homepage (merges recent posts from both collections)
  HOMEPAGE.forEach(r => routes.add(r));

  // Add listing pages for affected content types
  if (contentTypes.has('recipes')) {
    RECIPE_LISTINGS.forEach(r => routes.add(r));
  }
  if (contentTypes.has('articles')) {
    ARTICLE_LISTINGS.forEach(r => routes.add(r));
  }

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
