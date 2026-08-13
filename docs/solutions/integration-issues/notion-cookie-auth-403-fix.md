---
title: "Notion Fetch Workflows 403: Authenticated notion-client with Session Cookie"
date: 2026-08-13
category: integration-issues
tags:
  - notion
  - github-actions
  - content-pipeline
  - authentication
severity: high
component: scripts/notion-utils.mjs, scripts/fetch-notion-recipe.mjs, scripts/fetch-notion-article.mjs, scripts/fetch-notion-review.mjs, scripts/dump-notion-content.mjs, .github/workflows/auto-publish-recipe.yml, .github/workflows/auto-publish-article.yml, .github/workflows/auto-publish-review.yml
status: resolved
---

# Notion Fetch Workflows 403: Authenticated notion-client with Session Cookie

## Problem

All three Notion fetch workflows (`auto-publish-recipe.yml`, `auto-publish-article.yml`,
`auto-publish-review.yml`) started failing in early August 2026 with:

```
[WARN] getPage(database) attempt 1 failed: [POST] "https://www.notion.so/api/v3/loadPageChunk": 403 Forbidden
[ERROR] getPage(database) failed after 3 attempts
```

## Root Cause

`scripts/notion-utils.mjs` and the three fetch scripts use `notion-client`, an unofficial wrapper
around Notion's private `www.notion.so/api/v3/*` endpoints, called **unauthenticated**
(`new NotionAPI()`). Notion began returning 403 to datacenter/CI IPs on that private API even for
public pages. Confirmed IP-based (not a content or repo regression): the identical unauthenticated
request returned 200 with a full payload from a residential IP for the same page.

## Why not the official API

The official `@notionhq/client` (`api.notion.com`) is the durable fix, but it requires creating a
Notion internal integration or personal access token and connecting it to the content database.
That's workspace-scoped: the account attempting it here was a **Guest** in the workspace that owns
the database ("Victor Vu's Space"), and guests cannot create integrations or tokens
("You don't have permission to create tokens in this workspace"). That path is blocked until
someone with owner/admin rights on that workspace creates and hands over a token, or upgrades the
guest's role. If either happens later, prefer switching to the official API — see the alternate
(reverted) approach in git history around this date for the full rewrite.

## Solution (interim, cookie-based)

Kept `notion-client` but authenticate every request as a logged-in workspace member, which
restores access from CI without needing integration-creation permissions.

`scripts/notion-utils.mjs` adds `createNotionApi()`:

```js
export function createNotionApi() {
  const authToken = process.env.NOTION_TOKEN_V2;
  const activeUser = process.env.NOTION_ACTIVE_USER;
  if (!authToken || !activeUser) {
    throw new Error("NOTION_TOKEN_V2 and NOTION_ACTIVE_USER must both be set. ...");
  }
  return new NotionAPI({ authToken, activeUser });
}
```

All four scripts (`fetch-notion-recipe.mjs`, `fetch-notion-article.mjs`,
`fetch-notion-review.mjs`, `dump-notion-content.mjs`) call `createNotionApi()` instead of
`new NotionAPI()`. No other logic changed — this is purely an auth swap.

### Extracting NOTION_TOKEN_V2 and NOTION_ACTIVE_USER

From a browser logged into Notion as a member of the workspace that owns the content database:

1. Open notion.so, DevTools -> Application (Chrome) / Storage (Firefox) -> Cookies -> `https://www.notion.so`.
2. Copy the value of the `token_v2` cookie -> `NOTION_TOKEN_V2`.
3. Copy the value of the `notion_user_id` cookie (a UUID) -> `NOTION_ACTIVE_USER`.
4. Add both as repo secrets:
   ```bash
   gh secret set NOTION_TOKEN_V2 --repo victortrinh/date-my-dish
   gh secret set NOTION_ACTIVE_USER --repo victortrinh/date-my-dish
   ```

The three `auto-publish-*.yml` workflows pass these through as env vars (replacing the unused
`NOTION_TOKEN` secret that was wired up but never read by any script).

## Known limitation

`token_v2` is a session cookie tied to a browser login, not an API credential — it can expire or be
invalidated (password change, "log out of all sessions", Notion-side session rotation) with no
warning, at which point these workflows will start 403ing again and the cookie must be re-extracted
and re-set manually. This is strictly worse long-term than the official, versioned API — treat this
as an interim unblock, and revisit the official-API migration once integration-creation permission
is available on the target workspace.

## Verification

`node scripts/fetch-notion-recipe.mjs` (and article/review) without `NOTION_TOKEN_V2` /
`NOTION_ACTIVE_USER` set fails immediately with a clear error instead of three retries ending in a
403. With both set, compare output against a known-good historical `notion/pending-*.json` (e.g.
`git show 4ef10c7:notion/pending-recipe.json`) for matching structure, then confirm on a real CI
runner with `gh workflow run auto-publish-recipe.yml`.
