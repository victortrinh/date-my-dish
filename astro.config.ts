import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";
import tailwind from "@astrojs/tailwind";

import cloudflare from "@astrojs/cloudflare";

export default defineConfig({
  site: "https://datemydish.com",

  integrations: [
    mdx(),
    sitemap({
      filter: (page) =>
        !page.includes("/search") &&
        !page.includes("/recherche") &&
        page !== "https://datemydish.com/",
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

  image: {
    service: {
      entrypoint: "astro/assets/services/sharp",
    },
  },

  adapter: cloudflare(),
});