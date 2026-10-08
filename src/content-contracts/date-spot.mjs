import { z } from "astro/zod";

export const text = z.string().trim().min(1);
export const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(
  (value) => Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value,
  "Expected a real calendar date",
);
const date = isoDate;
export const slug = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
/** @template {z.ZodRawShape} T @param {T} shape */
const object = (shape) => z.object(shape).strict();

// The five fixed Date Spot categories, in the order "Make a night of it"
// always shows them. Category and neighbourhood listings key off these too.
export const DATE_SPOT_CATEGORIES = /** @type {const} */ (["activities-sports", "arts-culture", "games-entertainment", "nature-scenic", "social-romantic"]);
export const OCCASIONS = /** @type {const} */ (["first-date", "anniversary", "casual-midweek", "impressing-a-cook", "double-date", "solo-at-the-bar"]);
export const VERDICTS = /** @type {const} */ (["favourite", "conditional", "pass"]);
export const SPOT_TYPES = /** @type {const} */ (["restaurant", "bar", "activity", "chef-led-experience"]);
// The build warns below the target and blocks below the minimum, per locale.
// Never pad to reach a number.
export const REVIEW_WORD_TARGET = 1000;
export const REVIEW_WORD_MINIMUM = 300;
export const MAKE_A_NIGHT_MAX = 5;
// Path segments used by listing routes under /date-spots/ and /lieux/.
export const RESERVED_SLUGS = ["category", "categorie", "neighbourhood", "quartier"];

/** Neighbourhood path segment for review URLs, e.g. "Côte-des-Neiges" -> "cote-des-neiges". */
export function neighbourhoodSlug(neighbourhood) {
  return neighbourhood.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

/**
 * An Optional Section is either absent or carries content: an object with
 * every field left out would render a heading over nothing.
 * @template {z.ZodTypeAny} T @param {T} schema @param {string} label @param {string[]} [labels] fields that label rather than fill the section
 */
const section = (schema, label, labels = []) => schema.refine(
  (value) => Object.entries(value).some(([key, item]) => !labels.includes(key) && item !== undefined && (!Array.isArray(item) || item.length > 0)),
  `${label} is optional, but when present it needs content`,
);

const assessment = z.enum(["ideal", "caveat", "not-for"]);
export const signal = object({ occasion: z.enum(OCCASIONS), assessment, reason: text });
export const goodFor = z.array(signal).min(1).max(6).refine(
  (items) => new Set(items.map((item) => item.occasion)).size === items.length,
  "Good-for occasions must be unique",
);
// A Date Spot's "When it works" rows name their own situation ("After
// dinner, summer"), because time of day and season matter more than the
// fixed review occasions.
export const whenItWorks = z.array(object({ situation: text, assessment, reason: text })).min(1);
export const materialUpdates = z.array(object({ date, note: text }));
export const googleReviews = z.array(object({ average: z.number().min(1).max(5), count: z.number().int().nonnegative(), asOf: date })).min(1);
export const metaTitle = text.max(60);
export const metaDescription = text.min(120).max(160);

// Photographs beyond the Editorial Image are declared once, locale-neutral,
// and referenced from the copy by key with per-locale alt text.
const photoRef = object({ photo: slug, alt: text });
const photo = object({
  src: z.union([z.string().regex(/^\/images\/date-spots\/[a-z0-9-]+\.(jpg|jpeg|webp|avif)$/), z.literal("/images/og-default.jpg")]),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  provenance: z.literal("dmd-held-photograph"),
  credit: text.optional(),
});

// The essentials card. A review needs cuisine (on the copy), neighbourhood
// (on the record), address and price per person; a Date Spot needs its
// address and practical info (hours and cost here, season on the copy).
const optionalEssentials = {
  booking: text.optional(),
  access: text.optional(),
  duration: text.optional(),
  canYouTalk: text.optional(),
  transit: text.optional(),
  stepFree: text.optional(),
};
const venueEssentials = object({ address: text, cost: text, timing: text.optional(), ...optionalEssentials });
const planningEssentials = object({ address: text, cost: text, timing: text, ...optionalEssentials });

const commonCopy = {
  // A review's H1 is always "{Name}, {Neighbourhood}" and a Date Spot's
  // falls back to its name, so a separate headline is optional.
  title: text.optional(),
  slug,
  // Usually supplied by the Companion File, merged in before this runs.
  metaTitle,
  metaDescription,
  // The verdict is always paired with a one-line reason.
  verdictReason: text,
  sourceNotes: text.optional(),
  factNotes: text.optional(),
  imageAlt: text,
  imageCredit: text.optional(),
  imageCaption: text.optional(),
  materialUpdates: materialUpdates.optional(),
};

const person = object({
  name: text,
  role: text.optional(),
  background: text.optional(),
  quote: text.optional(),
  approach: text.optional(),
  portrait: photoRef.optional(),
  // Links the section to a standalone Chef page when one exists.
  profileId: slug.optional(),
});
const drinks = section(object({
  intro: text.optional(),
  picks: z.array(object({ moment: z.enum(["to-start", "with-the-meal", "second-round", "not-drinking"]), name: text, note: text.optional() })).min(1).optional(),
  list: text.optional(),
}), "The drinks");
const dish = object({ name: text, tag: z.enum(["order-this", "worth-it", "skip"]), note: text.optional(), photo: photoRef.optional() });
const realCost = section(object({
  intro: text.optional(),
  lines: z.array(object({ item: text, amount: text })).min(1).optional(),
  total: object({ label: text, amount: text }).optional(),
  howToSpendLess: text.optional(),
}), "The real cost");
export const nightPick = object({
  spotId: slug,
  timing: z.enum(["before", "after"]).optional(),
  walkMinutes: z.number().int().positive().max(15).optional(),
  blurb: text.optional(),
});
export const pairing = object({ spotId: slug, walkMinutes: z.number().int().positive().optional() });

const venueCopy = {
  ...commonCopy,
  // Ideally one sentence naming the chef (when known), the venue, the
  // neighbourhood and the cuisine.
  opening: text,
  cuisine: text,
  paymentDisclosure: text,
  essentials: venueEssentials,
  verdictHeadline: text.optional(),
  // Everything below is an Optional Section: it renders only when present
  // and is never filled with invented material.
  goodFor: goodFor.optional(),
  room: text.optional(),
  roomPhoto: photoRef.optional(),
  drinks: drinks.optional(),
  realCost: realCost.optional(),
  reportersNote: section(object({
    byline: z.literal("Victor"),
    visits: z.number().int().positive().optional(),
    detail: text.optional(),
    caveat: text.optional(),
  }), "My note", ["byline"]).optional(),
  beforeYouBook: z.array(object({ question: text, answer: text })).min(1).optional(),
  // Cards render only for published Date Spots, in category order.
  makeANight: z.array(nightPick).min(1).max(MAKE_A_NIGHT_MAX).optional(),
  atHome: object({ recipeId: slug, intro: text.optional() }).optional(),
};
const restaurantCopy = object({
  ...venueCopy,
  meetChef: person.optional(),
  whatToOrder: section(object({
    waitersChoice: object({ recommendation: text, outcome: text.optional() }).optional(),
    setMenu: object({
      name: text,
      courses: z.number().int().positive().optional(),
      pricePerPerson: text.optional(),
      note: text.optional(),
      advice: z.enum(["take-it", "go-a-la-carte"]).optional(),
    }).optional(),
    strategy: text.optional(),
    dishes: z.array(dish).min(1).max(7).optional(),
  }), "What to order").optional(),
});
const barCopy = object({
  ...venueCopy,
  meetTheBartender: person.optional(),
  whatToEat: section(object({ intro: text.optional(), dishes: z.array(dish).min(1).max(7).optional() }), "What to eat").optional(),
});
const planningCopy = object({
  ...commonCopy,
  opening: text.optional(),
  paymentDisclosure: text.optional(),
  essentials: planningEssentials,
  season: text,
  verdictQualifier: text.optional(),
  whenItWorks: whenItWorks.optional(),
  whatItIs: text.optional(),
  howToDoItWell: z.array(object({ label: text, text })).min(1).optional(),
  // Rendered only for published Restaurant or Bar reviews.
  pairItWith: z.array(pairing).min(1).optional(),
});
/** @template {z.ZodTypeAny} T @param {T} copy */
const pair = (copy) => object({ en: copy, "fr-CA": copy });
// "Checked {month}" defaults to the publish date, changes only when the
// venue is actually rechecked, and feeds dateModified.
const freshness = object({ published: date, visited: date.optional(), lastChecked: date.optional() })
  .transform((value) => ({ ...value, lastChecked: value.lastChecked ?? value.published }));
const common = {
  id: slug,
  postType: z.literal("date-spot"),
  name: text,
  // Montréal is the Home Market; a Travel Review names its actual city.
  city: text.default("Montréal"),
  neighbourhood: text,
  reporterByline: z.literal("Victor"),
  freshness,
  image: object({
    src: z.union([
      z.string().regex(/^\/images\/date-spots\/[a-z0-9-]+\.(jpg|jpeg|webp|avif)$/),
      z.literal("/images/og-default.jpg"),
    ]),
    width: z.number().int().positive(),
    height: z.number().int().positive(),
    provenance: z.literal("dmd-held-photograph"),
  }),
  photos: z.record(slug, photo).optional(),
  mapUrl: z.string().url().optional(),
  payment: z.enum(["paid", "hosted", "other"]).optional(),
  priceRange: z.enum(["free", "$", "$$", "$$$", "$$$$"]).optional(),
  // Every Date Spot uses the same three-state signal; it is also the listing filter.
  reviewVerdict: z.enum(VERDICTS),
  instagram: z.string().regex(/^[A-Za-z0-9._]{1,30}$/, "Instagram handle without the @").optional(),
  bookingUrl: z.string().url().optional(),
  // The venue's own Google rating, frozen on the day it was recorded. It is
  // their number, printed with its date, never refreshed silently and never
  // emitted as DMD structured data. New snapshots are appended.
  googleReviews: googleReviews.optional(),
};
const category = z.enum(DATE_SPOT_CATEGORIES);

const collect = (value, key, found = []) => {
  if (Array.isArray(value)) value.forEach((item) => collect(item, key, found));
  else if (value && typeof value === "object") {
    for (const [k, v] of Object.entries(value)) {
      if (k === key && typeof v === "string") found.push(v);
      else collect(v, key, found);
    }
  }
  return found;
};

// Words a reader actually sees; identifiers, notes for editors and SEO
// metadata don't count toward the word count.
const UNCOUNTED_KEYS = new Set(["slug", "metaTitle", "metaDescription", "sourceNotes", "factNotes", "imageAlt", "imageCredit", "alt", "photo", "spotId", "recipeId", "profileId", "moment", "tag", "occasion", "assessment", "timing", "advice", "byline", "date"]);
export function countReaderWords(value) {
  if (typeof value === "string") return value.split(/\s+/).filter((word) => /[\p{L}\p{N}]/u.test(word)).length;
  if (Array.isArray(value)) return value.reduce((sum, item) => sum + countReaderWords(item), 0);
  if (value && typeof value === "object") {
    return Object.entries(value).reduce((sum, [key, item]) => sum + (UNCOUNTED_KEYS.has(key) ? 0 : countReaderWords(item)), 0);
  }
  return 0;
}

// Values that must agree across the Locale Pair; any other string is just
// words and only its presence must match.
const STRUCTURAL_KEYS = new Set(["occasion", "assessment", "moment", "tag", "advice", "spotId", "timing", "recipeId", "profileId", "photo", "date", "byline"]);
// Per-locale fields whose presence may differ between languages.
const LOCALE_ONLY_KEYS = new Set(["slug", "title", "metaTitle", "metaDescription", "sourceNotes", "factNotes", "imageCredit"]);
function shape(value, key) {
  if (Array.isArray(value)) {
    const items = value.map((item) => shape(item));
    return key === "goodFor" ? items.sort((a, b) => String(a.occasion).localeCompare(String(b.occasion))) : items;
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).filter((k) => !LOCALE_ONLY_KEYS.has(k) && value[k] !== undefined).sort().map((k) => [k, shape(value[k], k)]));
  }
  if (typeof value === "string") return STRUCTURAL_KEYS.has(key) ? value : "text";
  return value;
}
// Everything in a Locale Pair must agree but the words: which Optional
// Sections are present, signal states, dish tags, links, and dates.
const structure = (copy) => JSON.stringify(shape(copy));

// Strict objects at every level reject old scores as well as undeclared fields.
export const dateSpotSchema = z.discriminatedUnion("spotType", [
  object({ ...common, spotType: z.literal("restaurant"), locales: pair(restaurantCopy) }),
  object({ ...common, spotType: z.literal("bar"), category: category.optional(), locales: pair(barCopy) }),
  object({ ...common, spotType: z.literal("activity"), category, locales: pair(planningCopy) }),
  object({ ...common, spotType: z.literal("chef-led-experience"), category, host: object({ name: text, role: z.enum(["chef", "bartender"]) }).optional(), locales: pair(planningCopy) }),
]).superRefine((spot, ctx) => {
  const issue = (path, message) => ctx.addIssue({ code: "custom", path, message });
  const { visited, published, lastChecked } = spot.freshness;
  // Reuse a real static image in browser tests without weakening the
  // documentary-image rule for publishable records.
  const testOnly = spot.id.startsWith("test-only-");
  if (spot.image.src === "/images/og-default.jpg" && !testOnly) {
    issue(["image", "src"], "The generic image is reserved for the non-public acceptance fixture");
  }
  for (const [key, entry] of Object.entries(spot.photos ?? {})) {
    if (entry.src === "/images/og-default.jpg" && !testOnly) issue(["photos", key, "src"], "The generic image is reserved for the non-public acceptance fixture");
  }
  if (visited && visited > published) issue(["freshness", "visited"], "Visit must precede publication");
  if (lastChecked < published) issue(["freshness", "lastChecked"], "Checked cannot precede publication");
  let previousSnapshot = "";
  for (const [index, snapshot] of (spot.googleReviews ?? []).entries()) {
    if (snapshot.asOf <= previousSnapshot) issue(["googleReviews", index, "asOf"], "Google review snapshots must be appended in date order");
    if (snapshot.asOf > lastChecked) issue(["googleReviews", index, "asOf"], "A Google review snapshot cannot postdate the Checked date");
    previousSnapshot = snapshot.asOf;
  }
  const venue = spot.spotType === "restaurant" || spot.spotType === "bar";
  for (const locale of ["en", "fr-CA"]) {
    const copy = spot.locales[locale];
    let previousUpdate = "";
    for (const [index, update] of (copy.materialUpdates ?? []).entries()) {
      if (update.date < published || update.date > lastChecked) {
        issue(["locales", locale, "materialUpdates", index, "date"], "Update must fall between publication and the Checked date");
      }
      if (update.date < previousUpdate) issue(["locales", locale, "materialUpdates", index, "date"], "Update lines are appended in date order");
      previousUpdate = update.date;
    }
    for (const key of collect(copy, "photo")) {
      if (!spot.photos?.[key]) issue(["locales", locale], `Photo "${key}" is referenced but not declared in photos`);
    }
    if (RESERVED_SLUGS.includes(copy.slug)) issue(["locales", locale, "slug"], `"${copy.slug}" is a reserved listing path`);
    if (!venue) continue;
    // The H1 and the SEO title both lead with name and neighbourhood.
    if (!copy.metaTitle.startsWith(`${spot.name}, ${spot.neighbourhood}`)) {
      issue(["locales", locale, "metaTitle"], `Review meta titles lead with "${spot.name}, ${spot.neighbourhood}"`);
    }
    const lead = "meetChef" in copy ? copy.meetChef : "meetTheBartender" in copy ? copy.meetTheBartender : undefined;
    if (lead && !copy.opening.includes(lead.name)) {
      issue(["locales", locale, "opening"], `The opening must name ${lead.name}, who is reported in the Meet section`);
    }
    const moments = copy.drinks?.picks?.map((pick) => pick.moment) ?? [];
    if (new Set(moments).size !== moments.length) issue(["locales", locale, "drinks", "picks"], "Each drink moment appears once");
    const words = countReaderWords(copy);
    if (words < REVIEW_WORD_MINIMUM) {
      issue(["locales", locale], `Reviews need at least ${REVIEW_WORD_MINIMUM} reader-facing words to publish; this one has ${words}. Never pad: publish when the reporting is there.`);
    }
    const picks = copy.makeANight?.map((pick) => pick.spotId) ?? [];
    if (new Set(picks).size !== picks.length) issue(["locales", locale, "makeANight"], "Each Make a night of it pick is a different Date Spot");
  }
  if (structure(spot.locales.en) !== structure(spot.locales["fr-CA"])) {
    issue(["locales"], "The Locale Pair must agree on everything but the words: sections, signals, dish tags, links, and update dates");
  }
});

/**
 * "Make a night of it": one card per published Date Spot pick, in the fixed
 * category order, at most five. Picks whose Date Spot is not published (not
 * in `spots`) are left out; with none left, the section is hidden.
 * @template {{ id: string, category?: (typeof DATE_SPOT_CATEGORIES)[number] }} S
 * @template {{ spotId: string }} P
 * @param {P[] | undefined} picks
 * @param {S[]} spots the published Date Spots
 * @returns {{ pick: P, target: S, category: (typeof DATE_SPOT_CATEGORIES)[number] }[]}
 */
export function makeANightCards(picks, spots) {
  const byId = new Map(spots.map((spot) => [spot.id, spot]));
  /** @type {{ pick: P, target: S, category: (typeof DATE_SPOT_CATEGORIES)[number] }[]} */
  const cards = [];
  for (const pick of picks ?? []) {
    const target = byId.get(pick.spotId);
    if (target?.category) cards.push({ pick, target, category: target.category });
  }
  return cards.sort((a, b) => DATE_SPOT_CATEGORIES.indexOf(a.category) - DATE_SPOT_CATEGORIES.indexOf(b.category)).slice(0, MAKE_A_NIGHT_MAX);
}

export const dateSpotsSchema = z.array(dateSpotSchema).superRefine((spots, ctx) => {
  for (const field of ["id", "en", "fr-CA"]) {
    const seen = new Set();
    spots.forEach((spot, index) => {
      const value = field === "id" ? spot.id : spot.locales[field].slug;
      if (seen.has(value)) ctx.addIssue({ code: "custom", path: [index], message: `Duplicate ${field}: ${value}` });
      seen.add(value);
    });
  }

  // A link to a Date Spot that is not published yet is allowed (the
  // Companion File may name it ahead of time); it simply doesn't render.
  // A link to a published one must make sense.
  const byId = new Map(spots.map((spot) => [spot.id, spot]));
  for (const [spotIndex, spot] of spots.entries()) {
    const copy = spot.locales.en;
    const at = (...path) => [spotIndex, "locales", "en", ...path];
    if ("pairItWith" in copy) {
      for (const [index, pairing] of (copy.pairItWith ?? []).entries()) {
        const target = byId.get(pairing.spotId);
        if (!target) continue;
        if (target.spotType !== "restaurant" && target.spotType !== "bar") {
          ctx.addIssue({ code: "custom", path: at("pairItWith", index), message: "Pairings must target a Restaurant or Bar review" });
        } else if (target.city !== spot.city) {
          ctx.addIssue({ code: "custom", path: at("pairItWith", index), message: "Pairings stay in the same city" });
        }
      }
    }
    if ("makeANight" in copy) {
      const categories = [];
      for (const [index, pick] of (copy.makeANight ?? []).entries()) {
        const target = byId.get(pick.spotId);
        if (!target) continue;
        if (!("category" in target) || !target.category) {
          ctx.addIssue({ code: "custom", path: at("makeANight", index), message: "Make a night of it picks must be categorised Date Spots (Activity, Chef-led Experience, or a categorised Bar)" });
        } else if (target.city !== spot.city) {
          ctx.addIssue({ code: "custom", path: at("makeANight", index), message: "Make a night of it picks stay in the same city" });
        } else {
          if (categories.includes(target.category)) {
            ctx.addIssue({ code: "custom", path: at("makeANight", index), message: `One pick per category: ${target.category} is already used` });
          }
          categories.push(target.category);
        }
      }
    }
  }
});
