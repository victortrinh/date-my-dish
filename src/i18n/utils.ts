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
    about: { en: "about", fr: "a-propos" },
    "a-propos": { en: "about", fr: "a-propos" },
    search: { en: "search", fr: "recherche" },
    recherche: { en: "search", fr: "recherche" },
    "privacy-policy": {
      en: "privacy-policy",
      fr: "politique-de-confidentialite",
    },
    "politique-de-confidentialite": {
      en: "privacy-policy",
      fr: "politique-de-confidentialite",
    },
    "terms-of-service": {
      en: "terms-of-service",
      fr: "conditions-dutilisation",
    },
    "conditions-dutilisation": {
      en: "terms-of-service",
      fr: "conditions-dutilisation",
    },
    articles: { en: "articles", fr: "articles" },
    reviews: { en: "reviews", fr: "critiques" },
    critiques: { en: "reviews", fr: "critiques" },
    occasion: { en: "occasion", fr: "occasion" },
    cuisine: { en: "cuisine", fr: "cuisine" },
    tag: { en: "tag", fr: "etiquette" },
    etiquette: { en: "tag", fr: "etiquette" },
  };

  const translatedParts = pathParts.slice(1).map((part, index, arr) => {
    if (routeMap[part]) {
      return routeMap[part][targetLocale];
    }
    // Translate occasion slugs
    const prev = arr[index - 1];
    if (prev === "occasion") {
      const canonical = getOccasionFromSlug(part, currentLocale);
      return getOccasionSlug(canonical, targetLocale);
    }
    // Translate cuisine slugs
    if (prev === "cuisine") {
      const canonical = getCuisineFromSlug(part, currentLocale);
      return getCuisineSlug(canonical, targetLocale);
    }
    // Translate tag slugs
    if (prev === "tag" || prev === "etiquette") {
      const canonical = getTagFromSlug(part, currentLocale);
      return getTagSlug(canonical, targetLocale);
    }
    return part;
  });

  const result = `/${targetLocale}/${translatedParts.join("/")}`;
  return result.endsWith("/") ? result : `${result}/`;
}

export function getRecipeLocalizedPath(
  locale: Locale,
  slug: string,
): string {
  const prefix = locale === "fr" ? "recettes" : "recipes";
  return `/${locale}/${prefix}/${slug}/`;
}

export function getArticleLocalizedPath(
  locale: Locale,
  slug: string,
): string {
  return `/${locale}/articles/${slug}/`;
}

export function getReviewLocalizedPath(
  locale: Locale,
  slug: string,
): string {
  const prefix = locale === "fr" ? "critiques" : "reviews";
  return `/${locale}/${prefix}/${slug}/`;
}

export const occasionSlugMap: Record<string, Record<Locale, string>> = {
  "date-night": { en: "date-night", fr: "soiree-en-amoureux" },
  weeknight: { en: "weeknight", fr: "soir-de-semaine" },
  entertaining: { en: "entertaining", fr: "recevoir" },
  comfort: { en: "comfort", fr: "reconfort" },
  celebration: { en: "celebration", fr: "celebration" },
  "quick-meal": { en: "quick-meal", fr: "repas-rapide" },
};

export const tagSlugMap: Record<string, Record<Locale, string>> = {
  appetizer: { en: "appetizer", fr: "entree" },
  "asian-fusion": { en: "asian-fusion", fr: "fusion-asiatique" },
  beef: { en: "beef", fr: "boeuf" },
  "beginner-friendly": { en: "beginner-friendly", fr: "debutant" },
  braised: { en: "braised", fr: "braise" },
  british: { en: "british", fr: "britannique" },
  "brussels-sprouts": { en: "brussels-sprouts", fr: "choux-de-bruxelles" },
  chicken: { en: "chicken", fr: "poulet" },
  chinese: { en: "chinese", fr: "chinois" },
  "comfort-food": { en: "comfort-food", fr: "reconfort" },
  condiment: { en: "condiment", fr: "condiment" },
  "cooking-techniques": { en: "cooking-techniques", fr: "techniques-de-cuisson" },
  "date-night": { en: "date-night", fr: "soiree-en-amoureux" },
  dessert: { en: "dessert", fr: "dessert" },
  "dining-etiquette": { en: "dining-etiquette", fr: "etiquette-a-table" },
  eggplant: { en: "eggplant", fr: "aubergine" },
  elegant: { en: "elegant", fr: "elegant" },
  "food-safety": { en: "food-safety", fr: "securite-alimentaire" },
  "food-science": { en: "food-science", fr: "science-alimentaire" },
  fried: { en: "fried", fr: "frit" },
  fusion: { en: "fusion", fr: "fusion" },
  guides: { en: "guides", fr: "guides" },
  healthy: { en: "healthy", fr: "sante" },
  ingredients: { en: "ingredients", fr: "ingredients" },
  italian: { en: "italian", fr: "italien" },
  "kitchen-tips": { en: "kitchen-tips", fr: "astuces-cuisine" },
  korean: { en: "korean", fr: "coreen" },
  lemon: { en: "lemon", fr: "citron" },
  mediterranean: { en: "mediterranean", fr: "mediterraneen" },
  mushroom: { en: "mushroom", fr: "champignon" },
  nikkei: { en: "nikkei", fr: "nikkei" },
  "no-bake": { en: "no-bake", fr: "sans-cuisson" },
  pasta: { en: "pasta", fr: "pates" },
  pickled: { en: "pickled", fr: "marine" },
  "plant-based": { en: "plant-based", fr: "vegetal" },
  proteins: { en: "proteins", fr: "proteines" },
  quick: { en: "quick", fr: "rapide" },
  roasted: { en: "roasted", fr: "roti" },
  salad: { en: "salad", fr: "salade" },
  salmon: { en: "salmon", fr: "saumon" },
  seafood: { en: "seafood", fr: "fruits-de-mer" },
  seasoning: { en: "seasoning", fr: "assaisonnement" },
  "side-dish": { en: "side-dish", fr: "accompagnement" },
  "slow-cooked": { en: "slow-cooked", fr: "mijote" },
  "sous-vide": { en: "sous-vide", fr: "sous-vide" },
  spanish: { en: "spanish", fr: "espagnol" },
  spicy: { en: "spicy", fr: "epice" },
  steak: { en: "steak", fr: "steak" },
  "stir-fry": { en: "stir-fry", fr: "saute" },
  umami: { en: "umami", fr: "umami" },
  vegan: { en: "vegan", fr: "vegane" },
  vegetarian: { en: "vegetarian", fr: "vegetarien" },
  vietnamese: { en: "vietnamese", fr: "vietnamien" },
  wok: { en: "wok", fr: "wok" },
  zucchini: { en: "zucchini", fr: "courgette" },
};

export function getOccasionSlug(occasion: string, locale: Locale): string {
  return occasionSlugMap[occasion]?.[locale] ?? occasion;
}

export function getOccasionFromSlug(slug: string, locale: Locale): string {
  for (const [canonical, slugs] of Object.entries(occasionSlugMap)) {
    if (slugs[locale] === slug) return canonical;
  }
  return slug;
}

export function getOccasionLocalizedPath(
  locale: Locale,
  occasion: string,
): string {
  const prefix = locale === "fr" ? "recettes/occasion" : "recipes/occasion";
  const slug = getOccasionSlug(occasion, locale);
  return `/${locale}/${prefix}/${slug}/`;
}

export function getTagSlug(tag: string, locale: Locale): string {
  return tagSlugMap[tag]?.[locale] ?? tag;
}

export function getTagFromSlug(slug: string, locale: Locale): string {
  for (const [canonical, slugs] of Object.entries(tagSlugMap)) {
    if (slugs[locale] === slug) return canonical;
  }
  return slug;
}

export function getTagLocalizedPath(locale: Locale, tag: string): string {
  const prefix = locale === "fr" ? "recettes/etiquette" : "recipes/tag";
  const slug = getTagSlug(tag, locale);
  return `/${locale}/${prefix}/${slug}/`;
}

export function getBookmarksLocalizedPath(locale: Locale): string {
  const segment = locale === "fr" ? "signets" : "bookmarks";
  return `/${locale}/${segment}/`;
}

export const cuisineSlugMap: Record<string, Record<Locale, string>> = {
  italian: { en: "italian", fr: "italien" },
  mediterranean: { en: "mediterranean", fr: "mediterraneen" },
  spanish: { en: "spanish", fr: "espagnol" },
  vietnamese: { en: "vietnamese", fr: "vietnamien" },
  british: { en: "british", fr: "britannique" },
  "southeast-asian": { en: "southeast-asian", fr: "asie-du-sud-est" },
  nikkei: { en: "nikkei", fr: "nikkei" },
  "korean-italian": { en: "korean-italian", fr: "coreen-italien" },
};

export function getCuisineSlug(cuisine: string, locale: Locale): string {
  const key = cuisine.toLowerCase().replace(/\s+/g, "-");
  return cuisineSlugMap[key]?.[locale] ?? key;
}

export function getCuisineFromSlug(slug: string, locale: Locale): string {
  for (const [canonical, slugs] of Object.entries(cuisineSlugMap)) {
    if (slugs[locale] === slug) return canonical;
  }
  return slug;
}

export function getCuisineLocalizedPath(
  locale: Locale,
  cuisine: string,
): string {
  const prefix = locale === "fr" ? "recettes/cuisine" : "recipes/cuisine";
  const slug = getCuisineSlug(cuisine, locale);
  return `/${locale}/${prefix}/${slug}/`;
}

export const locales: Locale[] = ["en", "fr"];
export const defaultLocale: Locale = "en";
