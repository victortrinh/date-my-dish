# Deploy

Run the pre-deploy checks, commit, and push to `main` (Cloudflare deploys on push).

Content is never published from here. A post goes live only when its Importer PR is merged (`docs/editorial-publishing-system.md`, "Publishing"). This command ships code, Companion File fixes and other changes that are already reviewed.

## Steps

1. **Pre-deploy checks** (all must pass):
   - `npm run check` (TypeScript and content contracts)
   - `npm run test:contracts`
   - `npm run build` (runs every guard: `validate-date-spots`, `notion-import check`, `validate-contributor-content`, `validate-descriptions`, `validate-source` before the build; Pagefind, `validate-build` and `validate-retired-content` after it)

2. **Review the changes:**
   - Show `git status` and `git diff --stat`.
   - Flag anything that touches prose in `src/content/date-spots.json`, `extended-profiles.json` or `contributor-recipes.json` outside an Importer PR: prose comes from Notion and is never edited by hand. Stop and ask.
   - Flag changes under `notion/sources/` or `notion/published.json` that the Importer did not write.
   - Confirm with the user before going on.

3. **Commit:** stage the relevant files only (never `.env`, `node_modules/`, `dist/`), with a conventional commit message.

4. **Push** to `main` and confirm the push succeeded. Watch the Cloudflare build: it runs the same guards, so a failing check stops the deploy.

5. **Post-deploy checks:**
   - [ ] `https://datemydish.com/en/` and `/fr/` load. While `MAINTENANCE_MODE` is on in `wrangler.jsonc`, every page answers the bilingual 503 from `src/worker.ts`; check that instead.
   - [ ] One page per published post type (review, Date Spot, chef, recipe card) renders in both locales, and the language toggle lands on the paired page.
   - [ ] One legacy flat review URL (`/en/reviews/{slug}-montreal/`) answers a single 301 to its nested URL.
   - [ ] `/robots.txt`, `/llms.txt` and `/sitemap-index.xml` load.
   - [ ] A retired recipe or article URL answers 404.

## Rollback

- Cloudflare keeps previous deployments: roll back from the dashboard (Workers & Pages > Deployments).
- Or `git revert HEAD && git push` to deploy the revert.
