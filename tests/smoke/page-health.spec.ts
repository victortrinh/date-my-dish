import { test, expect } from "../fixtures";
import { discoverPages } from "../helpers/discover-pages";

const pages = discoverPages();

// Known noise to filter out (third-party scripts, non-critical warnings)
const IGNORED_ERRORS = [
  "favicon", // Browser-generated favicon 404
];

// Third-party domains to block in tests (prevents CORS/resource errors on localhost)
const BLOCKED_DOMAINS = [
  "cloudflareinsights.com",
  "pinimg.com",
  "pinterest.com",
];

for (const { path, name } of pages) {
  test(`${name} loads without errors`, async ({ page }) => {
    // Block third-party tracking scripts that cause errors on localhost
    await page.route(
      (url) => BLOCKED_DOMAINS.some((d) => url.hostname.includes(d)),
      (route) => route.abort(),
    );

    const consoleErrors: string[] = [];
    const pageErrors: Error[] = [];

    page.on("console", (msg) => {
      if (msg.type() === "error") {
        const text = msg.text();
        if (!IGNORED_ERRORS.some((i) => text.includes(i))) {
          consoleErrors.push(text);
        }
      }
    });

    page.on("pageerror", (error) => {
      pageErrors.push(error);
    });

    const response = await page.goto(path);
    await page.waitForLoadState("networkidle");

    // Assert HTTP 200
    expect(response?.status(), `${path} returned ${response?.status()}`).toBe(
      200,
    );

    // Assert no console errors
    expect(
      consoleErrors,
      `Console errors on ${path}:\n${consoleErrors.join("\n")}`,
    ).toHaveLength(0);

    // Assert no uncaught JS exceptions
    expect(
      pageErrors,
      `JS exceptions on ${path}:\n${pageErrors.map((e) => e.message).join("\n")}`,
    ).toHaveLength(0);
  });
}
