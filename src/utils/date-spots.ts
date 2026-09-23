import type { CollectionEntry } from "astro:content";
import { getDateSpotLocalizedPath, getReviewLocalizedPath, type Locale } from "@i18n/utils";

type DateSpot = CollectionEntry<"dateSpots">["data"];

export type RestaurantDateSpot = Extract<DateSpot, { spotType: "restaurant" }>;
export type RestaurantDateSpotEntry = CollectionEntry<"dateSpots"> & { data: RestaurantDateSpot };

export function isRestaurantDateSpot(spot: CollectionEntry<"dateSpots">): spot is RestaurantDateSpotEntry {
  return spot.data.spotType === "restaurant";
}

export function isVenueReview(spot: DateSpot): boolean {
  return spot.spotType === "restaurant" || spot.spotType === "bar";
}

export function dateSpotPath(spot: DateSpot, locale: Locale): string {
  const copy = spot.locales[locale === "fr" ? "fr-CA" : "en"];
  return spot.spotType === "restaurant"
    ? getReviewLocalizedPath(locale, copy.slug)
    : getDateSpotLocalizedPath(locale, copy.slug);
}

export function dateSpotDestinations(spots: CollectionEntry<"dateSpots">[], locale: Locale) {
  return [
    ...(spots.length ? [{ label: "Date Spots", path: locale === "fr" ? "/lieux/" : "/date-spots/" }] : []),
    ...(spots.some(({ data }) => isVenueReview(data))
      ? [{ label: locale === "fr" ? "Restaurants et bars" : "Restaurants & Bars", path: locale === "fr" ? "/critiques/" : "/reviews/" }]
      : []),
  ];
}
