# Contributor Recipe — Notion Story template

See `README.md` in this folder for the general publishing flow. Use only
for a recipe supplied by a named chef or bartender. Never a recreation,
adaptation, inspired-by, or generic recipe.

## Database properties

Shared properties (see README) plus:

- `Contributor name`, `Contributor role` (`Chef` or `Bartender`), `Venue or context`
- `Supplied source` (what was supplied, how it was received)
- `Received on` (date; must be on or before `Published`)
- `Published`

## Locale copy shape (one JSON code block per locale)

Required keys, matching `src/content-contracts/contributor-recipe.mjs`:

```json
{
  "title": "{Dish}",
  "slug": "dish-slug",
  "metaTitle": "{Dish}: {Name}'s Date-Night Recipe",
  "metaDescription": "120-160 characters",
  "originalContext": "Attribution: contributor, role, venue, and the at-home context.",
  "serves": "e.g. 2 servings",
  "activeTime": "PT20M",
  "totalTime": "PT45M",
  "difficulty": "easy",
  "equipment": ["..."],
  "dietaryNotes": ["..."],
  "ingredientGroups": [{ "group": "optional", "items": ["..."] }],
  "methodGroups": [{ "group": "optional", "steps": ["..."] }],
  "contributorNotes": ["Notes from {Name}: supplied advice, substitutions, mistakes to avoid."],
  "sourceNotes": "...",
  "factNotes": "...",
  "imageAlt": "...",
  "imageCredit": "..."
}
```

`activeTime`/`totalTime` are ISO 8601 durations. `difficulty` is `easy`,
`medium`, or `hard`. Optional: `dmdTestingNote` (DMD's own testing
observation; must never silently alter the contributor's recipe) and
`pairItWith` (an array of Date Spot `id`s, agreeing across locales).

Reproduce the method exactly as supplied; do not substitute or rewrite it.
