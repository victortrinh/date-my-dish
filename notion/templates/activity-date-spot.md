# Activity Date Spot — Notion Story template

See `README.md` in this folder for the general publishing flow. Never
duplicate a Restaurant or Bar Date Spot as an Activity: link to its review
via `pairItWith` instead.

## Database properties

Shared properties (see README) plus:

- `Spot Type`: `Activity`
- `Name`, `City`, `Neighbourhood`
- `Visited`, `Published`, `Last checked`
- `Payment`: `Paid`, `Hosted`, or `Other`
- `Map URL`

Activity Date Spots have no `Verdict` property; they use the planning
format, not the review format.

## Locale copy shape (one JSON code block per locale)

Required keys, matching `src/content-contracts/date-spot.mjs`'s planning copy:

```json
{
  "title": "...",
  "slug": "activity-slug",
  "metaTitle": "Place, Neighbourhood: Date Spot Guide",
  "metaDescription": "120-160 characters",
  "opening": "What it is, where it is, the specific date context.",
  "goodFor": [
    { "occasion": "first-date", "assessment": "ideal", "reason": "..." }
  ],
  "whatItIs": "The reported experience and one useful detail other guides miss.",
  "howToDoItWell": "Timing, entry/access, booking, preparation, cost.",
  "essentials": { "address": "...", "booking": "...", "access": "...", "duration": "...", "cost": "...", "timing": "..." },
  "paymentDisclosure": "One sentence matching the Payment property.",
  "sourceNotes": "...",
  "factNotes": "...",
  "imageAlt": "...",
  "imageCredit": "...",
  "materialUpdates": []
}
```

Optional: `season` (a string; prompts a "recheck before the season" venue
maintenance reminder) and `pairItWith` (an array of Restaurant/Bar Date Spot
`id`s -- link to their review instead of duplicating the venue here).
