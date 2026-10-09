// Mechanical test records, not reporting or translations. They are never
// loaded as content: unit tests build them in memory, and the browser
// acceptance fixtures (tests/fixtures/*.json and tests/fixtures/editorial/)
// are regenerated from them with `node tests/contracts/date-spot-fixtures.mjs`.
import { mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { DINNER_AND_DATE_QUESTIONS } from "../../src/content-contracts/extended-profile.mjs";

export const token = "[TEST ONLY]";
// Mechanical words to reach a word count without meaning anything.
export const filler = (label, count) => `${token} ${label} ${Array.from({ length: count }, () => "test").join(" ")}`;
const signals = (occasions) => occasions.map((occasion, index) => ({ occasion, assessment: ["ideal", "caveat", "not-for", "ideal"][index % 4], reason: `${token} ${occasion} reason` }));
const metaDescription = `${token} mechanical fixture describing a Date Spot for checking the bilingual route, its visible modules, metadata and schema output here.`.padEnd(152, ".");

const sharedFields = (id, spotType, name) => ({
  id, postType: "date-spot", spotType, name, city: "Test City", neighbourhood: "Test Quarter",
  reporterByline: "Victor",
  freshness: { visited: "2026-01-01", published: "2026-01-02", lastChecked: "2026-01-03" },
  image: { src: `/images/date-spots/${id}.webp`, width: 1200, height: 800, provenance: "dmd-held-photograph" },
  reviewVerdict: "conditional",
});

/** Only what the spec requires of a Review, in one locale. */
function minimalVenueCopy(slug, name) {
  return {
    slug,
    metaTitle: `${name}, Test Quarter: Review & Date Night Guide`,
    metaDescription,
    opening: filler("opening", 150),
    cuisine: `${token} cuisine`,
    verdictReason: filler("verdict reason", 160),
    imageAlt: `${token} image description`,
    paymentDisclosure: `${token} payment disclosure`,
    essentials: { address: `${token} address`, cost: `${token} cost per person` },
  };
}

/** A Review with every Optional Section filled, in one locale. */
function fullVenueCopy(spotType, slug, name) {
  const copy = {
    ...minimalVenueCopy(slug, name),
    title: `${token} ${name}`,
    opening: `${token} opening`,
    verdictReason: filler("verdict reason", 80),
    verdictHeadline: `${token} verdict headline`,
    sourceNotes: `${token} source notes`,
    factNotes: `${token} fact notes`,
    imageCredit: `${token} image credit`,
    essentials: { address: `${token} address`, cost: `${token} cost per person`, booking: `${token} booking`, access: `${token} access`, duration: `${token} duration`, hours: `${token} hours` },
    goodFor: signals(["anniversary", "impressing-a-cook", "first-date", "casual-midweek"]),
    room: filler("room", 500),
    drinks: {
      intro: filler("drinks", 40),
      picks: [
        { moment: "to-start", name: `${token} cocktail`, note: `${token} first drink` },
        ...(spotType === "restaurant" ? [{ moment: "with-the-meal", name: `${token} wine`, note: `${token} pairing` }] : [{ moment: "second-round", name: `${token} second`, note: `${token} second round` }]),
        { moment: "not-drinking", name: `${token} zero proof`, note: `${token} no alcohol` },
      ],
      list: filler("list", 90),
    },
    realCost: {
      intro: `${token} real cost`,
      lines: [{ item: `${token} food`, amount: "$100" }, { item: `${token} tax and tip`, amount: "$30" }],
      total: { label: `${token} two people, all in`, amount: "$130" },
      howToSpendLess: `${token} spend less`,
    },
    reportersNote: { byline: "Victor", visits: 2, detail: filler("note detail", 70), caveat: filler("note caveat", 60) },
    beforeYouBook: [{ question: `${token} how far ahead?`, answer: filler("answer", 40) }, { question: `${token} parking?`, answer: filler("answer", 40) }],
    materialUpdates: [],
  };
  if (spotType === "restaurant") {
    copy.whatToOrder = {
      dishes: ["order-this", "worth-it", "worth-it", "skip"].map((tag, index) => ({ name: `${token} dish ${index + 1}`, tag, note: filler("dish", 40) })),
    };
  }
  return copy;
}

function planningCopy(slug, name) {
  return {
    title: `${token} ${name}`,
    slug,
    metaTitle: `${name}, Test Quarter: Date Spot Guide`,
    metaDescription,
    opening: `${token} opening`,
    verdictReason: `${token} verdict reason`,
    imageAlt: `${token} image description`,
    imageCredit: `${token} image credit`,
    essentials: { address: `${token} address`, cost: `${token} cost`, hours: `${token} hours`, booking: `${token} booking`, duration: `${token} duration` },
    season: `${token} all year`,
    paymentDisclosure: `${token} payment disclosure`,
    whenItWorks: [{ situation: `${token} after dinner`, assessment: "ideal", reason: `${token} works reason` }, { situation: `${token} winter`, assessment: "not-for", reason: `${token} winter reason` }],
    whatItIs: `${token} what it is`,
    howToDoItWell: [{ label: `${token} timing`, text: `${token} go before sunset` }],
    materialUpdates: [],
  };
}

const pairOf = (id, copy) => {
  const fr = structuredClone(copy);
  fr.slug = `${id}-fr`;
  return { en: structuredClone(copy), "fr-CA": fr };
};

/** A valid Date Spot of the given Spot Type, with its Optional Sections filled. */
export function dateSpotFixture(spotType = "restaurant", id = "test-only", name = "Test Venue") {
  const venue = spotType === "restaurant" || spotType === "bar";
  const copy = venue ? fullVenueCopy(spotType, id, name) : planningCopy(id, name);
  return {
    ...sharedFields(id, spotType, name),
    mapUrl: "https://example.com", payment: "paid", priceRange: spotType === "activity" ? "free" : "$$$",
    ...(spotType === "activity" || spotType === "chef-led-experience" ? { category: "nature-scenic" } : {}),
    ...(spotType === "chef-led-experience" ? { host: { name: token, role: "chef" } } : {}),
    locales: pairOf(id, copy),
  };
}

/** A Review with only the fields the spec requires, nothing optional. */
export function minimalReviewFixture(id = "test-only-minimal", name = "Test Minimal") {
  const { freshness, ...shared } = sharedFields(id, "restaurant", name);
  return {
    ...shared,
    freshness: { published: freshness.published },
    locales: pairOf(id, minimalVenueCopy(id, name)),
  };
}

/** A small, fully linked collection for the browser acceptance build. */
export function acceptanceCollection() {
  const restaurant = dateSpotFixture("restaurant", "test-only-restaurant", "Test Venue");
  const activity = dateSpotFixture("activity", "test-only-activity", "Test Park");
  const bar = dateSpotFixture("bar", "test-only-bar", "Test Bar");
  const minimal = minimalReviewFixture();
  minimal.reviewVerdict = "pass";
  bar.category = "social-romantic";
  for (const spot of [restaurant, activity, bar, minimal]) spot.image.src = "/images/og-default.jpg";
  restaurant.photos = { room: { src: "/images/og-default.jpg", width: 1200, height: 630, provenance: "dmd-held-photograph" } };
  for (const locale of ["en", "fr-CA"]) {
    const copy = restaurant.locales[locale];
    copy.opening = `${token} Chef ${token} Cook opening`;
    copy.roomPhoto = { photo: "room", alt: `${token} room photo` };
    copy.meetChef = { name: `${token} Cook`, role: `${token} chef`, background: filler("chef background", 90), quote: `${token} chef quote`, approach: filler("chef approach", 100), profileId: "test-only-profile" };
    copy.atHome = { recipeId: "test-only-recipe", intro: `${token} at home intro` };
    copy.whatToOrder.waitersChoice = { recommendation: `${token} waiter recommendation`, outcome: `${token} they were right` };
    copy.whatToOrder.setMenu = { name: `${token} tasting`, courses: 5, pricePerPerson: "$95", note: `${token} set menu note`, advice: "take-it" };
    // Out of category order on purpose, plus a pick whose Date Spot is not
    // published: the page shows the activity, then the bar, and nothing else.
    copy.makeANight = [
      { spotId: "test-only-bar", timing: "after", walkMinutes: 4, blurb: `${token} bar blurb` },
      { spotId: "test-only-unpublished", timing: "after", walkMinutes: 2, blurb: `${token} unpublished blurb` },
      { spotId: "test-only-activity", timing: "before", walkMinutes: 9, blurb: `${token} activity blurb` },
    ];
    activity.locales[locale].pairItWith = [{ spotId: "test-only-restaurant", walkMinutes: 12 }];
    activity.locales[locale].verdictQualifier = `${token} in season`;
    activity.locales[locale].season = `${token} May to October`;
    activity.locales[locale].essentials.transit = `${token} metro`;
  }
  return [restaurant, activity, bar, minimal];
}

/**
 * Companion Files for the acceptance build. The restaurant's verdict,
 * Checked date, update line, venue facts and meta title come from here, not
 * from the Notion-derived record, so the browser tests prove the merge.
 */
export function acceptanceCompanions() {
  const locale = (lang) => ({
    metaTitle: `Test Venue, Test Quarter: Companion ${lang} Title`,
    materialUpdates: [{ date: "2026-01-04", note: `${token} update` }],
  });
  return [{
    id: "test-only-restaurant",
    reviewVerdict: "favourite",
    lastChecked: "2026-01-04",
    googleReviews: [{ average: 4.6, count: 312, asOf: "2026-01-02" }],
    instagram: "test_only",
    bookingUrl: "https://example.com/book",
    locales: { en: locale("EN"), "fr-CA": locale("FR") },
  }];
}

const description = `${token} mechanical fixture for checking a contributor page route, its visible modules, metadata and schema output.`.padEnd(130, ".");

/** A valid Chef Recipe Card with its optional fields filled. */
export function contributorRecipeFixture(id = "test-only-recipe") {
  const copy = (slug) => ({
    title: `${token} recipe`, slug, metaTitle: `${token} recipe`, metaDescription: description,
    originalContext: `${token} original context`, sourceNotes: token, factNotes: token, imageAlt: `${token} recipe photo`, imageCredit: token,
    serves: "2", activeTime: "PT20M", totalTime: "PT45M", difficulty: "medium", equipment: [`${token} pan`], dietaryNotes: [`${token} diet`],
    ingredientGroups: [{ items: [`${token} ingredient`] }], methodGroups: [{ steps: [`${token} step`] }], contributorNotes: [`${token} contributor note`],
  });
  return {
    id, postType: "contributor-recipe", recipeOrigin: "contributor-supplied",
    contributor: { name: `${token} Cook`, role: "chef", venueOrContext: "Test Venue" },
    suppliedSource: { description: token, receivedOn: "2026-01-01" },
    published: "2026-01-02",
    image: { src: "/images/og-default.jpg", width: 1200, height: 630, provenance: "dmd-held-photograph" },
    locales: { en: copy(id), "fr-CA": copy(`${id}-fr`) },
  };
}

/** A valid Chef page, companion to the acceptance restaurant, with its optional sections filled. */
export function extendedProfileFixture(id = "test-only-profile") {
  const copy = (slug) => ({
    title: `${token} In the kitchen with ${token} Cook`, slug, metaTitle: `${token} Cook, chef at Test Venue: Interview`, metaDescription: description,
    standfirst: `${token} standfirst`, shortScene: `${token} short scene`,
    theVenue: [{ question: `${token} venue question 1`, answer: `${token} venue answer 1` }, { question: `${token} venue question 2`, answer: `${token} venue answer 2` }],
    pullQuote: `${token} pull quote`,
    dinnerAndDate: DINNER_AND_DATE_QUESTIONS.map((key) => ({ key, question: `${token} ${key}?`, answer: `${token} ${key} answer` })),
    shortVersion: { cuisine: `${token} cuisine`, from: `${token} hometown`, inKitchensSince: 2005 },
    sourceNotes: token, factNotes: token, imageAlt: `${token} portrait`, imageCredit: token,
    atHome: `${token} at home answer`, contributorRecipe: "test-only-recipe",
  });
  return {
    id, postType: "extended-profile",
    subject: { name: `${token} Cook`, role: "chef", venue: "Test Venue", neighbourhood: "Test Quarter" },
    companionDateSpot: "test-only-restaurant", interviewer: "Victor",
    originalInterview: { conductedOn: "2026-01-01", source: token },
    published: "2026-01-02",
    image: { src: "/images/og-default.jpg", width: 1200, height: 630, provenance: "dmd-held-photograph" },
    locales: { en: copy(id), "fr-CA": copy(`${id}-fr`) },
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const fixtures = new URL("../fixtures/", import.meta.url);
  const write = (file, value) => writeFileSync(new URL(file, fixtures), `${JSON.stringify(value, null, 2)}\n`);
  write("date-spots.json", acceptanceCollection());
  write("contributor-recipes.json", [contributorRecipeFixture()]);
  write("extended-profiles.json", [extendedProfileFixture()]);
  const editorial = new URL("editorial/", fixtures);
  mkdirSync(editorial, { recursive: true });
  for (const file of readdirSync(editorial)) rmSync(new URL(file, editorial));
  for (const companion of acceptanceCompanions()) write(`editorial/${companion.id}.json`, companion);
}
