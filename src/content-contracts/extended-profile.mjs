import { z } from "astro/zod";

const text = z.string().trim().min(1);
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const slug = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const object = (shape) => z.object(shape).strict();
const profileCopy = object({
  title: text,
  slug,
  metaTitle: text.max(60),
  metaDescription: text.max(160),
  shortScene: text,
  venueReporting: text,
  dinnerAndDate: z.array(object({ question: text, answer: text })).min(1),
  shortVersion: text,
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
  originalInterview: object({ conductedOn: date, source: text, quoteVerification: z.literal("facts-and-quotes-only") }),
  authorship: object({ reporting: z.literal("human"), translation: z.literal("human") }),
  published: date,
  image: object({
    src: z.string().regex(/^\/images\/profiles\/[a-z0-9-]+\.(jpg|jpeg|webp|avif)$/),
    width: z.number().int().positive(),
    height: z.number().int().positive(),
    provenance: z.literal("dmd-held-photograph"),
  }),
  locales: object({ en: profileCopy, "fr-CA": profileCopy }),
}).superRefine((profile, ctx) => {
  if (profile.originalInterview.conductedOn > profile.published) {
    ctx.addIssue({ code: "custom", path: ["originalInterview", "conductedOn"], message: "Interview must be conducted before publication" });
  }
  const enRecipe = profile.locales.en.contributorRecipe;
  const frRecipe = profile.locales["fr-CA"].contributorRecipe;
  if (enRecipe !== frRecipe) {
    ctx.addIssue({ code: "custom", path: ["locales"], message: "Contributor-recipe links must agree across the Locale Pair" });
  }
  if (Boolean(enRecipe) !== Boolean(profile.locales.en.atHome)) {
    ctx.addIssue({ code: "custom", path: ["locales", "en"], message: "At-home reporting and a Contributor Recipe link must appear together" });
  }
  if (Boolean(frRecipe) !== Boolean(profile.locales["fr-CA"].atHome)) {
    ctx.addIssue({ code: "custom", path: ["locales", "fr-CA"], message: "At-home reporting and a Contributor Recipe link must appear together" });
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
