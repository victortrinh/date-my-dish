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

  const reviews = await getCollection("reviews");
  const frReviews = reviews
    .filter((r) => r.data.lang === "fr")
    .sort((a, b) => b.data.publishDate.getTime() - a.data.publishDate.getTime());

  const reviewItems = frReviews.map((review) => {
    const slug = review.id.replace(/^fr\//, "");
    return {
      title: review.data.title,
      description: review.data.description,
      pubDate: review.data.publishDate,
      link: `/fr/critiques/${slug}/`,
    };
  });

  const allItems = [...recipeItems, ...articleItems, ...reviewItems].sort(
    (a, b) => b.pubDate.getTime() - a.pubDate.getTime(),
  );

  return rss({
    title: "Date My Dish - Recettes et guides de cuisine pour soirées en amoureux",
    description:
      "Découvrez des recettes et guides de cuisine préparés avec amour. Des classiques réconfortants aux astuces d'experts, sublimez vos soupers en amoureux.",
    site: context.site!,
    items: allItems,
    customData: `<language>fr</language>`,
  });
}
