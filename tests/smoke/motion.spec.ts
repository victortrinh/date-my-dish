import { test, expect, type Page } from "@playwright/test";

// Motion (DESIGN.md): quiet reveals, the verdict settle and the card-to-post
// View Transition. Content stays visible without JavaScript and nothing moves
// under prefers-reduced-motion.
const review = "/en/reviews/test-quarter/test-only-restaurant/";
const listing = "/en/date-spots/";

const hiddenRevealCount = (page: Page) =>
  page.locator("[data-reveal]").evaluateAll((elements) => elements.filter((element) => getComputedStyle(element).opacity !== "1").length);

test("reveals leave the first screen alone and play once below the fold", async ({ page }) => {
  await page.goto(review);
  await expect(page.locator("html")).toHaveClass(/js-reveal/);
  const pending = await page.locator("[data-reveal]").evaluateAll((elements) => elements.map((element) => {
    const box = element.getBoundingClientRect();
    return { onScreen: box.bottom > 0 && box.top < innerHeight, pending: element.classList.contains("reveal-pending") };
  }));
  expect(pending.filter(({ onScreen, pending }) => onScreen && pending)).toEqual([]);
  const heading = page.locator("#faq-title");
  await expect(heading).toHaveClass(/reveal-pending/);
  await heading.scrollIntoViewIfNeeded();
  await expect(heading).toHaveClass(/is-revealed/);
  await expect.poll(() => heading.evaluate((element) => getComputedStyle(element).opacity)).toBe("1");
  await page.evaluate(() => scrollTo(0, 0));
  await heading.scrollIntoViewIfNeeded();
  await expect(heading).not.toHaveClass(/reveal-pending/);
});

test("without JavaScript every revealed element is visible", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  for (const route of [review, listing]) {
    await page.goto(route);
    await expect(page.locator("html")).not.toHaveClass(/js-reveal/);
    expect(await hiddenRevealCount(page)).toBe(0);
  }
  await context.close();
});

test("reduced motion turns off reveals, the settle and the zoom", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const route of [review, listing]) {
    await page.goto(route);
    await expect(page.locator("html")).not.toHaveClass(/js-reveal/);
    await page.evaluate(() => scrollTo(0, document.body.scrollHeight));
    expect(await hiddenRevealCount(page)).toBe(0);
    expect(await page.evaluate(() => document.getAnimations().length)).toBe(0);
  }
  await page.locator("article[data-verdict] a").first().hover();
  expect(await page.locator("article[data-verdict] img").first().evaluate((img) => getComputedStyle(img).transform)).toBe("none");
});

test("a card's photo and title share their view-transition names with the post hero", async ({ page }) => {
  await page.goto(listing);
  const names = await page.locator("[style*='view-transition-name']").evaluateAll((elements) => elements.map((element) => getComputedStyle(element).viewTransitionName));
  expect(names.length).toBeGreaterThan(0);
  expect(new Set(names).size).toBe(names.length);
  const card = page.locator("article[data-verdict]").first();
  const photo = await card.locator(".arch").evaluate((element) => getComputedStyle(element).viewTransitionName);
  const title = await card.locator("h2, h3").evaluate((element) => getComputedStyle(element).viewTransitionName);
  await page.goto((await card.locator("a").getAttribute("href"))!);
  expect(await page.locator("img[fetchpriority='high']").evaluate((element) => getComputedStyle(element).viewTransitionName)).toBe(photo);
  expect(await page.locator("h1 [style*='view-transition-name'], h1[style*='view-transition-name']").first().evaluate((element) => getComputedStyle(element).viewTransitionName)).toBe(title);
});
