import { existsSync, readFileSync, readdirSync } from "fs";
import { join, relative } from "path";

const DIST_DIR = join(process.cwd(), "dist");
const PAGES_JSON = join(process.cwd(), ".playwright-pages.json");

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
      const routePath =
        "/" + relative(DIST_DIR, dir).replace(/\\/g, "/") + "/";
      results.push(routePath === "//" ? "/" : routePath);
    }
  }
  return results;
}

function toPageEntry(route: string): { path: string; name: string } {
  return {
    path: route,
    name:
      route
        .replace(/^\//, "")
        .replace(/\/$/, "")
        .replace(/\//g, "-") || "root",
  };
}

export function discoverPages(): { path: string; name: string }[] {
  // If .playwright-pages.json exists, use it (written by generate-playwright-pages.cjs)
  if (existsSync(PAGES_JSON)) {
    const pages: string[] = JSON.parse(readFileSync(PAGES_JSON, "utf8"));
    console.log(
      `[discover-pages] Using .playwright-pages.json (${pages.length} pages)`,
    );
    return pages.sort().map(toPageEntry);
  }

  // Fallback: discover all pages from dist/
  console.log("[discover-pages] Full discovery from dist/");
  return walkDir(DIST_DIR)
    .filter((route) => !EXCLUDED_PATTERNS.some((p) => p.test(route)))
    .sort()
    .map(toPageEntry);
}
