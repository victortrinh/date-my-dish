# Full Growth Stack — Manual Setup Steps

## 1. Cloudflare Web Analytics

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com) → your site → Web Analytics
2. Enable Web Analytics if not already enabled
3. Copy the beacon token (a hex string like `a1b2c3d4e5f6...`)
4. In `src/layouts/BaseLayout.astro`, replace `YOUR_CF_ANALYTICS_TOKEN` with your actual token:
   ```
   data-cf-beacon='{"token": "a1b2c3d4e5f6..."}'
   ```

## 2. Cloudflare Workers KV (Star Ratings)

1. Run in your terminal:
   ```
   npx wrangler kv namespace create RATINGS
   ```
2. It will output something like:
   ```
   { binding = "RATINGS", id = "abc123def456..." }
   ```
3. Copy the `id` value
4. In `wrangler.jsonc`, replace `YOUR_KV_NAMESPACE_ID` with that ID
5. For the build-time ratings fetch script, you also need a Cloudflare API token:
   - Go to Cloudflare Dashboard → My Profile → API Tokens → Create Token
   - Use the "Edit Cloudflare Workers" template (or create custom with Workers KV read permission)
   - Copy the token
6. Add these as GitHub Secrets (for CI) or `.env` (for local):
   ```
   CF_ACCOUNT_ID=your-account-id
   CF_API_TOKEN=your-api-token
   CF_KV_NAMESPACE_ID=abc123def456...
   ```
   Your account ID is in the Cloudflare Dashboard URL or on the overview page sidebar.

## 3. ConvertKit (Newsletter)

1. Go to [kit.com](https://kit.com) and create a free account
2. Go to Grow → Landing Pages & Forms → Create Form
3. Choose "Inline" form type, give it a name like "Date My Dish Newsletter"
4. In the form settings, go to General → get the form ID from the URL (it's the number, e.g. `7654321`)
5. Add a custom field:
   - Go to Subscribers → Subscriber Fields → New Field
   - Name: `locale`, Type: Text
6. Enable double opt-in: Settings → General → check "Require confirmation"
7. In `src/components/NewsletterSignup.astro`, replace `YOUR_FORM_ID` in the fetch URL:
   ```
   fetch('https://app.convertkit.com/forms/7654321/subscriptions', {
   ```

## 4. Disqus (Comments)

1. Go to [disqus.com](https://disqus.com) and create an account
2. Click "Get Started" → "I want to install Disqus on my site"
3. Enter site name, choose a shortname (e.g. `datemydish`) — note this exact shortname
4. Select the free "Basic" plan
5. In Site Settings → Trusted Domains, add:
   - `datemydish.com`
   - `localhost`
6. In `src/components/Comments.astro`, replace `YOUR_SHORTNAME` with your shortname:
   ```
   script.src = 'https://datemydish.disqus.com/embed.js';
   ```

## 5. Pinterest Standard Access & OAuth

1. Go to [Pinterest Developer Portal](https://developers.pinterest.com/apps/) → your app
2. Apply for **Standard Access** (required for production API usage):
   - Go to your app → "Request Standard Access"
   - Fill out the app description, use case, and website URL
   - **Upload a demo video** showing how your app uses the Pinterest API (screen recording of the social-post script creating a pin, or a walkthrough of the workflow)
   - Wait for approval (can take a few business days)
3. Once approved, go to OAuth settings
4. Re-initiate OAuth flow requesting these scopes: `boards:read`, `boards:write`, `pins:read`, `pins:write`
5. Complete the authorization flow to get a new access token + refresh token
6. Update GitHub Secrets:
   - `PINTEREST_ACCESS_TOKEN` → new access token
   - `PINTEREST_REFRESH_TOKEN` → new refresh token
7. Verify the token refresh workflow works:
   ```
   gh workflow run token-refresh.yml
   ```
8. Test with one recipe:
   ```
   node scripts/social-post.mjs --slug beef-ragu-pappardelle --platform pinterest
   ```
9. Confirm the pin appears on your Pinterest board

## 6. Social Media Backfill

After Pinterest token is working:

1. Run Instagram backfill:
   ```
   node scripts/social-post.mjs --backfill --platform instagram
   ```
2. Run Pinterest backfill:
   ```
   node scripts/social-post.mjs --backfill --platform pinterest
   ```
3. Verify `data/social-posts-log.json` has valid entries for all 10 recipes on both platforms

## 7. Deploy

Once all placeholders are replaced:

1. Commit and push the branch
2. Create a PR, or merge to `main` to trigger Cloudflare auto-deploy
3. After deploy, verify:
   - Analytics beacon fires (check Cloudflare Web Analytics dashboard)
   - Cookie banner shows on first visit
   - Star rating API responds at `https://datemydish.com/api/rate?slug=cacio-e-pepe`
   - Share buttons open correct share popups
   - Newsletter form submits to ConvertKit
   - Comments load after clicking "Load Comments"
   - Bookmarks page works at `/en/bookmarks/` and `/fr/signets/`
