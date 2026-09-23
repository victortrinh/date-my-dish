# Bar Date Spot — Notion Story template

See `README.md` in this folder for the general publishing flow.

## Database properties

Shared properties (see README) plus:

- `Spot Type`: `Bar`
- `Name`, `City`, `Neighbourhood`
- `Visited`, `Published`, `Last checked` (dates; visited ≤ published ≤ last checked is enforced)
- `Payment`: `Paid`, `Hosted`, or `Other`
- `Map URL`
- `Verdict`: `A Favourite`, `Depends on the Night`, or `Not Our First Pick`

## Locale copy shape (one JSON code block per locale)

Required keys, matching `src/content-contracts/date-spot.mjs`'s bar copy:

```json
{
  "title": "...",
  "slug": "bar-slug",
  "metaTitle": "Bar, Neighbourhood: Bar Review",
  "metaDescription": "120-160 characters",
  "opening": "Bar, neighbourhood, and its particular reason to go.",
  "verdictReason": "The specific reason behind the Verdict.",
  "goodFor": [
    { "occasion": "solo-at-the-bar", "assessment": "ideal", "reason": "..." }
  ],
  "room": "Sound, seating, service, crowd, best time to arrive.",
  "whatToDrink": "First drink, second-round or food pairing, non-alcohol option, list guidance.",
  "realCost": "Honest cost scenario.",
  "reportersNote": { "byline": "Victor Vu", "text": "The subjective detail and honest caveat." },
  "beforeYouGo": "Booking, walk-ins, timing, access.",
  "essentials": { "address": "...", "booking": "...", "access": "...", "duration": "...", "cost": "...", "timing": "..." },
  "paymentDisclosure": "One sentence matching the Payment property.",
  "sourceNotes": "...",
  "factNotes": "...",
  "imageAlt": "...",
  "imageCredit": "...",
  "materialUpdates": []
}
```

`goodFor` occasions: `first-date`, `anniversary`, `casual-midweek`, `impressing-a-cook`, `double-date`, `solo-at-the-bar` (each `ideal`, `caveat`, or `not-for`, with a reason; at least one required; no duplicate occasions).

`materialUpdates` starts empty on first publish; the dated-update rule for a republished, changed Bar Date Spot works exactly as described in `restaurant-date-spot.md`.

Optional, only when genuinely reported and present in both locales: `whatToEat` (a string; only when food is genuinely part of the decision), `meetTheBartender` ({name, role: "bartender", note}), `nearbyDateSpots` (array of {id, label, note}, min 1 if present), `contributorRecipe` ({title, slug, contributor, source, testingNotes?}). See `src/content-contracts/date-spot.mjs` for the exact shape.
