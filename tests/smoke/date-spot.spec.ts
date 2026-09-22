import { test, expect } from "@playwright/test";
import { readdirSync } from "node:fs";

for (const route of ["/en/reviews/test-only-restaurant/", "/fr/critiques/test-only-restaurant-fr/"]) {
  test(`${route} renders the complete Restaurant Date Spot contract`, async ({ page }) => {
    const response = await page.goto(route);
    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("[TEST ONLY]");
    for (const text of ["[TEST ONLY] verdict reason", "[TEST ONLY] room", "[TEST ONLY] real cost", "Victor Vu"]) {
      if (route.startsWith("/en/")) await expect(page.getByText(text, { exact: true }).first()).toBeVisible();
    }
    const jsonLd = await page.locator('script[type="application/ld+json"]').allTextContents();
    const schema = jsonLd.join("\n");
    expect(schema).toContain('"@type":"Restaurant"');
    expect(schema).toContain('"@type":"Article"');
    expect(schema).toContain('"@type":"Person"');
    expect(schema).not.toMatch(/reviewRating|ratingValue|bestRating|worstRating/);
    expect(await page.locator("html").textContent()).not.toMatch(/\b\d+(?:\.\d+)?\s*\/\s*10\b/);
  });
}

test("Restaurant Date Spot has an atomic reciprocal Locale Pair", async ({ request }) => {
  const en = await request.get("/en/reviews/test-only-restaurant/");
  const fr = await request.get("/fr/critiques/test-only-restaurant-fr/");
  expect(await en.text()).toContain('hreflang="fr" href="https://datemydish.com/fr/critiques/test-only-restaurant-fr/"');
  expect(await fr.text()).toContain('hreflang="en" href="https://datemydish.com/en/reviews/test-only-restaurant/"');
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
