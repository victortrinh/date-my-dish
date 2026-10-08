import { z } from "astro/zod";
import { isoDate as date, metaDescription, metaTitle, slug, text } from "./date-spot.mjs";

const duration = z.string().regex(/^P(?:\d+D)?T?(?:\d+H)?(?:\d+M)?$/, "Expected an ISO 8601 duration");
/** @template {z.ZodRawShape} T @param {T} shape */
const object = (shape) => z.object(shape).strict();

const ingredientGroup = object({ group: text.optional(), items: z.array(text).min(1) });
const methodGroup = object({ group: text.optional(), steps: z.array(text).min(1) });
// Required: title, the chef's name and the source of the recipe, ingredients,
// steps, servings, EN and FR. Everything else is optional.
const recipeCopy = object({
  title: text,
  slug,
  metaTitle,
  metaDescription,
  originalContext: text.optional(),
  sourceNotes: text.optional(),
  factNotes: text.optional(),
  imageAlt: text.optional(),
  imageCredit: text.optional(),
  serves: text,
  activeTime: duration.optional(),
  totalTime: duration.optional(),
  difficulty: z.enum(["easy", "medium", "hard"]).optional(),
  equipment: z.array(text).min(1).optional(),
  dietaryNotes: z.array(text).min(1).optional(),
  ingredientGroups: z.array(ingredientGroup).min(1),
  methodGroups: z.array(methodGroup).min(1),
  // Notes from the chef.
  contributorNotes: z.array(text).min(1).optional(),
  pairItWith: z.array(slug).optional(),
  // This is a DMD observation, never a rewrite or correction to the supplied recipe.
  dmdTestingNote: text.optional(),
});

export const contributorRecipeSchema = object({
  id: slug,
  postType: z.literal("contributor-recipe"),
  recipeOrigin: z.literal("contributor-supplied"),
  contributor: object({ name: text, role: z.enum(["chef", "bartender"]).default("chef"), venueOrContext: text.optional() }),
  suppliedSource: object({ description: text, receivedOn: date.optional() }),
  published: date,
  image: object({
    src: z.union([z.string().regex(/^\/images\/contributor-recipes\/[a-z0-9-]+\.(jpg|jpeg|webp|avif)$/), z.literal("/images/og-default.jpg")]),
    width: z.number().int().positive(),
    height: z.number().int().positive(),
    provenance: z.literal("dmd-held-photograph"),
  }).optional(),
  locales: object({ en: recipeCopy, "fr-CA": recipeCopy }),
}).superRefine((recipe, ctx) => {
  const issue = (path, message) => ctx.addIssue({ code: "custom", path, message });
  // The generic image is reserved for the non-public acceptance fixtures.
  if (recipe.image?.src === "/images/og-default.jpg" && !recipe.id.startsWith("test-only-")) {
    issue(["image", "src"], "The generic image is reserved for the non-public acceptance fixture");
  }
  const receivedOn = recipe.suppliedSource.receivedOn;
  if (receivedOn && receivedOn > recipe.published) {
    issue(["suppliedSource", "receivedOn"], "Recipe must be supplied before publication");
  }
  for (const locale of ["en", "fr-CA"]) {
    if (recipe.image && !recipe.locales[locale].imageAlt) issue(["locales", locale, "imageAlt"], "A recipe photo needs alt text");
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
