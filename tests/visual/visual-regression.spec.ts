import { test, expect } from "../fixtures";
import { REPRESENTATIVE_PAGES } from "../helpers/representative-pages";

for (const { path, name } of REPRESENTATIVE_PAGES) {
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
