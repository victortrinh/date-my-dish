// Checks that span collections: a review's recipe card and chef profile,
// a profile's companion review, and a recipe's pairings must all resolve.
// Each collection's own schema can't see the others, so the build and the
// Notion publish gate run this after schema validation.

export const REVIEW_INTERNAL_LINK_TARGET = 9;
// "A favourite" stops meaning anything if it lands on most reviews.
export const FAVOURITE_SHARE_TARGET = 0.25;

/**
 * @param {{ spots: any[], recipes: any[], profiles: any[] }} collections parsed records
 * @returns {string[]} problems, empty when every reference resolves
 */
export function checkCrossReferences({ spots, recipes, profiles }) {
  const problems = [];
  const spotIds = new Set(spots.map((spot) => spot.id));
  const recipeIds = new Set(recipes.map((recipe) => recipe.id));
  const profileIds = new Set(profiles.map((profile) => profile.id));

  for (const spot of spots) {
    const copy = spot.locales.en;
    if (copy.atHome && !recipeIds.has(copy.atHome.recipeId)) {
      problems.push(`${spot.id}: atHome links to Contributor Recipe "${copy.atHome.recipeId}", which is not published`);
    }
    const lead = copy.meetChef ?? copy.meetTheBartender;
    if (lead?.profileId && !profileIds.has(lead.profileId)) {
      problems.push(`${spot.id}: the Meet section links to Extended Profile "${lead.profileId}", which is not published`);
    }
  }
  for (const profile of profiles) {
    const companion = spots.find((spot) => spot.id === profile.companionDateSpot);
    if (!companion) problems.push(`${profile.id}: companion Date Spot "${profile.companionDateSpot}" is not published`);
    else if (companion.spotType !== "restaurant" && companion.spotType !== "bar") {
      problems.push(`${profile.id}: the companion Date Spot must be a Restaurant or Bar review`);
    }
    const recipeId = profile.locales.en.contributorRecipe;
    if (recipeId && !recipeIds.has(recipeId)) problems.push(`${profile.id}: Contributor Recipe "${recipeId}" is not published`);
  }
  for (const recipe of recipes) {
    for (const target of recipe.locales.en.pairItWith ?? []) {
      if (!spotIds.has(target)) problems.push(`${recipe.id}: pairItWith "${target}" is not a published Date Spot`);
    }
  }
  return problems;
}

/**
 * Editorial targets from the review spec that shouldn't block a publish
 * (the first reviews in a neighbourhood can't have nearby reviews yet), but
 * should be visible on every build.
 * @param {any[]} spots parsed Date Spots
 * @returns {string[]} warnings
 */
export function editorialWarnings(spots) {
  const warnings = [];
  const reviews = spots.filter((spot) => spot.spotType === "restaurant" || spot.spotType === "bar");
  for (const review of reviews) {
    const copy = review.locales.en;
    const lead = copy.meetChef ?? copy.meetTheBartender;
    const nearbyReviews = reviews.filter((other) => other.id !== review.id && other.city === review.city && other.neighbourhood === review.neighbourhood).length;
    const links = (copy.makeANight?.length ?? 0) + 1 /* neighbourhood guide */ + (copy.atHome ? 1 : 0) + (lead?.profileId ? 1 : 0) + Math.min(nearbyReviews, 2);
    if (links < REVIEW_INTERNAL_LINK_TARGET) {
      warnings.push(`${review.id}: ${links} earned internal links; the review spec aims for ${REVIEW_INTERNAL_LINK_TARGET} (five Make a night of it picks, the neighbourhood guide, the recipe card, two nearby reviews)`);
    }
  }
  const favourites = spots.filter((spot) => spot.reviewVerdict === "favourite").length;
  if (spots.length >= 4 && favourites / spots.length > FAVOURITE_SHARE_TARGET) {
    warnings.push(`${favourites} of ${spots.length} Date Spots are "A favourite"; keep it scarce, roughly one in four`);
  }
  return warnings;
}
