# Fix 4 Recipe Prose Bodies — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rewrite the prose bodies of 4 recently batch-published recipes to follow the Notion adaptation pattern (preserve author's voice from Notion blocks) instead of the AI-generated prose that was incorrectly used.

**Architecture:** For each recipe, extract the original Notion blocks from git history (commit `51008da`), rewrite the EN prose body preserving the author's voice and structure, run `/humanizer`, translate to FR with `/translate-recipe`, run `/humanizer` on FR, then `/seo-audit`. Frontmatter stays untouched. Each recipe is independent and can be processed in parallel.

**Tech Stack:** Astro MDX, existing slash commands (`/humanizer`, `/translate-recipe`, `/seo-audit`)

**Key references:**
- Spec: `docs/superpowers/specs/2026-03-31-fix-recipe-prose-design.md`
- Brand voice: `docs/brand-voice-guide.md`
- Example of correct adaptation: `src/content/recipes/en/beef-ragu-pappardelle.mdx`
- Notion data: `git show 51008da:notion/pending-recipe-{63,65,66,73}.json`

---

## Adaptation Rules (apply to ALL tasks)

These rules come from `daily-content-publish` step 11 and must be followed for every recipe:

1. **Notion blocks are the foundation.** Do NOT rewrite from scratch. The author's words, stories, tips, and personality should be preserved verbatim where possible.
2. **Restructure Notion H3 sections into H2 sections** (~6 H2s per recipe).
3. **Convert bullet lists to flowing prose** where appropriate. Tips and shopping notes get woven into relevant sections.
4. **Strip sections that live in frontmatter:** ingredients, instructions, FAQs, recipe card. These are already in YAML.
5. **Keep Notion-unique sections** the AI version dropped: "Why You'll Love This," "Shopping Notes," "Expert Tips," "During the Date" / "Date Night Notes," "What to Serve With."
6. **Never use em-dashes (—).** Use commas, periods, colons, or semicolons.
7. **Preserve existing image imports and `<Picture>` placement.** Keep the same import variable names and image files. Place images where Notion placed them (ingredient spread, key steps, plated shot).
8. **Target 800-1500 words** of prose.
9. **Include internal cross-links** to related content.

---

### Task 1: Fix lamb meatballs with gochujang glaze (EN)

**Files:**
- Modify: `src/content/recipes/en/lamb-meatballs-gochujang-glaze.mdx` (lines 132-245, prose body only)

**Notion source:** `git show 51008da:notion/pending-recipe-63.json`

**Existing image imports to preserve (lines 133-139):**
```
import imgIngredients from "../../../assets/images/recipes/lamb-meatballs-gochujang-glaze-step-1.jpg";
import imgMeatMix from "../../../assets/images/recipes/lamb-meatballs-gochujang-glaze-step-2.jpg";
import imgFormed from "../../../assets/images/recipes/lamb-meatballs-gochujang-glaze-step-3.jpg";
import imgRaw from "../../../assets/images/recipes/lamb-meatballs-gochujang-glaze-step-4.jpg";
import imgSeared from "../../../assets/images/recipes/lamb-meatballs-gochujang-glaze-step-5.jpg";
import imgGlazed from "../../../assets/images/recipes/lamb-meatballs-gochujang-glaze-step-6.jpg";
```

- [ ] **Step 1: Extract Notion blocks**

```bash
git show 51008da:notion/pending-recipe-63.json > /tmp/notion-recipe-63.json
```

Read the extracted JSON. Identify the prose-relevant sections from the blocks:
- "Quick Overview" intro paragraphs (the opening story)
- "Why You'll Love This" (4 bullet items)
- "Shopping Notes" (4 tips)
- "During the Date" section (pause tips)
- "Expert Tips" (3 tips)
- "What to Serve With" / "Pairings"

Skip: ingredients, step-by-step instructions, FAQs, recipe card (all in frontmatter).

- [ ] **Step 2: Rewrite EN prose body**

Replace everything after the frontmatter closing `---` (lines 132-245) with adapted prose.

**Structure to follow (H2 sections):**

1. **Opening paragraph** — Use the Notion intro verbatim: "I made this on a night where I wanted dinner to feel like a special occasion without leaving Montreal or fighting for a reservation..." + the descriptive paragraph about the components + "It's the kind of plate that makes someone pause after the first bite..."
2. **## What makes this plate work** — Adapt "Why You'll Love This" bullets into flowing prose. Weave in the "Shopping Notes" tips where relevant (kabocha selection, gochujang brand, etc.).
3. **## The kabocha puree nobody expects** — Use Notion's texture goal tip ("silky enough to swipe with a spoon") and the cooking context. Keep the author's voice about miso + sake + mirin.
4. **## Building the glaze and rolling the meatballs** — Combine glaze and meatball sections. Use Notion's consistency check tip ("coat the back of a spoon and leave a clean line"). Keep the size note about "smaller meatballs feel more snacky."
5. **## The peanut crunch that ties it together** — Use Notion's tip verbatim: "Do not walk away when sugar is in the pan. It goes from 'perfect' to 'why does it taste like campfire' fast."
6. **## Plating and making it a date night** — Combine assembly instructions and "During the Date" section. Keep: "This recipe has built-in little pauses. Use them." + the specific pause activities. Include cross-links from Notion pairings section.

Place `<Picture>` components at the same positions, using the same import variables (`imgIngredients`, `imgMeatMix`, `imgFormed`, `imgRaw`, `imgSeared`, `imgGlazed`).

- [ ] **Step 3: Run `/humanizer` on the EN prose**

Run `/humanizer` on the updated EN file to smooth any remaining AI patterns while preserving the author's voice.

- [ ] **Step 4: Commit EN changes**

```bash
git add src/content/recipes/en/lamb-meatballs-gochujang-glaze.mdx
git commit -m "fix(content): adapt lamb meatballs EN prose from Notion blocks"
```

---

### Task 2: Fix lamb meatballs with gochujang glaze (FR)

**Files:**
- Modify: `src/content/recipes/fr/boulettes-agneau-gochujang.mdx` (prose body only)

- [ ] **Step 1: Run `/translate-recipe` on the updated EN version**

Run `/translate-recipe boulettes-agneau-gochujang` to regenerate the FR prose from the corrected EN version. Quebec French register (souper, cuillère à soupe, etc.).

- [ ] **Step 2: Run `/humanizer` on the FR prose**

Run `/humanizer` on the FR file.

- [ ] **Step 3: Commit FR changes**

```bash
git add src/content/recipes/fr/boulettes-agneau-gochujang.mdx
git commit -m "fix(content): adapt lamb meatballs FR prose from corrected EN"
```

---

### Task 3: Fix 3-day aged miso duck breast (EN)

**Files:**
- Modify: `src/content/recipes/en/3-day-aged-miso-duck-breast.mdx` (lines 96-187, prose body only)

**Notion source:** `git show 51008da:notion/pending-recipe-65.json`

**Existing image imports to preserve (lines 97-101):**
```
import imgCure from "../../../assets/images/recipes/3-day-aged-miso-duck-breast-step-1.jpg";
import imgRender from "../../../assets/images/recipes/3-day-aged-miso-duck-breast-step-2.jpg";
import imgSliced from "../../../assets/images/recipes/3-day-aged-miso-duck-breast-step-3.jpg";
import imgFinished from "../../../assets/images/recipes/3-day-aged-miso-duck-breast-step-4.jpg";
```

- [ ] **Step 1: Extract Notion blocks**

```bash
git show 51008da:notion/pending-recipe-65.json > /tmp/notion-recipe-65.json
```

Read the extracted JSON. Prose-relevant sections:
- Opening paragraphs (the intro about patience and intentional cooking)
- "Why You'll Love This" (4 bullets about crisp skin, flavor, timeline, simplicity)
- "Shopping Notes" (duck breast selection, miso type, torch recommendation)
- "Expert Tips" (4 tips about dryness, rendering fat, ice bath, torch)
- "Date Night Notes / During the Date" (cure days, sous vide window, rest moment)
- "What to Serve With" / "Pairings"

Skip: ingredients, step-by-step instructions, FAQs, recipe card.

- [ ] **Step 2: Rewrite EN prose body**

Replace everything after frontmatter closing `---` (lines 96-187) with adapted prose.

**Structure to follow (H2 sections):**

1. **Opening paragraph** — Use Notion intro verbatim: "This is the duck breast you make when you want the night to feel intentional. Not fussy. Not chaotic. Just a slow-build kind of impressive..." + the cure/render/sear overview paragraph.
2. **## What miso actually does to duck** — Adapt from Notion's cure explanation. Weave in shopping notes about white miso type. Keep the author's voice about patience and enzymes.
3. **## The render: where crispy skin begins** — Use Notion's expert tip: "Dryness is the whole game." + the cold-pan rendering explanation. Weave in the tip about saving rendered duck fat.
4. **## Sous vide takes the stress out** — Use Notion content about 58°C/136°F precision. Include the expert tip about ice bath being non-optional. Keep the alternative oven method.
5. **## The final sear and torch** — Use Notion's re-sear steps and torch/grill finish. Keep the expert tip about torch as insurance.
6. **## Rest, slice, and making it a date** — Combine the rest/slice section with "Date Night Notes." Keep the specific timeline: "Send a quick text on day 1," "During sous vide: pour wine," "During the rest: plate slowly." Include cross-links.

Place `<Picture>` components using existing imports (`imgCure`, `imgRender`, `imgSliced`, `imgFinished`).

- [ ] **Step 3: Run `/humanizer` on the EN prose**

- [ ] **Step 4: Commit EN changes**

```bash
git add src/content/recipes/en/3-day-aged-miso-duck-breast.mdx
git commit -m "fix(content): adapt miso duck breast EN prose from Notion blocks"
```

---

### Task 4: Fix 3-day aged miso duck breast (FR)

**Files:**
- Modify: `src/content/recipes/fr/magret-canard-miso-3-jours.mdx` (prose body only)

- [ ] **Step 1: Run `/translate-recipe` on the updated EN version**

Run `/translate-recipe magret-canard-miso-3-jours` to regenerate FR prose. Quebec French register.

- [ ] **Step 2: Run `/humanizer` on the FR prose**

- [ ] **Step 3: Commit FR changes**

```bash
git add src/content/recipes/fr/magret-canard-miso-3-jours.mdx
git commit -m "fix(content): adapt miso duck breast FR prose from corrected EN"
```

---

### Task 5: Fix pâte à choux (EN)

**Files:**
- Modify: `src/content/recipes/en/pate-a-choux.mdx` (lines 100-226, prose body only)

**Notion source:** `git show 51008da:notion/pending-recipe-66.json`

**Existing image imports to preserve (lines 102-108):**
```
import imgIngredients from "../../../assets/images/recipes/pate-a-choux-step-1.jpg";
import imgPanade from "../../../assets/images/recipes/pate-a-choux-step-2.jpg";
import imgDryDough from "../../../assets/images/recipes/pate-a-choux-step-3.jpg";
import imgFoodProcessor from "../../../assets/images/recipes/pate-a-choux-step-4.jpg";
import imgEggsIncorporated from "../../../assets/images/recipes/pate-a-choux-step-5.jpg";
import imgPipingBag from "../../../assets/images/recipes/pate-a-choux-step-6.jpg";
```

- [ ] **Step 1: Extract Notion blocks**

```bash
git show 51008da:notion/pending-recipe-66.json > /tmp/notion-recipe-66.json
```

Prose-relevant sections:
- Opening paragraphs about competence energy and date-night power move
- "What Is Pâte à Choux?" explanation
- "The Big Secret: Learn What Correct Dough Looks Like" (key teaching content)
- "How to Pipe (Without Making It Weird)" tips
- "Baking Notes (The Part That Makes or Breaks It)" rules
- "Variation: Cheesy Gougères" (savory version)
- "Troubleshooting (So You Don't Panic)" (4 items)
- "During the Date" Notes
- "Ingredient Notes" tips

Skip: ingredients, step-by-step instructions, recipe card.

- [ ] **Step 2: Rewrite EN prose body**

Replace everything after frontmatter closing `---` (lines 100-226) with adapted prose.

**Structure to follow (H2 sections):**

1. **Opening paragraph** — Use Notion intro: "Pâte à choux is one of those 'looks like you know what you're doing' doughs..." + the key line: "It's not just dessert energy. It's *competence* energy." + "And if you're cooking for a date, this is the kind of thing that gets you that look across the table..."
2. **## What pâte à choux actually is** — Combine "What Is Pâte à Choux?" explanation with ingredient notes. Keep: "No yeast. No baking powder. Just technique." Weave in the water/milk split reasoning and bread flour explanation.
3. **## The big secret: knowing when the dough is right** — Use Notion's "Big Secret" section verbatim. Key content: "smooth and glossy," "holds a peak that slowly droops," "you are better off stopping slightly short."
4. **## From panade to piping bag** — Combine the cooking steps overview with "How to Pipe" tips. Keep: "Pipe straight down, not at an angle." Include resting explanation.
5. **## Baking rules and troubleshooting** — Combine "Baking Notes" and "Troubleshooting." Keep the specific rules: "Bake hot enough to create steam quickly," "If your puffs look beautiful but collapse, they needed more bake time." Use Notion's troubleshooting items directly.
6. **## The gougères variation and making it a date** — Combine gougère instructions with "During the Date" notes. Keep: "Pile cream puffs into a small tower..." and the key line about cream puffs that crunch. Include cross-links.

Place `<Picture>` components using existing imports.

- [ ] **Step 3: Run `/humanizer` on the EN prose**

- [ ] **Step 4: Commit EN changes**

```bash
git add src/content/recipes/en/pate-a-choux.mdx
git commit -m "fix(content): adapt pate a choux EN prose from Notion blocks"
```

---

### Task 6: Fix pâte à choux (FR)

**Files:**
- Modify: `src/content/recipes/fr/pate-a-choux.mdx` (prose body only)

- [ ] **Step 1: Run `/translate-recipe` on the updated EN version**

Run `/translate-recipe pate-a-choux` (FR slug is same). Quebec French register.

- [ ] **Step 2: Run `/humanizer` on the FR prose**

- [ ] **Step 3: Commit FR changes**

```bash
git add src/content/recipes/fr/pate-a-choux.mdx
git commit -m "fix(content): adapt pate a choux FR prose from corrected EN"
```

---

### Task 7: Fix chocolate tofu pudding (EN)

**Files:**
- Modify: `src/content/recipes/en/chocolate-tofu-pudding.mdx` (lines 106-227, prose body only)

**Notion source:** `git show 51008da:notion/pending-recipe-73.json`

**Existing image imports to preserve (lines 107-115):**
```
import imgIngredients from "../../../assets/images/recipes/chocolate-tofu-pudding-step-1.jpg";
import imgSoakDates from "../../../assets/images/recipes/chocolate-tofu-pudding-step-2.jpg";
import imgBlendTofu from "../../../assets/images/recipes/chocolate-tofu-pudding-step-3.jpg";
import imgBlendSmooth from "../../../assets/images/recipes/chocolate-tofu-pudding-step-4.jpg";
import imgSieveChocolate from "../../../assets/images/recipes/chocolate-tofu-pudding-step-5.jpg";
import imgToastNibs from "../../../assets/images/recipes/chocolate-tofu-pudding-step-6.jpg";
import imgAssembled from "../../../assets/images/recipes/chocolate-tofu-pudding-step-7.jpg";
import imgFinished from "../../../assets/images/recipes/chocolate-tofu-pudding-step-8.jpg";
```

- [ ] **Step 1: Extract Notion blocks**

```bash
git show 51008da:notion/pending-recipe-73.json > /tmp/notion-recipe-73.json
```

Prose-relevant sections:
- Introduction paragraphs ("There's a very specific kind of date-night confidence...")
- "Why You'll Love This" (4 bullets: make-ahead, tofu secret, olive oil, candied nibs)
- "Shopping Notes" (chocolate quality, tofu type, dates, cacao nibs)
- "Expert Tips" (3 tips: sieve, chocolate quality, olive oil + salt)
- "Date Night Notes / During the Date" (vibe setup, timeline, pairings, conversation prompts)
- "What to Serve With" (port, amaro, espresso)

Skip: ingredients, step-by-step instructions, FAQs, recipe card.

- [ ] **Step 2: Rewrite EN prose body**

Replace everything after frontmatter closing `---` (lines 106-227) with adapted prose.

**Structure to follow (H2 sections):**

1. **Opening paragraph** — Use Notion intro verbatim: "There's a very specific kind of date-night confidence that comes from serving a dessert that feels like it belongs on a tasting menu. Not fussy. Not fragile. Just sleek, glossy, and suspiciously good. This is that." + the tofu/dates description.
2. **## Why tofu works here (and why nobody will know)** — Adapt "Why You'll Love This" + shopping notes about tofu and dates. Keep the author's line about tofu being "the texture engine." Weave in the shopping note about chocolate quality.
3. **## The sieve step (yes, it is worth it)** — Use expert tip verbatim: "sieve it. It's the difference between 'good' and 'what is this sorcery.'" Include the chocolate stirring step.
4. **## Candied cacao nibs: the crunch that makes it** — Keep the caramel instructions and the warning about sugar browning. Use the note about nibs keeping 1-2 weeks for make-ahead.
5. **## Make it early, serve it cool** — Combine "Date Night Notes" timeline and vibe. Keep: "Lighting: one lamp + one candle. No overhead lights." + the specific timeline (make pudding earlier, nibs in jar, slice banana right before). Include conversation prompts from Notion.
6. **## Plating and pairing** — Combine assembly description with "What to Serve With." Keep the expert tip: olive oil and salt are not optional. Include cross-links.

Place `<Picture>` components using existing imports.

- [ ] **Step 3: Run `/humanizer` on the EN prose**

- [ ] **Step 4: Commit EN changes**

```bash
git add src/content/recipes/en/chocolate-tofu-pudding.mdx
git commit -m "fix(content): adapt chocolate tofu pudding EN prose from Notion blocks"
```

---

### Task 8: Fix chocolate tofu pudding (FR)

**Files:**
- Modify: `src/content/recipes/fr/pouding-au-chocolat-et-tofu.mdx` (prose body only)

- [ ] **Step 1: Run `/translate-recipe` on the updated EN version**

Run `/translate-recipe pouding-au-chocolat-et-tofu`. Quebec French register.

- [ ] **Step 2: Run `/humanizer` on the FR prose**

- [ ] **Step 3: Commit FR changes**

```bash
git add src/content/recipes/fr/pouding-au-chocolat-et-tofu.mdx
git commit -m "fix(content): adapt chocolate tofu pudding FR prose from corrected EN"
```

---

### Task 9: Run SEO audit and final verification

**Files:**
- All 8 MDX files modified in Tasks 1-8

- [ ] **Step 1: Run `/seo-audit` on each EN recipe**

```bash
# Run for each:
/seo-audit lamb-meatballs-gochujang-glaze
/seo-audit 3-day-aged-miso-duck-breast
/seo-audit pate-a-choux
/seo-audit chocolate-tofu-pudding
```

Fix any issues flagged (missing cross-links, word count below 800, etc.).

- [ ] **Step 2: Run build to verify no breakage**

```bash
npm run build
```

Expected: Clean build with no errors. All 8 MDX files should compile.

- [ ] **Step 3: Commit any SEO fixes**

```bash
git add -A
git commit -m "fix(seo): address audit issues from prose adaptation"
```

(Skip this step if no changes were needed.)

---

## Parallelization Notes

- **Tasks 1+3+5+7 (all EN recipes)** can run in parallel since they modify independent files.
- **Tasks 2, 4, 6, 8 (FR translations)** each depend on their EN counterpart completing first.
- **Task 9** depends on all previous tasks completing.

Recommended execution order with 4 parallel agents:
- Agent A: Task 1 → Task 2
- Agent B: Task 3 → Task 4
- Agent C: Task 5 → Task 6
- Agent D: Task 7 → Task 8
- Then: Task 9 (single agent)
