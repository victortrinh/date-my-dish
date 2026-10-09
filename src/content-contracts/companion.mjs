import { z } from "astro/zod";
import {
  BOROUGHS, DATE_SPOT_CATEGORIES, MAKE_A_NIGHT_MAX, SPOT_TYPES, VERDICTS, goodFor, googleReviews, isoDate, materialUpdates,
  metaDescription, metaTitle, nightPick, pairing, slug, text, whenItWorks,
} from "./date-spot.mjs";

// The Companion File, src/content/editorial/{slug}.json: everything Notion
// does not carry and DMD controls. Notion owns the prose; this file owns the
// verdict, signals, neighbourhood, borough, Checked date and update lines, Google
// snapshot, Instagram, booking link, meta fields, alt text and internal
// links. The Importer pre-fills it, Victor approves it, and a later import
// never overwrites it. The loaders merge it over the Notion-derived record,
// and its fields win.

/** @template {z.ZodRawShape} T @param {T} shape */
const object = (shape) => z.object(shape).strict();

const companionLocale = object({
  verdictReason: text.optional(),
  goodFor: goodFor.optional(),
  whenItWorks: whenItWorks.optional(),
  materialUpdates: materialUpdates.optional(),
  metaTitle: metaTitle.optional(),
  metaDescription: metaDescription.optional(),
  imageAlt: text.optional(),
  makeANight: z.array(nightPick).min(1).max(MAKE_A_NIGHT_MAX).optional(),
  pairItWith: z.array(pairing).min(1).optional(),
});

export const companionSchema = object({
  id: slug,
  spotType: z.enum(SPOT_TYPES).optional(),
  category: z.enum(DATE_SPOT_CATEGORIES).optional(),
  neighbourhood: text.optional(),
  borough: z.enum(BOROUGHS).optional(),
  reviewVerdict: z.enum(VERDICTS).optional(),
  // "Checked {month}". Defaults to the publish date when left out.
  lastChecked: isoDate.optional(),
  googleReviews: googleReviews.optional(),
  instagram: z.string().regex(/^[A-Za-z0-9._]{1,30}$/, "Instagram handle without the @").optional(),
  bookingUrl: z.string().url().optional(),
  locales: object({ en: companionLocale.optional(), "fr-CA": companionLocale.optional() }).optional(),
});

const LOCALES = /** @type {const} */ (["en", "fr-CA"]);

/**
 * Merge a Companion File over a Notion-derived record. Every field the
 * Companion File sets replaces the record's; fields it leaves out keep the
 * record's value. The result is unvalidated: run it through the collection
 * schema afterwards.
 * @param {Record<string, any>} record
 * @param {z.infer<typeof companionSchema>} companion
 * @returns {Record<string, any>}
 */
export function applyCompanion(record, companion) {
  const { id: _id, lastChecked, locales, ...fields } = companion;
  const merged = { ...record };
  for (const [key, value] of Object.entries(fields)) {
    if (value !== undefined) merged[key] = value;
  }
  if (lastChecked) merged.freshness = { ...record.freshness, lastChecked };
  if (locales) {
    merged.locales = { ...record.locales };
    for (const locale of LOCALES) {
      const overlay = locales[locale];
      if (!overlay) continue;
      const copy = { ...record.locales?.[locale] };
      for (const [key, value] of Object.entries(overlay)) {
        if (value !== undefined) copy[key] = value;
      }
      merged.locales[locale] = copy;
    }
  }
  return merged;
}
