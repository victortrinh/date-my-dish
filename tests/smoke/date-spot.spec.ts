import { test, expect } from "@playwright/test";

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
    // The verdict, Checked date, update line, venue facts and meta title come
    // from the Companion File, which wins over the Notion-derived record.
    await expect(page.locator("#verdict [data-verdict]")).toHaveAttribute("data-verdict", "favourite");
    await expect(page).toHaveTitle(new RegExp(`Companion ${locale.toUpperCase()} Title`));
    await expect(page.locator("#note time")).toHaveAttribute("datetime", "2026-01-04");
    // The verdict paragraph sets the one-line reason in ink where it stands, once.
    await expect(page.locator("#verdict strong")).toHaveCount(1);
    await expect(page.locator("#verdict strong")).toContainText("[TEST ONLY] verdict reason");
    // Make a night of it, in the fixed category order: published picks link
    // to their page, a pick with no page shows its name unlinked.
    await expect(page.locator("[data-night-pick]")).toHaveCount(4);
    expect(await page.locator("[data-night-pick]").evaluateAll((cards) => cards.map((card) => card.getAttribute("data-category")))).toEqual(["arts-culture", "games-entertainment", "nature-scenic", "social-romantic"]);
    expect(await page.locator("[data-night-pick]").evaluateAll((cards) => cards.map((card) => card.getAttribute("data-linked")))).toEqual(["true", "false", "true", "false"]);
    await expect(page.locator('[data-night-pick][data-linked="false"] a')).toHaveCount(0);
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

const minimal = { en: "/en/reviews/test-quarter/test-only-minimal/", fr: "/fr/critiques/test-quarter/test-only-minimal-fr/" };

for (const [locale, route] of Object.entries(minimal)) {
  test(`${route} renders a review with only the required fields and no empty sections`, async ({ page }) => {
    expect((await page.goto(route))?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Test Minimal, Test Quarter");
    const headings = (await page.locator("article h2").allTextContents()).map((heading) => heading.trim());
    expect(headings).toEqual(locale === "en"
      ? ["Is Test Minimal worth it?", "The essentials", "The essentials"]
      : ["Test Minimal, ça vaut le coup?", "L’essentiel", "L’essentiel"]);
    for (const id of ["good-for", "room", "meet", "drinks", "order", "cost", "note", "night", "at-home", "before-you-book"]) {
      await expect(page.locator(`#${id}`)).toHaveCount(0);
    }
    // Every heading on the page sits over content.
    const empty = await page.locator("article section").evaluateAll((sections) => sections
      .filter((section) => (section.textContent ?? "").replace((section.querySelector("h2")?.textContent ?? ""), "").trim() === "")
      .map((section) => section.id || section.getAttribute("aria-labelledby")));
    expect(empty).toEqual([]);
    await expect(page.locator("figcaption")).toHaveCount(0);
    const schema = (await page.locator('script[type="application/ld+json"]').allTextContents()).join("\n");
    expect(schema).toContain('"dateModified":"2026-01-02"');
    expect(schema).not.toMatch(/reviewRating|ratingValue|aggregateRating|"Review"|FAQPage/);
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

test("the Date Spots listing holds activities only, grouped by category", async ({ page }) => {
  await page.goto("/en/date-spots/");
  await expect(page.locator("article[data-verdict]")).toHaveCount(2);
  await expect(page.locator('main a[href^="/en/reviews/"]')).toHaveCount(0);
  await expect(page.locator("main section[data-filter-group] > h2")).toHaveText(["Arts and Culture", "Nature and Scenic"]);
});

test("the verdict and borough filters narrow the Date Spots listing together", async ({ page }) => {
  await page.goto("/en/date-spots/");
  const verdict = page.getByRole("group", { name: "Filter by our take" });
  const borough = page.getByRole("group", { name: "Filter by borough" });
  await expect(borough.getByRole("button")).toHaveText(["All", "Verdun", "Ville-Marie"]);
  await verdict.getByRole("button", { name: "Depends on the night" }).click();
  await expect(page.locator("article[data-verdict]:visible")).toHaveCount(1);
  await expect(page.locator('article[data-verdict="favourite"]')).toBeHidden();
  await borough.getByRole("button", { name: "Ville-Marie" }).click();
  await expect(page.locator("article[data-verdict]:visible")).toHaveCount(0);
  await expect(page.locator("#nature-scenic")).toBeHidden();
  await verdict.getByRole("button", { name: "All" }).click();
  await expect(page.locator("article[data-verdict]:visible")).toHaveCount(1);
  await expect(page.locator('article[data-borough="ville-marie"]')).toBeVisible();
  await expect(borough.getByRole("button", { name: "Ville-Marie" })).toHaveAttribute("aria-pressed", "true");
  await borough.getByRole("button", { name: "All" }).click();
  await expect(page.locator("article[data-verdict]:visible")).toHaveCount(2);
});

// The seven reviews published before the rework lived at flat
// /{locale}/{reviews|critiques}/{slug}-montreal/ URLs. Each one 301s, in one
// hop, to its nested URL: the neighbourhood and slug its record renders at
// (public/_redirects; the Notion H1 and Slug decide both).
const legacyReviews = {
  "giwa-verdun": ["verdun", "giwa"],
  "hoogan-et-beaufort": ["rosemont", "hoogan-et-beaufort"],
  "ile-flottante": ["mile-end", "ile-flottante"],
  mckiernan: ["ville-emard", "mckiernan"],
  moccione: ["villeray", "moccione"],
  "oncle-lee-kao": ["old-montreal", "oncle-lee-kao"],
  othym: ["the-village", "othym"],
};

test("legacy flat review URLs 301 once to their nested URLs", async ({ request }) => {
  for (const prefix of ["/en/reviews", "/fr/critiques"]) {
    for (const [legacy, [neighbourhood, slug]] of Object.entries(legacyReviews)) {
      const route = `${prefix}/${legacy}-montreal/`;
      const target = `${prefix}/${neighbourhood}/${slug}/`;
      const response = await request.get(route, { maxRedirects: 0 });
      expect(response.status(), route).toBe(301);
      expect(new URL(response.headers().location ?? "", "http://localhost").pathname, route).toBe(target);
      // One hop: the target never redirects again.
      const next = await request.get(target, { maxRedirects: 0 });
      expect(next.headers().location, target).toBeUndefined();
    }
  }
});
