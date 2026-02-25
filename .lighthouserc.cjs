// .lighthouserc.cjs
// Lighthouse CI configuration for Date My Dish — PR gate
// Must be .cjs because package.json has "type": "module"

const fs = require('fs');
const path = require('path');

const BASE = 'http://localhost:8788';

// Static pages
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
const recipesDir = path.join(__dirname, 'src', 'content', 'recipes');

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

const urls = [...staticUrls, ...recipeUrls];

module.exports = {
  ci: {
    collect: {
      startServerCommand: 'npx wrangler dev --port 8788',
      startServerReadyPattern: 'Ready on',
      startServerReadyTimeout: 30000,
      url: urls,
      numberOfRuns: 1,
      settings: {
        chromeFlags: '--no-sandbox --disable-dev-shm-usage',
        preset: 'desktop',
      },
    },
    assert: {
      assertions: {
        // Block on deterministic categories
        'categories:seo': ['error', { minScore: 0.9 }],
        'categories:accessibility': ['error', { minScore: 0.9 }],

        // Warn on flaky categories
        'categories:performance': ['warn', { minScore: 0.9, aggregationMethod: 'median' }],
        'categories:best-practices': ['warn', { minScore: 0.9 }],

        // Core Web Vitals
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.1, aggregationMethod: 'median' }],
      },
    },
    upload: {
      target: 'temporary-public-storage',
    },
  },
};
