import { test, expect } from "../fixtures";
import { discoverPages } from "../helpers/discover-pages";

const recipePages = discoverPages().filter(
  (p) =>
    (p.path.startsWith("/en/recipes/") || p.path.startsWith("/fr/recettes/")) &&
    // Exclude listing/category/tag/occasion/cuisine pages
    p.path.split("/").filter(Boolean).length >= 3 &&
    !p.path.includes("/tag/") &&
    !p.path.includes("/etiquette/") &&
    !p.path.includes("/occasion/") &&
    !p.path.includes("/cuisine/"),
);

for (const { path, name } of recipePages) {
  test(`${name} has valid Recipe Microdata`, async ({ page }) => {
    await page.goto(path);

    const card = page.locator('article[itemtype="https://schema.org/Recipe"]');
    await expect(card, `${path} missing Recipe itemscope`).toHaveCount(1);

    // Required Microdata properties for Google rich results
    await expect(
      card.locator('[itemprop="image"]'),
      `${path} missing itemprop="image"`,
    ).toHaveCount(1);

    await expect(
      card.locator('[itemprop="name"]'),
      `${path} missing itemprop="name"`,
    ).toHaveCount(1);

    await expect(
      card.locator('[itemprop="recipeIngredient"]'),
      `${path} missing itemprop="recipeIngredient"`,
    ).not.toHaveCount(0);

    await expect(
      card.locator('[itemprop="recipeInstructions"]'),
      `${path} missing itemprop="recipeInstructions"`,
    ).not.toHaveCount(0);
  });

  test(`${name} has valid Recipe JSON-LD`, async ({ page }) => {
    await page.goto(path);

    const jsonLd = await page.evaluate(() => {
      const scripts = document.querySelectorAll(
        'script[type="application/ld+json"]',
      );
      for (const script of scripts) {
        try {
          const data = JSON.parse(script.textContent || "");
          if (data["@type"] === "Recipe") return data;
        } catch {
          // skip malformed
        }
      }
      return null;
    });

    expect(jsonLd, `${path} missing Recipe JSON-LD`).not.toBeNull();
    expect(jsonLd.image, `${path} JSON-LD missing image`).toBeTruthy();
    expect(jsonLd.image.length, `${path} JSON-LD image is empty array`).toBeGreaterThan(0);
    expect(jsonLd.name, `${path} JSON-LD missing name`).toBeTruthy();
    expect(jsonLd.recipeIngredient?.length, `${path} JSON-LD missing ingredients`).toBeGreaterThan(0);
    expect(jsonLd.recipeInstructions?.length, `${path} JSON-LD missing instructions`).toBeGreaterThan(0);
    expect(jsonLd.description, `${path} JSON-LD missing description`).toBeTruthy();
    expect(jsonLd.author, `${path} JSON-LD missing author`).toBeTruthy();
    expect(jsonLd.recipeCategory, `${path} JSON-LD missing recipeCategory`).toBeTruthy();
    expect(jsonLd.recipeCuisine, `${path} JSON-LD missing recipeCuisine`).toBeTruthy();
    expect(jsonLd.keywords, `${path} JSON-LD missing keywords`).toBeTruthy();
  });
}
