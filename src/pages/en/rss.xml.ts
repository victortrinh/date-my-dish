import rss from "@astrojs/rss";
import { getCollection } from "astro:content";
import type { APIContext } from "astro";

export async function GET(context: APIContext) {
  const recipes = await getCollection("recipes");
  const enRecipes = recipes
    .filter((r) => r.data.lang === "en")
    .sort((a, b) => b.data.publishDate.getTime() - a.data.publishDate.getTime());

  const articles = await getCollection("articles");
  const enArticles = articles
    .filter((a) => a.data.lang === "en")
    .sort((a, b) => b.data.publishDate.getTime() - a.data.publishDate.getTime());

  const recipeItems = enRecipes.map((recipe) => {
    const slug = recipe.id.replace(/^en\//, "");
    return {
      title: recipe.data.title,
      description: recipe.data.description,
      pubDate: recipe.data.publishDate,
      link: `/en/recipes/${slug}/`,
    };
  });

  const articleItems = enArticles.map((article) => {
    const slug = article.id.replace(/^en\//, "");
    return {
      title: article.data.title,
      description: article.data.description,
      pubDate: article.data.publishDate,
      link: `/en/articles/${slug}/`,
    };
  });

  const allItems = [...recipeItems, ...articleItems].sort(
    (a, b) => b.pubDate.getTime() - a.pubDate.getTime(),
  );

  return rss({
    title: "Date My Dish - Recipes & Cooking Guides for Date Night",
    description:
      "Discover recipes and cooking guides crafted with love. From comforting classics to expert kitchen tips, elevate your date night dinners.",
    site: context.site!,
    items: allItems,
    customData: `<language>en</language>`,
  });
}
