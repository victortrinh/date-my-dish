# Social Media API Setup Guide

Manual steps to configure Instagram and Pinterest APIs for automatic posting. Complete these steps, then add the secrets to GitHub so the automation workflows can run.

---

## Part 1: Pinterest Setup

Pinterest is simpler — start here.

### Step 1: Verify Business Account

1. Log in to [pinterest.com](https://www.pinterest.com) as `datemydish`
2. Go to **Settings** (gear icon) > **Account management**
3. Check if it says "Business account". If not:
   - Click **Convert to business account**
   - Fill in business name: "Date My Dish"
   - Select category: "Food & Drink"
   - Click **Done**

### Step 2: Create a "Recipes" Board

1. Go to your profile page
2. Click **+** > **Board**
3. Name: **Recipes**
4. Keep visibility **Public**
5. Save

### Step 3: Create a Pinterest Developer App

1. Go to [developers.pinterest.com](https://developers.pinterest.com)
2. Log in with the `datemydish` account
3. Click **My apps** > **Create app**
4. Fill in:
   - **App name**: "Date My Dish Auto-Post"
   - **Description**: "Automatic recipe pin creation"
   - **Website URL**: `https://datemydish.com`
5. Submit the app

### Step 4: Configure App Settings

1. In your app dashboard, go to **App settings**
2. Add a **Redirect URI**: `https://datemydish.com/oauth/pinterest/callback`
   - (This URL doesn't need to actually exist — we just need it to capture the auth code from the redirect)
3. Note down:
   - **App ID** (this is your `PINTEREST_CLIENT_ID`)
   - **App secret** (this is your `PINTEREST_CLIENT_SECRET`)

### Step 5: Generate Initial Tokens

Open your browser and navigate to this URL (replace `YOUR_CLIENT_ID`):

```
https://www.pinterest.com/oauth/?client_id=YOUR_CLIENT_ID&redirect_uri=https://datemydish.com/oauth/pinterest/callback&response_type=code&scope=boards:read,pins:read,pins:write,user_accounts:read
```

1. Click **Authorize** when Pinterest asks for permissions
2. You'll be redirected to `https://datemydish.com/oauth/pinterest/callback?code=XXXXXX`
3. The page will likely show a 404 — that's fine. **Copy the `code` value from the URL bar.**
4. Exchange the code for tokens by running this in your terminal:

```bash
# Replace the 3 values below
CLIENT_ID="your_app_id"
CLIENT_SECRET="your_app_secret"
AUTH_CODE="the_code_from_url"

curl -X POST "https://api.pinterest.com/v5/oauth/token" \
  -H "Authorization: Basic $(echo -n "$CLIENT_ID:$CLIENT_SECRET" | base64)" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=authorization_code&code=$AUTH_CODE&redirect_uri=https://datemydish.com/oauth/pinterest/callback&continuous_refresh=true"
```

5. The response will contain:
   ```json
   {
     "access_token": "pina_...",
     "refresh_token": "pinr_...",
     "expires_in": 2592000
   }
   ```
6. Save both tokens — you'll need them for GitHub Secrets.

### Step 6: Get the Board ID

Run this with your new access token:

```bash
curl -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  "https://api.pinterest.com/v5/boards"
```

Find the board named "Recipes" in the response and note the `id` field (a long numeric string like `"1234567890123456789"`).

### Pinterest Secrets to Save

| Value | Secret Name |
|-------|-------------|
| App ID | `PINTEREST_CLIENT_ID` |
| App secret | `PINTEREST_CLIENT_SECRET` |
| Access token (`pina_...`) | `PINTEREST_ACCESS_TOKEN` |
| Refresh token (`pinr_...`) | `PINTEREST_REFRESH_TOKEN` |
| Board ID (numeric string) | `PINTEREST_BOARD_ID` |

---

## Part 2: Instagram Setup

Instagram Content Publishing requires a Meta Business account, a Facebook Page, and app review. This takes more time.

### Step 1: Convert to Professional Account

1. Open the **Instagram app** on your phone
2. Go to **Settings** > **Account type and tools** > **Switch to professional account**
3. Choose **Business** (not Creator — Business is needed for the Content Publishing API)
4. Select category: **Food & Beverage**
5. Complete the setup

If `@datemydishdotcom` is already a Business or Creator account, verify by going to **Settings** > **Account type and tools**. If it's Creator, switch to **Business**.

### Step 2: Create a Facebook Page

1. Go to [facebook.com/pages/create](https://www.facebook.com/pages/create)
2. **Page name**: "Date My Dish"
3. **Category**: "Food & Beverage" or "Recipe Website"
4. Click **Create Page**

### Step 3: Link Instagram to the Facebook Page

1. Go to your Facebook Page
2. Click **Settings** (gear icon) > **Linked accounts** > **Instagram**
3. Click **Connect account**
4. Log in with `@datemydishdotcom` and authorize

Alternatively, from Instagram:
1. Go to **Settings** > **Account center** > **Accounts**
2. Add your Facebook Page

### Step 4: Set Up Meta Business Suite

1. Go to [business.facebook.com](https://business.facebook.com)
2. If you don't have a Business Account, create one:
   - Business name: "Date My Dish"
   - Your name and email
3. Add your Facebook Page to the Business Account:
   - **Settings** > **Accounts** > **Pages** > **Add** > select your page

### Step 5: Create a Meta App

1. Go to [developers.facebook.com](https://developers.facebook.com)
2. Click **My Apps** > **Create App**
3. Select **Other** as use case, then **Business** as app type
4. Fill in:
   - **App name**: "Date My Dish Auto-Post"
   - **App contact email**: your email
   - **Business Account**: select "Date My Dish"
5. Click **Create App**

### Step 6: Add Instagram Product

1. In your app dashboard, find **Add products to your app**
2. Find **Instagram** and click **Set up**
3. This adds the Instagram Graph API product to your app

### Step 7: Configure Permissions

1. In the app dashboard, go to **App Review** > **Permissions and Features**
2. Request these permissions:
   - `instagram_basic` — Read profile info
   - `instagram_content_publish` — Create posts
   - `pages_show_list` — List pages (needed for token exchange)
   - `pages_read_engagement` — Read page data
3. For `instagram_content_publish`, you'll need to submit for **App Review**:
   - Provide a description: "Automated recipe blog post publishing. When a new recipe is published on datemydish.com, our CI pipeline automatically creates an Instagram post with the recipe image and description."
   - Provide a screencast showing the flow (you can record the GitHub Action running)
   - This review can take **1-5 business days**

**Note:** While waiting for review, you can test with your own account using the "Development Mode" tokens (limited to accounts with a role on the app).

### Step 8: Generate Access Tokens

**Short-lived token (for testing):**

1. Go to [developers.facebook.com/tools/explorer](https://developers.facebook.com/tools/explorer)
2. Select your app from the dropdown
3. Click **Generate Access Token**
4. Grant the requested permissions
5. Copy the token

**Exchange for long-lived token:**

```bash
SHORT_TOKEN="your_short_lived_token"
APP_ID="your_app_id"
APP_SECRET="your_app_secret"

curl "https://graph.facebook.com/v21.0/oauth/access_token?grant_type=fb_exchange_token&client_id=$APP_ID&client_secret=$APP_SECRET&fb_exchange_token=$SHORT_TOKEN"
```

Response:
```json
{
  "access_token": "EAAG...",
  "token_type": "bearer",
  "expires_in": 5184000
}
```

This long-lived token is valid for **60 days**. The automation workflow will refresh it automatically.

### Step 9: Get Your Instagram User ID

```bash
LONG_TOKEN="your_long_lived_token"

curl "https://graph.instagram.com/v21.0/me?fields=id,username&access_token=$LONG_TOKEN"
```

Response:
```json
{
  "id": "17841400000000000",
  "username": "datemydishdotcom"
}
```

The `id` field is your `INSTAGRAM_USER_ID`.

### Instagram Secrets to Save

| Value | Secret Name |
|-------|-------------|
| Long-lived access token (`EAAG...`) | `INSTAGRAM_ACCESS_TOKEN` |
| Instagram User ID (numeric string) | `INSTAGRAM_USER_ID` |

---

## Part 3: Add Secrets to GitHub

1. Go to your repo: **github.com/[your-username]/date-my-dish**
2. Click **Settings** > **Secrets and variables** > **Actions**
3. Click **New repository secret** for each:

| Secret Name | Value |
|-------------|-------|
| `PINTEREST_CLIENT_ID` | Pinterest App ID |
| `PINTEREST_CLIENT_SECRET` | Pinterest App secret |
| `PINTEREST_ACCESS_TOKEN` | Pinterest access token (`pina_...`) |
| `PINTEREST_REFRESH_TOKEN` | Pinterest refresh token (`pinr_...`) |
| `PINTEREST_BOARD_ID` | Recipes board ID (numeric string) |
| `INSTAGRAM_ACCESS_TOKEN` | Instagram long-lived token (`EAAG...`) |
| `INSTAGRAM_USER_ID` | Instagram numeric user ID |

`ANTHROPIC_API_KEY` should already exist from the SEO audit workflow.

---

## Part 4: Verification Checklist

Run these checks after setup to confirm everything works:

### Pinterest

```bash
# Test: List your boards (should return "Recipes" board)
curl -H "Authorization: Bearer $PINTEREST_ACCESS_TOKEN" \
  "https://api.pinterest.com/v5/boards"

# Test: Get your user info
curl -H "Authorization: Bearer $PINTEREST_ACCESS_TOKEN" \
  "https://api.pinterest.com/v5/user_account"
```

### Instagram

```bash
# Test: Get your profile info
curl "https://graph.instagram.com/v21.0/me?fields=id,username,media_count&access_token=$INSTAGRAM_ACCESS_TOKEN"

# Test: Check content publishing permission
curl "https://graph.instagram.com/v21.0/$INSTAGRAM_USER_ID/content_publishing_limit?fields=config,quota_usage&access_token=$INSTAGRAM_ACCESS_TOKEN"
```

If both return valid JSON (not errors), you're good to go.

---

## Timeline Estimate

| Task | Time |
|------|------|
| Pinterest setup (Steps 1-6) | ~30 minutes |
| Instagram professional account + Facebook Page (Steps 1-3) | ~15 minutes |
| Meta Business Suite + App creation (Steps 4-6) | ~30 minutes |
| Instagram App Review (Step 7) | 1-5 business days |
| Token generation + GitHub secrets (Steps 8-9, Part 3) | ~15 minutes |

**Recommendation:** Do Pinterest first (30 min), then start the Instagram setup. While waiting for Instagram App Review, the Pinterest automation can already be running.

---

## Token Refresh Schedule

Once the automation is live, tokens refresh automatically:

| Platform | Token Lifetime | Auto-Refresh |
|----------|---------------|--------------|
| Pinterest access token | 30 days | Every 1st and 25th of month |
| Pinterest refresh token | 60 days | Rotates with access token |
| Instagram long-lived token | 60 days | Every 1st and 25th of month |

If a refresh fails, a GitHub issue will be created with the label `social-media-failure`.
