import { z } from "astro/zod";

const text = z.string().trim().min(1);
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const slug = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
/** @template {z.ZodRawShape} T @param {T} shape */
const object = (shape) => z.object(shape).strict();

// Round two asks every chef or bartender the same eight questions, in this
// order, so answers stay comparable across profiles. The question wording
// is written per locale in the Story; these keys pin which question it is.
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
const profileCopy = object({
  title: text,
  slug,
  metaTitle: text.max(60),
  metaDescription: text.min(120).max(160),
  // One or two sentences under the name: role, venue, and the hook.
  standfirst: text,
  shortScene: text,
  theVenue: z.array(qa).min(1),
  pullQuote: text.optional(),
  dinnerAndDate: z.array(object({ key: z.enum(DINNER_AND_DATE_QUESTIONS), question: text, answer: text })).length(DINNER_AND_DATE_QUESTIONS.length),
  shortVersion: object({
    cuisine: text,
    from: text.optional(),
    trainedAt: text.optional(),
    inKitchensSince: z.number().int().min(1900).max(2100).optional(),
  }),
  sourceNotes: text,
  factNotes: text,
  imageAlt: text,
  imageCredit: text,
  atHome: text.optional(),
  contributorRecipe: slug.optional(),
});

export const extendedProfileSchema = object({
  id: slug,
  postType: z.literal("extended-profile"),
  subject: object({ name: text, role: z.enum(["chef", "bartender"]), venue: text, neighbourhood: text }),
  companionDateSpot: slug,
  interviewer: z.literal("Victor"),
  originalInterview: object({ conductedOn: date, source: text, quoteVerification: z.literal("facts-and-quotes-only") }),
  authorship: object({ reporting: z.literal("human"), translation: z.literal("human") }),
  published: date,
  image: object({
    src: z.union([z.string().regex(/^\/images\/profiles\/[a-z0-9-]+\.(jpg|jpeg|webp|avif)$/), z.literal("/images/og-default.jpg")]),
    width: z.number().int().positive(),
    height: z.number().int().positive(),
    provenance: z.literal("dmd-held-photograph"),
  }),
  locales: object({ en: profileCopy, "fr-CA": profileCopy }),
}).superRefine((profile, ctx) => {
  // The generic image is reserved for the non-public acceptance fixtures.
  if (profile.image.src === "/images/og-default.jpg" && !profile.id.startsWith("test-only-")) {
    ctx.addIssue({ code: "custom", path: ["image", "src"], message: "The generic image is reserved for the non-public acceptance fixture" });
  }
  if (profile.originalInterview.conductedOn > profile.published) {
    ctx.addIssue({ code: "custom", path: ["originalInterview", "conductedOn"], message: "Interview must be conducted before publication" });
  }
  for (const locale of ["en", "fr-CA"]) {
    const keys = profile.locales[locale].dinnerAndDate.map((item) => item.key);
    if (keys.join() !== DINNER_AND_DATE_QUESTIONS.join()) {
      ctx.addIssue({ code: "custom", path: ["locales", locale, "dinnerAndDate"], message: `Dinner and a date asks the same eight questions in order: ${DINNER_AND_DATE_QUESTIONS.join(", ")}` });
    }
  }
  const en = profile.locales.en;
  const fr = profile.locales["fr-CA"];
  if (en.theVenue.length !== fr.theVenue.length || Boolean(en.pullQuote) !== Boolean(fr.pullQuote)) {
    ctx.addIssue({ code: "custom", path: ["locales"], message: "Both locales carry the same round-one questions and pull quote" });
  }
  const shortVersionKeys = (copy) => Object.keys(copy.shortVersion).sort().join();
  if (shortVersionKeys(en) !== shortVersionKeys(fr) || en.shortVersion.inKitchensSince !== fr.shortVersion.inKitchensSince) {
    ctx.addIssue({ code: "custom", path: ["locales"], message: "The short version must list the same facts in both locales" });
  }
  if (en.contributorRecipe !== fr.contributorRecipe) {
    ctx.addIssue({ code: "custom", path: ["locales"], message: "Contributor-recipe links must agree across the Locale Pair" });
  }
  for (const locale of ["en", "fr-CA"]) {
    const copy = profile.locales[locale];
    if (Boolean(copy.contributorRecipe) !== Boolean(copy.atHome)) {
      ctx.addIssue({ code: "custom", path: ["locales", locale], message: "At-home reporting and a Contributor Recipe link must appear together" });
    }
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
