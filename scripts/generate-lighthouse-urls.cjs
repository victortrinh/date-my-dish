// scripts/generate-lighthouse-urls.cjs
// Generates URL list from content directory for Lighthouse CI full audit

const fs = require('fs');
const path = require('path');

const BASE = 'http://localhost:8788';

// Static pages (always audited)
const staticUrls = [
  `${BASE}/en/`,
  `${BASE}/fr/`,
  `${BASE}/en/recipes/`,
  `${BASE}/fr/recettes/`,
  `${BASE}/en/about/`,
  `${BASE}/fr/a-propos/`,
  `${BASE}/en/contact/`,
  `${BASE}/fr/contact/`,
];

// Discover recipe URLs from content directory
const recipesDir = path.join(__dirname, '..', 'src', 'content', 'recipes');

const enRecipes = fs.readdirSync(path.join(recipesDir, 'en'))
  .filter(f => f.endsWith('.mdx'))
  .map(f => f.replace('.mdx', ''));

const frRecipes = fs.readdirSync(path.join(recipesDir, 'fr'))
  .filter(f => f.endsWith('.mdx'))
  .map(f => f.replace('.mdx', ''));

const recipeUrls = [
  ...enRecipes.map(slug => `${BASE}/en/recipes/${slug}/`),
  ...frRecipes.map(slug => `${BASE}/fr/recettes/${slug}/`),
];

const allUrls = [...staticUrls, ...recipeUrls];

// Write to .lighthouserc-full-urls.json for the config to consume
const outputPath = path.join(__dirname, '..', '.lighthouserc-full-urls.json');
fs.writeFileSync(outputPath, JSON.stringify(allUrls, null, 2));

console.log(`Generated ${allUrls.length} URLs for Lighthouse CI:`);
allUrls.forEach(url => console.log(`  ${url}`));
