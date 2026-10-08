import { defineCollection } from "astro:content";
import { z } from "astro/zod";

import { dateSpotSchema } from "./content-contracts/date-spot.mjs";
import { contributorRecipeSchema } from "./content-contracts/contributor-recipe.mjs";
import { extendedProfileSchema } from "./content-contracts/extended-profile.mjs";
import { loadCollection } from "./content-contracts/load.mjs";

// Each collection is the Notion-derived JSON with its Companion Files
// (src/content/editorial/{slug}.json) merged over it; Companion File fields
// win. Acceptance builds may opt into mechanical fixtures. Production always
// consumes the source collections.
const editorialDir = process.env.EDITORIAL_SOURCE || "src/content/editorial";
const merged = (path: string) => () => loadCollection(path, editorialDir).map((record) => ({ ...record, id: String(record.id) }));

const dateSpots = defineCollection({
  loader: merged(process.env.DATE_SPOT_SOURCE || "src/content/date-spots.json"),
  schema: dateSpotSchema,
});

const contributorRecipes = defineCollection({
  loader: merged(process.env.CONTRIBUTOR_RECIPE_SOURCE || "src/content/contributor-recipes.json"),
  schema: contributorRecipeSchema,
});

const extendedProfiles = defineCollection({
  loader: merged(process.env.EXTENDED_PROFILE_SOURCE || "src/content/extended-profiles.json"),
  schema: extendedProfileSchema,
});

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

const DateNightTipsSchema = z.object({
  wine: z.string().optional(),
  music: z.string().optional(),
  platingTip: z.string().optional(),
});

const VideoSchema = z.object({
  name: z.string(),
  description: z.string(),
  thumbnailUrl: z.string().url(),
  contentUrl: z.string().url(),
  uploadDate: z.coerce.date(),
  duration: z.string(),
});

const ArticleCategorySchema = z.enum([
  "cooking-techniques",
  "food-science",
  "guides",
  "ingredients",
  "kitchen-tips",
  "drinks",
]);

const recipes = defineCollection({
  // Retired Legacy Content stays in Git but must never enter public collections.
  loader: async () => [],
  schema: ({ image }) => {
    const HowToStepSchema = z.object({
      text: z.string(),
      image: image().optional(),
      images: z.array(image()).optional(),
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
      totalTime: z.string().regex(/^P(?:\d+D)?T?(?:\d+H)?(?:\d+M)?$/, "Must be ISO 8601 duration (e.g. PT45M, P3DT2H50M)"),
      passiveTime: z.string().regex(/^P(?:\d+D)?T?(?:\d+H)?(?:\d+M)?$/, "Must be ISO 8601 duration (e.g. P3D, PT4H)").optional(),
      recipeYield: z.string(),
      difficulty: z.enum(["easy", "medium", "hard"]),
      recipeCategory: z.array(z.string()),
      recipeCuisine: z.string(),
      keywords: z.array(z.string()),
      tags: z.array(z.string()).optional(),
      ingredientGroups: z.array(IngredientGroupSchema),
      instructionGroups: z.array(InstructionGroupSchema),
      nutrition: NutritionSchema.optional(),
      occasion: z.array(z.string()).optional(),
      impressFactor: z.number().min(1).max(5).optional(),
      dateNightTips: DateNightTipsSchema.optional(),
      video: VideoSchema.optional(),
      summary: z.string().optional(),
      socialCaption: z.object({
        instagram: z.string().optional(),
        pinterest: z.string().optional(),
      }).optional(),
      faqs: z.array(FAQSchema).min(1),
    });
  },
});

const articles = defineCollection({
  // Retired Legacy Content stays in Git but must never enter public collections.
  loader: async () => [],
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      lang: z.enum(["en", "fr"]),
      translationSlug: z.string(),
      description: z.string().max(160),
      author: z.string().default("Victor"),
      publishDate: z.coerce.date(),
      updatedDate: z.coerce.date().optional(),
      heroImage: image(),
      heroImageAlt: z.string(),
      keywords: z.array(z.string()),
      tags: z.array(z.string()).optional(),
      articleCategory: ArticleCategorySchema,
      readingTime: z.number().optional(),
      relatedRecipes: z.array(z.string()).optional(),
      isAffiliate: z.boolean().optional().default(false),
      affiliateProducts: z
        .array(
          z.object({
            name: z.string(),
            url: z.string().url(),
            description: z.string().optional(),
          })
        )
        .optional(),
      socialCaption: z.object({
        instagram: z.string().optional(),
        pinterest: z.string().optional(),
      }).optional(),
      faqs: z
        .array(z.object({ question: z.string(), answer: z.string() }))
        .min(1),
    }),
});

// Older scored review files remain in repository history only. New restaurant
// reporting is published through the Date Spot collection above.
export const collections = { recipes, articles, dateSpots, contributorRecipes, extendedProfiles };
