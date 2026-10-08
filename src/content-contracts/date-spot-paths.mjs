// URL paths for Date Spot detail pages. Dependency-free so the site
// (src/utils/date-spots.ts) and the CI page/URL generators
// (scripts/lib/date-spot-routes.cjs, loaded with require()) build the same
// routes from one place.

/** Neighbourhood path segment for review URLs, e.g. "Côte-des-Neiges" -> "cote-des-neiges". */
export function neighbourhoodSlug(neighbourhood) {
  return neighbourhood.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

/**
 * Restaurants and bars are Venue Reviews; activities and chef-led experiences are Planning Spots.
 * @param {string} spotType
 */
export function isVenueReviewType(spotType) {
  return spotType === "restaurant" || spotType === "bar";
}

/**
 * Detail-page path for a Date Spot record in one locale. Venue Reviews nest
 * under the neighbourhood (/en/reviews/{neighbourhood}/{slug}/,
 * /fr/critiques/{neighbourhood}/{slug}/); Planning Spots live at
 * /en/date-spots/{slug}/ and /fr/lieux/{slug}/.
 * @param {{ spotType: string, neighbourhood: string, locales: Record<"en" | "fr-CA", { slug: string }> }} spot
 * @param {"en" | "fr"} locale
 * @returns {string}
 */
export function dateSpotDetailPath(spot, locale) {
  const slug = spot.locales[locale === "fr" ? "fr-CA" : "en"].slug;
  if (isVenueReviewType(spot.spotType)) {
    return `/${locale}/${locale === "fr" ? "critiques" : "reviews"}/${neighbourhoodSlug(spot.neighbourhood)}/${slug}/`;
  }
  return `/${locale}/${locale === "fr" ? "lieux" : "date-spots"}/${slug}/`;
}
