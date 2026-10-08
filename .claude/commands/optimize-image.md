# Optimize Image

Check, and when needed re-optimise, the photos of a published post against the image budgets in `docs/editorial-publishing-system.md` ("SEO rules", "Performance budgets").

The Importer (`node scripts/notion-import.mjs next`) already downloads and optimises every Notion photo when it imports a post. Use this command to audit those files, or to redo one that misses a budget. Photos come from Notion only: never add a photo that is not on the post's Notion page, and never use an AI-generated image.

## Input
- A post slug, or one or more image paths under `public/images/`: $ARGUMENTS

## Budgets

| Photo | Max width | Max size | Format |
|---|---|---|---|
| Hero | 1200px | 200 KB | WebP (the page serves AVIF and WebP with a WebP fallback) |
| Every other photo | 900px | 150 KB | WebP |

Where photos live (the contracts check the path):

| Post type | Folder |
|---|---|
| Review, Date Spot | `public/images/date-spots/` |
| Chef | `public/images/profiles/` |
| Chef Recipe Card | `public/images/contributor-recipes/` |

## Steps

1. **List the photos.** For a slug, read the record in its collection (`src/content/date-spots.json`, `extended-profiles.json` or `contributor-recipes.json`) and collect `image` and every photo's `src`. Note which one is the hero.

2. **Measure** each file's width, height and size (`node -e "require('sharp')('<file>').metadata().then(m => console.log(m.width, m.height, m.format))"` and `ls -l`).

3. **Re-optimise** any file over budget with the Importer's own function, so the result matches what the pipeline produces:

   ```bash
   node --input-type=module -e "
   import { readFileSync, writeFileSync } from 'node:fs';
   import { optimiseImage, IMAGE_BUDGETS } from './scripts/notion-story/images.mjs';
   const [file, kind] = process.argv.slice(1);
   const { data, width, height } = await optimiseImage(readFileSync(file), IMAGE_BUDGETS[kind]);
   writeFileSync(file, data);
   console.log(file, width, height, data.length);
   " public/images/date-spots/<file>.webp hero
   ```

   Use `hero` or `other` as the budget. It never upscales; it steps the quality down, then the width, until the file fits. If the dimensions changed, update the photo's `width` and `height` in the record (they must match the file; every `<img>` sets both). That is a data fix, not a prose edit.

4. **Check names and alt text.** Filenames are descriptive (`{slug}-{what-the-photo-shows}.webp`, as `imageFilename()` in `scripts/notion-story/images.mjs` builds them), never camera names like `IMG_4521`. Alt text describes the plate or the place, with no "Image of" prefix. Hero alt text lives in the Companion File (`locales.{en,fr-CA}.imageAlt` in `src/content/editorial/{slug}.json`); fix it there. Do not rename a file without updating every reference to it.

5. **Verify**: `npm run validate:source` (the publish gate rechecks the photo budgets) and `npm run build` (`validate-build` fails a hero source over 200 KB, any `<img>` without width and height, and a below-the-fold image without `loading="lazy"`).

6. **Report** a table: file, role (hero or other), before and after (width, size), and any alt text or dimension changes.
