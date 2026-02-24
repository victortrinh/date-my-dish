import rss from "@astrojs/rss";
import { getCollection } from "astro:content";
import type { APIContext } from "astro";

export async function GET(context: APIContext) {
  const recipes = await getCollection("recipes");
  const enRecipes = recipes
    .filter((r) => r.data.lang === "en")
    .sort((a, b) => b.data.publishDate.getTime() - a.data.publishDate.getTime());

  return rss({
    title: "Date My Dish - Recipes Worth Falling For",
    description:
      "Discover simple, delicious recipes crafted with love. From comforting classics to creative dishes, find your next favorite meal.",
    site: context.site!,
    items: enRecipes.map((recipe) => {
      const slug = recipe.id.replace(/^en\//, "");
      return {
        title: recipe.data.title,
        description: recipe.data.description,
        pubDate: recipe.data.publishDate,
        link: `/en/recipes/${slug}/`,
      };
    }),
    customData: `<language>en</language>`,
  });
}
