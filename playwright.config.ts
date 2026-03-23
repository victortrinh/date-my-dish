import { defineConfig, devices } from "@playwright/test";

const PORT = 8788;
const BASE_URL = `http://localhost:${PORT}`;

const allProjects = [
  {
    name: "desktop-light",
    use: {
      ...devices["Desktop Chrome"],
      colorScheme: "light" as const,
      viewport: { width: 1280, height: 900 },
    },
  },
  {
    name: "desktop-dark",
    use: {
      ...devices["Desktop Chrome"],
      colorScheme: "dark" as const,
      viewport: { width: 1280, height: 900 },
    },
  },
  {
    name: "mobile-light",
    use: {
      ...devices["Pixel 5"],
      colorScheme: "light" as const,
    },
  },
  {
    name: "mobile-dark",
    use: {
      ...devices["Pixel 5"],
      colorScheme: "dark" as const,
    },
  },
];

// PR mode: desktop-light + mobile-dark (covers both viewport and theme dimensions)
const prProjects = allProjects.filter(
  (p) => p.name === "desktop-light" || p.name === "mobile-dark",
);

const scope = process.env.PLAYWRIGHT_SCOPE;
const projects = scope === "pr" ? prProjects : allProjects;

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,

  reporter: process.env.CI
    ? [
        ["github"],
        ["html", { open: "never" }],
        ["json", { outputFile: "playwright-report/results.json" }],
      ]
    : [["html", { open: "on-failure" }]],

  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },

  expect: {
    timeout: 10_000,
  },

  projects,

  webServer: {
    command: `npx wrangler dev --port ${PORT}`,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
    stdout: "pipe",
    stderr: "pipe",
  },
});
