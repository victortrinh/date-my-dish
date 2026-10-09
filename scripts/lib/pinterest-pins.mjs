// scripts/lib/pinterest-pins.mjs
// What a Date Spot's pins say and look like. Spec:
// docs/editorial-publishing-system.md ("Pinterest").
//
//   - Copy is assembled from the English meta title, meta description and
//     verdict line (verdict label + its one-line reason). No new prose, and
//     never an em-dash.
//   - Images are the post's own photos (the hero plus every photo the page
//     shows), cropped to 1000x1500 with a title overlay rendered here. No
//     generated imagery: a landscape photo is letterboxed over a blurred copy
//     of itself, never extended.
//   - English only; the pin links to the nested English URL.

import { readFileSync } from "fs";
import { join } from "path";

export const PIN_WIDTH = 1000;
export const PIN_HEIGHT = 1500;
const TITLE_MAX = 100; // Pinterest pin title limit
const DESCRIPTION_MAX = 800; // Pinterest pin description limit
const ALT_MAX = 500;

const EN_STRINGS = JSON.parse(readFileSync(new URL("../../src/i18n/en.json", import.meta.url), "utf8"));
/** The verdict labels the page shows ("A favourite", "Depends on the night", "Not our first pick"). */
export const VERDICT_LABELS = EN_STRINGS.dateSpot.verdict;

const GENERIC_IMAGE = "/images/og-default.jpg";

// ---------------------------------------------------------------------------
// Copy
// ---------------------------------------------------------------------------

/** Normalise copy for a pin: em-dashes become commas, whitespace collapses. */
export function cleanCopy(value) {
  return String(value ?? "")
    .replace(/\s*—\s*/g, ", ")
    .replace(/\s+/g, " ")
    .trim();
}

function clip(value, max) {
  if (value.length <= max) return value;
  const cut = value.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).replace(/[\s,;:.]+$/, "")}…`;
}

/** First paragraph of the verdict reason (the page shows it under the verdict badge). */
function verdictReason(copy) {
  return cleanCopy(String(copy.verdictReason ?? "").split(/\n\s*\n/)[0]);
}

/** "A favourite: A lively brunch and lunch in a large industrial room with plenty of daylight." */
export function verdictLine(spot) {
  const label = VERDICT_LABELS[spot.reviewVerdict];
  if (!label) throw new Error(`${spot.id}: unknown verdict "${spot.reviewVerdict}"`);
  const reason = verdictReason(spot.locales.en);
  return reason ? `${label}: ${reason}` : label;
}

/** Split "McKiernan, Ville-Émard: Brunch & Date Guide" into its lead and its tail. */
function splitMetaTitle(metaTitle) {
  const index = metaTitle.indexOf(": ");
  if (index === -1) return { lead: metaTitle, tail: "" };
  return { lead: metaTitle.slice(0, index), tail: metaTitle.slice(index + 2) };
}

/**
 * Pin copy for one variant, from the English meta title, meta description and
 * verdict line only.
 *   - "title": overlay leads with the meta title; description is the meta
 *     description then the verdict line.
 *   - "verdict": overlay leads with the verdict reason; description puts the
 *     verdict line first.
 * @param {Record<string, any>} spot a Date Spot record with its Companion File merged in
 * @param {"title" | "verdict"} [variant]
 */
export function assemblePinCopy(spot, variant = "title") {
  const copy = spot.locales?.en;
  if (!copy?.metaTitle || !copy?.metaDescription) throw new Error(`${spot.id}: pins need an English meta title and meta description`);
  const metaTitle = cleanCopy(copy.metaTitle);
  const metaDescription = cleanCopy(copy.metaDescription);
  const verdict = verdictLine(spot);
  const label = VERDICT_LABELS[spot.reviewVerdict];
  const { lead, tail } = splitMetaTitle(metaTitle);

  if (variant === "title") {
    return {
      title: clip(metaTitle, TITLE_MAX),
      description: clip(`${metaDescription} ${verdict}`, DESCRIPTION_MAX),
      overlay: { kicker: label, heading: lead, subheading: tail },
    };
  }
  if (variant === "verdict") {
    return {
      title: clip(metaTitle, TITLE_MAX),
      description: clip(`${verdict} ${metaDescription}`, DESCRIPTION_MAX),
      overlay: { kicker: label, heading: verdictReason(copy) || lead, subheading: lead },
    };
  }
  throw new Error(`Unknown pin variant "${variant}"`);
}

// ---------------------------------------------------------------------------
// Photos and pin sets
// ---------------------------------------------------------------------------

function collectPhotoRefs(value, found = []) {
  if (Array.isArray(value)) value.forEach((item) => collectPhotoRefs(item, found));
  else if (value && typeof value === "object") {
    if (typeof value.photo === "string" && typeof value.alt === "string") found.push({ key: value.photo, alt: value.alt });
    for (const child of Object.values(value)) collectPhotoRefs(child, found);
  }
  return found;
}

/**
 * The real photos the English page shows: the hero, then every photo a
 * section references, in page order, each once.
 * @returns {{ key: string, src: string, width: number, height: number, alt: string }[]}
 */
export function postPhotos(spot) {
  const copy = spot.locales.en;
  const photos = [];
  if (spot.image?.src && spot.image.src !== GENERIC_IMAGE) {
    photos.push({ key: "hero", src: spot.image.src, width: spot.image.width, height: spot.image.height, alt: cleanCopy(copy.imageAlt) });
  }
  const seen = new Set(["hero"]);
  for (const ref of collectPhotoRefs(copy)) {
    const photo = spot.photos?.[ref.key];
    if (!photo || seen.has(ref.key) || photo.src === GENERIC_IMAGE) continue;
    seen.add(ref.key);
    photos.push({ key: ref.key, src: photo.src, width: photo.width, height: photo.height, alt: cleanCopy(ref.alt) });
  }
  return photos;
}

/**
 * A Date Spot's pin set: one pin per post photo, alternating the title and
 * verdict variants. A post with a single photo gets both variants on it, so
 * every set carries the meta title and the verdict.
 * @returns {{ imageKey: string, photo: ReturnType<typeof postPhotos>[number], variant: "title" | "verdict" }[]}
 */
export function planPinSet(spot) {
  const photos = postPhotos(spot);
  if (photos.length === 0) return [];
  const items = photos.length === 1
    ? [{ photo: photos[0], variant: "title" }, { photo: photos[0], variant: "verdict" }]
    : photos.map((photo, index) => ({ photo, variant: index % 2 === 0 ? "title" : "verdict" }));
  return items.map((item) => ({ ...item, imageKey: `${spot.id}--${item.photo.key}--${item.variant}` }));
}

/** Where a rendered pin image lives, e.g. data/pinterest/mckiernan-hero-title.jpg. */
export function pinImagePath(spot, item, dir = "data/pinterest") {
  return join(dir, `${spot.id}-${item.photo.key}-${item.variant}.jpg`);
}

/** Alt text for a pin: the photo's own alt text from the post. */
export function pinAltText(item) {
  return clip(item.photo.alt, ALT_MAX);
}

// ---------------------------------------------------------------------------
// Rendering (sharp + an SVG overlay)
// ---------------------------------------------------------------------------

function escapeXml(value) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

/** Greedy word wrap by an approximate characters-per-line budget. */
export function wrapText(text, maxChars) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (next.length > maxChars && line) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines;
}

const SERIF = "'Playfair Display', Georgia, 'DejaVu Serif', serif";
const SANS = "Inter, 'Helvetica Neue', Arial, 'DejaVu Sans', sans-serif";
const TEXT_WIDTH = PIN_WIDTH - 2 * 70;

// Average glyph width as a fraction of the font size, for wrapping.
const SERIF_RATIO = 0.57;
const SANS_RATIO = 0.52;

function fitLines(text, sizes, maxLines, ratio) {
  for (const size of sizes) {
    const lines = wrapText(text, Math.floor(TEXT_WIDTH / (size * ratio)));
    if (lines.length <= maxLines) return { size, lines };
  }
  const size = sizes[sizes.length - 1];
  const lines = wrapText(text, Math.floor(TEXT_WIDTH / (size * ratio)));
  return { size, lines: [...lines.slice(0, maxLines - 1), `${lines.slice(maxLines - 1).join(" ").slice(0, Math.floor(TEXT_WIDTH / (size * ratio)) - 1)}…`] };
}

/** The overlay as an SVG string: bottom gradient, verdict kicker, heading, subheading, site name. */
export function overlaySvg({ kicker, heading, subheading }) {
  const x = 70;
  const head = fitLines(heading, [78, 70, 62, 56, 50], 4, SERIF_RATIO);
  const sub = subheading ? fitLines(subheading, [42, 38, 34], 2, SANS_RATIO) : { size: 0, lines: [] };
  const kickerSize = 32;
  const footerSize = 28;

  // Lay out bottom-up from the site name.
  const parts = [];
  let y = PIN_HEIGHT - 70;
  parts.push(`<text x="${x}" y="${y}" font-family="${SANS}" font-size="${footerSize}" fill="#F3E9DF" fill-opacity="0.85">datemydish.com</text>`);
  y -= footerSize + 34;
  for (const line of [...sub.lines].reverse()) {
    parts.push(`<text x="${x}" y="${y}" font-family="${SANS}" font-size="${sub.size}" fill="#FFFFFF" fill-opacity="0.92">${escapeXml(line)}</text>`);
    y -= Math.round(sub.size * 1.3);
  }
  if (sub.lines.length) y -= 14;
  for (const line of [...head.lines].reverse()) {
    parts.push(`<text x="${x}" y="${y}" font-family="${SERIF}" font-size="${head.size}" font-style="italic" font-weight="700" fill="#FFFFFF">${escapeXml(line)}</text>`);
    y -= Math.round(head.size * 1.18);
  }
  y -= 10;
  parts.push(`<text x="${x}" y="${y}" font-family="${SANS}" font-size="${kickerSize}" font-weight="700" fill="#D4A853">${escapeXml(kicker)}</text>`);
  const top = Math.max(0, y - kickerSize - 220);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${PIN_WIDTH}" height="${PIN_HEIGHT}" viewBox="0 0 ${PIN_WIDTH} ${PIN_HEIGHT}">
<defs><linearGradient id="shade" x1="0" y1="0" x2="0" y2="1">
<stop offset="0" stop-color="#1A100C" stop-opacity="0"/>
<stop offset="0.35" stop-color="#1A100C" stop-opacity="0.62"/>
<stop offset="1" stop-color="#1A100C" stop-opacity="0.9"/>
</linearGradient></defs>
<rect x="0" y="${top}" width="${PIN_WIDTH}" height="${PIN_HEIGHT - top}" fill="url(#shade)"/>
${parts.reverse().join("\n")}
</svg>`;
}

/**
 * Render one pin: the real photo at 1000x1500 plus the overlay, as JPEG.
 * Photos near 2:3 are cropped to fill; others are fitted over a blurred,
 * darkened copy of the same photo.
 * @param {{ sourcePath: string, overlay: { kicker: string, heading: string, subheading?: string }, outPath: string }} options
 */
export async function renderPinImage({ sourcePath, overlay, outPath }) {
  const { default: sharp } = await import("sharp");
  const meta = await sharp(sourcePath).metadata();
  const ratio = meta.width / meta.height;
  const target = PIN_WIDTH / PIN_HEIGHT;

  let base;
  if (Math.abs(ratio - target) / target <= 0.2) {
    base = await sharp(sourcePath).resize(PIN_WIDTH, PIN_HEIGHT, { fit: "cover", position: "attention" }).toBuffer();
  } else {
    const background = await sharp(sourcePath).resize(PIN_WIDTH, PIN_HEIGHT, { fit: "cover" }).blur(40).modulate({ brightness: 0.6 }).toBuffer();
    const fitted = await sharp(sourcePath).resize(PIN_WIDTH, PIN_HEIGHT, { fit: "inside" }).toBuffer({ resolveWithObject: true });
    const top = Math.max(0, Math.round((PIN_HEIGHT * 0.62 - fitted.info.height) / 2));
    base = await sharp(background).composite([{ input: fitted.data, top, left: Math.round((PIN_WIDTH - fitted.info.width) / 2) }]).toBuffer();
  }

  await sharp(base)
    .composite([{ input: Buffer.from(overlaySvg({ subheading: "", ...overlay })), top: 0, left: 0 }])
    .jpeg({ quality: 80, mozjpeg: true })
    .toFile(outPath);
}
