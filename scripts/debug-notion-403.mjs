// Temporary diagnostic script. Not part of the pipeline.
// Prints response status/headers/body for the same request the fetch
// scripts make, both unauthenticated and authenticated, and with/without
// a browser-like User-Agent, to isolate whether the 403 is IP-based
// (Cloudflare edge) or auth-based (Notion application layer).

const DATABASE_PAGE_ID = "9ce95183-5035-43d6-8450-194d1010824b";
const URL = "https://www.notion.so/api/v3/loadPageChunk";
const BODY = JSON.stringify({
  pageId: DATABASE_PAGE_ID,
  limit: 1,
  cursor: { stack: [] },
  chunkNumber: 0,
  verticalColumns: false,
});

async function attempt(label, headers) {
  console.log(`\n--- ${label} ---`);
  try {
    const res = await fetch(URL, { method: "POST", headers, body: BODY });
    console.log("status:", res.status, res.statusText);
    console.log("cf-ray:", res.headers.get("cf-ray"));
    console.log("cf-mitigated:", res.headers.get("cf-mitigated"));
    console.log("server:", res.headers.get("server"));
    console.log("content-type:", res.headers.get("content-type"));
    const text = await res.text();
    console.log("body (first 300 chars):", text.slice(0, 300));
  } catch (err) {
    console.log("threw:", err.message);
  }
}

async function main() {
  const authToken = process.env.NOTION_TOKEN_V2;
  const activeUser = process.env.NOTION_ACTIVE_USER;

  await attempt("unauthenticated, no UA", {
    "Content-Type": "application/json",
  });

  await attempt("unauthenticated, browser UA", {
    "Content-Type": "application/json",
    "User-Agent":
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
  });

  if (authToken && activeUser) {
    await attempt("authenticated, no UA", {
      "Content-Type": "application/json",
      cookie: `token_v2=${authToken}`,
      "x-notion-active-user-header": activeUser,
    });

    await attempt("authenticated, browser UA", {
      "Content-Type": "application/json",
      cookie: `token_v2=${authToken}`,
      "x-notion-active-user-header": activeUser,
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
    });
  } else {
    console.log("\n(skipping authenticated attempts, no secrets set)");
  }
}

main();
