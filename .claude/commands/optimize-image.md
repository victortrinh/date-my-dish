# Optimize Image

Process and optimize recipe images: hero, step, and batch processing with correct naming and sizing.

## Input
- Image file path(s) or directory: $ARGUMENTS

## Steps

1. **Analyze the image(s):**
   - Read the image file(s)
   - Get dimensions and file size
   - Determine image type (hero or step) based on filename or user input

2. **Determine content type and rename descriptively:**
   - Ask for the recipe or article slug if not obvious from the filename
   - Determine if the image is for a recipe or article (ask if unclear from context)
   - Hero image: `{slug}.jpg`
   - Step images (recipes only): `{slug}-step-{n}.jpg` (numbered sequentially)
   - Use lowercase, hyphens, no spaces

3. **Resize for web:**

   **Hero image:**
   - Max 1200px wide, maintain aspect ratio
   - Target file size: under 200KB for JPEG source (Astro creates AVIF/WebP)
   - Quality: 82
   ```bash
   node -e "require('sharp')('input.jpg').resize(1200, null, {withoutEnlargement: true}).jpeg({quality: 82}).toFile('output.jpg')"
   ```

   **Step images:**
   - Max 900px wide, maintain aspect ratio
   - Target file size: under 150KB for JPEG source
   - Quality: 80
   ```bash
   node -e "require('sharp')('input.jpg').resize(900, null, {withoutEnlargement: true}).jpeg({quality: 80}).toFile('output.jpg')"
   ```

4. **Batch processing (multiple images):**
   When given a directory or multiple files:
   - Identify which image is the hero (largest/best composed, or ask user)
   - Number remaining images as step-1, step-2, etc. in logical cooking order
   - Process all with appropriate sizing (hero vs step)
   - Report summary table of all processed images

5. **Move to correct location:**
   - Recipe images: move to `src/assets/images/recipes/`
   - Article images: move to `src/assets/images/articles/`

6. **Output frontmatter paths and alt text guidance:**
   ```yaml
   # Recipe hero image
   heroImage: "../../../assets/images/recipes/{slug}.jpg"
   heroImageAlt: "Descriptive alt text here (~125 chars, include dish name)"

   # Recipe step images (in instruction steps) -- uses image() imports
   instructionGroups:
     - steps:
         - text: "Step description"
           image: "../../../assets/images/recipes/{slug}-step-1.jpg"

   # Article hero image
   heroImage: "../../../assets/images/articles/{slug}.jpg"
   heroImageAlt: "Descriptive alt text here (~125 chars)"
   ```

   **Note**: Articles only need a hero image (no step images). Recipe step images use Astro `image()` imports (relative paths), not URL strings.

7. **Verify:**
   - Check final file sizes (hero < 200KB, step < 150KB)
   - Run `npx astro check` to verify image references
   - Report image count (target: 5-7 total per recipe)

## Image Size Targets

| Image Type | Max Width | Max File Size | Quality |
|------------|-----------|---------------|---------|
| Hero | 1200px | 200KB | 82 |
| Step | 900px | 150KB | 80 |
| Pinterest | 1000x1500 | 200KB | 85 |

## Image Guidelines
- Source images should be at least 1200px wide (hero) or 900px wide (step)
- Use descriptive filenames (chocolate-crepes.jpg, not IMG_4521.jpg)
- Target 5-7 images per recipe (1 hero + 3-5 step images)
- Original process photos demonstrate E-E-A-T Experience (proves you cooked it)

## Alt Text Guidelines
- Descriptive, ~125 characters max
- Include the dish name naturally
- Describe what's visible: colors, textures, arrangement, setting
- No "Image of" or "Picture of" prefix

**Hero image alt text** -- describe the finished dish:
- Good: `"Stack of golden French crepes drizzled with melted dark chocolate on a white plate"`
- Bad: `"Chocolate crepes recipe"`

**Step image alt text** -- describe the cooking action/state:
- Good: `"Beef chunks searing in a hot Dutch oven with golden brown crust forming"`
- Bad: `"Step 3 of the recipe"`

## Pinterest Images (Deferred)

Pinterest-optimized images (1000x1500, 2:3 ratio) are deferred until the site has 30+ published recipes. Pinterest requires a minimum content library (30 recipes to start testing, 50+ for real momentum). The `pinterestImage` field exists in the schema for future use.

When ready to enable:
- Filename: `{recipe-slug}-pinterest.jpg`
- Crop/resize to 2:3 ratio from center
- Add text overlay with recipe name and brand URL
- Process with quality 85
