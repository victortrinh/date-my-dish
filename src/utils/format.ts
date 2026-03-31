import { t, type Locale } from "@i18n/utils";

export function formatDuration(iso: string, locale: Locale): string {
  const match = iso.match(/P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?)?/);
  if (!match) return iso;
  const days = match[1] ? parseInt(match[1]) : 0;
  const hours = match[2] ? parseInt(match[2]) : 0;
  const minutes = match[3] ? parseInt(match[3]) : 0;

  const parts: string[] = [];
  if (days > 0) parts.push(`${days} ${t(locale, days === 1 ? "recipe.day" : "recipe.days")}`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes} ${t(locale, "recipe.minutes")}`);
  return parts.join(" ") || iso;
}
