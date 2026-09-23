# Notion Story templates

Each template below lists the database properties a Story needs and the
exact JSON shape its Locale Pair must contain. Publishing (`scripts/fetch-notion-story.mjs`)
never writes or rewords reader-facing copy: it reads these properties and
JSON blocks verbatim and runs them through the real content-contract schema
in `src/content-contracts/`.

## How to write a Story page

1. Fill in the database properties listed for the Post Type (and Spot Type,
   for a Date Spot).
2. On the page body, add exactly **two Notion "code" blocks**, in this
   order: **English**, then **Canadian French**. Each code block's content
   is a single JSON object matching the "Locale copy shape" for that
   template, written by hand in DMD's editorial voice.
3. Add the Editorial Image as the first image block on the page.
4. Check "Human reporting", "Human translation", and "DMD-held photograph"
   only once they are true. The publish gate rejects a Story where any of
   these is unchecked.
5. Set Status to "Ready to Publish". The next `Publish Notion Story` run
   picks up the lowest-numbered unpublished (or edited-since-sync) Story.

A Story that fails validation never publishes. It produces a report issue
listing exactly what to fix in Notion; nothing on the site changes until you
fix it there and the Story passes.

## Shared database properties (every Post Type)

- `Status`, `Story #`, `Post Type`
- `ID` (the record's slug-shaped identifier, shared by both locales)
- `Human reporting`, `Human translation`, `DMD-held photograph` (checkboxes)

Type-specific properties are listed in each template.
