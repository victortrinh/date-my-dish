// scripts/lib/content-images.mjs
// Shared, content-type-aware helpers for the Pinterest posting pipeline.
//
// Responsibilities:
//   - Know the URL / directory conventions for recipes, articles, and reviews
//   - Fetch a deployed page and discover every postable photo on it (hero +
//     any body/step images), not just the hero
//   - Dedupe images that appear more than once on a page (e.g. a review's
//     hero photo is rendered once as the banner and again inline in the
//     prose body; a recipe step photo is sometimes also reused inline)
//   - Resolve a pin's image back to its original source file under
//     src/assets/images/ so posting can upload bytes directly instead of
//     depending on a content-hashed dist URL staying alive until the pin's
//     scheduled post date
//
// Dedup strategy: images are keyed primarily by normalized alt text (stable
// across different Astro-generated image sizes/formats of the same source
// photo), falling back to the resolved <img> src. This is a heuristic, not
// pixel comparison, so it can occasionally under- or over-merge, but it's
// deliberately conservative (prefers merging over creating a near-duplicate
// pin) since posting the same photo twice is the exact problem this module
// exists to avoid.

import { readFileSync, readdirSync, existsSync } from "fs";
import { join, dirname, basename, extname } from "path";
import matter from "gray-matter";

export const SITE_URL = "https://datemydish.com";

export const CONTENT_TYPES = {
  recipe: { dir: "src/content/recipes", urlSegment: "recipes", label: "Recipe" },
  article: { dir: "src/content/articles", urlSegment: "articles", label: "Article" },
  review: { dir: "src/content/reviews", urlSegment: "reviews", label: "Review" },
};

const FETCH_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (compatible; DateMyDishBot/1.0; +https://datemydish.com)",
};

// ---------------------------------------------------------------------------
// URL / path helpers
// ---------------------------------------------------------------------------
export function buildContentUrl(type, slug) {
  const cfg = CONTENT_TYPES[type];
  if (!cfg) throw new Error(`Unknown content type: ${type}`);
  return `${SITE_URL}/en/${cfg.urlSegment}/${slug}/`;
}

export function contentDir(type, lang = "en") {
  const cfg = CONTENT_TYPES[type];
  if (!cfg) throw new Error(`Unknown content type: ${type}`);
  return `${cfg.dir}/${lang}`;
}

// Which Pinterest board ID env var backs a given content type.
// Recipes keep the original env var name for backward compatibility with
// existing GitHub secrets / already-scheduled pins.
export function boardIdForType(type) {
  const map = {
    recipe: process.env.PINTEREST_BOARD_ID,
    article: process.env.PINTEREST_BOARD_ID_ARTICLES,
    review: process.env.PINTEREST_BOARD_ID_REVIEWS,
  };
  return map[type];
}

// ---------------------------------------------------------------------------
// HTML fetch
// ---------------------------------------------------------------------------
export async function fetchLiveHtml(url) {
  const res = await fetch(url, { headers: FETCH_HEADERS });
  if (!res.ok) {
    throw new Error(`Failed to fetch ${url}: HTTP ${res.status} ${res.statusText}`);
  }
  return res.text();
}

// ---------------------------------------------------------------------------
// Hero image (from Recipe/BlogPosting JSON-LD, already reliable today)
// ---------------------------------------------------------------------------
function extractHeroFromJsonLd(html) {
  const match = html.match(
    /<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/
  );
  if (!match) return null;

  try {
    const jsonLd = JSON.parse(match[1]);
    const image = Array.isArray(jsonLd.image) ? jsonLd.image[0] : jsonLd.image;
    return image ? { src: absolutize(image) } : null;
  } catch {
    return null;
  }
}

function absolutize(src) {
  if (!src) return src;
  if (/^https?:\/\//.test(src)) return src;
  return new URL(src, SITE_URL).toString();
}

function decodeHtmlEntities(str) {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function normalizeAlt(alt) {
  return (alt || "").trim().toLowerCase().replace(/\s+/g, " ");
}

// ---------------------------------------------------------------------------
// Body / step content images
//
// Every content <Picture> on the site (hero re-embeds, inline body photos,
// and recipe step photos rendered by InstructionSteps.astro) sets
// loading="lazy" or loading="eager". Nav/footer/search chrome images do not
// use those attributes with the Picture component's output shape, so this
// is a reasonably safe way to isolate "content" images with a regex scan
// (no DOM parser dependency needed).
//
// Recipe step images additionally carry data-pin-url / data-pin-description,
// written specifically for this purpose in InstructionSteps.astro.
// ---------------------------------------------------------------------------
function extractContentImages(html) {
  const images = [];
  const imgTagRe = /<img\b[^>]*>/gi;
  let match;

  while ((match = imgTagRe.exec(html))) {
    const tag = match[0];
    if (!/\bloading="(lazy|eager)"/.test(tag)) continue;
    // Author photo (AuthorBioCard) and related-content card thumbnails
    // (RecipeCard/ArticleCard/ReviewCard) explicitly opt out with this
    // attribute since they aren't photos of *this* piece of content.
    if (/\bdata-pin-nopin="true"/.test(tag)) continue;

    const srcMatch = tag.match(/\bsrc="([^"]+)"/);
    if (!srcMatch) continue;

    const altMatch = tag.match(/\balt="([^"]*)"/);
    const pinUrlMatch = tag.match(/\bdata-pin-url="([^"]*)"/);
    const pinDescMatch = tag.match(/\bdata-pin-description="([^"]*)"/);

    images.push({
      src: absolutize(srcMatch[1]),
      alt: altMatch ? decodeHtmlEntities(altMatch[1]) : "",
      pinUrl: pinUrlMatch ? decodeHtmlEntities(pinUrlMatch[1]) : null,
      pinDescription: pinDescMatch ? decodeHtmlEntities(pinDescMatch[1]) : null,
      isStepImage: /class="[^"]*\bstep-image\b/.test(tag),
    });
  }

  return images;
}

// ---------------------------------------------------------------------------
// Public: discover every unique postable image from already-fetched HTML.
// Returns an ordered array: [{ src, alt, pinDescription, isHero, isStepImage }]
// Hero is always first (if found). Duplicates (same alt text, normalized)
// are dropped, keeping the first occurrence.
// ---------------------------------------------------------------------------
export function discoverImagesFromHtml(html, { heroAlt } = {}) {
  const hero = extractHeroFromJsonLd(html);
  const contentImages = extractContentImages(html);

  const seenAlt = new Set();
  const seenSrc = new Set();
  const result = [];

  if (hero) {
    if (heroAlt) seenAlt.add(normalizeAlt(heroAlt));
    seenSrc.add(hero.src);
    result.push({ src: hero.src, alt: heroAlt || "", isHero: true });
  }

  for (const img of contentImages) {
    const altKey = normalizeAlt(img.alt);
    if (altKey && seenAlt.has(altKey)) continue; // same photo, different render size
    if (seenSrc.has(img.src)) continue;

    if (altKey) seenAlt.add(altKey);
    seenSrc.add(img.src);

    result.push({
      src: img.src,
      alt: img.alt,
      pinDescription: img.pinDescription || null,
      isHero: false,
      isStepImage: img.isStepImage,
    });
  }

  return result;
}

// Convenience wrapper: fetch a live URL then discover images from it.
export async function discoverImages(url, opts = {}) {
  const html = await fetchLiveHtml(url);
  return discoverImagesFromHtml(html, opts);
}

// ---------------------------------------------------------------------------
// Stable, short key for an image, used to identify a pin in the log so
// re-running discovery is idempotent (never creates a second pin for an
// image we've already logged, and never touches an existing pin's data).
// ---------------------------------------------------------------------------
export function imageKeyFor(image) {
  const basis = normalizeAlt(image.alt) || image.src;
  let hash = 0;
  for (let i = 0; i < basis.length; i++) {
    hash = (hash * 31 + basis.charCodeAt(i)) >>> 0;
  }
  return `img_${hash.toString(36)}`;
}

// ---------------------------------------------------------------------------
// Local source asset resolution
//
// Pins store the deployed, content-hashed image URL at scheduling time
// (e.g. /_astro/hoogan-et-beaufort-asparagus.tGXbg52Y_1Rmb8v.webp) but may
// not post until days or weeks later, by which point a re-optimized image
// can have a different hash and the stored URL 404s. Astro's hashed output
// filenames always preserve the original source basename, so that basename
// is a stable, hash-independent way to find the real file under
// src/assets/images/ and post its bytes directly instead of trusting a URL
// to stay alive.
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

// Extract the source basename from a deployed asset URL, e.g.
// ".../hoogan-et-beaufort-asparagus.tGXbg52Y_1Rmb8v.webp" -> "hoogan-et-beaufort-asparagus"
function basenameFromDeployedUrl(imageSrc) {
  const file = basename(new URL(imageSrc).pathname);
  return file.split(".")[0];
}

function heroImagePathFromFrontmatter(type, slug) {
  const filePath = join(contentDir(type, "en"), `${slug}.mdx`);
  if (!existsSync(filePath)) return null;
  const raw = readFileSync(filePath, "utf-8");
  const { data } = matter(raw);
  if (!data.heroImage) return null;
  // heroImage is a relative import path from the mdx file's own directory,
  // e.g. "../../../assets/images/recipes/slug.jpg"
  return join(dirname(filePath), data.heroImage);
}

// Resolve a pin back to its source file under src/assets/images/.
// Resolution order: an explicit imageFile (new pins carry this), then the
// basename of a stored deployed URL looked up in the asset index, then
// (for legacy pins with neither) the content's own heroImage frontmatter.
export function resolveLocalAsset({ type, slug, imageSrc, imageFile }) {
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

  const heroPath = heroImagePathFromFrontmatter(type, slug);
  if (heroPath && existsSync(heroPath)) return heroPath;

  throw new Error(`Cannot resolve a local image for ${slug}: no imageFile, imageSrc, or heroImage`);
}

// Pinterest's image_base64 media source only accepts image/jpeg, image/png,
// or image/gif. Pass jpg/png through as-is; convert everything else (webp,
// the format most new assets are saved in) to JPEG with sharp.
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
