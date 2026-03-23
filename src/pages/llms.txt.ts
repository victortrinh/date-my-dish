import type { APIRoute } from "astro";
import { getCollection } from "astro:content";
import { SITE_URL } from "@utils/constants";

export const GET: APIRoute = async () => {
  const recipes = await getCollection("recipes");
  const articles = await getCollection("articles");

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

  // Group EN recipes by occasion
  const occasionGroups: Record<string, typeof enRecipes> = {};
  for (const recipe of enRecipes) {
    for (const occ of recipe.data.occasion || []) {
      if (!occasionGroups[occ]) occasionGroups[occ] = [];
      occasionGroups[occ].push(recipe);
    }
  }

  // Group EN recipes by cuisine
  const cuisineGroups: Record<string, typeof enRecipes> = {};
  for (const recipe of enRecipes) {
    const cuisine = recipe.data.recipeCuisine;
    if (!cuisineGroups[cuisine]) cuisineGroups[cuisine] = [];
    cuisineGroups[cuisine].push(recipe);
  }

  const formatRecipe = (recipe: (typeof enRecipes)[0], locale: "en" | "fr") => {
    const slug = recipe.id.replace(new RegExp(`^${locale}/`), "");
    const prefix = locale === "fr" ? "recettes" : "recipes";
    const url = `${SITE_URL}/${locale}/${prefix}/${slug}/`;
    const summary = recipe.data.summary ? ` - ${recipe.data.summary}` : ` - ${recipe.data.description}`;
    const meta = [
      recipe.data.recipeCuisine,
      recipe.data.difficulty,
      recipe.data.totalTime,
      recipe.data.recipeYield,
    ].join(" | ");
    return `- [${recipe.data.title}](${url})${summary} (${meta})`;
  };

  const formatArticle = (article: (typeof enArticles)[0], locale: "en" | "fr") => {
    const slug = article.id.replace(new RegExp(`^${locale}/`), "");
    const url = `${SITE_URL}/${locale}/articles/${slug}/`;
    return `- [${article.data.title}](${url}) - ${article.data.description}`;
  };

  const lines: string[] = [
    "# Date My Dish",
    "",
    "> A bilingual (English/French) date night recipe blog by Victor, a Montreal home cook. Features romantic recipes designed to impress, cooking technique articles, and food science guides. Every recipe is tested at least three times before publishing.",
    "",
    "## English Recipes",
    "",
  ];

  for (const recipe of enRecipes) {
    lines.push(formatRecipe(recipe, "en"));
  }

  // Occasion groupings
  const occasionOrder = ["date-night", "weeknight", "entertaining", "comfort"];
  lines.push("", "### Recipes by Occasion", "");
  for (const occ of occasionOrder) {
    if (occasionGroups[occ]) {
      lines.push(`**${occ}**: ${occasionGroups[occ].map((r) => r.data.title).join(", ")}`);
    }
  }

  // Cuisine groupings
  lines.push("", "### Recipes by Cuisine", "");
  for (const [cuisine, group] of Object.entries(cuisineGroups).sort((a, b) => b[1].length - a[1].length)) {
    lines.push(`**${cuisine}** (${group.length}): ${group.map((r) => r.data.title).join(", ")}`);
  }

  if (enArticles.length > 0) {
    lines.push("", "## English Articles", "");
    for (const article of enArticles) {
      lines.push(formatArticle(article, "en"));
    }
  }

  lines.push("", "---", "", "## Recettes en français", "");

  for (const recipe of frRecipes) {
    lines.push(formatRecipe(recipe, "fr"));
  }

  if (frArticles.length > 0) {
    lines.push("", "## Articles en français", "");
    for (const article of frArticles) {
      lines.push(formatArticle(article, "fr"));
    }
  }

  lines.push(
    "",
    "## Pages",
    "",
    `- [Home (EN)](${SITE_URL}/en/)`,
    `- [Accueil (FR)](${SITE_URL}/fr/)`,
    `- [All Recipes (EN)](${SITE_URL}/en/recipes/)`,
    `- [Toutes les recettes (FR)](${SITE_URL}/fr/recettes/)`,
    `- [All Articles (EN)](${SITE_URL}/en/articles/)`,
    `- [Tous les articles (FR)](${SITE_URL}/fr/articles/)`,
    `- [About](${SITE_URL}/en/about/)`,
    `- [À propos](${SITE_URL}/fr/a-propos/)`,
    `- [Contact (EN)](${SITE_URL}/en/contact/)`,
    `- [Contact (FR)](${SITE_URL}/fr/contact/)`,
    "",
  );

  return new Response(lines.join("\n"), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
};
