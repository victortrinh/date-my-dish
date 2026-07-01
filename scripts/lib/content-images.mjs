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
//
// Dedup strategy: images are keyed primarily by normalized alt text (stable
// across different Astro-generated image sizes/formats of the same source
// photo), falling back to the resolved <img> src. This is a heuristic, not
// pixel comparison, so it can occasionally under- or over-merge, but it's
// deliberately conservative (prefers merging over creating a near-duplicate
// pin) since posting the same photo twice is the exact problem this module
// exists to avoid.

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
