// Mechanical test records, not reporting or translations. They are never
// loaded as content: unit tests build them in memory, and the browser
// acceptance fixtures (tests/fixtures/*.json) are regenerated from them with
// `node tests/contracts/date-spot-fixtures.mjs`.
import { writeFileSync } from "node:fs";
import { DINNER_AND_DATE_QUESTIONS } from "../../src/content-contracts/extended-profile.mjs";

export const token = "[TEST ONLY]";
// Enough mechanical words to clear the review word floor without meaning anything.
const filler = (label, count) => `${token} ${label} ${Array.from({ length: count }, () => "test").join(" ")}`;
const signals = (occasions) => occasions.map((occasion, index) => ({ occasion, assessment: ["ideal", "caveat", "not-for", "ideal"][index % 4], reason: `${token} ${occasion} reason` }));
const essentials = (label) => ({ address: `${token} address`, booking: `${token} booking`, access: `${token} access`, duration: `${token} duration`, cost: `${token} ${label} cost`, timing: `${token} timing` });

function commonCopy(slug, name, neighbourhood, venue) {
  return {
    title: `${token} ${name}`,
    slug,
    metaTitle: venue ? `${name}, ${neighbourhood}: Review & Date Night Guide` : `${name}, ${neighbourhood}: Date Spot Guide`,
    metaDescription: `${token} mechanical fixture describing a Date Spot for checking the bilingual route, its visible modules, metadata and schema output here.`.padEnd(152, "."),
    opening: `${token} opening`,
    sourceNotes: `${token} source notes`,
    factNotes: `${token} fact notes`,
    imageAlt: `${token} image description`,
    imageCredit: `${token} image credit`,
    essentials: essentials(slug),
    paymentDisclosure: `${token} payment disclosure`,
    materialUpdates: [],
  };
}

function venueCopy(spotType, slug, name, neighbourhood) {
  const copy = {
    ...commonCopy(slug, name, neighbourhood, true),
    verdictHeadline: `${token} verdict headline`,
    verdictReason: filler("verdict reason", 80),
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
  };
  if (spotType === "restaurant") {
    Object.assign(copy, {
      cuisine: `${token} cuisine`,
      whatToOrder: {
        dishes: ["order-this", "worth-it", "worth-it", "skip"].map((tag, index) => ({ name: `${token} dish ${index + 1}`, tag, note: filler("dish", 40) })),
      },
    });
  }
  return copy;
}

function planningCopy(slug, name, neighbourhood) {
  return {
    ...commonCopy(slug, name, neighbourhood, false),
    whenItWorks: [{ situation: `${token} after dinner`, assessment: "ideal", reason: `${token} works reason` }, { situation: `${token} winter`, assessment: "not-for", reason: `${token} winter reason` }],
    whatItIs: `${token} what it is`,
    howToDoItWell: [{ label: `${token} timing`, text: `${token} go before sunset` }],
  };
}

const sharedFields = (id, spotType, name) => ({
  id, postType: "date-spot", spotType, name, city: "Test City", neighbourhood: "Test Quarter",
  reporterByline: "Victor", authorship: { reporting: "human", translation: "human" },
  freshness: { visited: "2026-01-01", published: "2026-01-02", lastChecked: "2026-01-03" },
  image: { src: `/images/date-spots/${id}.webp`, width: 1200, height: 800, provenance: "dmd-held-photograph" },
  mapUrl: "https://example.com", payment: "paid", priceRange: spotType === "activity" ? "free" : "$$$",
  reviewVerdict: "conditional",
});

/** A valid Date Spot of the given Spot Type. */
export function dateSpotFixture(spotType = "restaurant", id = "test-only", name = "Test Venue") {
  const venue = spotType === "restaurant" || spotType === "bar";
  const copy = venue ? venueCopy(spotType, id, name, "Test Quarter") : planningCopy(id, name, "Test Quarter");
  const fr = structuredClone(copy);
  fr.slug = `${id}-fr`;
  return {
    ...sharedFields(id, spotType, name),
    ...(spotType === "activity" || spotType === "chef-led-experience" ? { category: "nature-scenic" } : {}),
    ...(spotType === "chef-led-experience" ? { host: { name: token, role: "chef" } } : {}),
    locales: { en: structuredClone(copy), "fr-CA": fr },
  };
}

/** A small, fully linked collection for the browser acceptance build. */
export function acceptanceCollection() {
  const restaurant = dateSpotFixture("restaurant", "test-only-restaurant", "Test Venue");
  const activity = dateSpotFixture("activity", "test-only-activity", "Test Park");
  const bar = dateSpotFixture("bar", "test-only-bar", "Test Bar");
  bar.category = "social-romantic";
  for (const spot of [restaurant, activity, bar]) spot.image.src = "/images/og-default.jpg";
  Object.assign(restaurant, {
    reviewVerdict: "favourite",
    instagram: "test_only",
    bookingUrl: "https://example.com/book",
    googleReviews: [{ average: 4.6, count: 312, asOf: "2026-01-02" }],
    photos: { room: { src: "/images/og-default.jpg", width: 1200, height: 630, provenance: "dmd-held-photograph" } },
  });
  for (const locale of ["en", "fr-CA"]) {
    const copy = restaurant.locales[locale];
    copy.opening = `${token} Chef ${token} Cook opening`;
    copy.roomPhoto = { photo: "room", alt: `${token} room photo` };
    copy.meetChef = { name: `${token} Cook`, role: `${token} chef`, background: filler("chef background", 90), quote: `${token} chef quote`, approach: filler("chef approach", 100), profileId: "test-only-profile" };
    copy.atHome = { recipeId: "test-only-recipe", intro: `${token} at home intro` };
    copy.whatToOrder.waitersChoice = { recommendation: `${token} waiter recommendation`, outcome: `${token} they were right` };
    copy.whatToOrder.setMenu = { name: `${token} tasting`, courses: 5, pricePerPerson: "$95", note: `${token} set menu note`, advice: "take-it" };
    copy.makeANight = [
      { spotId: "test-only-activity", timing: "before", walkMinutes: 9, blurb: `${token} activity blurb` },
      { spotId: "test-only-bar", timing: "after", walkMinutes: 4, blurb: `${token} bar blurb` },
    ];
    copy.materialUpdates = [{ date: "2026-01-03", note: `${token} update` }];
    activity.locales[locale].pairItWith = [{ spotId: "test-only-restaurant", walkMinutes: 12 }];
    activity.locales[locale].verdictQualifier = `${token} in season`;
    activity.locales[locale].season = `${token} May to October`;
    activity.locales[locale].essentials.transit = `${token} metro`;
  }
  return [restaurant, activity, bar];
}

const description = `${token} mechanical fixture for checking a contributor page route, its visible modules, metadata and schema output.`.padEnd(130, ".");

/** A valid Contributor Recipe. */
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
    authorship: { recipe: "human-supplied", translation: "human" }, published: "2026-01-02",
    image: { src: "/images/og-default.jpg", width: 1200, height: 630, provenance: "dmd-held-photograph" },
    locales: { en: copy(id), "fr-CA": copy(`${id}-fr`) },
  };
}

/** A valid Extended Profile, companion to the acceptance restaurant. */
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
    originalInterview: { conductedOn: "2026-01-01", source: token, quoteVerification: "facts-and-quotes-only" },
    authorship: { reporting: "human", translation: "human" }, published: "2026-01-02",
    image: { src: "/images/og-default.jpg", width: 1200, height: 630, provenance: "dmd-held-photograph" },
    locales: { en: copy(id), "fr-CA": copy(`${id}-fr`) },
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const write = (file, value) => writeFileSync(new URL(`../fixtures/${file}`, import.meta.url), `${JSON.stringify(value, null, 2)}\n`);
  write("date-spots.json", acceptanceCollection());
  write("contributor-recipes.json", [contributorRecipeFixture()]);
  write("extended-profiles.json", [extendedProfileFixture()]);
}
