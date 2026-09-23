# Bar Date Spot: Notion Story template

See `README.md` in this folder for the general publishing flow. A Bar review
uses the same review structure as `restaurant-date-spot.md`; this page lists
only the differences.

## Database properties

Shared properties (see README) plus:

- `Spot Type`: `Bar`
- `Name`, `City`, `Neighbourhood`
- `Visited`, `Published`, `Last checked` (dates; visited ≤ published ≤ last checked is enforced)
- `Payment`: `Paid`, `Hosted`, or `Other`
- `Map URL`
- `Verdict`: `A Favourite`, `Depends on the Night`, or `Not Our First Pick`
- `Price range`: `$`, `$$`, `$$$`, or `$$$$`

Optional, filled in only when true: `Instagram`, `Booking URL`,
`Google reviews` (same format and append-only rule as the Restaurant
template), and `Category`. Set `Category` (usually `Social and Romantic`)
only when the bar should be offered as a before-or-after pick in other
reviews' "Make a night of it".

## Locale copy shape (one JSON code block per locale)

Same keys as the Restaurant copy, with these differences:

- No `cuisine` and no `whatToOrder`.
- `whatToEat` is optional, only when the food is part of the decision:
  `{ "intro": "...", "dishes": [ { "name": "...", "tag": "order-this", "note": "..." } ] }`
  (1 to 7 dishes, same tags as the Restaurant dish cards).
- `meetTheBartender` replaces `meetChef`, with the same shape
  (`name`, `role`, `background`, `quote`, `approach`, `portrait`, `profileId`).
- `drinks.picks` needs `to-start` and `not-drinking`; `second-round` and
  `with-the-meal` are optional.
- `beforeYouBook` renders as "Before you go": walk-ins, timing, access.

All the Restaurant rules apply: the 1,000-word floor, the `metaTitle`
pattern (`{Bar}, {Neighbourhood}: Review & Date Night Guide`), 4 to 6
Good-for rows, the opening naming the bartender when `meetTheBartender` is
present, matching locales, and dated `materialUpdates` for changed
recommendations.
