import rss from "@astrojs/rss";
import { getCollection } from "astro:content";
import type { APIContext } from "astro";
import { dateSpotPath } from "@utils/date-spots";
import { t } from "@i18n/utils";

export async function GET(context: APIContext) {
  const locale = "en";
  const spots = await getCollection("dateSpots");
  return rss({
    title: t(locale, "seo.homeTitle"),
    description: t(locale, "seo.homeDescription"),
    site: context.site!,
    items: spots.sort((a, b) => b.data.freshness.published.localeCompare(a.data.freshness.published)).map(({ data }) => {
      const copy = data.locales["en"];
      return { title: copy.title, description: copy.metaDescription, pubDate: new Date(data.freshness.published), link: dateSpotPath(data, locale) };
    }),
    customData: `<language>${locale}</language>`,
  });
}
