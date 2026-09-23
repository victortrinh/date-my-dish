# Restaurant Date Spot — Notion Story template

See `README.md` in this folder for the general publishing flow.

## Database properties

Shared properties (see README) plus:

- `Spot Type`: `Restaurant`
- `Name`, `City`, `Neighbourhood`
- `Visited`, `Published`, `Last checked` (dates; visited ≤ published ≤ last checked is enforced)
- `Payment`: `Paid`, `Hosted`, or `Other`
- `Map URL`
- `Verdict`: `A Favourite`, `Depends on the Night`, or `Not Our First Pick`

## Locale copy shape (one JSON code block per locale)

Required keys, matching `src/content-contracts/date-spot.mjs`'s restaurant copy:

```json
{
  "title": "...",
  "slug": "restaurant-slug",
  "metaTitle": "Restaurant, Neighbourhood: Restaurant Review",
  "metaDescription": "120-160 characters",
  "opening": "Restaurant, neighbourhood, cuisine, and who leads the kitchen when reported.",
  "verdictReason": "The specific reason behind the Verdict.",
  "goodFor": [
    { "occasion": "first-date", "assessment": "ideal", "reason": "..." }
  ],
  "room": "Atmosphere, table/service realities, noise, timing, dress.",
  "whatToDrink": "Opening drink, pairing/list guidance, a truthful non-alcohol option.",
  "cuisine": "e.g. Seasonal Italian",
  "whatToOrder": "Individually tagged dishes: Order this / Worth it / Skip.",
  "realCost": "Honest two-person scenario and how to spend less.",
  "reportersNote": { "byline": "Victor Vu", "text": "The subjective detail and honest caveat." },
  "beforeYouGo": "Real answers on reservations, dietary needs, transport.",
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

`materialUpdates` starts empty on first publish. When republishing an already-live Restaurant Date Spot with a changed Verdict, Good-for Signal, or Essentials, add an entry (`{ "date": "YYYY-MM-DD", "note": "..." }`) dated after the previous `Last checked` in both locales -- the publish gate rejects an undated change.

Recommended modules (`meetChef`, `nearbyPlans`, `contributorRecipe`) are optional and editorial, not a template quota: see `src/content-contracts/date-spot.mjs` for their exact shape and add them only when genuinely reported. If used, both locales must include the same set of modules.
