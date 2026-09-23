# Restaurant Date Spot: Notion Story template

See `README.md` in this folder for the general publishing flow, and
`docs/editorial-publishing-system.md` for what each section is for.

## Database properties

Shared properties (see README) plus:

- `Spot Type`: `Restaurant`
- `Name`, `City`, `Neighbourhood`
- `Visited`, `Published`, `Last checked` (dates; visited ≤ published ≤ last checked is enforced)
- `Payment`: `Paid`, `Hosted`, or `Other`
- `Map URL`
- `Verdict`: `A Favourite`, `Depends on the Night`, or `Not Our First Pick`
- `Price range`: `$`, `$$`, `$$$`, or `$$$$`

Optional, filled in only when true:

- `Instagram`: the restaurant's handle (with or without the `@`)
- `Booking URL`: where the Book button goes
- `Google reviews`: the restaurant's own Google rating, frozen on the day you
  record it, one line per snapshot, oldest first: `4.6 | 312 | 2026-09-18`
  (average, number of reviews, date recorded). It prints as "their number,
  as of that date". Never edit an old line; when you recheck, add a new one.
  The publish gate rejects a changed or deleted line.

## Photos

The first plain image block is the Editorial Image. Any other photo the copy
uses is an image block captioned `photo:<key>`, optionally with a credit:
`photo:room`, `photo:chef-portrait | credit: Jane Doe`, `photo:dish-caramelle`.
The copy then points at it with `{ "photo": "room", "alt": "..." }`.

## Locale copy shape (one JSON code block per locale)

Matches `src/content-contracts/date-spot.mjs`'s restaurant copy. Values below
describe what goes in each field; write them yourself, in each language.

```json
{
  "title": "Moccione",
  "slug": "moccione",
  "metaTitle": "Moccione, Villeray: Review & Date Night Guide",
  "metaDescription": "150-160 characters: chef, cuisine, neighbourhood, what to order, what it costs, and what to do nearby.",
  "opening": "One sentence carrying the chef's name (when reported), the restaurant, the neighbourhood and the cuisine.",
  "verdictHeadline": "One line that answers 'should we go': Worth the money when the night is the point.",
  "verdictReason": "The paragraph behind the verdict. Specific, not polite.",
  "goodFor": [
    { "occasion": "anniversary", "assessment": "ideal", "reason": "Exactly the room it was built for." }
  ],
  "room": "Atmosphere, which tables to ask for, noise, service rhythm, dress. Separate paragraphs with a blank line.",
  "roomPhoto": { "photo": "room", "alt": "..." },
  "meetChef": {
    "name": "Chef Name",
    "role": "Chef and owner",
    "background": "Where they trained and cooked before, two or three concrete places (80 to 120 words).",
    "quote": "One line in the chef's own words.",
    "approach": "What they are trying to do here, and how you can taste it on the plate (100 to 150 words).",
    "portrait": { "photo": "chef-portrait", "alt": "..." },
    "profileId": "chef-name"
  },
  "drinks": {
    "intro": "Why the first drink matters here.",
    "picks": [
      { "moment": "to-start", "name": "Cocktail name", "note": "Why it's the right first drink." },
      { "moment": "with-the-meal", "name": "Let the sommelier pick", "note": "How to use the list." },
      { "moment": "not-drinking", "name": "What is actually good", "note": "Whether the no-alcohol list is real." }
    ],
    "list": "How the list is built, by-the-glass prices, corkage or bring-your-own-wine, whether the markup is fair."
  },
  "cuisine": "Seasonal Italian",
  "whatToOrder": {
    "waitersChoice": { "recommendation": "What the server said they'd order on a date.", "outcome": "Whether they were right." },
    "setMenu": { "name": "Menu name", "courses": 5, "pricePerPerson": "$95", "note": "Does it include the dish worth coming for? Does the whole table have to take it?", "advice": "take-it" },
    "strategy": "Going a la carte instead, for two people: ...",
    "dishes": [
      { "name": "Caramelle pasta", "tag": "order-this", "note": "About 45 words.", "photo": { "photo": "dish-caramelle", "alt": "..." } }
    ]
  },
  "realCost": {
    "intro": "Budget and what the breakdown shows.",
    "lines": [{ "item": "Two starters, two pastas, one main, one dessert", "amount": "$190" }],
    "total": { "label": "Two people, all in", "amount": "$380" },
    "howToSpendLess": "Which lever to pull to spend less without the night feeling smaller."
  },
  "reportersNote": {
    "byline": "Victor",
    "visits": 2,
    "detail": "The thing that stayed with you. Not a summary.",
    "caveat": "The honest caveat. Do not soften it."
  },
  "makeANight": [
    { "spotId": "parc-jarry", "timing": "after", "walkMinutes": 12, "blurb": "Why this pick works with this dinner." }
  ],
  "atHome": { "recipeId": "chef-name-date-night-dish", "intro": "What the chef cooks at home when they want to feed someone properly." },
  "beforeYouBook": [
    { "question": "How far ahead do I need to book?", "answer": "..." }
  ],
  "essentials": {
    "address": "7495 rue Saint-Denis",
    "booking": "Plan ahead",
    "access": "...",
    "duration": "2 to 2.5 hours",
    "cost": "$120 to $200 per person",
    "timing": "...",
    "canYouTalk": "Yes, easily"
  },
  "paymentDisclosure": "One sentence matching the Payment property.",
  "sourceNotes": "...",
  "factNotes": "...",
  "imageAlt": "...",
  "imageCredit": "...",
  "materialUpdates": []
}
```

Rules the publish gate checks:

- `metaTitle` starts with `{Name}, {Neighbourhood}`, at most 60 characters.
  `metaDescription` is 150 to 160 characters.
- At least 1,000 reader-facing words in each language. If you're short, the
  words are missing from The room, Meet the chef or The drinks. Don't pad the
  dish cards.
- `goodFor`: 4 to 6 rows from `first-date`, `anniversary`, `casual-midweek`,
  `impressing-a-cook`, `double-date`, `solo-at-the-bar`, each `ideal`,
  `caveat`, or `not-for`, always with a reason.
- `drinks.picks` needs `to-start`, `with-the-meal` and `not-drinking`, each
  once (`second-round` is optional).
- `whatToOrder.dishes`: 4 to 7 cards, each tagged `order-this`, `worth-it`
  or `skip`. `setMenu.advice` is `take-it` or `go-a-la-carte`.
- When `meetChef` is present, `opening` names the chef.
- `makeANight`: up to five picks, one per category, all published Date Spots
  in the same city within a 15-minute walk. `atHome.recipeId` must be a
  published Contributor Recipe and `meetChef.profileId` a published Extended
  Profile.
- Both locales carry the same modules, signals, dish tags, links and update
  dates. Only the words differ.

Optional modules (`roomPhoto`, `meetChef`, `whatToOrder.waitersChoice`,
`whatToOrder.setMenu`, `whatToOrder.strategy`, `makeANight`, `atHome`) are
editorial, not a template quota: leave them out unless you actually reported
them. Never invent a waiter's recommendation or a set menu.

`materialUpdates` starts empty on first publish. When republishing an
already-live review with a changed Verdict, Good-for Signal, or Essentials,
add an entry (`{ "date": "YYYY-MM-DD", "note": "..." }`) dated after the
previous `Last checked`, in both locales. It prints as an Update line under
My note, so write it as one: what changed, never a quiet rewrite.
