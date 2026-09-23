import { z } from "astro/zod";

const text = z.string().trim().min(1);
const slug = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const duration = z.string().regex(/^P(?:\d+D)?T?(?:\d+H)?(?:\d+M)?$/, "Expected an ISO 8601 duration");
/** @template {z.ZodRawShape} T @param {T} shape */
const object = (shape) => z.object(shape).strict();

const ingredientGroup = object({ group: text.optional(), items: z.array(text).min(1) });
const methodGroup = object({ group: text.optional(), steps: z.array(text).min(1) });
const recipeCopy = object({
  title: text,
  slug,
  metaTitle: text.max(60),
  metaDescription: text.min(120).max(160),
  originalContext: text,
  sourceNotes: text,
  factNotes: text,
  imageAlt: text,
  imageCredit: text,
  serves: text,
  activeTime: duration,
  totalTime: duration,
  difficulty: z.enum(["easy", "medium", "hard"]),
  equipment: z.array(text).min(1),
  dietaryNotes: z.array(text).min(1),
  ingredientGroups: z.array(ingredientGroup).min(1),
  methodGroups: z.array(methodGroup).min(1),
  contributorNotes: z.array(text).min(1),
  pairItWith: z.array(slug).optional(),
  // This is a DMD observation, never a rewrite or correction to the supplied recipe.
  dmdTestingNote: text.optional(),
});

export const contributorRecipeSchema = object({
  id: slug,
  postType: z.literal("contributor-recipe"),
  recipeOrigin: z.literal("contributor-supplied"),
  contributor: object({ name: text, role: z.enum(["chef", "bartender"]), venueOrContext: text }),
  suppliedSource: object({ description: text, receivedOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }),
  authorship: object({ recipe: z.literal("human-supplied"), translation: z.literal("human") }),
  published: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  image: object({
    src: z.union([z.string().regex(/^\/images\/contributor-recipes\/[a-z0-9-]+\.(jpg|jpeg|webp|avif)$/), z.literal("/images/og-default.jpg")]),
    width: z.number().int().positive(),
    height: z.number().int().positive(),
    provenance: z.literal("dmd-held-photograph"),
  }),
  locales: object({ en: recipeCopy, "fr-CA": recipeCopy }),
}).superRefine((recipe, ctx) => {
  const issue = (path, message) => ctx.addIssue({ code: "custom", path, message });
  // The generic image is reserved for the non-public acceptance fixtures.
  if (recipe.image.src === "/images/og-default.jpg" && !recipe.id.startsWith("test-only-")) {
    issue(["image", "src"], "The generic image is reserved for the non-public acceptance fixture");
  }
  if (recipe.suppliedSource.receivedOn > recipe.published) {
    issue(["suppliedSource", "receivedOn"], "Recipe must be supplied before publication");
  }
  if (recipe.locales.en.pairItWith?.join("\0") !== recipe.locales["fr-CA"].pairItWith?.join("\0")) {
    issue(["locales"], "Pair-it-with links must agree across the Locale Pair");
  }
});

export const contributorRecipesSchema = z.array(contributorRecipeSchema).superRefine((recipes, ctx) => {
  for (const field of ["id", "en", "fr-CA"]) {
    const seen = new Set();
    recipes.forEach((recipe, index) => {
      const value = field === "id" ? recipe.id : recipe.locales[field].slug;
      if (seen.has(value)) ctx.addIssue({ code: "custom", path: [index], message: `Duplicate ${field}: ${value}` });
      seen.add(value);
    });
  }
});
