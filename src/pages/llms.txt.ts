import type { APIRoute } from "astro";
import { getCollection } from "astro:content";

export const GET: APIRoute = async () => {
  const recipes = await getCollection("recipes");
  const articles = await getCollection("articles");
  const siteUrl = "https://datemydish.com";

  const enRecipes = recipes
    .filter((r) => r.data.lang === "en")
    .sort((a, b) => b.data.publishDate.getTime() - a.data.publishDate.getTime());

  const frRecipes = recipes
    .filter((r) => r.data.lang === "fr")
    .sort((a, b) => b.data.publishDate.getTime() - a.data.publishDate.getTime());

  const enArticles = articles
    .filter((a) => a.data.lang === "en")
    .sort((a, b) => b.data.publishDate.getTime() - a.data.publishDate.getTime());

  const frArticles = articles
    .filter((a) => a.data.lang === "fr")
    .sort((a, b) => b.data.publishDate.getTime() - a.data.publishDate.getTime());

  const lines: string[] = [
    "# Date My Dish",
    "",
    "> A bilingual recipe blog by Victor, featuring simple and delicious recipes, cooking guides, and food science articles in English and French.",
    "",
    "## English Recipes",
    "",
  ];

  for (const recipe of enRecipes) {
    const slug = recipe.id.replace(/^en\//, "");
    lines.push(`- [${recipe.data.title}](${siteUrl}/en/recipes/${slug}/)`);
  }

  if (enArticles.length > 0) {
    lines.push("", "## English Articles", "");
    for (const article of enArticles) {
      const slug = article.id.replace(/^en\//, "");
      lines.push(`- [${article.data.title}](${siteUrl}/en/articles/${slug}/)`);
    }
  }

  lines.push("", "## Recettes en français", "");

  for (const recipe of frRecipes) {
    const slug = recipe.id.replace(/^fr\//, "");
    lines.push(`- [${recipe.data.title}](${siteUrl}/fr/recettes/${slug}/)`);
  }

  if (frArticles.length > 0) {
    lines.push("", "## Articles en français", "");
    for (const article of frArticles) {
      const slug = article.id.replace(/^fr\//, "");
      lines.push(`- [${article.data.title}](${siteUrl}/fr/articles/${slug}/)`);
    }
  }

  lines.push(
    "",
    "## Pages",
    "",
    `- [Home (EN)](${siteUrl}/en/)`,
    `- [Accueil (FR)](${siteUrl}/fr/)`,
    `- [All Recipes (EN)](${siteUrl}/en/recipes/)`,
    `- [Toutes les recettes (FR)](${siteUrl}/fr/recettes/)`,
    `- [All Articles (EN)](${siteUrl}/en/articles/)`,
    `- [Tous les articles (FR)](${siteUrl}/fr/articles/)`,
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
