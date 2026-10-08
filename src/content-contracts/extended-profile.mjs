import { z } from "astro/zod";
import { isoDate as date, metaDescription, metaTitle, slug, text } from "./date-spot.mjs";

/** @template {z.ZodRawShape} T @param {T} shape */
const object = (shape) => z.object(shape).strict();

// Round two asks every chef or bartender from the same eight questions, in
// this order, so answers stay comparable across chef pages. Any of them may
// be left out; the ones asked keep their order. The wording is written per
// locale; these keys pin which question it is.
export const DINNER_AND_DATE_QUESTIONS = /** @type {const} */ ([
  "first-thing-cooked",
  "last-day-off",
  "cook-for-or-together",
  "judging-a-restaurant",
  "overrated-romantic-ingredient",
  "date-dinner-length",
  "morning-after",
  "table-six",
]);

const qa = object({ question: text, answer: text });
// Required: the chef's name, the restaurant they are tied to, at least one
// answer from the Q&A, EN and FR. Everything else is an Optional Section.
const profileCopy = object({
  title: text.optional(),
  slug,
  metaTitle,
  metaDescription,
  // One or two sentences under the name: role, venue, and the hook.
  standfirst: text.optional(),
  shortScene: text.optional(),
  theVenue: z.array(qa).min(1).optional(),
  pullQuote: text.optional(),
  dinnerAndDate: z.array(object({ key: z.enum(DINNER_AND_DATE_QUESTIONS), question: text, answer: text })).min(1).max(DINNER_AND_DATE_QUESTIONS.length).optional(),
  shortVersion: object({
    cuisine: text.optional(),
    from: text.optional(),
    trainedAt: text.optional(),
    inKitchensSince: z.number().int().min(1900).max(2100).optional(),
  }).optional(),
  sourceNotes: text.optional(),
  factNotes: text.optional(),
  imageAlt: text.optional(),
  imageCredit: text.optional(),
  // "What would you make for a date night at home?"
  atHome: text.optional(),
  contributorRecipe: slug.optional(),
});

export const extendedProfileSchema = object({
  id: slug,
  postType: z.literal("extended-profile"),
  // The venue is a published review (companionDateSpot) or just its name.
  subject: object({ name: text, role: z.enum(["chef", "bartender"]).default("chef"), venue: text, neighbourhood: text.optional() }),
  companionDateSpot: slug.optional(),
  interviewer: z.literal("Victor"),
  originalInterview: object({ conductedOn: date.optional(), source: text.optional(), quoteVerification: z.literal("facts-and-quotes-only").optional() }).optional(),
  // No longer required. Still accepted because the pre-rework Notion Story
  // mapper (scripts/notion-story/map.mjs) emits it until #539 replaces it.
  authorship: object({ reporting: z.literal("human"), translation: z.literal("human") }).optional(),
  published: date,
  // The portrait is optional; when present it carries alt text per locale.
  image: object({
    src: z.union([z.string().regex(/^\/images\/profiles\/[a-z0-9-]+\.(jpg|jpeg|webp|avif)$/), z.literal("/images/og-default.jpg")]),
    width: z.number().int().positive(),
    height: z.number().int().positive(),
    provenance: z.literal("dmd-held-photograph"),
  }).optional(),
  locales: object({ en: profileCopy, "fr-CA": profileCopy }),
}).superRefine((profile, ctx) => {
  const issue = (path, message) => ctx.addIssue({ code: "custom", path, message });
  // The generic image is reserved for the non-public acceptance fixtures.
  if (profile.image?.src === "/images/og-default.jpg" && !profile.id.startsWith("test-only-")) {
    issue(["image", "src"], "The generic image is reserved for the non-public acceptance fixture");
  }
  const conductedOn = profile.originalInterview?.conductedOn;
  if (conductedOn && conductedOn > profile.published) {
    issue(["originalInterview", "conductedOn"], "Interview must be conducted before publication");
  }
  for (const locale of ["en", "fr-CA"]) {
    const copy = profile.locales[locale];
    if (!copy.theVenue?.length && !copy.dinnerAndDate?.length && !copy.atHome) {
      issue(["locales", locale], "A chef page needs at least one answer from the Q&A");
    }
    const keys = copy.dinnerAndDate?.map((item) => item.key) ?? [];
    const inOrder = keys.every((key, index) => index === 0 || DINNER_AND_DATE_QUESTIONS.indexOf(key) > DINNER_AND_DATE_QUESTIONS.indexOf(keys[index - 1]));
    if (!inOrder) {
      issue(["locales", locale, "dinnerAndDate"], `Dinner and a date asks the fixed questions once each, in order: ${DINNER_AND_DATE_QUESTIONS.join(", ")}`);
    }
    if (profile.image && !copy.imageAlt) issue(["locales", locale, "imageAlt"], "A portrait needs alt text");
    if (copy.contributorRecipe && !copy.atHome) {
      issue(["locales", locale, "atHome"], "A recipe card link sits under the chef's answer to the closing question");
    }
  }
  const en = profile.locales.en;
  const fr = profile.locales["fr-CA"];
  if ((en.theVenue?.length ?? 0) !== (fr.theVenue?.length ?? 0) || Boolean(en.pullQuote) !== Boolean(fr.pullQuote)) {
    issue(["locales"], "Both locales carry the same round-one questions and pull quote");
  }
  const dinnerKeys = (copy) => copy.dinnerAndDate?.map((item) => item.key).join() ?? "";
  if (dinnerKeys(en) !== dinnerKeys(fr) || Boolean(en.atHome) !== Boolean(fr.atHome) || Boolean(en.standfirst) !== Boolean(fr.standfirst) || Boolean(en.shortScene) !== Boolean(fr.shortScene)) {
    issue(["locales"], "Both locales answer the same questions and carry the same sections");
  }
  const shortVersionKeys = (copy) => Object.keys(copy.shortVersion ?? {}).sort().join();
  if (shortVersionKeys(en) !== shortVersionKeys(fr) || en.shortVersion?.inKitchensSince !== fr.shortVersion?.inKitchensSince) {
    issue(["locales"], "The short version must list the same facts in both locales");
  }
  if (en.contributorRecipe !== fr.contributorRecipe) {
    issue(["locales"], "Contributor-recipe links must agree across the Locale Pair");
  }
});

export const extendedProfilesSchema = z.array(extendedProfileSchema).superRefine((profiles, ctx) => {
  for (const field of ["id", "en", "fr-CA"]) {
    const seen = new Set();
    profiles.forEach((profile, index) => {
      const value = field === "id" ? profile.id : profile.locales[field].slug;
      if (seen.has(value)) ctx.addIssue({ code: "custom", path: [index], message: `Duplicate ${field}: ${value}` });
      seen.add(value);
    });
  }
});
