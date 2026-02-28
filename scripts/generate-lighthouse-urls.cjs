// scripts/generate-lighthouse-urls.cjs
// Generates URL list for Lighthouse CI
// --mode=all    -> all pages (weekly audit)
// --mode=changed -> only changed content pages + translation pairs (PR check)

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const BASE = 'http://localhost:8788';
const args = process.argv.slice(2);
const mode = args.find(a => a.startsWith('--mode='))?.split('=')[1] || 'all';
const base = args.find(a => a.startsWith('--base='))?.split('=')[1] || 'origin/main';

// Map a content file path to its Lighthouse audit URL
function fileToUrl(filePath) {
  const match = filePath.match(/src\/content\/(recipes|articles)\/(en|fr)\/(.+)\.mdx$/);
  if (!match) return null;
  const [, type, locale, slug] = match;
  if (type === 'recipes') {
    return locale === 'en'
      ? `${BASE}/en/recipes/${slug}/`
      : `${BASE}/fr/recettes/${slug}/`;
  }
  return `${BASE}/${locale}/articles/${slug}/`;
}

// Extract translationSlug from MDX frontmatter via regex
function getTranslationSlug(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const fmMatch = content.match(/^---\n([\s\S]*?)\n---/);
    if (!fmMatch) return null;
    const slugMatch = fmMatch[1].match(/^translationSlug:\s*["']?([^"'\n]+)["']?/m);
    return slugMatch ? slugMatch[1].trim() : null;
  } catch {
    return null; // File may not exist (deleted in PR)
  }
}

// Build the translation pair's file path
function getTranslationPath(filePath, translationSlug) {
  const match = filePath.match(/src\/content\/(recipes|articles)\/(en|fr)\//);
  if (!match) return null;
  const [, type, locale] = match;
  const otherLocale = locale === 'en' ? 'fr' : 'en';
  return `src/content/${type}/${otherLocale}/${translationSlug}.mdx`;
}

// --mode=changed: only pages affected by the PR
function generateChangedUrls() {
  const diff = execSync(`git diff --name-only --diff-filter=ACMR ${base}...HEAD`, {
    encoding: 'utf8',
  }).trim();

  if (!diff) return [];

  const contentFiles = diff
    .split('\n')
    .filter(f => /^src\/content\/(recipes|articles)\/(en|fr)\/.+\.mdx$/.test(f));

  if (contentFiles.length === 0) return [];

  const urls = new Set();

  for (const file of contentFiles) {
    const url = fileToUrl(file);
    if (url) urls.add(url);

    // Resolve and add translation pair
    const absPath = path.join(__dirname, '..', file);
    const translationSlug = getTranslationSlug(absPath);
    if (translationSlug) {
      const pairPath = getTranslationPath(file, translationSlug);
      if (pairPath) {
        const pairAbsPath = path.join(__dirname, '..', pairPath);
        if (fs.existsSync(pairAbsPath)) {
          const pairUrl = fileToUrl(pairPath);
          if (pairUrl) urls.add(pairUrl);
        } else {
          console.warn(`Warning: Translation pair not found: ${pairPath}`);
        }
      }
    }
  }

  return [...urls];
}

// --mode=all: every page on the site
function generateAllUrls() {
  const staticUrls = [
    `${BASE}/en/`,
    `${BASE}/fr/`,
    `${BASE}/en/recipes/`,
    `${BASE}/fr/recettes/`,
    `${BASE}/en/articles/`,
    `${BASE}/fr/articles/`,
    `${BASE}/en/about/`,
    `${BASE}/fr/a-propos/`,
    `${BASE}/en/contact/`,
    `${BASE}/fr/contact/`,
  ];

  const contentDirs = [
    { dir: 'src/content/recipes/en', prefix: '/en/recipes/' },
    { dir: 'src/content/recipes/fr', prefix: '/fr/recettes/' },
    { dir: 'src/content/articles/en', prefix: '/en/articles/' },
    { dir: 'src/content/articles/fr', prefix: '/fr/articles/' },
  ];

  const contentUrls = contentDirs.flatMap(({ dir, prefix }) => {
    const fullDir = path.join(__dirname, '..', dir);
    if (!fs.existsSync(fullDir)) return [];
    return fs.readdirSync(fullDir)
      .filter(f => f.endsWith('.mdx'))
      .map(f => `${BASE}${prefix}${f.replace('.mdx', '')}/`);
  });

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
