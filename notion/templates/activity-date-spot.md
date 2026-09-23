# Activity Date Spot: Notion Story template

See `README.md` in this folder for the general publishing flow. Never
duplicate a Restaurant or Bar Date Spot as an Activity: link to its review
via `pairItWith` instead.

## Database properties

Shared properties (see README) plus:

- `Spot Type`: `Activity`
- `Category`: `Activities and Sports`, `Arts and Culture`,
  `Games and Entertainment`, `Nature and Scenic`, or `Social and Romantic`
- `Name`, `City`, `Neighbourhood`
- `Visited`, `Published`, `Last checked`
- `Payment`: `Paid`, `Hosted`, or `Other`
- `Map URL`
- `Verdict`: `A Favourite`, `Depends on the Night`, or `Not Our First Pick`.
  Date Spots share the reviews' signal system; it prints as "Our take".
- `Price range`: `Free`, `$`, `$$`, `$$$`, or `$$$$`

Optional: `Instagram`, `Booking URL`, `Google reviews` (see the Restaurant
template for the format).

## Locale copy shape (one JSON code block per locale)

Matches `src/content-contracts/date-spot.mjs`'s planning copy:

```json
{
  "title": "Parc Jarry",
  "slug": "parc-jarry",
  "metaTitle": "Parc Jarry, Villeray: Date Spot Guide",
  "metaDescription": "120-160 characters",
  "opening": "What it is, where it is, and the specific date context.",
  "verdictQualifier": "in season",
  "whenItWorks": [
    { "situation": "After dinner, summer", "assessment": "ideal", "reason": "..." },
    { "situation": "November to April", "assessment": "not-for", "reason": "..." }
  ],
  "whatItIs": "Two short paragraphs, separated by a blank line: the experience at the hour you'd go, then the history or small story.",
  "howToDoItWell": [
    { "label": "Timing", "text": "..." },
    { "label": "Entrance", "text": "..." },
    { "label": "Bring", "text": "..." }
  ],
  "pairItWith": [{ "spotId": "moccione", "walkMinutes": 12 }],
  "season": "May to October",
  "essentials": {
    "address": "...",
    "booking": "None needed",
    "access": "...",
    "duration": "30 to 60 min",
    "cost": "Free",
    "timing": "...",
    "transit": "Metro station",
    "stepFree": "Yes"
  },
  "paymentDisclosure": "One sentence matching the Payment property.",
  "sourceNotes": "...",
  "factNotes": "...",
  "imageAlt": "...",
  "imageCredit": "...",
  "materialUpdates": []
}
```

`whenItWorks` rows name their own situation (time of day, season, before or
after dinner), each `ideal`, `caveat`, or `not-for`, always with a reason.
`verdictQualifier` is optional and prints after the verdict ("A favourite,
in season").

Optional: `season` (prompts a "recheck before the season" venue maintenance
reminder), `pairItWith` (published Restaurant or Bar Date Spot `id`s in the
same city, with the walk in minutes), `essentials.transit` and
`essentials.stepFree`.
