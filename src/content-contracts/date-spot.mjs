import { z } from "astro/zod";

const text = z.string().trim().min(1);
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(
  (value) => Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value,
  "Expected a real calendar date",
);
const slug = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
/** @template {z.ZodRawShape} T @param {T} shape */
const object = (shape) => z.object(shape).strict();

// The five fixed Date Spot categories. "Make a night of it" carries at most
// one pick per category, and category/neighbourhood listings key off these.
export const DATE_SPOT_CATEGORIES = /** @type {const} */ (["activities-sports", "arts-culture", "games-entertainment", "nature-scenic", "social-romantic"]);
export const OCCASIONS = /** @type {const} */ (["first-date", "anniversary", "casual-midweek", "impressing-a-cook", "double-date", "solo-at-the-bar"]);
export const VERDICTS = /** @type {const} */ (["favourite", "conditional", "pass"]);
export const REVIEW_WORD_FLOOR = 1000;
// Path segments used by listing routes under /date-spots/ and /lieux/.
export const RESERVED_SLUGS = ["category", "categorie", "neighbourhood", "quartier"];

/** Neighbourhood path segment for review URLs, e.g. "Côte-des-Neiges" -> "cote-des-neiges". */
export function neighbourhoodSlug(neighbourhood) {
  return neighbourhood.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

const assessment = z.enum(["ideal", "caveat", "not-for"]);
const signal = object({ occasion: z.enum(OCCASIONS), assessment, reason: text });
const goodFor = z.array(signal).min(4).max(6).refine(
  (items) => new Set(items.map((item) => item.occasion)).size === items.length,
  "Good-for occasions must be unique",
);
// A planning Date Spot's "When it works" rows name their own situation
// ("After dinner, summer"), because time of day and season matter more
// than the fixed review occasions.
const whenItWorks = z.array(object({ situation: text, assessment, reason: text })).min(1);

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

const essentials = object({
  address: text,
  booking: text,
  access: text,
  duration: text,
  cost: text,
  timing: text,
  canYouTalk: text.optional(),
  transit: text.optional(),
  stepFree: text.optional(),
});
const commonCopy = {
  title: text,
  slug,
  metaTitle: text.max(60),
  metaDescription: text.min(120).max(160),
  opening: text,
  sourceNotes: text,
  factNotes: text,
  imageAlt: text,
  imageCredit: text,
  imageCaption: text.optional(),
  essentials,
  paymentDisclosure: text,
  materialUpdates: z.array(object({ date, note: text })),
};

const person = object({
  name: text,
  role: text,
  background: text,
  quote: text.optional(),
  approach: text,
  portrait: photoRef.optional(),
  // Links the section to a standalone Extended Profile when one exists.
  profileId: slug.optional(),
});
const drinks = object({
  intro: text,
  picks: z.array(object({ moment: z.enum(["to-start", "with-the-meal", "second-round", "not-drinking"]), name: text, note: text })).min(2),
  list: text,
});
const dish = object({ name: text, tag: z.enum(["order-this", "worth-it", "skip"]), note: text, photo: photoRef.optional() });
const realCost = object({
  intro: text,
  lines: z.array(object({ item: text, amount: text })).min(1),
  total: object({ label: text, amount: text }),
  howToSpendLess: text.optional(),
});
const nightPick = object({ spotId: slug, timing: z.enum(["before", "after"]), walkMinutes: z.number().int().positive().max(15), blurb: text });
const venueCopy = {
  ...commonCopy,
  metaDescription: text.min(150).max(160),
  verdictHeadline: text,
  verdictReason: text,
  goodFor,
  room: text,
  roomPhoto: photoRef.optional(),
  drinks,
  realCost,
  reportersNote: object({ byline: z.literal("Victor"), visits: z.number().int().positive(), detail: text, caveat: text }),
  beforeYouBook: z.array(object({ question: text, answer: text })).min(1),
  // Recommended modules: reporting, not a template quota, decides whether
  // they appear. Omit them rather than filling them.
  makeANight: z.array(nightPick).min(1).max(5).optional(),
  atHome: object({ recipeId: slug, intro: text }).optional(),
};
const restaurantCopy = object({
  ...venueCopy,
  cuisine: text,
  meetChef: person.optional(),
  whatToOrder: object({
    waitersChoice: object({ recommendation: text, outcome: text }).optional(),
    setMenu: object({ name: text, courses: z.number().int().positive(), pricePerPerson: text, note: text, advice: z.enum(["take-it", "go-a-la-carte"]) }).optional(),
    strategy: text.optional(),
    dishes: z.array(dish).min(4).max(7),
  }),
});
const barCopy = object({
  ...venueCopy,
  meetTheBartender: person.optional(),
  whatToEat: object({ intro: text.optional(), dishes: z.array(dish).min(1).max(7) }).optional(),
});
const planningCopy = object({
  ...commonCopy,
  verdictQualifier: text.optional(),
  whenItWorks,
  whatItIs: text,
  howToDoItWell: z.array(object({ label: text, text })).min(1),
  // Only include companions when earned by reporting.
  pairItWith: z.array(object({ spotId: slug, walkMinutes: z.number().int().positive() })).min(1).optional(),
  season: text.optional(),
});
/** @template {z.ZodTypeAny} T @param {T} copy */
const pair = (copy) => object({ en: copy, "fr-CA": copy });
const common = {
  id: slug,
  postType: z.literal("date-spot"),
  name: text,
  city: text,
  neighbourhood: text,
  reporterByline: z.literal("Victor"),
  authorship: object({ reporting: z.literal("human"), translation: z.literal("human") }),
  freshness: object({ visited: date, published: date, lastChecked: date }),
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
  mapUrl: z.string().url(),
  payment: z.enum(["paid", "hosted", "other"]),
  priceRange: z.enum(["free", "$", "$$", "$$$", "$$$$"]),
  // Every Date Spot uses the same three-state signal; it is also the listing filter.
  reviewVerdict: z.enum(VERDICTS),
  instagram: z.string().regex(/^[A-Za-z0-9._]{1,30}$/, "Instagram handle without the @").optional(),
  bookingUrl: z.string().url().optional(),
  // The venue's own Google rating, frozen on the day it was recorded. It is
  // their number, printed with its date, never refreshed silently and never
  // emitted as DMD structured data. New snapshots are appended.
  googleReviews: z.array(object({ average: z.number().min(1).max(5), count: z.number().int().nonnegative(), asOf: date })).min(1).optional(),
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
// metadata don't count toward the review floor.
const UNCOUNTED_KEYS = new Set(["slug", "metaTitle", "metaDescription", "sourceNotes", "factNotes", "imageAlt", "imageCredit", "alt", "photo", "spotId", "recipeId", "profileId", "moment", "tag", "occasion", "assessment", "timing", "advice", "byline", "date"]);
export function countReaderWords(value) {
  if (typeof value === "string") return value.split(/\s+/).filter((word) => /[\p{L}\p{N}]/u.test(word)).length;
  if (Array.isArray(value)) return value.reduce((sum, item) => sum + countReaderWords(item), 0);
  if (value && typeof value === "object") {
    return Object.entries(value).reduce((sum, [key, item]) => sum + (UNCOUNTED_KEYS.has(key) ? 0 : countReaderWords(item)), 0);
  }
  return 0;
}

// Everything in a Locale Pair that must agree across languages: presence of
// optional modules, signal states, dish tags, links, and dates. Only the
// words may differ.
function structure(copy) {
  const tagged = (items, fields) => items?.map((item) => Object.fromEntries(fields.map((field) => [field, item[field] ?? null]))) ?? null;
  const personShape = (p) => p ? { quote: Boolean(p.quote), portrait: p.portrait?.photo ?? null, profileId: p.profileId ?? null } : null;
  return JSON.stringify({
    goodFor: tagged(copy.goodFor, ["occasion", "assessment"])?.sort((a, b) => a.occasion.localeCompare(b.occasion)),
    whenItWorks: tagged(copy.whenItWorks, ["assessment"]),
    verdictQualifier: Boolean(copy.verdictQualifier),
    roomPhoto: copy.roomPhoto?.photo ?? null,
    drinks: tagged(copy.drinks?.picks, ["moment"]),
    dishes: tagged(copy.whatToOrder?.dishes ?? copy.whatToEat?.dishes, ["tag"])?.map((d, i) => ({ ...d, photo: (copy.whatToOrder?.dishes ?? copy.whatToEat?.dishes)[i].photo?.photo ?? null })),
    waitersChoice: Boolean(copy.whatToOrder?.waitersChoice),
    setMenu: copy.whatToOrder?.setMenu ? { courses: copy.whatToOrder.setMenu.courses, advice: copy.whatToOrder.setMenu.advice } : null,
    strategy: Boolean(copy.whatToOrder?.strategy),
    whatToEat: Boolean(copy.whatToEat),
    realCost: copy.realCost ? { lines: copy.realCost.lines.length, spendLess: Boolean(copy.realCost.howToSpendLess) } : null,
    visits: copy.reportersNote?.visits ?? null,
    beforeYouBook: copy.beforeYouBook?.length ?? null,
    howToDoItWell: copy.howToDoItWell?.length ?? null,
    person: personShape(copy.meetChef ?? copy.meetTheBartender),
    makeANight: tagged(copy.makeANight, ["spotId", "timing", "walkMinutes"]),
    pairItWith: copy.pairItWith ?? null,
    atHome: copy.atHome?.recipeId ?? null,
    season: Boolean(copy.season),
    imageCaption: Boolean(copy.imageCaption),
    essentials: Object.keys(copy.essentials).sort(),
    materialUpdates: copy.materialUpdates.map((update) => update.date),
  });
}

// Strict objects at every level reject old scores as well as undeclared fields.
export const dateSpotSchema = z.discriminatedUnion("spotType", [
  object({ ...common, spotType: z.literal("restaurant"), locales: pair(restaurantCopy) }),
  object({ ...common, spotType: z.literal("bar"), category: category.optional(), locales: pair(barCopy) }),
  object({ ...common, spotType: z.literal("activity"), category, locales: pair(planningCopy) }),
  object({ ...common, spotType: z.literal("chef-led-experience"), category, host: object({ name: text, role: z.enum(["chef", "bartender"]) }), locales: pair(planningCopy) }),
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
  if (visited > published) issue(["freshness", "visited"], "Visit must precede publication");
  if (lastChecked < visited) issue(["freshness", "lastChecked"], "Last check must follow the visit");
  let previousSnapshot = "";
  for (const [index, snapshot] of (spot.googleReviews ?? []).entries()) {
    if (snapshot.asOf <= previousSnapshot) issue(["googleReviews", index, "asOf"], "Google review snapshots must be appended in date order");
    if (snapshot.asOf > lastChecked) issue(["googleReviews", index, "asOf"], "A Google review snapshot cannot postdate the last check");
    previousSnapshot = snapshot.asOf;
  }
  const en = spot.locales.en;
  const fr = spot.locales["fr-CA"];
  const venue = spot.spotType === "restaurant" || spot.spotType === "bar";
  for (const locale of ["en", "fr-CA"]) {
    const copy = spot.locales[locale];
    for (const [index, update] of copy.materialUpdates.entries()) {
      if (update.date < published || update.date > lastChecked) {
        issue(["locales", locale, "materialUpdates", index, "date"], "Update must fall between publication and last check");
      }
    }
    for (const key of collect(copy, "photo")) {
      if (!spot.photos?.[key]) issue(["locales", locale], `Photo "${key}" is referenced but not declared in photos`);
    }
    if (RESERVED_SLUGS.includes(copy.slug)) issue(["locales", locale, "slug"], `"${copy.slug}" is a reserved listing path`);
    if (!venue) continue;
    // The opening sentence carries restaurant and neighbourhood (and the
    // chef, when reported), which is also what the SEO title leads with.
    if (!copy.metaTitle.startsWith(`${spot.name}, ${spot.neighbourhood}`)) {
      issue(["locales", locale, "metaTitle"], `Review meta titles lead with "${spot.name}, ${spot.neighbourhood}"`);
    }
    const lead = "meetChef" in copy ? copy.meetChef : "meetTheBartender" in copy ? copy.meetTheBartender : undefined;
    if (lead && !copy.opening.includes(lead.name)) {
      issue(["locales", locale, "opening"], `The opening must name ${lead.name}, who is reported in the Meet section`);
    }
    const moments = copy.drinks.picks.map((pick) => pick.moment);
    if (new Set(moments).size !== moments.length) issue(["locales", locale, "drinks", "picks"], "Each drink moment appears once");
    const requiredMoments = spot.spotType === "restaurant" ? ["to-start", "with-the-meal", "not-drinking"] : ["to-start", "not-drinking"];
    for (const moment of requiredMoments) {
      if (!moments.includes(moment)) issue(["locales", locale, "drinks", "picks"], `The drinks need a "${moment}" pick`);
    }
    const words = countReaderWords(copy);
    if (words < REVIEW_WORD_FLOOR) {
      issue(["locales", locale], `Reviews need at least ${REVIEW_WORD_FLOOR} reader-facing words; this one has ${words}. The gap is usually in The room, Meet the chef, or The drinks, not the dish cards.`);
    }
    const picks = copy.makeANight?.map((pick) => pick.spotId) ?? [];
    if (new Set(picks).size !== picks.length) issue(["locales", locale, "makeANight"], "Each Make a night of it pick is a different Date Spot");
  }
  if (structure(en) !== structure(fr)) {
    issue(["locales"], "The Locale Pair must agree on everything but the words: modules, signals, dish tags, links, and update dates");
  }
});

export const dateSpotsSchema = z.array(dateSpotSchema).superRefine((spots, ctx) => {
  for (const field of ["id", "en", "fr-CA"]) {
    const seen = new Set();
    spots.forEach((spot, index) => {
      const value = field === "id" ? spot.id : spot.locales[field].slug;
      if (seen.has(value)) ctx.addIssue({ code: "custom", path: [index], message: `Duplicate ${field}: ${value}` });
      seen.add(value);
    });
  }

  const byId = new Map(spots.map((spot) => [spot.id, spot]));
  for (const [spotIndex, spot] of spots.entries()) {
    const copy = spot.locales.en;
    const at = (...path) => [spotIndex, "locales", "en", ...path];
    if ("pairItWith" in copy) {
      for (const [index, pairing] of (copy.pairItWith ?? []).entries()) {
        const target = byId.get(pairing.spotId);
        if (!target) ctx.addIssue({ code: "custom", path: at("pairItWith", index), message: `Pairing target not found: ${pairing.spotId}` });
        else if (target.spotType !== "restaurant" && target.spotType !== "bar") {
          ctx.addIssue({ code: "custom", path: at("pairItWith", index), message: "Pairings must target a Restaurant or Bar Date Spot" });
        } else if (target.city !== spot.city) {
          ctx.addIssue({ code: "custom", path: at("pairItWith", index), message: "Pairings stay in the same city" });
        }
      }
    }
    if ("makeANight" in copy) {
      const categories = [];
      for (const [index, pick] of (copy.makeANight ?? []).entries()) {
        const target = byId.get(pick.spotId);
        if (!target) {
          ctx.addIssue({ code: "custom", path: at("makeANight", index), message: `Make a night of it target not found: ${pick.spotId}` });
        } else if (!("category" in target) || !target.category) {
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
