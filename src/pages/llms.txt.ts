import type { APIRoute } from "astro";
import { getCollection } from "astro:content";

export const GET: APIRoute = async () => {
  const recipes = await getCollection("recipes");
  const siteUrl = "https://datemydish.com";

  const enRecipes = recipes
    .filter((r) => r.data.lang === "en")
    .sort((a, b) => b.data.publishDate.getTime() - a.data.publishDate.getTime());

  const frRecipes = recipes
    .filter((r) => r.data.lang === "fr")
    .sort((a, b) => b.data.publishDate.getTime() - a.data.publishDate.getTime());

  const lines: string[] = [
    "# Date My Dish",
    "",
    "> A bilingual recipe blog by Victor, featuring simple and delicious recipes in English and French.",
    "",
    "## English Recipes",
    "",
  ];

  for (const recipe of enRecipes) {
    const slug = recipe.id.replace(/^en\//, "");
    lines.push(`- [${recipe.data.title}](${siteUrl}/en/recipes/${slug}/)`);
  }

  lines.push("", "## Recettes en français", "");

  for (const recipe of frRecipes) {
    const slug = recipe.id.replace(/^fr\//, "");
    lines.push(`- [${recipe.data.title}](${siteUrl}/fr/recettes/${slug}/)`);
  }

  lines.push(
    "",
    "## Pages",
    "",
    `- [Home (EN)](${siteUrl}/en/)`,
    `- [Accueil (FR)](${siteUrl}/fr/)`,
    `- [All Recipes (EN)](${siteUrl}/en/recipes/)`,
    `- [Toutes les recettes (FR)](${siteUrl}/fr/recettes/)`,
    `- [About](${siteUrl}/en/about/)`,
    `- [À propos](${siteUrl}/fr/a-propos/)`,
    `- [Contact (EN)](${siteUrl}/en/contact/)`,
    `- [Contact (FR)](${siteUrl}/fr/contact/)`,
    "",
  );

  return new Response(lines.join("\n"), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
};
