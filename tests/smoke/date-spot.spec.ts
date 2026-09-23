import { test, expect } from "@playwright/test";
import { readdirSync } from "node:fs";

// Routes rendered from the mechanical acceptance fixtures in tests/fixtures/.
const restaurant = { en: "/en/reviews/test-quarter/test-only-restaurant/", fr: "/fr/critiques/test-quarter/test-only-restaurant-fr/" };

for (const [locale, route] of Object.entries(restaurant)) {
  test(`${route} renders the review sections in the design's order`, async ({ page }) => {
    const response = await page.goto(route);
    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Test Venue, Test Quarter");
    const headings = await page.locator("article h2").allTextContents();
    const expected = locale === "en"
      ? ["Is Test Venue worth it?", "The essentials", "Good for", "The room", "Meet the chef", "What to drink at Test Venue", "What to order at Test Venue", "How much does dinner at Test Venue cost?", "My note on Test Venue", "What to do before or after dinner in Test Quarter", "What the chef would make for a date night", "Before you book", "The essentials"]
      : ["Test Venue, ça vaut le coup?", "L’essentiel", "Bon pour", "La salle", "Rencontrez le chef", "Quoi boire chez Test Venue", "Quoi commander chez Test Venue", "Combien coûte un souper chez Test Venue?", "Ma note sur Test Venue", "Quoi faire avant ou après le souper dans Test Quarter", "Ce que le chef cuisinerait pour un tête-à-tête", "Avant de réserver", "L’essentiel"];
    expect(headings.map((heading) => heading.trim())).toEqual(expected);
    await expect(page.locator("[data-dish-tag]")).toHaveCount(4);
    await expect(page.locator("#verdict [data-verdict]")).toHaveAttribute("data-verdict", "favourite");
    // The venue's Google number is shown dated and labelled as theirs.
    await expect(page.locator("aside")).toContainText(locale === "en" ? "Their rating on Google, not ours." : "Leur note sur Google, pas la nôtre.");
    for (const href of await page.locator("article a[href^='/']").evaluateAll((links) => links.map((link) => link.getAttribute("href")))) {
      expect((await page.request.get(href!)).status(), href!).toBe(200);
    }
    const schema = (await page.locator('script[type="application/ld+json"]').allTextContents()).join("\n");
    for (const type of ["Restaurant", "Article", "Person", "BreadcrumbList"]) expect(schema).toContain(`"@type":"${type}"`);
    expect(schema).not.toMatch(/reviewRating|ratingValue|aggregateRating|bestRating|worstRating|FAQPage/);
    expect(await page.locator("html").textContent()).not.toMatch(/\b\d+(?:\.\d+)?\s*\/\s*10\b/);
  });
}

test("Restaurant review has an atomic reciprocal Locale Pair", async ({ request }) => {
  const en = await request.get(restaurant.en);
  const fr = await request.get(restaurant.fr);
  expect(await en.text()).toContain(`hreflang="fr" href="https://datemydish.com${restaurant.fr}"`);
  expect(await fr.text()).toContain(`hreflang="en" href="https://datemydish.com${restaurant.en}"`);
});

test("the spot page, chef page, recipe card and listings render and link back into the reviews", async ({ page }) => {
  await page.goto("/en/date-spots/test-only-activity/");
  await expect(page.locator("article h2")).toContainText(["When it works", "What it actually is", "How to do it well", "Pair it with"]);
  await expect(page.locator(`a[href="${restaurant.en}"]`).first()).toBeVisible();

  await page.goto("/en/chefs/test-only-profile/");
  await expect(page.locator("[data-question]")).toHaveCount(8);
  await expect(page.locator(`a[href="${restaurant.en}"]`)).toHaveCount(1);
  await expect(page.locator('a[href="/en/recipe-cards/test-only-recipe/"]')).toHaveCount(1);

  expect((await page.goto("/en/recipe-cards/test-only-recipe/"))?.status()).toBe(200);
  expect((await page.goto("/fr/lieux/categorie/nature-et-panoramas/"))?.status()).toBe(200);
  expect((await page.goto("/en/date-spots/neighbourhood/test-quarter/"))?.status()).toBe(200);
});

test("the verdict filter narrows a listing to one state", async ({ page }) => {
  await page.goto("/en/date-spots/");
  await page.getByRole("button", { name: "Depends on the night" }).click();
  await expect(page.locator("article[data-verdict]:visible")).toHaveCount(2);
  await expect(page.locator('article[data-verdict="favourite"]')).toBeHidden();
  await page.getByRole("button", { name: "All" }).click();
  await expect(page.locator("article[data-verdict]:visible")).toHaveCount(3);
});

test("legacy numeric reviews stay withheld from public routes", async ({ request }) => {
  for (const locale of ["en", "fr"]) {
    const prefix = locale === "en" ? "reviews" : "critiques";
    for (const file of readdirSync(`src/content/reviews/${locale}`)) {
      const response = await request.get(`/${locale}/${prefix}/${file.replace(/\.mdx$/, "")}/`, { maxRedirects: 0 });
      expect(response.status()).toBe(404);
      expect(response.headers().location).toBeUndefined();
    }
  }
});
