import type { CollectionEntry } from "astro:content";
import { DATE_SPOT_CATEGORIES, neighbourhoodSlug } from "@content-contracts/date-spot.mjs";
import { t, type Locale } from "@i18n/utils";

type DateSpot = CollectionEntry<"dateSpots">["data"];
export type DateSpotEntry = CollectionEntry<"dateSpots">;
export type VenueReview = Extract<DateSpot, { spotType: "restaurant" | "bar" }>;
export type PlanningSpot = Extract<DateSpot, { spotType: "activity" | "chef-led-experience" }>;
export type DateSpotCategory = (typeof DATE_SPOT_CATEGORIES)[number];
export type Verdict = DateSpot["reviewVerdict"];

export { DATE_SPOT_CATEGORIES, neighbourhoodSlug };

export const copyLocale = (locale: Locale) => (locale === "fr" ? "fr-CA" : "en") as "en" | "fr-CA";

export function isVenueReview(spot: DateSpot): spot is VenueReview {
  return spot.spotType === "restaurant" || spot.spotType === "bar";
}

export function isPlanningSpot(spot: DateSpot): spot is PlanningSpot {
  return spot.spotType === "activity" || spot.spotType === "chef-led-experience";
}

export function spotCategory(spot: DateSpot): DateSpotCategory | undefined {
  return "category" in spot ? spot.category : undefined;
}

const categorySlugs: Record<DateSpotCategory, Record<Locale, string>> = {
  "activities-sports": { en: "activities-and-sports", fr: "activites-et-sports" },
  "arts-culture": { en: "arts-and-culture", fr: "arts-et-culture" },
  "games-entertainment": { en: "games-and-entertainment", fr: "jeux-et-divertissement" },
  "nature-scenic": { en: "nature-and-scenic", fr: "nature-et-panoramas" },
  "social-romantic": { en: "social-and-romantic", fr: "social-et-romantique" },
};

export function categoryFromSlug(slug: string): DateSpotCategory | undefined {
  return DATE_SPOT_CATEGORIES.find((category) => categorySlugs[category].en === slug || categorySlugs[category].fr === slug);
}

const base = (locale: Locale) => (locale === "fr" ? "/fr/lieux" : "/en/date-spots");

export function reviewPath(spot: VenueReview, locale: Locale): string {
  const slug = spot.locales[copyLocale(locale)].slug;
  return `/${locale}/${locale === "fr" ? "critiques" : "reviews"}/${neighbourhoodSlug(spot.neighbourhood)}/${slug}/`;
}

export function planningPath(spot: PlanningSpot, locale: Locale): string {
  return `${base(locale)}/${spot.locales[copyLocale(locale)].slug}/`;
}

export function dateSpotPath(spot: DateSpot, locale: Locale): string {
  return isVenueReview(spot) ? reviewPath(spot, locale) : planningPath(spot as PlanningSpot, locale);
}

export function categoryPath(category: DateSpotCategory, locale: Locale): string {
  return `${base(locale)}/${locale === "fr" ? "categorie" : "category"}/${categorySlugs[category][locale]}/`;
}

export function neighbourhoodPath(neighbourhood: string, locale: Locale): string {
  return `${base(locale)}/${locale === "fr" ? "quartier" : "neighbourhood"}/${neighbourhoodSlug(neighbourhood)}/`;
}

export function profilePath(slug: string, locale: Locale): string {
  return `/${locale}/chefs/${slug}/`;
}

export function recipeCardPath(slug: string, locale: Locale): string {
  return `/${locale}/${locale === "fr" ? "fiches-recettes" : "recipe-cards"}/${slug}/`;
}

export function verdictLabel(verdict: Verdict, locale: Locale): string {
  return t(locale, `dateSpot.verdict.${verdict}`);
}

export function priceLabel(price: DateSpot["priceRange"], locale: Locale): string {
  return price === "free" ? t(locale, "dateSpot.free") : price;
}

/** Spots nearby in the same category, for "N more nearby" and "More {category}". */
export function sameCategoryNearby(spots: DateSpotEntry[], spot: DateSpot): DateSpotEntry[] {
  const category = spotCategory(spot);
  return spots.filter(({ data }) => data.id !== spot.id && data.city === spot.city && category !== undefined && spotCategory(data) === category);
}

export function dateSpotDestinations(spots: DateSpotEntry[], locale: Locale, profiles: CollectionEntry<"extendedProfiles">[] = []) {
  return [
    ...(spots.length ? [{ label: t(locale, "nav.dateSpots"), path: locale === "fr" ? "/lieux/" : "/date-spots/" }] : []),
    ...(spots.some(({ data }) => isVenueReview(data))
      ? [{ label: t(locale, "nav.venueReviews"), path: locale === "fr" ? "/critiques/" : "/reviews/" }]
      : []),
    ...(profiles.length ? [{ label: t(locale, "nav.chefs"), path: "/chefs/" }] : []),
  ];
}
