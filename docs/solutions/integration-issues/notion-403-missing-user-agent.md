---
title: "Notion Fetch Workflows 403: Missing User-Agent, Not Auth or IP Blocking"
date: 2026-08-13
category: integration-issues
tags:
  - notion
  - github-actions
  - content-pipeline
  - cloudflare
severity: high
component: scripts/notion-utils.mjs, scripts/fetch-notion-recipe.mjs, scripts/fetch-notion-article.mjs, scripts/fetch-notion-review.mjs, scripts/dump-notion-content.mjs
status: resolved
---

# Notion Fetch Workflows 403: Missing User-Agent, Not Auth or IP Blocking

## Problem

All three Notion fetch workflows (`auto-publish-recipe.yml`, `auto-publish-article.yml`,
`auto-publish-review.yml`) started failing in early August 2026 with:

```
[WARN] getPage(database) attempt 1 failed: [POST] "https://www.notion.so/api/v3/loadPageChunk": 403 Forbidden
[ERROR] getPage(database) failed after 3 attempts
```

## Investigation (two wrong turns first)

**First hypothesis: unauthenticated requests are blocked.** The fetch scripts call
`new NotionAPI()` (from `notion-client`, an unofficial wrapper around Notion's private
`www.notion.so/api/v3/*` endpoints) with no credentials. Tried authenticating with a logged-in
session's `token_v2`/`notion_user_id` cookies. **Still 403'd from GitHub Actions**, ruling this out.

**Second hypothesis: GitHub Actions' datacenter IP range is hard-blocked.** Plausible since the
same authenticated request succeeded from a residential IP. But this couldn't be tested directly
without instrumenting the actual failing request.

**Root cause, found by inspecting the response instead of guessing further.** Added a temporary
diagnostic script hitting `https://www.notion.so/api/v3/loadPageChunk` directly with `fetch()`,
logging status, `cf-ray`/`server`/`content-type` headers, and the response body. Ran it via a
throwaway `workflow_dispatch` job on the actual GitHub Actions runner. Result:

| Request | Status |
|---|---|
| Unauthenticated, no User-Agent | 403, `server: cloudflare`, HTML challenge page |
| Unauthenticated, browser User-Agent | **200**, JSON body |
| Authenticated (`token_v2` cookie), no User-Agent | 403, same HTML challenge page |
| Authenticated, browser User-Agent | 200, JSON body |

Auth made zero difference in either direction. The only variable that mattered was the
`User-Agent` header. `notion-client`'s `fetch()` (via `ofetch`) sends no `User-Agent` by default,
and Cloudflare's edge WAF in front of `notion.so` challenges/blocks that request pattern from
datacenter IPs, independent of the page's public status or any Notion-level authentication.

## Solution

`scripts/notion-utils.mjs`:

```js
import { NotionAPI } from "notion-client";

const BROWSER_USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36";

export function createNotionApi() {
  return new NotionAPI({
    ofetchOptions: { headers: { "User-Agent": BROWSER_USER_AGENT } },
  });
}
```

All four scripts (`fetch-notion-recipe.mjs`, `fetch-notion-article.mjs`,
`fetch-notion-review.mjs`, `dump-notion-content.mjs`) call `createNotionApi()` instead of
`new NotionAPI()`. No auth, no secrets, no workflow env changes needed — the unused
`NOTION_TOKEN` secret reference in the three `auto-publish-*.yml` workflows was left as-is (it
predates this incident and nothing has ever read it).

## Verification

`node scripts/fetch-notion-recipe.mjs` against the real database, and
`gh workflow run auto-publish-recipe.yml` on a real CI runner, both succeed post-fix.

## Lesson

When an HTTP client starts getting blocked with no code or content change on the other end,
inspect the actual response (status, headers, body) before reaching for auth or infrastructure
changes. `cf-ray`/`server: cloudflare` plus an HTML body on a request that expects JSON is a strong
signal of edge bot-mitigation, not an application-level auth or permission problem — and
bot-mitigation is very often keyed on request fingerprint (User-Agent, TLS, headers) rather than
IP or credentials.
