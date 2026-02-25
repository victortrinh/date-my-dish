/**
 * Curated list of representative pages for visual regression testing.
 * One page per template type per locale.
 *
 * Update this list when adding new page templates to the site.
 * Smoke tests (page-health.spec.ts) still test ALL pages via discoverPages().
 *
 * Template types covered:
 * - Homepage, Recipe listing, Individual recipe, Category page,
 *   About, Contact, Search
 */
export const REPRESENTATIVE_PAGES: { path: string; name: string }[] = [
  // Homepages
  { path: "/en/", name: "en" },
  { path: "/fr/", name: "fr" },
  // Recipe listings
  { path: "/en/recipes/", name: "en-recipes" },
  { path: "/fr/recettes/", name: "fr-recettes" },
  // Individual recipe (same slug both locales)
  { path: "/en/recipes/cacio-e-pepe/", name: "en-recipes-cacio-e-pepe" },
  { path: "/fr/recettes/cacio-e-pepe/", name: "fr-recettes-cacio-e-pepe" },
  // Category pages
  { path: "/en/recipes/category/dinner/", name: "en-recipes-category-dinner" },
  {
    path: "/fr/recettes/categorie/souper/",
    name: "fr-recettes-categorie-souper",
  },
  // About
  { path: "/en/about/", name: "en-about" },
  { path: "/fr/a-propos/", name: "fr-a-propos" },
  // Contact
  { path: "/en/contact/", name: "en-contact" },
  { path: "/fr/contact/", name: "fr-contact" },
  // Search
  { path: "/en/search/", name: "en-search" },
  { path: "/fr/recherche/", name: "fr-recherche" },
];
