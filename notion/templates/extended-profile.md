# Extended Profile — Notion Story template

See `README.md` in this folder for the general publishing flow. Use only
when original interview reporting earns a standalone companion to a
Restaurant or Bar Date Spot. The ordinary "Meet the chef"/"Meet the
bartender" material stays inside that Date Spot.

## Database properties

Shared properties (see README) plus:

- `Subject name`, `Subject role` (`Chef` or `Bartender`), `Subject venue`, `Subject neighbourhood`
- `Companion Date Spot` (its `id`)
- `Interview date` (must be on or before `Published`), `Interview source`
- `Published`

## Locale copy shape (one JSON code block per locale)

Required keys, matching `src/content-contracts/extended-profile.mjs`:

```json
{
  "title": "{Name}, {Role} at {Venue}: Interview",
  "slug": "name-slug",
  "metaTitle": "...",
  "metaDescription": "120-160 characters",
  "shortScene": "A short reported scene identifying the subject.",
  "venueReporting": "Original reporting about their work, training, venue, menu, or rhythm.",
  "dinnerAndDate": [{ "question": "...", "answer": "..." }],
  "shortVersion": "Workplace, neighbourhood, background, related review.",
  "sourceNotes": "...",
  "factNotes": "...",
  "imageAlt": "...",
  "imageCredit": "..."
}
```

`dinnerAndDate` needs at least one accurately transcribed question and
answer. Optional: `atHome` and `contributorRecipe` (a Contributor Recipe
`slug`) -- these two must appear together, and both must agree between
locales.
