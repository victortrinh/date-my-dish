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

  const reviews = (await getCollection("dateSpots"))
    .map(({ data }) => data)
    .filter((spot) => spot.spotType === "restaurant")
    .sort((a, b) => b.freshness.published.localeCompare(a.freshness.published));

  const reviewItems = reviews.map((spot) => {
    return {
      title: spot.locales.en.title,
      description: spot.locales.en.metaDescription,
      pubDate: new Date(`${spot.freshness.published}T00:00:00Z`),
      link: `/en/reviews/${spot.locales.en.slug}/`,
    };
  });

  const allItems = [...recipeItems, ...articleItems, ...reviewItems].sort(
    (a, b) => b.pubDate.getTime() - a.pubDate.getTime(),
  );

  return rss({
    title: "Date My Dish - Montréal Date Spots",
    description: "Human-reported restaurant recommendations for planning a date in Montréal.",
    site: context.site!,
    items: allItems,
    customData: `<language>en</language>`,
  });
}
