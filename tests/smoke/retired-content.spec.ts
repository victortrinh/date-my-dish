import { test, expect } from "@playwright/test";
import { readdirSync, readFileSync } from "node:fs";

const retiredRoutes = [
  "/en/recipes/", "/fr/recettes/", "/en/articles/", "/fr/articles/",
  "/en/recipes/category/dinner/", "/fr/recettes/categorie/souper/",
  "/en/recipes/cuisine/italian/", "/fr/recettes/cuisine/italien/",
  "/en/recipes/tag/pasta/", "/fr/recettes/etiquette/pates/",
  "/en/recipes/occasion/date-night/", "/fr/recettes/occasion/soiree-en-amoureux/",
  "/en/articles/date-night-recipes-guide/", "/fr/articles/guide-recettes-soiree-romantique/",
  "/cacio-e-pepe/",
];
for (const collection of ["recipes", "articles"]) {
  for (const locale of ["en", "fr"]) {
    const prefix = collection === "recipes" && locale === "fr" ? "recettes" : collection;
    for (const file of readdirSync(`src/content/${collection}/${locale}`)) {
      if (file.endsWith(".mdx")) retiredRoutes.push(`/${locale}/${prefix}/${file.replace(/\.mdx$/, "")}/`);
    }
  }
}

test("every retired source URL and taxonomy returns 404 without a redirect", async ({ request }) => {
  for (const route of retiredRoutes) {
    const response = await request.get(route, { maxRedirects: 0 });
    expect(response.status(), route).toBe(404);
    expect(response.headers().location, route).toBeUndefined();
  }
});

test("retired redirects and public discovery remain absent", async ({ request }) => {
  expect(readFileSync("public/_redirects", "utf8")).not.toMatch(/\/(recipes|recettes|articles)\//);
  for (const route of ["/en/", "/fr/", "/en/rss.xml", "/fr/rss.xml", "/llms.txt", "/sitemap-0.xml"]) {
    const response = await request.get(route);
    expect(response.ok(), route).toBeTruthy();
    expect(await response.text(), route).not.toMatch(/\/(en\/(recipes|articles)|fr\/(recettes|articles))\//);
  }
  expect(await (await request.get("/recipe-index.json")).json()).toEqual([]);
});

for (const locale of ["en", "fr"]) {
  test(`${locale} search cannot find retired recipes or articles`, async ({ page }) => {
    await page.goto(`/${locale}/`);
    const results = await page.evaluate(async () => {
      // Load the real post-build index in the current locale.
      const modulePath = "/pagefind/pagefind.js";
      const pagefind = await import(/* @vite-ignore */ modulePath) as {
        search: (query: string) => Promise<{ results: { data: () => Promise<{ url: string }> }[] }>;
      };
      const searches = await Promise.all(["cacio", "wok hei", "posset"].map((query) => pagefind.search(query)));
      return Promise.all(searches.flatMap((search) => search.results.map(async (result) => (await result.data()).url)));
    });
    expect(results).not.toEqual(expect.arrayContaining([expect.stringMatching(/\/(recipes|recettes|articles)\//)]));
  });
}
