import { readdirSync } from "fs";
import { join, relative } from "path";

const DIST_DIR = join(process.cwd(), "dist");

// Routes to exclude from testing
const EXCLUDED_PATTERNS = [
  /^\/$/, // Root redirect (302)
  /\/_worker\.js/, // Cloudflare worker internals
  /\/_astro\//, // Hashed assets
  /\/pagefind\//, // Pagefind assets
];

function walkDir(dir: string): string[] {
  const results: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walkDir(fullPath));
    } else if (entry.name === "index.html") {
      // Convert dist/en/recipes/cacio-e-pepe/index.html -> /en/recipes/cacio-e-pepe/
      const routePath =
        "/" + relative(DIST_DIR, dir).replace(/\\/g, "/") + "/";
      results.push(routePath === "//" ? "/" : routePath);
    }
  }
  return results;
}

export function discoverPages(): { path: string; name: string }[] {
  return walkDir(DIST_DIR)
    .filter((route) => !EXCLUDED_PATTERNS.some((p) => p.test(route)))
    .sort()
    .map((route) => ({
      path: route,
      name:
        route
          .replace(/^\//, "")
          .replace(/\/$/, "")
          .replace(/\//g, "-") || "root",
    }));
}
