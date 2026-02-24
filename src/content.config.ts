import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

const IngredientGroupSchema = z.object({
  group: z.string().optional(),
  items: z.array(z.string()),
});

const NutritionSchema = z.object({
  calories: z.string().optional(),
  fatContent: z.string().optional(),
  carbohydrateContent: z.string().optional(),
  proteinContent: z.string().optional(),
});

const FAQSchema = z.object({
  question: z.string(),
  answer: z.string(),
});

const recipes = defineCollection({
  loader: glob({ pattern: "**/*.mdx", base: "./src/content/recipes" }),
  schema: ({ image }) => {
    const HowToStepSchema = z.object({
      text: z.string(),
      image: image().optional(),
    });

    const InstructionGroupSchema = z.object({
      group: z.string().optional(),
      steps: z.array(HowToStepSchema),
    });

    return z.object({
      title: z.string(),
      lang: z.enum(["en", "fr"]),
      translationSlug: z.string(),
      description: z.string().max(160),
      author: z.string().default("Victor"),
      publishDate: z.coerce.date(),
      updatedDate: z.coerce.date().optional(),
      heroImage: image(),
      heroImageAlt: z.string(),
      pinterestImage: image().optional(),
      prepTime: z.string().regex(/^PT\d+[HM](\d+[MS])?$/, "Must be ISO 8601 duration (e.g. PT15M)"),
      cookTime: z.string().regex(/^PT\d+[HM](\d+[MS])?$/, "Must be ISO 8601 duration (e.g. PT30M)"),
      totalTime: z.string().regex(/^PT\d+[HM](\d+[MS])?$/, "Must be ISO 8601 duration (e.g. PT45M)"),
      recipeYield: z.string(),
      difficulty: z.enum(["easy", "medium", "hard"]),
      recipeCategory: z.array(z.string()),
      recipeCuisine: z.string(),
      keywords: z.array(z.string()),
      tags: z.array(z.string()).optional(),
      ingredientGroups: z.array(IngredientGroupSchema),
      instructionGroups: z.array(InstructionGroupSchema),
      nutrition: NutritionSchema.optional(),
      faqs: z.array(FAQSchema).min(1),
    });
  },
});

export const collections = { recipes };
