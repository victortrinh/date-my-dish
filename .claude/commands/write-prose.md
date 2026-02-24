# Write Prose

Generate SEO blog prose (MDX body) for an English recipe that has completed frontmatter.

## Input
- Recipe slug: $ARGUMENTS

## Steps

1. **Locate and read the recipe:**
   - Read `src/content/recipes/en/{slug}.mdx`
   - Extract all frontmatter data: title, description, ingredients, instructions, FAQs, categories, cuisine, keywords

2. **Validate frontmatter readiness:**
   - Verify ingredient groups contain real items (not "Item 1", "Item 2" placeholders)
   - Verify instruction steps contain real text (not "Step description here" placeholders)
   - Verify at least 3 FAQs with real content
   - If frontmatter has placeholders, STOP and tell the user to fill in real recipe data first

3. **Check for existing prose:**
   - If the MDX body already contains content beyond heading skeletons, show the existing prose and ask the user to confirm before overwriting
   - If the body is empty or only contains `## Heading` skeletons from `/new-recipe`, proceed

4. **Discover available images:**
   - Scan `src/assets/images/recipes/` for files matching `{slug}*` (any extension: .jpg, .webp, .png)
   - Identify hero image (`{slug}.jpg` or similar) and step/process images
   - These will be imported and placed as `<Picture>` components in the prose

5. **Analyze existing recipe prose for patterns:**
   - Read 2-3 existing recipes' MDX bodies (e.g., `cacio-e-pepe.mdx`, `quinoa-crusted-salmon.mdx`) to match:
     - H2 section structure (typically 5-8 sections)
     - Tone and voice (authoritative, technique-focused, warm)
     - Cross-link placement patterns
     - `<Picture>` component placement within sections

6. **Select internal cross-links:**
   - List all EN recipe slugs and their `recipeCategory` values
   - Pick 1 recipe from the same category as the current recipe
   - Pick 1 recipe from a different category (for variety)
   - Prefer recipes with fewer inbound links (grep each slug across all MDX bodies, pick least-linked)
   - Also include 1 category page link: `/en/recipes/category/{category}/`
   - Verify every linked recipe file exists before including

7. **Generate the MDX body prose:**

   **Structure to follow:**

   ```mdx
   import { Picture } from "astro:assets";
   import imgExample from "../../../assets/images/recipes/{slug}-example.jpg";

   [Opening paragraph — hook the reader. Why this recipe matters, what makes it special. 2-3 sentences. Naturally include the recipe title and a primary keyword.]

   ## [Technique or Ingredient Deep-Dive 1]

   [2-3 paragraphs exploring a key technique, ingredient choice, or cultural context from the recipe. Reference specific ingredients and steps from the frontmatter without repeating them verbatim.]

   <Picture
     src={imgExample}
     alt="Descriptive alt text including dish name (~125 chars)"
     widths={[400, 600, 900]}
     sizes="(max-width: 896px) 100vw, 896px"
     formats={["avif", "webp"]}
     class="my-6 w-full rounded-lg"
     loading="lazy"
   />

   ## [Technique or Ingredient Deep-Dive 2]

   [2-3 paragraphs on another aspect...]

   ## [Tips, Variations, or Substitutions]

   [Practical tips, ingredient swaps, make-ahead advice. Draw from FAQ answers for inspiration but don't duplicate them.]

   ## Serving Suggestions

   [How to plate, what to pair with. Include 2-3 internal cross-links here:]
   - Link to a related recipe: [recipe name](/en/recipes/{slug}/)
   - Link to another recipe: [recipe name](/en/recipes/{slug}/)
   - Link to a category page: [category](/en/recipes/category/{category}/)

   ## [Why This Recipe Stands Out / Final Thought]

   [Closing paragraph — why this dish is worth making, what the reader will experience.]
   ```

   **Prose rules:**
   - Target 800-1500 words
   - 5-8 H2 sections
   - Naturally weave in keywords from the frontmatter `keywords` array (no keyword stuffing)
   - Reference ingredients and techniques from the frontmatter but do NOT repeat instruction steps verbatim
   - Place `<Picture>` components at contextually relevant spots (e.g., image of sauce-making near the sauce section)
   - Cross-links should read naturally in context, not feel forced
   - Write in second person or third person, not first person ("you" not "I")
   - Use the authoritative, technique-focused tone of existing recipes

8. **Write the prose:**
   - Write ONLY the MDX body (everything after the closing `---` of frontmatter)
   - NEVER modify frontmatter
   - The output replaces the existing MDX body content

9. **Post-generation:**
   - Run `npx astro check` to validate
   - Count words in the generated prose
   - Report: word count, number of H2 sections, number of images used, number of cross-links
   - Remind the user to run `/translate-recipe {slug}` to generate the French version

## Alt Text Guidelines for Picture Components
- Descriptive, ~125 characters max
- Include the dish name naturally
- Describe what's visible: colors, textures, arrangement
- No "Image of" or "Picture of" prefix
- Good: `"Golden seared salmon fillet with crispy quinoa crust on a bed of wilted greens"`
- Bad: `"Image of salmon recipe step 3"`
