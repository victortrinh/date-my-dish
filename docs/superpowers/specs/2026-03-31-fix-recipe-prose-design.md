# Fix 4 Recipe Prose: Notion Adaptation Pattern — Design Spec

**Problem:** The 4 recipes batch-published on 2026-03-30 (commit `dd04a70`) used `/write-prose` to generate prose from scratch instead of following the Notion adaptation convention defined in `daily-content-publish` step 11. The result is AI-generated prose that rewrites the author's voice rather than preserving it.

**Goal:** Rewrite the MDX prose body for all 4 recipes (EN + FR) using the original Notion blocks as the foundation, following the same pattern used in the retrofit (commit `052f025`).

---

## Recipes to Fix

| # | EN slug | FR slug |
|---|---------|---------|
| 63 | `lamb-meatballs-gochujang-glaze` | `boulettes-agneau-gochujang` |
| 65 | `3-day-aged-miso-duck-breast` | `magret-canard-miso-3-jours` |
| 66 | `pate-a-choux` | `pate-a-choux` |
| 73 | `chocolate-tofu-pudding` | `pouding-au-chocolat-et-tofu` |

## Source Data

Notion blocks are preserved in git at commit `51008da` in files:
- `notion/pending-recipe-63.json`
- `notion/pending-recipe-65.json`
- `notion/pending-recipe-66.json`
- `notion/pending-recipe-73.json`

## What Changes

**Only the MDX prose body** (everything after the frontmatter `---` closing). Frontmatter stays as-is since it was correctly mapped from Notion data.

## Adaptation Rules (from `daily-content-publish` step 11)

1. **Notion blocks are the foundation.** Do not rewrite from scratch.
2. **Restructure H3/sub_sub_header into H2 sections** (~6 sections for recipes).
3. **Convert bullet lists to flowing prose paragraphs** where appropriate. Keep lists that read better as lists (e.g., "Why You'll Love This" bullets can become prose, shopping notes can stay as tips woven into paragraphs).
4. **Strip sections that live in frontmatter:** ingredients, instructions, FAQs, recipe card. These are already in YAML.
5. **Keep the author's voice, stories, tips, and personality verbatim where possible.** Adapt for flow, not for style.
6. **Never use em-dashes.**
7. **Preserve Notion image placement.** Images stay where Notion placed them (typically ingredient spreads, key steps, plated shots). Do not scatter images differently.
8. **Include sections unique to Notion that the AI version dropped:**
   - "Why You'll Love This" content
   - "Shopping Notes" tips (weave into relevant sections)
   - "Expert Tips" (weave into technique sections)
   - "During the Date" / "Date Night Notes" (keep as a section)
   - "What to Serve With" / "Pairings" (adapt into cross-links section)
9. **Target 800-1500 words** per recipe.
10. **Include internal cross-links** to related content where Notion references them.

## Per-Recipe Process

For each of the 4 recipes:

1. Extract Notion blocks from `git show 51008da:notion/pending-recipe-{num}.json`
2. Read the current EN MDX file to understand existing image imports and placement
3. Rewrite the EN prose body following the adaptation rules above
4. Run `/humanizer` on the EN prose
5. Translate to FR using `/translate-recipe`
6. Run `/humanizer` on the FR prose
7. Run `/seo-audit` on the updated recipe

## What Does NOT Change

- Frontmatter (all fields stay as-is)
- Image imports (same files, same variable names)
- Image file paths and filenames
- `socialCaption` fields
- FAQs in frontmatter

## Reference: Correctly Adapted Recipe

`src/content/recipes/en/beef-ragu-pappardelle.mdx` is a good example of the target style. Note how it preserves first-person voice, opinionated technique commentary, and personal storytelling from the original Notion content.

## Success Criteria

- Each recipe's prose body reads like the author's Notion content adapted into blog format, not AI-generated content
- Author's specific tips, stories, and personality are preserved verbatim where possible
- H2 structure with ~6 sections
- 800-1500 words per recipe
- No em-dashes
- Internal cross-links present
- `/humanizer` applied to both EN and FR
- `/seo-audit` passes
