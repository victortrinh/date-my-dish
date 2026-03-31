# Fix Pinterest Workflow: Caption Quality + Missing Posts

**Date**: 2026-03-30
**Branch**: `fix/pinterest`

## Problem

Three issues with the Pinterest auto-posting pipeline:

1. **3 recipes never posted**: `miso-udon-carbonara`, `northern-thai-beef-tartare`, `pork-osso-buco` are missing from `social-posts-log.json` because the deploy workflow's `git diff --diff-filter=A HEAD~1` detection missed them.
2. **URLs embedded in descriptions**: All 31 existing pin descriptions have recipe URLs appended (e.g., `https://datemydish.com/en/recipes/slug/`), redundant since Pinterest receives the link separately via the API's `link` parameter.
3. **Unhumanized AI copy**: Descriptions have obvious AI patterns ("whispers 'I've been thinking about you all day'", repeated titles like "The Pasta That Says 'I Made This For You'" across multiple recipes). Never run through `/humanizer`.

## Solution

### 1. Fix `scripts/social-post.mjs`

**`buildPinterestTemplate()`** — remove URL suffix:

```js
// Before
function buildPinterestTemplate(data) {
  return `${data.description} Get the full recipe at datemydish.com!`;
}

// After
function buildPinterestTemplate(data) {
  return data.description;
}
```

**`generateCaptions()`** — produce distinct variant titles while sharing the same description:

```js
async function generateCaptions(enData, frData) {
  const baseDescription = enData.socialCaption?.pinterest || buildPinterestTemplate(enData);
  const baseTitle = enData.socialCaption?.pinterest
    ? enData.socialCaption.pinterest.split('\n')[0].slice(0, 100)
    : enData.title;

  // Variant titles: different hooks for Pinterest algorithm variety
  const timeMatch = enData.totalTime?.match(/PT(\d+)M/);
  const timeMinutes = timeMatch ? timeMatch[1] : null;
  const v2Title = timeMinutes
    ? `${timeMinutes}-Minute ${enData.recipeCuisine || ''} ${enData.recipeCategory?.[0] || 'Recipe'}`.trim()
    : `${enData.recipeCuisine || 'Homemade'} ${enData.title}`;
  const v3Title = `Easy ${enData.title} for Date Night`;

  return {
    instagram_caption: enData.socialCaption?.instagram || buildInstagramTemplate(enData, frData),
    pinterest_title: baseTitle,
    pinterest_description: baseDescription,
    pinterest_title_v2: v2Title.slice(0, 100),
    pinterest_description_v2: baseDescription,
    pinterest_title_v3: v3Title.slice(0, 100),
    pinterest_description_v3: baseDescription,
  };
}
```

Key changes:
- All descriptions are URL-free (come from frontmatter `socialCaption.pinterest` or plain `description`)
- Variant titles differ by angle: base title, time/cuisine hook, "Easy X for Date Night" hook
- Titles capped at 100 chars (Pinterest limit)

### 2. Fix `.github/workflows/social-post-on-deploy.yml`

Add unposted recipe detection by cross-referencing `social-posts-log.json`:

```yaml
- name: Detect new recipes
  id: detect
  run: |
    NEW_RECIPES=$(git diff --name-only --diff-filter=A HEAD~1 -- 'src/content/recipes/en/*.mdx' || true)

    UNPOSTED=$(node -e "
      const fs = require('fs');
      const log = JSON.parse(fs.readFileSync('data/social-posts-log.json'));
      const recipes = fs.readdirSync('src/content/recipes/en')
        .filter(f => f.endsWith('.mdx'))
        .map(f => f.replace('.mdx',''));
      const missing = recipes.filter(r => !log[r]);
      if (missing.length) {
        console.log(missing.map(r => 'src/content/recipes/en/' + r + '.mdx').join('\n'));
      }
    ")

    ALL_NEW=$(echo -e "${NEW_RECIPES}\n${UNPOSTED}" | sort -u | grep -v '^$' || true)

    if [ -z "$ALL_NEW" ]; then
      echo "count=0" >> $GITHUB_OUTPUT
      echo "recipes=" >> $GITHUB_OUTPUT
    else
      echo "recipes<<EOF" >> $GITHUB_OUTPUT
      echo "$ALL_NEW" >> $GITHUB_OUTPUT
      echo "EOF" >> $GITHUB_OUTPUT
      echo "count=$(echo "$ALL_NEW" | wc -l | tr -d ' ')" >> $GITHUB_OUTPUT
    fi
    echo "Detected recipes to post: $ALL_NEW"
```

This catches any recipe that slipped through the git diff detection on a subsequent push.

### 3. Write `socialCaption.pinterest` for all 14 EN recipes

Add humanized `socialCaption.pinterest` to frontmatter for all EN recipes. The 2 that already have captions (miso-udon-carbonara, its FR pair) get reviewed. The other 12 get new captions.

Captions should be:
- 150-300 characters (Pinterest sweet spot for descriptions)
- No URLs (the API `link` parameter handles this)
- Recipe-specific, mentioning key ingredients/technique/time
- Written in the Date My Dish brand voice (cheeky, confident)
- Run through `/humanizer` to strip AI patterns

FR recipes do not need Pinterest captions (only EN recipes are posted to Pinterest).

### 4. Regenerate `social-posts-log.json`

For the 11 already-posted recipes:
- Rewrite all pin `description` fields from the new frontmatter captions (no URLs)
- Rewrite `title` fields using the new variant title logic
- Preserve `id`, `postedAt`, `status`, `scheduledFor`, `variant` fields (post history)

### 5. Update 33 live pins via `pinterest-update-pins.mjs`

Run the existing update script to PATCH all posted pins with the new titles and descriptions. The script uses `PATCH https://api.pinterest.com/v5/pins/{pinId}` and supports updating `title`, `description`, and `alt_text`.

This is a manual workflow dispatch (`pinterest-update-pins.yml`) targeting all recipes.

### 6. Backfill 3 missing recipes

After all fixes are merged to main, run the backfill workflow (`social-backfill.yml`) with:
- Platform: `pinterest`
- Recipes per run: `3`

The 3 unposted recipes will pick up their frontmatter captions through the fixed `generateCaptions()` flow.

## Files Changed

| File | Change |
|------|--------|
| `scripts/social-post.mjs` | Fix `buildPinterestTemplate()`, fix `generateCaptions()` |
| `.github/workflows/social-post-on-deploy.yml` | Add log cross-reference detection |
| `src/content/recipes/en/*.mdx` (12 files) | Add `socialCaption.pinterest` to frontmatter |
| `src/content/recipes/en/miso-udon-carbonara.mdx` | Review existing caption |
| `data/social-posts-log.json` | Regenerate descriptions and titles |

## Out of Scope

- Instagram captions (not reported as broken)
- FR Pinterest captions (only EN recipes are posted)
- Changing the 3-variant pin strategy
- Adding Claude API calls to the posting script
