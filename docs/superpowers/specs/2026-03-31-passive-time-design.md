# Passive Time for Recipes

**Date:** 2026-03-31
**Status:** Draft

## Problem

Several recipes have significant passive time (curing, chilling, marinating, pickling) that isn't reflected in the displayed times. The 3-Day Aged Miso Duck Breast shows "Total: 2h 50 min" despite requiring 72 hours of curing. This misleads users about the actual time commitment.

### Affected Recipes

| Recipe | Issue | passiveTime | New totalTime |
|--------|-------|-------------|---------------|
| 3-Day Aged Miso Duck Breast | 72hr cure missing | `P3D` | `P3DT2H50M` |
| Lemon Posset Brulee | 4hr chill missing from breakdown | `PT4H` | `PT4H25M` (already correct) |
| Chocolate Tofu Pudding | 30min chill missing, math wrong | `PT30M` | `PT1H15M` |
| Vietnamese Pickled Vegetables | Overnight pickling missing | `P1D` | `P1DT15M` |
| Pork Osso Buco | Math rounding error, no passive time | n/a | `PT3H55M` |

## Solution

Add an optional `passiveTime` field to the recipe schema. Display it as a 4th time pill in the UI when present.

## Schema Change

**File:** `src/content.config.ts`

Add after `totalTime` (line 73):

```ts
passiveTime: z.string().regex(/^P(?:\d+D)?(?:T(?:\d+H)?(?:\d+M)?)?$/, "Must be ISO 8601 duration (e.g. P3D, PT4H, P1DT12H)").optional(),
```

Update `totalTime` regex to support days:

```ts
totalTime: z.string().regex(/^P(?:\d+D)?(?:T(?:\d+H)?(?:\d+M)?)?$/, "Must be ISO 8601 duration (e.g. PT45M, P3DT2H50M)"),
```

The `passiveTime` field is optional. Recipes without passive time are unaffected.

## Time Formatting

**File:** `src/utils/format.ts`

Update `formatDuration()` to parse days from ISO 8601:

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

## i18n Keys

**Files:** `src/i18n/en.json`, `src/i18n/fr.json`

### English
```json
"recipe.passive": "Passive",
"recipe.passiveTime": "Passive Time",
"recipe.day": "day",
"recipe.days": "days"
```

### French
```json
"recipe.passive": "Passif",
"recipe.passiveTime": "Temps passif",
"recipe.day": "jour",
"recipe.days": "jours"
```

## UI Changes

### Hero Meta Bar (recipe detail pages)

**Files:** `src/pages/en/recipes/[...slug].astro`, `src/pages/fr/recipes/[...slug].astro` (equivalent FR file)

Add a 4th time pill between Cook and Total, conditionally rendered when `passiveTime` exists:

```astro
{data.passiveTime && (
  <div class="text-center">
    <p class="text-xs uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
      {t(locale, "recipe.passive")}
    </p>
    <p class="text-lg font-semibold text-neutral-800 dark:text-neutral-200">
      {formatDuration(data.passiveTime, locale)}
    </p>
  </div>
)}
```

The grid changes from `grid-cols-4` to a dynamic class: `grid-cols-4` when no passive time, `grid-cols-5` when passive time exists.

### Print View

**File:** `src/components/RecipeContent.astro`

Add `passiveTime` to Props interface. Conditionally render between cook and total:

```astro
{passiveTime && <span>{t(locale, "recipe.passiveTime")}: {formatDuration(passiveTime, locale)}</span>}
```

### RecipeDetailCard Meta Tags

**File:** `src/components/RecipeDetailCard.astro`

No change needed. Schema.org `Recipe` type doesn't have a `passiveTime` property. The `totalTime` meta tag already captures the full duration.

### RecipeSchema JSON-LD

**File:** `src/components/RecipeSchema.astro`

No change needed. `totalTime` in JSON-LD will now include passive time (e.g., `P3DT2H50M`), which is the correct value for Google's recipe rich results. No new props required.

### RecipeCard (listings)

**File:** `src/components/RecipeCard.astro`

No change. Already displays `totalTime`, which will now be accurate.

## Recipe Frontmatter Updates

Update both EN and FR versions of each affected recipe:

### 3-Day Aged Miso Duck Breast
```yaml
passiveTime: "P3D"
totalTime: "P3DT2H50M"
```

### Lemon Posset Brulee
```yaml
passiveTime: "PT4H"
# totalTime already PT4H25M - correct
```

### Chocolate Tofu Pudding
```yaml
passiveTime: "PT30M"
totalTime: "PT1H15M"  # was PT1H (wrong), now 25min active + 30min passive + 20min cook
```

### Vietnamese Pickled Vegetables
```yaml
passiveTime: "P1D"
totalTime: "P1DT15M"
```

### Pork Osso Buco
```yaml
# No passiveTime needed
totalTime: "PT3H55M"  # was PT4H (rounding fix)
```

## Files Modified

| File | Change |
|------|--------|
| `src/content.config.ts` | Add `passiveTime` field, update `totalTime` regex |
| `src/utils/format.ts` | Support days in `formatDuration()` |
| `src/i18n/en.json` | Add 4 keys |
| `src/i18n/fr.json` | Add 4 keys |
| `src/pages/en/recipes/[...slug].astro` | Add passive time pill, dynamic grid |
| `src/pages/fr/recipes/[...slug].astro` | Same changes |
| `src/components/RecipeContent.astro` | Add passive time to print view |
| `src/components/RecipeDetailCard.astro` | No change (totalTime meta tag is sufficient) |
| 10 recipe MDX files (5 EN + 5 FR) | Update frontmatter times |
