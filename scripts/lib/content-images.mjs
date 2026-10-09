// scripts/lib/content-images.mjs
// Shared helpers for the Pinterest pipeline (scripts/social-post.mjs queues
// pins, scripts/pinterest-rotate.mjs posts them).
//
// Responsibilities:
//   - Build the live English URL a pin links to, from the Date Spot record,
//     with the same path logic the site uses (date-spot-paths.mjs): Venue
//     Reviews nest under the neighbourhood, Planning Spots live under
//     /en/date-spots/.
//   - Pick the Pinterest board for a log entry's type.
//   - Resolve a pin to a local image file and read it as base64, so posting
//     uploads bytes instead of trusting a deployed URL to stay alive until
//     the pin's scheduled date.
//
// The retired recipe, article and MDX review collections are gone; nothing
// here reads src/content/{recipes,articles,reviews} any more.

import { readFileSync, readdirSync, existsSync } from "fs";
import { join, basename, extname } from "path";
import { dateSpotDetailPath, isVenueReviewType } from "../../src/content-contracts/date-spot-paths.mjs";

export const SITE_URL = "https://datemydish.com";

// ---------------------------------------------------------------------------
// URL helpers
// ---------------------------------------------------------------------------

/**
 * Absolute English URL of a Date Spot's detail page, e.g.
 * https://datemydish.com/en/reviews/ville-emard/mckiernan/ for a Venue Review
 * or https://datemydish.com/en/date-spots/{slug}/ for a Planning Spot.
 * Pins are English only.
 * @param {{ spotType: string, neighbourhood: string, locales: Record<"en" | "fr-CA", { slug: string }> }} spot
 */
export function buildContentUrl(spot) {
  if (!spot?.locales?.en?.slug) throw new Error(`Cannot build a pin URL for ${spot?.id ?? "an unknown record"}: no English slug`);
  return `${SITE_URL}${dateSpotDetailPath(spot, "en")}`;
}

/** Log entry type for a Date Spot record: "review" (restaurant, bar) or "date-spot". */
export function contentTypeForSpot(spot) {
  return isVenueReviewType(spot.spotType) ? "review" : "date-spot";
}

// Which Pinterest board backs a given log entry type. Planning Spots fall
// back to the reviews board until a dedicated board secret exists.
export function boardIdForType(type) {
  const map = {
    review: process.env.PINTEREST_BOARD_ID_REVIEWS,
    "date-spot": process.env.PINTEREST_BOARD_ID_DATE_SPOTS || process.env.PINTEREST_BOARD_ID_REVIEWS,
  };
  return map[type];
}

// ---------------------------------------------------------------------------
// Local image resolution
//
// New pins carry an explicit `imageFile` (the rendered 1000x1500 pin in
// data/pinterest/). Pins queued before the rework stored a deployed,
// content-hashed URL instead; Astro keeps the source basename in that URL,
// so it can still be found under src/assets/images/.
// ---------------------------------------------------------------------------
const ASSETS_ROOT = "src/assets/images";
let assetIndexCache = null;

function buildAssetIndex() {
  const index = new Map();
  function walk(dir) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else {
        const base = basename(entry.name, extname(entry.name));
        if (!index.has(base)) index.set(base, full);
      }
    }
  }
  if (existsSync(ASSETS_ROOT)) walk(ASSETS_ROOT);
  return index;
}

function assetIndex() {
  if (!assetIndexCache) assetIndexCache = buildAssetIndex();
  return assetIndexCache;
}

// ".../hoogan-et-beaufort-asparagus.tGXbg52Y_1Rmb8v.webp" -> "hoogan-et-beaufort-asparagus"
function basenameFromDeployedUrl(imageSrc) {
  const file = basename(new URL(imageSrc).pathname);
  return file.split(".")[0];
}

/** Resolve a pin to a local file: its `imageFile`, else the source asset behind a stored deployed URL. */
export function resolveLocalAsset({ slug, imageSrc, imageFile }) {
  if (imageFile) {
    if (!existsSync(imageFile)) {
      throw new Error(`Local asset ${imageFile} for ${slug} no longer exists`);
    }
    return imageFile;
  }

  if (imageSrc) {
    const base = basenameFromDeployedUrl(imageSrc);
    const found = assetIndex().get(base);
    if (found) return found;
    throw new Error(`No local asset found for ${slug} matching basename "${base}"`);
  }

  throw new Error(`Cannot resolve a local image for ${slug}: no imageFile or imageSrc`);
}

// Pinterest's image_base64 media source only accepts image/jpeg, image/png,
// or image/gif. Pass jpg/png through as-is; convert everything else (webp)
// to JPEG with sharp.
const PASSTHROUGH_CONTENT_TYPES = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
};

export async function readImageAsBase64(filePath) {
  const ext = extname(filePath).toLowerCase();
  const passthroughType = PASSTHROUGH_CONTENT_TYPES[ext];

  if (passthroughType) {
    const bytes = readFileSync(filePath);
    return { contentType: passthroughType, data: bytes.toString("base64") };
  }

  const { default: sharp } = await import("sharp");
  const bytes = await sharp(filePath).jpeg().toBuffer();
  return { contentType: "image/jpeg", data: bytes.toString("base64") };
}
