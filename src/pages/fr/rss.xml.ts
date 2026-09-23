import rss from "@astrojs/rss";
import { getCollection } from "astro:content";
import type { APIContext } from "astro";

export async function GET(context: APIContext) {
  const recipes = await getCollection("recipes");
  const frRecipes = recipes
    .filter((r) => r.data.lang === "fr")
    .sort((a, b) => b.data.publishDate.getTime() - a.data.publishDate.getTime());

  const articles = await getCollection("articles");
  const frArticles = articles
    .filter((a) => a.data.lang === "fr")
    .sort((a, b) => b.data.publishDate.getTime() - a.data.publishDate.getTime());

  const recipeItems = frRecipes.map((recipe) => {
    const slug = recipe.id.replace(/^fr\//, "");
    return {
      title: recipe.data.title,
      description: recipe.data.description,
      pubDate: recipe.data.publishDate,
      link: `/fr/recettes/${slug}/`,
    };
  });

  const articleItems = frArticles.map((article) => {
    const slug = article.id.replace(/^fr\//, "");
    return {
      title: article.data.title,
      description: article.data.description,
      pubDate: article.data.publishDate,
      link: `/fr/articles/${slug}/`,
    };
  });

  const reviews = (await getCollection("dateSpots"))
    .map(({ data }) => data)
    .filter((spot) => spot.spotType === "restaurant")
    .sort((a, b) => b.freshness.published.localeCompare(a.freshness.published));

  const reviewItems = reviews.map((spot) => {
    return {
      title: spot.locales["fr-CA"].title,
      description: spot.locales["fr-CA"].metaDescription,
      pubDate: new Date(`${spot.freshness.published}T00:00:00Z`),
      link: `/fr/critiques/${spot.locales["fr-CA"].slug}/`,
    };
  });

  const allItems = [...recipeItems, ...articleItems, ...reviewItems].sort(
    (a, b) => b.pubDate.getTime() - a.pubDate.getTime(),
  );

  return rss({
    title: "Date My Dish - Endroits pour un rendez-vous à Montréal",
    description: "Des recommandations humaines de restaurants pour planifier un rendez-vous à Montréal.",
    site: context.site!,
    items: allItems,
    customData: `<language>fr</language>`,
  });
}
