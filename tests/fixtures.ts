import { test as base, expect } from "@playwright/test";

export const test = base.extend({
  page: async ({ page, context }, use, testInfo) => {
    const isDark = testInfo.project.name.includes("dark");

    await context.addInitScript((theme: string) => {
      localStorage.setItem("theme", theme);
    }, isDark ? "dark" : "light");

    await use(page);
  },
});

export { expect };
