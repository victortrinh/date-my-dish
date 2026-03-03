/**
 * Generates dist/recipe-index.json from the built recipe pages.
 * Runs during postbuild (after Astro build, before Pagefind).
 *
 * Reads recipe MDX frontmatter from src/content/recipes/ and outputs
 * a JSON index for the client-side bookmarks page.
 */

import { readFileSync, writeFileSync, readdirSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import matter from "gray-matter";

const __dirname = dirname(fileURLToPath(import.meta.url));
const recipesDir = join(__dirname, "..", "src", "content", "recipes");
const outputPath = join(__dirname, "..", "dist", "recipe-index.json");

const recipes = [];

for (const lang of ["en", "fr"]) {
  const langDir = join(recipesDir, lang);
  if (!existsSync(langDir)) continue;

  for (const file of readdirSync(langDir)) {
    if (!file.endsWith(".mdx")) continue;
    const slug = file.replace(/\.mdx$/, "");
    const content = readFileSync(join(langDir, file), "utf-8");
    const { data } = matter(content);

    recipes.push({
      slug,
      title: data.title || slug,
      description: data.description || "",
      heroImage: typeof data.heroImage === "string" ? data.heroImage : "",
      locale: lang,
      translationSlug: data.translationSlug || slug,
      category: data.recipeCategory || [],
    });
  }
}

writeFileSync(outputPath, JSON.stringify(recipes, null, 2) + "\n");
console.log(`[generate-recipe-index] Wrote ${recipes.length} recipes to ${outputPath}`);
