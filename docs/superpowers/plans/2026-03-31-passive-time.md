# Passive Time Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an optional `passiveTime` field to recipes so users see curing, chilling, and marinating time alongside prep/cook/total.

**Architecture:** New optional schema field + updated time formatter to support days + conditional 4th pill in the hero meta bar and print view. No new components; extends existing patterns.

**Tech Stack:** Astro 5, Zod schema, TypeScript, Tailwind CSS, i18n JSON

**Spec:** `docs/superpowers/specs/2026-03-31-passive-time-design.md`

---

### Task 1: Add i18n keys

**Files:**
- Modify: `src/i18n/en.json:42` (inside `"recipe"` object)
- Modify: `src/i18n/fr.json:42` (inside `"recipe"` object)

- [ ] **Step 1: Add English keys**

In `src/i18n/en.json`, add these 4 keys after `"minutes": "min"` (line 42):

```json
"passive": "Passive",
"passiveTime": "Passive Time",
"day": "day",
"days": "days",
```

- [ ] **Step 2: Add French keys**

In `src/i18n/fr.json`, add these 4 keys after `"minutes": "min"` (line 42):

```json
"passive": "Passif",
"passiveTime": "Temps passif",
"day": "jour",
"days": "jours",
```

- [ ] **Step 3: Verify TypeScript picks up the new keys**

Run: `npx astro check 2>&1 | head -20`
Expected: No errors related to i18n keys (the `TranslationKey` type is auto-derived from the JSON structure).

- [ ] **Step 4: Commit**

```bash
git add src/i18n/en.json src/i18n/fr.json
git commit -m "feat(i18n): add passive time and day/days translation keys"
```

---

### Task 2: Update `formatDuration()` to support days

**Files:**
- Modify: `src/utils/format.ts:3-11`

- [ ] **Step 1: Replace the `formatDuration` function**

Replace the entire function in `src/utils/format.ts` with:

```ts
export function formatDuration(iso: string, locale: Locale): string {
  const match = iso.match(/P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?)?/);
  if (!match) return iso;
  const days = match[1] ? parseInt(match[1]) : 0;
  const hours = match[2] ? parseInt(match[2]) : 0;
  const minutes = match[3] ? parseInt(match[3]) : 0;

  const parts: string[] = [];
  if (days > 0) parts.push(`${days} ${t(locale, days === 1 ? "recipe.day" : "recipe.days")}`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes} ${t(locale, "recipe.minutes")}`);
  return parts.join(" ") || iso;
}
```

This handles all existing formats (`PT15M`, `PT1H30M`, `PT2H`) plus new day formats (`P3D`, `P3DT2H50M`, `P1DT15M`).

- [ ] **Step 2: Verify existing formats still work**

Run: `npx astro check 2>&1 | head -20`
Expected: No type errors.

- [ ] **Step 3: Commit**

```bash
git add src/utils/format.ts
git commit -m "feat(format): support days in ISO 8601 duration formatting"
```

---

### Task 3: Add `passiveTime` to recipe schema

**Files:**
- Modify: `src/content.config.ts:73`

- [ ] **Step 1: Update the `totalTime` regex and add `passiveTime` field**

In `src/content.config.ts`, replace line 73:

```ts
      totalTime: z.string().regex(/^PT\d+[HM](\d+[MS])?$/, "Must be ISO 8601 duration (e.g. PT45M)"),
```

with:

```ts
      totalTime: z.string().regex(/^P(?:\d+D)?T?(?:\d+H)?(?:\d+M)?$/, "Must be ISO 8601 duration (e.g. PT45M, P3DT2H50M)"),
      passiveTime: z.string().regex(/^P(?:\d+D)?T?(?:\d+H)?(?:\d+M)?$/, "Must be ISO 8601 duration (e.g. P3D, PT4H)").optional(),
```

The `prepTime` and `cookTime` regexes remain unchanged since they only need hours/minutes.

- [ ] **Step 2: Verify schema compiles**

Run: `npx astro check 2>&1 | head -20`
Expected: No errors (passiveTime is optional, so existing recipes pass validation).

- [ ] **Step 3: Commit**

```bash
git add src/content.config.ts
git commit -m "feat(schema): add optional passiveTime field to recipe collection"
```

---

### Task 4: Add passive time pill to EN recipe detail page

**Files:**
- Modify: `src/pages/en/recipes/[...slug].astro:152-186`

- [ ] **Step 1: Update the meta bar grid**

In `src/pages/en/recipes/[...slug].astro`, replace line 153:

```astro
            <div class="grid grid-cols-2 gap-4 rounded-xl border border-brand-wine/5 bg-white p-4 shadow-sm sm:grid-cols-4 dark:border-warm-700 dark:bg-warm-800">
```

with:

```astro
            <div class:list={["grid grid-cols-2 gap-4 rounded-xl border border-brand-wine/5 bg-white p-4 shadow-sm dark:border-warm-700 dark:bg-warm-800", data.passiveTime ? "sm:grid-cols-5" : "sm:grid-cols-4"]}>
```

- [ ] **Step 2: Add the passive time pill**

In the same file, add this block after the Cook pill closing `</div>` (after line 169) and before the Total pill `<div>` (line 170):

```astro
              {data.passiveTime && (
                <div class="text-center border-r border-brand-wine/10 dark:border-warm-700">
                  <p class="mb-1 font-ui text-[10px] font-bold uppercase tracking-wider text-brand-wine/50 dark:text-brand-rose">
                    {t(locale, "recipe.passive")}
                  </p>
                  <p class="font-body text-sm font-bold text-warm-800 dark:text-warm-200">
                    {formatDuration(data.passiveTime, locale)}
                  </p>
                </div>
              )}
```

- [ ] **Step 3: Pass passiveTime to RecipeContent**

In the same file, find the `<RecipeContent` component (around line 224). Add `passiveTime` prop after `totalTime`:

```astro
          totalTime={data.totalTime}
          passiveTime={data.passiveTime}
```

- [ ] **Step 4: Commit**

```bash
git add src/pages/en/recipes/[...slug].astro
git commit -m "feat(en): add passive time pill to recipe detail page"
```

---

### Task 5: Add passive time pill to FR recipe detail page

**Files:**
- Modify: `src/pages/fr/recettes/[...slug].astro:153-186`

- [ ] **Step 1: Update the meta bar grid**

In `src/pages/fr/recettes/[...slug].astro`, replace the meta bar grid class (same pattern as EN, around line 153):

```astro
            <div class="grid grid-cols-2 gap-4 rounded-xl border border-brand-wine/5 bg-white p-4 shadow-sm sm:grid-cols-4 dark:border-warm-700 dark:bg-warm-800">
```

with:

```astro
            <div class:list={["grid grid-cols-2 gap-4 rounded-xl border border-brand-wine/5 bg-white p-4 shadow-sm dark:border-warm-700 dark:bg-warm-800", data.passiveTime ? "sm:grid-cols-5" : "sm:grid-cols-4"]}>
```

- [ ] **Step 2: Add the passive time pill**

Add this block after the Cook pill and before the Total pill (same markup as EN):

```astro
              {data.passiveTime && (
                <div class="text-center border-r border-brand-wine/10 dark:border-warm-700">
                  <p class="mb-1 font-ui text-[10px] font-bold uppercase tracking-wider text-brand-wine/50 dark:text-brand-rose">
                    {t(locale, "recipe.passive")}
                  </p>
                  <p class="font-body text-sm font-bold text-warm-800 dark:text-warm-200">
                    {formatDuration(data.passiveTime, locale)}
                  </p>
                </div>
              )}
```

- [ ] **Step 3: Pass passiveTime to RecipeContent**

Find the `<RecipeContent` component and add `passiveTime={data.passiveTime}` after `totalTime={data.totalTime}`.

- [ ] **Step 4: Commit**

```bash
git add src/pages/fr/recettes/[...slug].astro
git commit -m "feat(fr): add passive time pill to recipe detail page"
```

---

### Task 6: Add passive time to print view

**Files:**
- Modify: `src/components/RecipeContent.astro:17-39,52-55`

- [ ] **Step 1: Add passiveTime to Props interface**

In `src/components/RecipeContent.astro`, replace the Props interface (lines 17-27):

```ts
interface Props {
  locale: Locale;
  title: string;
  prepTime: string;
  cookTime: string;
  totalTime: string;
  recipeYield: string;
  difficulty: "easy" | "medium" | "hard";
  instructionGroups: InstructionGroup[];
  sourceUrl: string;
}
```

with:

```ts
interface Props {
  locale: Locale;
  title: string;
  prepTime: string;
  cookTime: string;
  totalTime: string;
  passiveTime?: string;
  recipeYield: string;
  difficulty: "easy" | "medium" | "hard";
  instructionGroups: InstructionGroup[];
  sourceUrl: string;
}
```

- [ ] **Step 2: Destructure passiveTime from props**

Replace the destructuring block (lines 29-39):

```ts
const {
  locale,
  title,
  prepTime,
  cookTime,
  totalTime,
  recipeYield,
  difficulty,
  instructionGroups,
  sourceUrl,
} = Astro.props;
```

with:

```ts
const {
  locale,
  title,
  prepTime,
  cookTime,
  totalTime,
  passiveTime,
  recipeYield,
  difficulty,
  instructionGroups,
  sourceUrl,
} = Astro.props;
```

- [ ] **Step 3: Add passive time to print header**

In the print header section (lines 52-55), replace:

```astro
    <div class="flex flex-wrap gap-x-4 gap-y-1 text-sm text-warm-700 dark:text-warm-300">
      <span>{t(locale, "recipe.prepTime")}: {formatDuration(prepTime, locale)}</span>
      <span>{t(locale, "recipe.cookTime")}: {formatDuration(cookTime, locale)}</span>
      <span>{t(locale, "recipe.totalTime")}: {formatDuration(totalTime, locale)}</span>
```

with:

```astro
    <div class="flex flex-wrap gap-x-4 gap-y-1 text-sm text-warm-700 dark:text-warm-300">
      <span>{t(locale, "recipe.prepTime")}: {formatDuration(prepTime, locale)}</span>
      <span>{t(locale, "recipe.cookTime")}: {formatDuration(cookTime, locale)}</span>
      {passiveTime && <span>{t(locale, "recipe.passiveTime")}: {formatDuration(passiveTime, locale)}</span>}
      <span>{t(locale, "recipe.totalTime")}: {formatDuration(totalTime, locale)}</span>
```

- [ ] **Step 4: Commit**

```bash
git add src/components/RecipeContent.astro
git commit -m "feat(print): add passive time to recipe print view"
```

---

### Task 7: Update recipe frontmatter (EN)

**Files:**
- Modify: `src/content/recipes/en/3-day-aged-miso-duck-breast.mdx`
- Modify: `src/content/recipes/en/lemon-posset-brulee.mdx`
- Modify: `src/content/recipes/en/chocolate-tofu-pudding.mdx`
- Modify: `src/content/recipes/en/vietnamese-pickled-vegetables.mdx`
- Modify: `src/content/recipes/en/pork-osso-buco.mdx`

- [ ] **Step 1: 3-Day Aged Miso Duck Breast (EN)**

In `src/content/recipes/en/3-day-aged-miso-duck-breast.mdx`, find:
```yaml
totalTime: "PT2H50M"
```
Replace with:
```yaml
totalTime: "P3DT2H50M"
passiveTime: "P3D"
```

- [ ] **Step 2: Lemon Posset Brulee (EN)**

In `src/content/recipes/en/lemon-posset-brulee.mdx`, find:
```yaml
totalTime: "PT4H25M"
```
Replace with:
```yaml
totalTime: "PT4H25M"
passiveTime: "PT4H"
```

(totalTime is already correct; just adding passiveTime.)

- [ ] **Step 3: Chocolate Tofu Pudding (EN)**

In `src/content/recipes/en/chocolate-tofu-pudding.mdx`, find:
```yaml
totalTime: "PT1H"
```
Replace with:
```yaml
totalTime: "PT1H15M"
passiveTime: "PT30M"
```

- [ ] **Step 4: Vietnamese Pickled Vegetables (EN)**

In `src/content/recipes/en/vietnamese-pickled-vegetables.mdx`, find:
```yaml
totalTime: "PT15M"
```
Replace with:
```yaml
totalTime: "P1DT15M"
passiveTime: "P1D"
```

- [ ] **Step 5: Pork Osso Buco (EN)**

In `src/content/recipes/en/pork-osso-buco.mdx`, find:
```yaml
totalTime: "PT4H"
```
Replace with:
```yaml
totalTime: "PT3H55M"
```

(No passiveTime needed; this is just a math correction.)

- [ ] **Step 6: Commit**

```bash
git add src/content/recipes/en/3-day-aged-miso-duck-breast.mdx src/content/recipes/en/lemon-posset-brulee.mdx src/content/recipes/en/chocolate-tofu-pudding.mdx src/content/recipes/en/vietnamese-pickled-vegetables.mdx src/content/recipes/en/pork-osso-buco.mdx
git commit -m "fix(recipes): add passive times and correct totalTime for EN recipes"
```

---

### Task 8: Update recipe frontmatter (FR)

**Files:**
- Modify: `src/content/recipes/fr/magret-canard-miso-3-jours.mdx`
- Modify: `src/content/recipes/fr/posset-brulee-au-citron.mdx`
- Modify: `src/content/recipes/fr/pouding-au-chocolat-et-tofu.mdx`
- Modify: `src/content/recipes/fr/legumes-marines-vietnamiens.mdx`
- Modify: `src/content/recipes/fr/osso-buco-au-porc.mdx`

- [ ] **Step 1: Magret de Canard Miso 3 Jours (FR)**

In `src/content/recipes/fr/magret-canard-miso-3-jours.mdx`, find:
```yaml
totalTime: "PT2H50M"
```
Replace with:
```yaml
totalTime: "P3DT2H50M"
passiveTime: "P3D"
```

- [ ] **Step 2: Posset Brulee au Citron (FR)**

In `src/content/recipes/fr/posset-brulee-au-citron.mdx`, find:
```yaml
totalTime: "PT4H25M"
```
Replace with:
```yaml
totalTime: "PT4H25M"
passiveTime: "PT4H"
```

- [ ] **Step 3: Pouding au Chocolat et Tofu (FR)**

In `src/content/recipes/fr/pouding-au-chocolat-et-tofu.mdx`, find:
```yaml
totalTime: "PT1H"
```
Replace with:
```yaml
totalTime: "PT1H15M"
passiveTime: "PT30M"
```

- [ ] **Step 4: Legumes Marines Vietnamiens (FR)**

In `src/content/recipes/fr/legumes-marines-vietnamiens.mdx`, find:
```yaml
totalTime: "PT15M"
```
Replace with:
```yaml
totalTime: "P1DT15M"
passiveTime: "P1D"
```

- [ ] **Step 5: Osso Buco au Porc (FR)**

In `src/content/recipes/fr/osso-buco-au-porc.mdx`, find:
```yaml
totalTime: "PT4H"
```
Replace with:
```yaml
totalTime: "PT3H55M"
```

- [ ] **Step 6: Commit**

```bash
git add src/content/recipes/fr/magret-canard-miso-3-jours.mdx src/content/recipes/fr/posset-brulee-au-citron.mdx src/content/recipes/fr/pouding-au-chocolat-et-tofu.mdx src/content/recipes/fr/legumes-marines-vietnamiens.mdx src/content/recipes/fr/osso-buco-au-porc.mdx
git commit -m "fix(recipes): add passive times and correct totalTime for FR recipes"
```

---

### Task 9: Build verification

- [ ] **Step 1: Run full build**

Run: `npm run build 2>&1 | tail -30`
Expected: Build succeeds with no errors. All 18 recipes should compile.

- [ ] **Step 2: Run astro check**

Run: `npx astro check 2>&1 | tail -20`
Expected: No type errors.

- [ ] **Step 3: Spot-check formatted output**

Run: `npm run dev` and verify in browser:
- `/en/recipes/3-day-aged-miso-duck-breast/` shows 5 pills: Prep 20 min | Cook 2h 30 min | Passive 3 days | Total 3 days 2h 50 min | Medium
- `/en/recipes/cacio-e-pepe/` shows 4 pills (no passive pill)
- `/fr/recettes/magret-canard-miso-3-jours/` shows "Passif 3 jours"
- Print view (Ctrl+P) shows passive time between cook and total

---

### Task 10: Update CLAUDE.md schema reference

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Add passiveTime to the Optional Fields table**

In `CLAUDE.md`, find the recipe Optional Fields table (after the Required Fields table). Add a row for `passiveTime`:

```markdown
| `passiveTime` | string | ISO 8601 duration for curing/chilling/marinating (e.g., `P3D`, `PT4H`) |
```

- [ ] **Step 2: Update the totalTime description in Required Fields**

In the Required Fields table, update the `totalTime` constraint from:
```
ISO 8601 duration (e.g., `PT45M`)
```
to:
```
ISO 8601 duration (e.g., `PT45M`, `P3DT2H50M`). Includes passive time when applicable.
```

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: add passiveTime to recipe schema reference in CLAUDE.md"
```
