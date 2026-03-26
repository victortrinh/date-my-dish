// scripts/refresh-tokens.mjs
// Refreshes Instagram and Pinterest access tokens and updates GitHub Secrets.
//
// Usage: node scripts/refresh-tokens.mjs
// Required env vars: see below.

import { execSync } from "child_process";

const {
  INSTAGRAM_ACCESS_TOKEN,
  PINTEREST_REFRESH_TOKEN,
  PINTEREST_CLIENT_ID,
  PINTEREST_CLIENT_SECRET,
  GH_TOKEN,
} = process.env;

let hasError = false;

// ---------------------------------------------------------------------------
// Instagram token refresh
// ---------------------------------------------------------------------------
async function refreshInstagram() {
  if (!INSTAGRAM_ACCESS_TOKEN) {
    console.log("Skipping Instagram refresh: no INSTAGRAM_ACCESS_TOKEN");
    return;
  }

  console.log("Refreshing Instagram long-lived token...");

  const res = await fetch(
    `https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=${INSTAGRAM_ACCESS_TOKEN}`
  );
  const data = await res.json();

  if (data.error) {
    throw new Error(
      `Instagram refresh failed: ${data.error.message} (code: ${data.error.code})`
    );
  }

  const newToken = data.access_token;
  const expiresIn = data.expires_in;
  console.log(`Instagram token refreshed. Expires in ${Math.round(expiresIn / 86400)} days.`);

  // Update GitHub Secret via stdin (avoids leaking token in command args/logs)
  try {
    execSync("gh secret set INSTAGRAM_ACCESS_TOKEN", {
      input: newToken,
      stdio: ["pipe", "inherit", "pipe"],
      env: { ...process.env, GH_TOKEN },
    });
    console.log("GitHub Secret INSTAGRAM_ACCESS_TOKEN updated.");
  } catch {
    throw new Error("Failed to update INSTAGRAM_ACCESS_TOKEN secret. Ensure PAT_TOKEN has the 'repo' scope.");
  }
}

// ---------------------------------------------------------------------------
// Pinterest token refresh
// ---------------------------------------------------------------------------
async function refreshPinterest() {
  if (!PINTEREST_REFRESH_TOKEN || !PINTEREST_CLIENT_ID || !PINTEREST_CLIENT_SECRET) {
    console.log("Skipping Pinterest refresh: missing credentials");
    return;
  }

  console.log("Refreshing Pinterest tokens...");

  const credentials = Buffer.from(
    `${PINTEREST_CLIENT_ID}:${PINTEREST_CLIENT_SECRET}`
  ).toString("base64");

  const res = await fetch("https://api.pinterest.com/v5/oauth/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: PINTEREST_REFRESH_TOKEN,
    }),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(
      `Pinterest refresh failed: ${data.message || JSON.stringify(data)}`
    );
  }

  const newAccessToken = data.access_token;
  const newRefreshToken = data.refresh_token;
  console.log(
    `Pinterest tokens refreshed. Access expires in ${Math.round(data.expires_in / 86400)} days.`
  );

  // Update both secrets via stdin (avoids leaking tokens in command args/logs)
  try {
    execSync("gh secret set PINTEREST_ACCESS_TOKEN", {
      input: newAccessToken,
      stdio: ["pipe", "inherit", "pipe"],
      env: { ...process.env, GH_TOKEN },
    });
    execSync("gh secret set PINTEREST_REFRESH_TOKEN", {
      input: newRefreshToken,
      stdio: ["pipe", "inherit", "pipe"],
      env: { ...process.env, GH_TOKEN },
    });
    console.log("GitHub Secrets PINTEREST_ACCESS_TOKEN and PINTEREST_REFRESH_TOKEN updated.");
  } catch {
    throw new Error("Failed to update Pinterest secrets. Ensure PAT_TOKEN has the 'repo' scope.");
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  try {
    await refreshInstagram();
  } catch (err) {
    console.error("Instagram refresh error:", err.message);
    hasError = true;
    createFailureIssue("Instagram", err);
  }

  try {
    await refreshPinterest();
  } catch (err) {
    console.error("Pinterest refresh error:", err.message);
    hasError = true;
    createFailureIssue("Pinterest", err);
  }

  if (hasError) {
    process.exit(1);
  }

  console.log("\nAll tokens refreshed successfully.");
}

function createFailureIssue(platform, error) {
  // Sanitize error message to avoid leaking tokens in GitHub issues
  const safeMessage = error.message
    .replace(/pina_[A-Za-z0-9]+/g, "[REDACTED]")
    .replace(/IGQV[A-Za-z0-9_-]+/g, "[REDACTED]");

  const title = `Token refresh failed: ${platform}`;
  const body = [
    "## Token Refresh Failure",
    "",
    "| Field | Value |",
    "|-------|-------|",
    `| **Platform** | ${platform} |`,
    `| **Error** | ${safeMessage} |`,
    `| **Timestamp** | ${new Date().toISOString()} |`,
    "",
    "### Recovery",
    "Manually generate a new token following the setup guide:",
    "`docs/guides/social-media-api-setup.md`",
  ].join("\n");

  try {
    execSync("gh issue create --title " + JSON.stringify(title) + " --body -", {
      input: body,
      stdio: ["pipe", "inherit", "pipe"],
      env: { ...process.env, GH_TOKEN },
    });
  } catch {
    console.error("Failed to create GitHub issue (check PAT_TOKEN permissions).");
  }
}

main();
