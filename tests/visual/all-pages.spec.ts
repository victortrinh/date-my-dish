import { test, expect } from "../fixtures";
import { discoverPages } from "../helpers/discover-pages";

const pages = discoverPages();

for (const { path, name } of pages) {
  test(`${name} visual snapshot`, async ({ page }) => {
    await page.goto(path);
    await page.waitForLoadState("networkidle");

    // Wait for web fonts to finish loading
    await page.evaluate(() => document.fonts.ready);

    await expect(page).toHaveScreenshot(`${name}.png`, {
      fullPage: true,
      stylePath: "./tests/screenshot.css",
    });
  });
}
