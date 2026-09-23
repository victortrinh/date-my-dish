// scripts/lib/date-spot-routes.cjs
// Shared route computation for src/content/date-spots.json, used by both
// generate-playwright-pages.cjs and generate-lighthouse-urls.cjs so page
// discovery for PR checks tracks the live Date Spot collection instead of
// the retired review MDX files.
//
// Mirrors the actual getStaticPaths() in src/pages/en/reviews/[...slug].astro
// (restaurant only) and src/pages/en/date-spots/[slug].astro (bar, activity,
// chef-led-experience) -- not src/utils/date-spots.ts's dateSpotPath, which
// currently disagrees with those routes for the "bar" Spot Type.

const fs = require('fs');
const path = require('path');

const DATE_SPOTS_FILE = path.join(__dirname, '..', '..', 'src/content/date-spots.json');

function loadDateSpots() {
  if (!fs.existsSync(DATE_SPOTS_FILE)) return [];
  return JSON.parse(fs.readFileSync(DATE_SPOTS_FILE, 'utf8'));
}

function spotRoutes(spot) {
  const enSlug = spot.locales.en.slug;
  const frSlug = spot.locales['fr-CA'].slug;
  return spot.spotType === 'restaurant'
    ? { en: `/en/reviews/${enSlug}/`, fr: `/fr/critiques/${frSlug}/` }
    : { en: `/en/date-spots/${enSlug}/`, fr: `/fr/lieux/${frSlug}/` };
}

function isVenueReview(spot) {
  return spot.spotType === 'restaurant' || spot.spotType === 'bar';
}

/** All detail-page routes for the current collection, flattened en+fr. */
function allDetailRoutes() {
  const spots = loadDateSpots();
  const routes = [];
  for (const spot of spots) {
    const { en, fr } = spotRoutes(spot);
    routes.push(en, fr);
  }
  return routes;
}

/** Listing pages to include when the collection has relevant content. */
function listingRoutes() {
  const spots = loadDateSpots();
  const routes = [];
  if (spots.length > 0) routes.push('/en/date-spots/', '/fr/lieux/');
  if (spots.some(isVenueReview)) routes.push('/en/reviews/', '/fr/critiques/');
  return routes;
}

module.exports = { loadDateSpots, spotRoutes, isVenueReview, allDetailRoutes, listingRoutes };
