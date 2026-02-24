import { t, type Locale } from "@i18n/utils";

export function formatDuration(iso: string, locale: Locale): string {
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
  if (!match) return iso;
  const hours = match[1] ? parseInt(match[1]) : 0;
  const minutes = match[2] ? parseInt(match[2]) : 0;
  if (hours > 0)
    return `${hours}h${minutes > 0 ? ` ${minutes} ${t(locale, "recipe.minutes")}` : ""}`;
  return `${minutes} ${t(locale, "recipe.minutes")}`;
}
