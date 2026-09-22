# Retired Legacy Content

Issue #498 retires all self-authored recipes and general articles in both locales.
The MDX source remains in Git under `src/content/recipes` and `src/content/articles`.
Their collection loaders deliberately return no entries; adding another file to
those directories cannot publish it. The legacy route templates and taxonomy
pages are removed. Future Contributor Recipes require their own publication
contract and must not re-enable these legacy loaders.

There are no specific successors for these pages. Their URLs, including old
WordPress aliases, return 404 without a generic redirect. Navigation, homepage
sections, review cross-promotions, RSS, Pagefind, sitemap, llms.txt, and the old
bookmark index no longer expose them.

Recipe/article Notion-fetch workflows, recipe rating seeding, legacy social
backfill, and legacy Pinterest-update workflows are removed. Direct legacy
fetch/update entry points fail before doing external work. Social posting and
queued Pinterest rotation skip recipes/articles, including log entries without a
type (historically recipes). No external pins are deleted or edited by this change.
Review migration and the broader human-authored editorial workflow belong to the
other tickets under #496.

`npm run build` checks generated files for retired routes and URLs.
`tests/smoke/retired-content.spec.ts` checks every retained legacy source URL,
representative taxonomy and alias URLs, discovery endpoints, and real Pagefind
searches against the built site.
