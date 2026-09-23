import { z } from "astro/zod";

const text = z.string().trim().min(1);
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(
  (value) => Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value,
  "Expected a real calendar date",
);
const slug = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
/** @template {z.ZodRawShape} T @param {T} shape */
const object = (shape) => z.object(shape).strict();
const signal = object({
  occasion: z.enum(["first-date", "anniversary", "casual-midweek", "impressing-a-cook", "double-date", "solo-at-the-bar"]),
  assessment: z.enum(["ideal", "caveat", "not-for"]),
  reason: text,
});
const signals = z.array(signal).min(1).refine(
  (items) => new Set(items.map((item) => item.occasion)).size === items.length,
  "Good-for occasions must be unique",
);
const commonCopy = {
  title: text,
  slug,
  metaTitle: text.max(60),
  metaDescription: text.max(160),
  opening: text,
  sourceNotes: text,
  factNotes: text,
  imageAlt: text,
  imageCredit: text,
  imageCaption: text.optional(),
  essentials: object({ address: text, booking: text, access: text, duration: text, cost: text, timing: text }),
  paymentDisclosure: text,
  materialUpdates: z.array(object({ date, note: text })),
};
const venueCopy = {
  ...commonCopy,
  verdictReason: text,
  goodFor: signals,
  room: text,
  whatToDrink: text,
  realCost: text,
  reportersNote: object({ byline: z.literal("Victor Vu"), text }),
  beforeYouGo: text,
  meetTheChef: object({ name: text, role: text, text }).optional(),
  nearbyPlans: object({ title: text, text }).optional(),
  contributorRecipe: object({ title: text, contributorName: text, source: text, text }).optional(),
};
const restaurantCopy = object({ ...venueCopy, cuisine: text, whatToOrder: text });
const reportedPerson = object({ name: text, role: z.literal("bartender"), note: text });
const linkedSpot = object({ id: slug, label: text, note: text });
const contributorRecipe = object({ title: text, slug, contributor: text, source: text, testingNotes: text.optional() });
const barCopy = object({
  ...venueCopy,
  // Food, bartender reporting, and companions are intentionally absent unless
  // the reporting earns them. These fields are editorial modules, not defaults.
  whatToEat: text.optional(),
  meetTheBartender: reportedPerson.optional(),
  nearbyDateSpots: z.array(linkedSpot).min(1).optional(),
  contributorRecipe: contributorRecipe.optional(),
});
const planningCopy = object({
  ...commonCopy,
  goodFor: signals,
  whatItIs: text,
  howToDoItWell: text,
  // Only include companions when earned by reporting.
  pairItWith: z.array(slug).optional(),
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
  reporterByline: z.literal("Victor Vu"),
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
  mapUrl: z.string().url(),
  payment: z.enum(["paid", "hosted", "other"]),
};
const verdict = z.enum(["favourite", "conditional", "pass"]);
const optionalRestaurantModules = {
  // These are deliberately optional: reporting, rather than a template quota,
  // determines whether they appear on a public page.
  meetChef: object({ name: text, role: text, reporting: text }).optional(),
  nearbyPlans: z.array(object({ name: text, detail: text, mapUrl: z.string().url().optional() })).optional(),
  contributorRecipe: contributorRecipe.optional(),
};

// Strict objects at every level reject old scores as well as undeclared fields.
export const dateSpotSchema = z.discriminatedUnion("spotType", [
  object({ ...common, spotType: z.literal("restaurant"), reviewVerdict: verdict, locales: pair(restaurantCopy.extend(optionalRestaurantModules)) }),
  object({ ...common, spotType: z.literal("bar"), reviewVerdict: verdict, locales: pair(barCopy) }),
  object({ ...common, spotType: z.literal("activity"), locales: pair(planningCopy) }),
  object({ ...common, spotType: z.literal("chef-led-experience"), host: object({ name: text, role: z.enum(["chef", "bartender"]) }), locales: pair(planningCopy) }),
]).superRefine((spot, ctx) => {
  const issue = (path, message) => ctx.addIssue({ code: "custom", path, message });
  const { visited, published, lastChecked } = spot.freshness;
  // Reuse a real static image in browser tests without weakening the
  // documentary-image rule for publishable records.
  if (spot.image.src === "/images/og-default.jpg" && spot.id !== "test-only-restaurant") {
    issue(["image", "src"], "The generic image is reserved for the non-public acceptance fixture");
  }
  if (visited > published) issue(["freshness", "visited"], "Visit must precede publication");
  if (lastChecked < visited) issue(["freshness", "lastChecked"], "Last check must follow the visit");
  const en = spot.locales.en;
  const fr = spot.locales["fr-CA"];
  for (const locale of ["en", "fr-CA"]) {
    for (const [index, update] of spot.locales[locale].materialUpdates.entries()) {
      if (update.date < published || update.date > lastChecked) {
        issue(["locales", locale, "materialUpdates", index, "date"], "Update must fall between publication and last check");
      }
    }
  }
  if (JSON.stringify(en.materialUpdates.map((u) => u.date)) !== JSON.stringify(fr.materialUpdates.map((u) => u.date))) {
    issue(["locales"], "Material updates must have matching dates across the Locale Pair");
  }
  const assessments = (copy) => copy.goodFor.map((s) => `${s.occasion}:${s.assessment}`).sort();
  if (JSON.stringify(assessments(en)) !== JSON.stringify(assessments(fr))) {
    issue(["locales"], "Good-for assessments must agree across the Locale Pair");
  }
  if (spot.spotType === "bar") {
    for (const module of ["whatToEat", "meetTheBartender", "nearbyDateSpots", "contributorRecipe"]) {
      if ((en[module] === undefined) !== (fr[module] === undefined)) {
        issue(["locales"], `${module} must be present in both halves of a Bar Date Spot Locale Pair`);
      }
    }
  }
  if (spot.spotType === "restaurant") {
    for (const module of ["meetChef", "nearbyPlans", "contributorRecipe"]) {
      if ((en[module] === undefined) !== (fr[module] === undefined)) {
        issue(["locales"], `${module} must be present in both halves of a Restaurant Date Spot Locale Pair`);
      }
    }
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

  for (const [spotIndex, spot] of spots.entries()) {
    if (spot.spotType !== "activity" && spot.spotType !== "chef-led-experience") continue;
    for (const locale of ["en", "fr-CA"]) {
      const pairings = spot.locales[locale].pairItWith ?? [];
      for (const [pairingIndex, pairingSlug] of pairings.entries()) {
        const target = spots.find((candidate) => candidate.locales[locale].slug === pairingSlug);
        if (!target) {
          ctx.addIssue({ code: "custom", path: [spotIndex, "locales", locale, "pairItWith", pairingIndex], message: `Pairing target not found: ${pairingSlug}` });
        } else if (target.spotType !== "restaurant" && target.spotType !== "bar") {
          ctx.addIssue({ code: "custom", path: [spotIndex, "locales", locale, "pairItWith", pairingIndex], message: "Pairings must target a Restaurant or Bar Date Spot" });
        }
      }
    }
  }
});
