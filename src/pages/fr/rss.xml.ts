import rss from "@astrojs/rss";
import { getCollection } from "astro:content";
import type { APIContext } from "astro";

export async function GET(context: APIContext) {
  const recipes = await getCollection("recipes");
  const frRecipes = recipes
    .filter((r) => r.data.lang === "fr")
    .sort((a, b) => b.data.publishDate.getTime() - a.data.publishDate.getTime());

  return rss({
    title: "Date My Dish - Des recettes dont on tombe amoureux",
    description:
      "Découvrez des recettes simples et délicieuses, préparées avec amour. Des classiques réconfortants aux plats créatifs, trouvez votre prochain coup de cœur.",
    site: context.site!,
    items: frRecipes.map((recipe) => {
      const slug = recipe.id.replace(/^fr\//, "");
      return {
        title: recipe.data.title,
        description: recipe.data.description,
        pubDate: recipe.data.publishDate,
        link: `/fr/recettes/${slug}/`,
      };
    }),
    customData: `<language>fr</language>`,
  });
}
