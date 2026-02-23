# Optimize Image

Process and optimize a recipe image: rename descriptively, resize for web, generate Pinterest variant, and output frontmatter paths.

## Input
- Image file path: $ARGUMENTS

## Steps

1. **Analyze the image:**
   - Read the image file
   - Get dimensions and file size
   - Determine if it needs resizing

2. **Rename descriptively:**
   - Ask for the recipe slug if not obvious from the filename
   - Rename to: `{recipe-slug}.jpg` (main hero)
   - Use lowercase, hyphens, no spaces

3. **Resize for web:**
   - Hero image: max 1200px wide, maintain aspect ratio
   - Target file size: under 200KB for JPEG source (Astro will create AVIF/WebP)
   - Use sharp to resize and compress:
     ```
     node -e "require('sharp')('input.jpg').resize(1200, null, {withoutEnlargement: true}).jpeg({quality: 82}).toFile('output.jpg')"
     ```

4. **Generate Pinterest variant (optional):**
   - Pinterest optimal: 1000x1500 (2:3 ratio)
   - Filename: `{recipe-slug}-pinterest.jpg`
   - Crop/resize to 2:3 ratio from center

5. **Move to correct location:**
   - Move processed images to `src/assets/images/recipes/`

6. **Output frontmatter paths:**
   ```yaml
   heroImage: "../../../assets/images/recipes/{recipe-slug}.jpg"
   heroImageAlt: "Descriptive alt text here"
   pinterestImage: "../../../assets/images/recipes/{recipe-slug}-pinterest.jpg"
   ```

7. **Verify:**
   - Check final file sizes
   - Run `npx astro check` to verify image references

## Image Guidelines
- Source images should be at least 1200px wide
- Use descriptive filenames (chocolate-crepes.jpg, not IMG_4521.jpg)
- Alt text should describe what's visible, not just the recipe name
- Example good alt: "Stack of golden French crêpes drizzled with melted dark chocolate on a white plate"
- Example bad alt: "Chocolate crêpes recipe"
