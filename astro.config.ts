import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";
import tailwind from "@astrojs/tailwind";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

import cloudflare from "@astrojs/cloudflare";

const distDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "dist");

// Astro's sitemap integration does not read noindex meta tags, so we read the
// built HTML for each page and drop any that render robots noindex (e.g. thin
// cuisine/occasion listing pages). Keeps noindex pages out of the sitemap
// generically, without a hardcoded route list.
function isNoindexPage(page: string): boolean {
  try {
    const { pathname } = new URL(page);
    const html = readFileSync(path.join(distDir, pathname, "index.html"), "utf-8");
    return /<meta[^>]+name=["']robots["'][^>]*noindex/i.test(html);
  } catch {
    return false;
  }
}

export default defineConfig({
  site: "https://datemydish.com",

  integrations: [
    mdx(),
    sitemap({
      filter: (page) =>
        new URL(page).pathname !== "/" &&
        !page.includes("/search") &&
        !page.includes("/recherche") &&
        !page.includes("/bookmarks") &&
        !page.includes("/signets") &&
        !page.includes("/404") &&
        !isNoindexPage(page),
      i18n: {
        defaultLocale: "en",
        locales: {
          en: "en",
          fr: "fr",
        },
      },
    }),
    tailwind(),
  ],

  i18n: {
    locales: ["en", "fr"],
    defaultLocale: "en",
    routing: {
      prefixDefaultLocale: true,
    },
  },

  adapter: cloudflare({
    imageService: "compile",
  }),
});
