// scripts/notion-story/map.mjs
//
// Builds an unvalidated content-contract record from a Notion Story's
// database properties and its parsed Locale Pair. Validation itself happens
// in gate.mjs, against the real Zod schemas in src/content-contracts/.

const POST_TYPE_LOOKUP = {
  "date spot": "date-spot",
  "contributor recipe": "contributor-recipe",
  "extended profile": "extended-profile",
};

const SPOT_TYPE_LOOKUP = {
  restaurant: "restaurant",
  bar: "bar",
  activity: "activity",
  "chef-led experience": "chef-led-experience",
  "chef led experience": "chef-led-experience",
};

const VERDICT_LOOKUP = {
  "a favourite": "favourite",
  favourite: "favourite",
  "depends on the night": "conditional",
  conditional: "conditional",
  "not our first pick": "pass",
  pass: "pass",
};

const PAYMENT_LOOKUP = { paid: "paid", hosted: "hosted", other: "other" };
const PRICE_RANGE_LOOKUP = { free: "free", $: "$", $$: "$$", $$$: "$$$", $$$$: "$$$$" };
const CATEGORY_LOOKUP = {
  "activities and sports": "activities-sports",
  "arts and culture": "arts-culture",
  "games and entertainment": "games-entertainment",
  "nature and scenic": "nature-scenic",
  "social and romantic": "social-romantic",
};
const ROLE_LOOKUP = { chef: "chef", bartender: "bartender" };

function normalize(value, lookup, label) {
  const key = String(value ?? "").trim().toLowerCase();
  if (!(key in lookup)) {
    throw new MappingError(`Unrecognized ${label}: "${value}"`);
  }
  return lookup[key];
}

export class MappingError extends Error {}

export function normalizePostType(value) {
  return normalize(value, POST_TYPE_LOOKUP, "Post Type");
}

export function normalizeSpotType(value) {
  return normalize(value, SPOT_TYPE_LOOKUP, "Spot Type");
}

const blank = (value) => String(value ?? "").trim() === "";

/**
 * The "Google reviews" property holds one snapshot per line, oldest first:
 * "4.6 | 312 | 2026-09-18" (average, review count, date recorded). New
 * snapshots are added as new lines; old lines are never edited.
 * @param {string} value
 */
export function parseGoogleReviews(value) {
  return String(value).trim().split(/\n+/).map((line) => {
    const match = line.trim().match(/^(\d(?:\.\d)?)\s*[|·]\s*(\d+)\s*[|·]\s*(\d{4}-\d{2}-\d{2})$/);
    if (!match) throw new MappingError(`Unrecognized Google reviews line: "${line.trim()}". Use "4.6 | 312 | 2026-09-18".`);
    return { average: Number(match[1]), count: Number(match[2]), asOf: match[3] };
  });
}

/**
 * @param {(name: string) => string} getProp reads a shared database property by name
 * @param {string} postType one of "date-spot" | "contributor-recipe" | "extended-profile"
 * @param {{en: object, "fr-CA": object}} locales parsed Locale Pair copy
 * @param {{src: string, width: number, height: number}} image already-processed Editorial Image
 * @param {Record<string, {src: string, width: number, height: number, credit?: string}>} [photos]
 *   already-processed additional Date Spot photos, keyed as the copy references them
 * @returns {object} an unvalidated record shaped for the matching content contract
 */
export function storyToRecord(getProp, postType, locales, image, photos = {}) {
  const id = getProp("ID").trim();
  const image_ = { ...image, provenance: "dmd-held-photograph" };

  if (postType === "date-spot") {
    const spotType = normalizeSpotType(getProp("Spot Type"));
    const record = {
      id,
      postType: "date-spot",
      spotType,
      name: getProp("Name"),
      city: getProp("City"),
      neighbourhood: getProp("Neighbourhood"),
      reporterByline: "Victor",
      authorship: { reporting: "human", translation: "human" },
      freshness: {
        visited: getProp("Visited"),
        published: getProp("Published"),
        lastChecked: getProp("Last checked"),
      },
      image: image_,
      mapUrl: getProp("Map URL"),
      payment: normalize(getProp("Payment"), PAYMENT_LOOKUP, "Payment"),
      priceRange: normalize(getProp("Price range"), PRICE_RANGE_LOOKUP, "Price range"),
      reviewVerdict: normalize(getProp("Verdict"), VERDICT_LOOKUP, "Verdict"),
      locales,
    };
    if (Object.keys(photos).length > 0) {
      record.photos = Object.fromEntries(Object.entries(photos).map(([key, photo]) => [key, { ...photo, provenance: "dmd-held-photograph" }]));
    }
    if (spotType !== "restaurant" && !(spotType === "bar" && blank(getProp("Category")))) {
      record.category = normalize(getProp("Category"), CATEGORY_LOOKUP, "Category");
    }
    if (!blank(getProp("Instagram"))) record.instagram = getProp("Instagram").trim().replace(/^@/, "");
    if (!blank(getProp("Booking URL"))) record.bookingUrl = getProp("Booking URL").trim();
    if (!blank(getProp("Google reviews"))) record.googleReviews = parseGoogleReviews(getProp("Google reviews"));
    if (spotType === "chef-led-experience") {
      record.host = {
        name: getProp("Host name"),
        role: normalize(getProp("Host role"), ROLE_LOOKUP, "Host role"),
      };
    }
    return record;
  }

  if (postType === "contributor-recipe") {
    return {
      id,
      postType: "contributor-recipe",
      recipeOrigin: "contributor-supplied",
      contributor: {
        name: getProp("Contributor name"),
        role: normalize(getProp("Contributor role"), ROLE_LOOKUP, "Contributor role"),
        venueOrContext: getProp("Venue or context"),
      },
      suppliedSource: {
        description: getProp("Supplied source"),
        receivedOn: getProp("Received on"),
      },
      authorship: { recipe: "human-supplied", translation: "human" },
      published: getProp("Published"),
      image: image_,
      locales,
    };
  }

  if (postType === "extended-profile") {
    return {
      id,
      postType: "extended-profile",
      subject: {
        name: getProp("Subject name"),
        role: normalize(getProp("Subject role"), ROLE_LOOKUP, "Subject role"),
        venue: getProp("Subject venue"),
        neighbourhood: getProp("Subject neighbourhood"),
      },
      companionDateSpot: getProp("Companion Date Spot"),
      interviewer: "Victor",
      originalInterview: {
        conductedOn: getProp("Interview date"),
        source: getProp("Interview source"),
        quoteVerification: "facts-and-quotes-only",
      },
      authorship: { reporting: "human", translation: "human" },
      published: getProp("Published"),
      image: image_,
      locales,
    };
  }

  throw new MappingError(`Unknown Post Type: "${postType}"`);
}
