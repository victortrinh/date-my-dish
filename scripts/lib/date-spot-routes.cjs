// scripts/lib/date-spot-routes.cjs
// Shared route computation for src/content/date-spots.json, used by both
// generate-playwright-pages.cjs and generate-lighthouse-urls.cjs so page
// discovery for PR checks and the weekly Lighthouse audit tracks the live
// Date Spot collection.
//
// Paths come from src/content-contracts/date-spot-paths.mjs, the same module
// src/utils/date-spots.ts uses, so Venue Reviews (restaurant, bar) resolve to
// /en/reviews/{neighbourhood}/{slug}/ and /fr/critiques/{neighbourhood}/{slug}/
// exactly as the site builds them. The .mjs is dependency-free and loaded with
// require(esm) (Node 20.19+ / 22.12+).

const fs = require('fs');
const path = require('path');
const { dateSpotDetailPath, isVenueReviewType } = require('../../src/content-contracts/date-spot-paths.mjs');

// Same source the build reads (src/content.config.ts): DATE_SPOT_SOURCE,
// relative to the working directory, when set (CI fixture builds).
const DATE_SPOTS_FILE = process.env.DATE_SPOT_SOURCE
  ? path.resolve(process.env.DATE_SPOT_SOURCE)
  : path.join(__dirname, '..', '..', 'src/content/date-spots.json');

function loadDateSpots(file = DATE_SPOTS_FILE) {
  if (!fs.existsSync(file)) return [];
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function spotRoutes(spot) {
  return { en: dateSpotDetailPath(spot, 'en'), fr: dateSpotDetailPath(spot, 'fr') };
}

function isVenueReview(spot) {
  return isVenueReviewType(spot.spotType);
}

/** All detail-page routes for the collection, flattened en+fr. */
function allDetailRoutes(spots = loadDateSpots()) {
  const routes = [];
  for (const spot of spots) {
    const { en, fr } = spotRoutes(spot);
    routes.push(en, fr);
  }
  return routes;
}

/** Listing pages to include when the collection has relevant content. */
function listingRoutes(spots = loadDateSpots()) {
  const routes = [];
  if (spots.length > 0) routes.push('/en/date-spots/', '/fr/lieux/');
  if (spots.some(isVenueReview)) routes.push('/en/reviews/', '/fr/critiques/');
  return routes;
}

module.exports = { loadDateSpots, spotRoutes, isVenueReview, allDetailRoutes, listingRoutes };
