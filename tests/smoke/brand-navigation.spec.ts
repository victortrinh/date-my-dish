import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";

const spots = JSON.parse(readFileSync(process.env.DATE_SPOT_SOURCE || "src/content/date-spots.json", "utf8"));
const hasVenues = spots.some((spot: { spotType: string }) => ["restaurant", "bar"].includes(spot.spotType));

for (const locale of ["en", "fr"]) {
  const index = `/${locale}/${locale === "fr" ? "lieux" : "date-spots"}/`;
  const reviews = `/${locale}/${locale === "fr" ? "critiques" : "reviews"}/`;
  test(`${locale} stages Date Spot destinations in desktop, mobile and footer navigation`, async ({ page }) => {
    await page.goto(`/${locale}/`);
    for (const [href, available] of [[index, spots.length > 0], [reviews, hasVenues]] as const) {
      const links = page.locator(`nav a[href="${href}"]`);
      expect(await links.count()).toBe(available ? 3 : 0);
    }
    await expect(page.locator('nav a[href*="/recipes/"], nav a[href*="/recettes/"], nav a[href*="/articles/"]')).toHaveCount(0);
    await expect(page.locator("h1")).toHaveText("Date My Dish");
    await expect(page.locator("main")).toContainText(locale === "fr"
      ? "Où sortir, quoi boire, quoi cuisiner pour quelqu’un."
      : "Where to go, what to drink, what to make for someone.");
  });

  test(`${locale} listings expose only their published Date Spot variants`, async ({ page, request }) => {
    for (const [route, entries] of [[index, spots], [reviews, spots.filter((spot: { spotType: string }) => ["restaurant", "bar"].includes(spot.spotType))]] as const) {
      await page.goto(route);
      await expect(page.locator("main a:has(img)")).toHaveCount(entries.length);
      if (!entries.length) await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
      for (const spot of entries) {
        const copy = spot.locales[locale === "fr" ? "fr-CA" : "en"];
        const prefix = spot.spotType === "restaurant" ? reviews : index;
        const href = `${prefix}${copy.slug}/`;
        await expect(page.locator(`main a[href="${href}"]`)).toHaveCount(1);
        expect((await request.get(href)).ok()).toBeTruthy();
        await expect(page.locator(`main a[href="${href}"]`)).toContainText(spot.city);
      }
    }
  });

  test(`${locale} public brand surfaces remove the founder persona but preserve reporting credit`, async ({ page }) => {
    for (const route of ["", locale === "fr" ? "a-propos/" : "about/", "contact/"]) {
      await page.goto(`/${locale}/${route}`);
      await expect(page.locator('img[src*="victor"], img[srcset*="victor"], source[srcset*="victor"]')).toHaveCount(0);
      await expect(page.locator("main")).not.toContainText(/home cook|recipe creator|cuisinier montréalais|foreplay/i);
    }
    await page.goto(`/${locale}/${locale === "fr" ? "a-propos" : "about"}/`);
    await expect(page.locator("main")).toContainText("Victor Vu");
    await expect(page.locator("main")).toContainText(locale === "fr"
      ? "Date My Dish est un guide montréalais des Date Spots"
      : "Date My Dish is a Montréal-first guide to Date Spots");
    const schema = await page.locator('script[type="application/ld+json"]').allTextContents();
    expect(schema.join(" ")).not.toMatch(/Home Cook|Recipe Creator|victor-about/);
  });

  test(`${locale} retired founder portrait images are not served`, async ({ request }) => {
    for (const image of ["victor-about.webp", "victor-contact.webp", "victor-vu.webp"]) {
      expect((await request.get(`/images/${image}`)).ok()).toBeFalsy();
    }
  });

  test(`${locale} 404 page carries no legacy recipe framing`, async ({ page }) => {
    const response = await page.goto(`/${locale}/this-page-does-not-exist/`);
    expect(response?.status()).toBe(404);
    await expect(page.locator("body")).not.toContainText(/recipe|recette|kitchen|cuisine/i);
  });
}
