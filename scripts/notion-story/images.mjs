// scripts/notion-story/images.mjs
//
// Download and optimise a post's Notion photos: the hero at most 1200px
// wide and under 200 KB, every other photo at most 900px wide and under
// 150 KB, WebP, with a real descriptive filename built from the slug and
// the author's alt text (docs/editorial-publishing-system.md, "SEO rules"
// and "Performance budgets").

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import sharp from "sharp";
import { slugify } from "./fields.mjs";

export const IMAGE_BUDGETS = {
  hero: { maxWidth: 1200, maxBytes: 200 * 1024 },
  other: { maxWidth: 900, maxBytes: 150 * 1024 },
};

/** Where each collection's photos live (the contracts check the path). */
export const IMAGE_DIRS = {
  review: "public/images/date-spots",
  "date-spot": "public/images/date-spots",
  chef: "public/images/profiles",
  "recipe-card": "public/images/contributor-recipes",
};

/**
 * "cabaret-lenfer" + "A cook plating at the pass, seen from the counter"
 * -> "cabaret-lenfer-cook-plating-at-the-pass-seen". Falls back to the
 * position when the author gave no alt text, never to a camera filename.
 * @param {string} slug
 * @param {string} alt
 * @param {number} index
 * @param {Set<string>} [taken] names already used for this post
 */
export function imageFilename(slug, alt, index, taken = new Set()) {
  // "The Cabaret l'Enfer nameplate" should not repeat the slug.
  const described = slugify(alt).replace(/^(?:the-|a-|an-)?/, "");
  const descriptor = (described.startsWith(`${slug}-`) ? described.slice(slug.length + 1) : described)
    .split("-")
    .filter((word) => word && !["a", "an", "the"].includes(word))
    .slice(0, 6)
    .join("-");
  const base = descriptor ? `${slug}-${descriptor}` : `${slug}-photo-${index + 1}`;
  let name = base;
  for (let n = 2; taken.has(name); n++) name = `${base}-${n}`;
  taken.add(name);
  return `${name}.webp`;
}

/**
 * Resize to the budget's width and step the quality down until the file
 * fits. Never upscales.
 * @param {Buffer} input
 * @param {{ maxWidth: number, maxBytes: number }} budget
 * @returns {Promise<{ data: Buffer, width: number, height: number }>}
 */
export async function optimiseImage(input, budget) {
  let width = budget.maxWidth;
  for (;;) {
    for (const quality of [82, 76, 70, 64, 58, 52, 46, 40]) {
      const { data, info } = await sharp(input)
        .rotate()
        .resize({ width, withoutEnlargement: true })
        .webp({ quality, effort: 5 })
        .toBuffer({ resolveWithObject: true });
      if (data.length <= budget.maxBytes) return { data, width: info.width, height: info.height };
    }
    // Still too heavy at the lowest quality: give up some width instead.
    width = Math.round(width * 0.85);
    if (width < 320) throw new Error(`Could not fit the image under ${budget.maxBytes} bytes`);
  }
}

/**
 * Download every source image, optimise it, and write it under the
 * collection's image folder. The hero is `heroIndex` (the first photo
 * unless the agent picks another).
 * @param {import("./parse.mjs").SourceImage[]} images
 * @param {{ slug: string, postType: keyof typeof IMAGE_DIRS, heroIndex?: number, root?: string, fetchImpl?: typeof fetch }} options
 * @returns {Promise<{ src: string, width: number, height: number, bytes: number, alt: string, hero: boolean, notionFile: string }[]>}
 */
export async function downloadImages(images, { slug, postType, heroIndex = 0, root = ".", fetchImpl = fetch }) {
  const dir = IMAGE_DIRS[postType];
  const taken = new Set();
  const results = [];
  for (const [index, image] of images.entries()) {
    if (!/^https?:/.test(image.url)) throw new Error(`Image "${image.file}" has no downloadable URL (was the page fetched with signed file URLs?)`);
    const response = await fetchImpl(image.url);
    if (!response.ok) throw new Error(`Could not download image "${image.file}": HTTP ${response.status}`);
    const hero = index === heroIndex;
    const { data, width, height } = await optimiseImage(Buffer.from(await response.arrayBuffer()), hero ? IMAGE_BUDGETS.hero : IMAGE_BUDGETS.other);
    const filename = imageFilename(slug, image.alt, index, taken);
    const outPath = join(root, dir, filename);
    mkdirSync(dirname(outPath), { recursive: true });
    writeFileSync(outPath, data);
    results.push({ src: `/${dir.replace(/^public\//, "")}/${filename}`, width, height, bytes: data.length, alt: image.alt, hero, notionFile: image.file });
  }
  return results;
}
