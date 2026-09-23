# Extended Profile (chef page): Notion Story template

See `README.md` in this folder for the general publishing flow. Use only
when original interview reporting earns a standalone companion to a
Restaurant or Bar Date Spot. The ordinary "Meet the chef"/"Meet the
bartender" material stays inside that Date Spot, which links here through
its `profileId`.

## Database properties

Shared properties (see README) plus:

- `Subject name`, `Subject role` (`Chef` or `Bartender`), `Subject venue`, `Subject neighbourhood`
- `Companion Date Spot` (the review's `id`; it must already be published)
- `Interview date` (must be on or before `Published`), `Interview source`
- `Published`

## Locale copy shape (one JSON code block per locale)

Matches `src/content-contracts/extended-profile.mjs`:

```json
{
  "title": "In the kitchen with {Name}",
  "slug": "name-slug",
  "metaTitle": "{Name}, {Role} at {Venue}: Interview",
  "metaDescription": "120-160 characters",
  "standfirst": "Role, venue, neighbourhood, and the hook: Chef and owner of Moccione in Villeray. Twenty-one years in kitchens...",
  "shortScene": "Two or three sentences of setup: where you met, what time of day, what they were doing.",
  "theVenue": [
    { "question": "What were you actually trying to build when you opened?", "answer": "..." }
  ],
  "pullQuote": "The one line that made you put your pen down.",
  "dinnerAndDate": [
    { "key": "first-thing-cooked", "question": "The first thing you ever cooked for someone you liked. Did it work?", "answer": "..." },
    { "key": "last-day-off", "question": "What did you actually eat on your last day off?", "answer": "..." },
    { "key": "cook-for-or-together", "question": "Cook for your date, or cook together?", "answer": "..." },
    { "key": "judging-a-restaurant", "question": "What do you order to judge a restaurant you have never been to?", "answer": "..." },
    { "key": "overrated-romantic-ingredient", "question": "The most overrated romantic ingredient?", "answer": "..." },
    { "key": "date-dinner-length", "question": "How long should a good date dinner actually take?", "answer": "..." },
    { "key": "morning-after", "question": "What do you cook the morning after?", "answer": "..." },
    { "key": "table-six", "question": "Table six is clearly on a bad date. Send something over, or leave them alone?", "answer": "..." }
  ],
  "atHome": "Their answer to the last question: what would you make for a date night at home?",
  "contributorRecipe": "recipe-slug",
  "shortVersion": { "cuisine": "Seasonal Italian", "from": "...", "trainedAt": "...", "inKitchensSince": 2005 },
  "sourceNotes": "...",
  "factNotes": "...",
  "imageAlt": "...",
  "imageCredit": "..."
}
```

- Round one (`theVenue`) is about their restaurant or bar: training, the
  dish that never leaves the menu, a Tuesday versus a Saturday, what people
  skip. Ask as many as the interview earns.
- Round two (`dinnerAndDate`) is the same eight questions for every
  profile, in the order above, identified by `key`. Write the question
  wording in each language; the gate rejects a missing, extra or reordered
  question.
- `atHome` and `contributorRecipe` (a published Contributor Recipe `id`)
  are optional but appear together, and the recipe link agrees between
  locales.
- The pull quote, the number of round-one questions and the short-version
  facts must match between locales.
- Quotes are recorded and only edited for length. Nobody approves their
  answers before publication.
