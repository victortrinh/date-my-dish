// .lighthouserc.cjs
// Lighthouse CI configuration for Date My Dish
// Must be .cjs because package.json has "type": "module"

const BASE = 'http://localhost:8788';

// Representative subset: 1 of each page type, both locales
const urls = [
  `${BASE}/en/`,
  `${BASE}/fr/`,
  `${BASE}/en/recipes/cacio-e-pepe/`,
  `${BASE}/fr/recettes/cacio-e-pepe/`,
  `${BASE}/en/recipes/`,
  `${BASE}/fr/recettes/`,
  `${BASE}/en/about/`,
  `${BASE}/fr/contact/`,
];

module.exports = {
  ci: {
    collect: {
      startServerCommand: 'npx wrangler dev --port 8788',
      startServerReadyPattern: 'Ready on',
      startServerReadyTimeout: 30000,
      url: urls,
      numberOfRuns: 3,
      settings: {
        chromeFlags: '--no-sandbox --disable-dev-shm-usage',
        preset: 'desktop',
      },
    },
    assert: {
      preset: 'lighthouse:recommended',
      assertions: {
        // Block on deterministic categories
        'categories:seo': ['error', { minScore: 0.9 }],
        'categories:accessibility': ['error', { minScore: 0.9 }],

        // Warn on flaky categories
        'categories:performance': ['warn', { minScore: 0.9, aggregationMethod: 'median' }],
        'categories:best-practices': ['warn', { minScore: 0.9 }],

        // Disable localhost-irrelevant audits
        'is-crawlable': 'off',
        'uses-long-cache-ttl': 'off',
        'redirects-http': 'off',
        'csp-xss': 'off',

        // Core Web Vitals
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.1, aggregationMethod: 'median' }],
      },
    },
    upload: {
      target: 'temporary-public-storage',
    },
  },
};
