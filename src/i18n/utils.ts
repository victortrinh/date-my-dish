import en from "./en.json";
import fr from "./fr.json";

export type Locale = "en" | "fr";

const translations = { en, fr } as const;

type NestedKeyOf<T, Prefix extends string = ""> = T extends object
  ? {
      [K in keyof T & string]: T[K] extends object
        ? NestedKeyOf<T[K], `${Prefix}${K}.`>
        : `${Prefix}${K}`;
    }[keyof T & string]
  : never;

export type TranslationKey = NestedKeyOf<typeof en>;

export function t(locale: Locale, key: TranslationKey): string {
  const keys = key.split(".");
  let value: unknown = translations[locale];
  for (const k of keys) {
    if (value && typeof value === "object" && k in value) {
      value = (value as Record<string, unknown>)[k];
    } else {
      return key;
    }
  }
  return typeof value === "string" ? value : key;
}

export function getLocaleFromUrl(url: URL): Locale {
  const [, locale] = url.pathname.split("/");
  if (locale === "fr") return "fr";
  return "en";
}

export function getLocalizedPath(locale: Locale, path: string): string {
  return `/${locale}${path.startsWith("/") ? path : `/${path}`}`;
}

export function getAlternateUrl(
  currentUrl: URL,
  targetLocale: Locale,
): string {
  const pathParts = currentUrl.pathname.split("/").filter(Boolean);

  if (pathParts.length === 0) return `/${targetLocale}/`;

  const currentLocale = pathParts[0] as Locale;
  if (currentLocale !== "en" && currentLocale !== "fr") {
    return `/${targetLocale}/`;
  }

  const routeMap: Record<string, Record<Locale, string>> = {
    recipes: { en: "recipes", fr: "recettes" },
    recettes: { en: "recipes", fr: "recettes" },
    category: { en: "category", fr: "categorie" },
    categorie: { en: "category", fr: "categorie" },
    about: { en: "about", fr: "a-propos" },
    "a-propos": { en: "about", fr: "a-propos" },
    search: { en: "search", fr: "recherche" },
    recherche: { en: "search", fr: "recherche" },
  };

  const translatedParts = pathParts.slice(1).map((part) => {
    if (routeMap[part]) {
      return routeMap[part][targetLocale];
    }
    return part;
  });

  return `/${targetLocale}/${translatedParts.join("/")}`;
}

export function getRecipeLocalizedPath(
  locale: Locale,
  slug: string,
): string {
  const prefix = locale === "fr" ? "recettes" : "recipes";
  return `/${locale}/${prefix}/${slug}`;
}

export function getCategoryLocalizedPath(
  locale: Locale,
  category: string,
): string {
  const prefix = locale === "fr" ? "recettes/categorie" : "recipes/category";
  return `/${locale}/${prefix}/${category}`;
}

export const locales: Locale[] = ["en", "fr"];
export const defaultLocale: Locale = "en";
