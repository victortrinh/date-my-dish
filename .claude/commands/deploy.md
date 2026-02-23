# Deploy

Run pre-deploy checks, commit changes, and push to trigger Cloudflare Pages auto-deploy.

## Steps

1. **Pre-deploy checks:**
   - Run `npx astro check` — must pass with 0 errors
   - Run `npm run build` — must complete successfully
   - Verify all recipe MDX files have matching EN/FR pairs (check translationSlug references)
   - Check for any uncommitted changes

2. **Review changes:**
   - Show `git status` and `git diff --stat` summary
   - List any new/modified recipe files
   - Confirm with user before proceeding

3. **Commit:**
   - Stage relevant files (avoid committing .env, node_modules, dist/)
   - Create a descriptive commit message summarizing what changed
   - Use conventional commit style

4. **Push:**
   - Push to `main` branch (triggers Cloudflare Pages auto-deploy)
   - Confirm push succeeded

5. **Post-deploy verification (manual reminders):**
   - [ ] Visit https://datemydish.com/en/ and /fr/ — pages load correctly
   - [ ] Check a recipe page — JSON-LD renders, images display
   - [ ] Test language toggle on a recipe page
   - [ ] Verify /robots.txt and /llms.txt are accessible
   - [ ] Check /sitemap-index.xml loads
   - [ ] Test one old WordPress URL redirect (if applicable)
   - [ ] Check Cloudflare Analytics dashboard for data flow

## Rollback
If issues are found post-deploy:
- Cloudflare Pages keeps previous deployments
- Can instantly roll back from the Cloudflare Dashboard > Pages > Deployments
- Or: `git revert HEAD && git push` to deploy the revert
