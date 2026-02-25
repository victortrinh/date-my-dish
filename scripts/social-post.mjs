// scripts/social-post.mjs
// Automatic social media posting for Date My Dish recipes.
// Posts to Instagram (bilingual EN+FR) and Pinterest (EN only).
//
// Usage:
//   node scripts/social-post.mjs src/content/recipes/en/slug.mdx [...]
//   node scripts/social-post.mjs --backfill

import { readFileSync, writeFileSync, readdirSync, existsSync } from "fs";
import { join, basename } from "path";
import matter from "gray-matter";
import Anthropic from "@anthropic-ai/sdk";

const SITE_URL = "https://datemydish.com";
const RECIPES_DIR = "src/content/recipes";
const LOG_FILE = "data/social-posts-log.json";
const DEPLOY_POLL_INTERVAL_MS = 10_000;
const DEPLOY_MAX_ATTEMPTS = 30;

// ---------------------------------------------------------------------------
// Env vars
// ---------------------------------------------------------------------------
const {
  ANTHROPIC_API_KEY,
  INSTAGRAM_ACCESS_TOKEN,
  INSTAGRAM_USER_ID,
  PINTEREST_ACCESS_TOKEN,
  PINTEREST_BOARD_ID,
  PLATFORM = "both",
  RECIPES_PER_RUN = "50",
} = process.env;

// ---------------------------------------------------------------------------
// Social posts log (idempotency)
// ---------------------------------------------------------------------------
function readLog() {
  if (!existsSync(LOG_FILE)) return {};
  return JSON.parse(readFileSync(LOG_FILE, "utf-8"));
}

function writeLog(log) {
  writeFileSync(LOG_FILE, JSON.stringify(log, null, 2) + "\n");
}

// ---------------------------------------------------------------------------
// Frontmatter parsing
// ---------------------------------------------------------------------------
function parseRecipe(filePath) {
  const raw = readFileSync(filePath, "utf-8");
  const { data } = matter(raw);
  const slug = basename(filePath, ".mdx");
  return { ...data, slug };
}

function findFrTranslation(enSlug) {
  const frDir = join(RECIPES_DIR, "fr");
  const files = readdirSync(frDir).filter((f) => f.endsWith(".mdx"));
  for (const file of files) {
    const frData = parseRecipe(join(frDir, file));
    if (frData.translationSlug === enSlug) {
      return frData;
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Deploy health check
// ---------------------------------------------------------------------------
async function waitForDeploy(slug) {
  const url = `${SITE_URL}/en/recipes/${slug}/`;
  console.log(`Waiting for deploy: ${url}`);

  for (let i = 0; i < DEPLOY_MAX_ATTEMPTS; i++) {
    try {
      const res = await fetch(url, { method: "HEAD" });
      if (res.ok) {
        console.log(`Deploy ready after ${(i + 1) * DEPLOY_POLL_INTERVAL_MS / 1000}s`);
        return;
      }
    } catch {
      // Network error, keep polling
    }
    await new Promise((r) => setTimeout(r, DEPLOY_POLL_INTERVAL_MS));
  }

  throw new Error(
    `Deploy not ready after ${(DEPLOY_MAX_ATTEMPTS * DEPLOY_POLL_INTERVAL_MS) / 1000}s: ${url}`
  );
}

// ---------------------------------------------------------------------------
// Hero image URL resolution (from live JSON-LD)
// ---------------------------------------------------------------------------
async function resolveHeroImageUrl(slug) {
  const url = `${SITE_URL}/en/recipes/${slug}/`;
  const res = await fetch(url);
  const html = await res.text();

  // Extract the first JSON-LD script (Recipe schema)
  const match = html.match(
    /<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/
  );
  if (!match) throw new Error(`No JSON-LD found on ${url}`);

  const jsonLd = JSON.parse(match[1]);
  // Recipe JSON-LD image is always array format per CLAUDE.md
  const image = Array.isArray(jsonLd.image) ? jsonLd.image[0] : jsonLd.image;
  if (!image) throw new Error(`No image in JSON-LD on ${url}`);

  return image;
}

// ---------------------------------------------------------------------------
// Caption generation via Claude
// ---------------------------------------------------------------------------
async function generateCaptions(enData, frData) {
  if (!ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY is required for caption generation");
  }

  const anthropic = new Anthropic();

  const frTitle = frData ? frData.title : enData.title;
  const frDescription = frData ? frData.description : enData.description;
  const frSlug = frData ? frData.slug : enData.slug;

  const response = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 1500,
    messages: [
      {
        role: "user",
        content: `Generate social media captions for this recipe from Date My Dish, a bilingual (English/French) date night recipe blog.

RECIPE DATA (English):
- Title: ${enData.title}
- Description: ${enData.description}
- Cuisine: ${enData.recipeCuisine}
- Categories: ${(enData.recipeCategory || []).join(", ")}
- Keywords: ${(enData.keywords || []).join(", ")}
- Tags: ${(enData.tags || []).join(", ")}
- Occasions: ${(enData.occasion || []).join(", ")}
- Difficulty: ${enData.difficulty}
- Total Time: ${enData.totalTime}
- Yield: ${enData.recipeYield}
- Date Night Tips: ${JSON.stringify(enData.dateNightTips || {})}

RECIPE DATA (French):
- Title: ${frTitle}
- Description: ${frDescription}

RECIPE URLs:
- English: ${SITE_URL}/en/recipes/${enData.slug}/
- French: ${SITE_URL}/fr/recettes/${frSlug}/

Return a JSON object with exactly these keys:

1. "instagram_caption": A bilingual Instagram caption following this structure:
   - Engaging hook line in English (1 line)
   - 1-2 sentence description in English
   - If date night tips exist, include a wine/music/plating tip
   - Recipe link (English)
   - A separator line "---"
   - French version of the above (hook + description + tip)
   - Recipe link (French)
   - A blank line, then 20-30 hashtags mixing: #datemydish, cuisine-specific, food-general, French hashtags

2. "pinterest_title": English only, catchy, max 100 characters

3. "pinterest_description": English only, SEO-optimized, max 500 characters. Include key ingredients, cooking method, and relevant keywords naturally. End with the recipe URL.

Return ONLY the JSON object, no markdown fences.`,
      },
    ],
  });

  const text = response.content[0].text.trim();
  // Handle potential markdown code fences
  const cleaned = text.replace(/^```json?\n?/, "").replace(/\n?```$/, "");
  return JSON.parse(cleaned);
}

// ---------------------------------------------------------------------------
// Instagram Graph API
// ---------------------------------------------------------------------------
async function postToInstagram(imageUrl, caption) {
  if (!INSTAGRAM_ACCESS_TOKEN || !INSTAGRAM_USER_ID) {
    console.log("Skipping Instagram: missing INSTAGRAM_ACCESS_TOKEN or INSTAGRAM_USER_ID");
    return null;
  }

  console.log("Creating Instagram media container...");

  // Step 1: Create media container
  const containerRes = await fetch(
    `https://graph.instagram.com/v21.0/${INSTAGRAM_USER_ID}/media`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        image_url: imageUrl,
        caption,
        access_token: INSTAGRAM_ACCESS_TOKEN,
      }),
    }
  );

  const containerData = await containerRes.json();
  if (containerData.error) {
    throw new Error(
      `Instagram container creation failed: ${containerData.error.message} (code: ${containerData.error.code})`
    );
  }

  const containerId = containerData.id;
  console.log(`Container created: ${containerId}`);

  // Step 2: Poll until container is ready
  let status = "IN_PROGRESS";
  let attempts = 0;
  while (status === "IN_PROGRESS" && attempts < 30) {
    await new Promise((r) => setTimeout(r, 5000));
    const statusRes = await fetch(
      `https://graph.instagram.com/v21.0/${containerId}?fields=status_code&access_token=${INSTAGRAM_ACCESS_TOKEN}`
    );
    const statusData = await statusRes.json();
    status = statusData.status_code;
    attempts++;
    console.log(`Container status: ${status} (attempt ${attempts})`);
  }

  if (status === "ERROR") {
    throw new Error("Instagram media container processing failed");
  }
  if (status !== "FINISHED") {
    throw new Error(`Instagram container not ready after ${attempts} attempts, status: ${status}`);
  }

  // Step 3: Publish
  console.log("Publishing Instagram post...");
  const publishRes = await fetch(
    `https://graph.instagram.com/v21.0/${INSTAGRAM_USER_ID}/media_publish`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        creation_id: containerId,
        access_token: INSTAGRAM_ACCESS_TOKEN,
      }),
    }
  );

  const publishData = await publishRes.json();
  if (publishData.error) {
    throw new Error(
      `Instagram publish failed: ${publishData.error.message} (code: ${publishData.error.code})`
    );
  }

  console.log(`Instagram post published: ${publishData.id}`);
  return publishData.id;
}

// ---------------------------------------------------------------------------
// Pinterest API v5
// ---------------------------------------------------------------------------
async function postToPinterest(imageUrl, title, description, link, altText) {
  if (!PINTEREST_ACCESS_TOKEN || !PINTEREST_BOARD_ID) {
    console.log("Skipping Pinterest: missing PINTEREST_ACCESS_TOKEN or PINTEREST_BOARD_ID");
    return null;
  }

  console.log("Creating Pinterest pin...");

  const res = await fetch("https://api.pinterest.com/v5/pins", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${PINTEREST_ACCESS_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      board_id: PINTEREST_BOARD_ID,
      title: title.slice(0, 100),
      description: description.slice(0, 800),
      link,
      alt_text: (altText || "").slice(0, 500),
      media_source: {
        source_type: "image_url",
        url: imageUrl,
      },
    }),
  });

  if (res.status === 429) {
    const retryAfter = res.headers.get("Retry-After");
    throw new Error(`Pinterest rate limited. Retry after ${retryAfter}s`);
  }

  const data = await res.json();

  if (!res.ok) {
    throw new Error(
      `Pinterest API error ${data.code || res.status}: ${data.message || JSON.stringify(data)}`
    );
  }

  console.log(`Pinterest pin created: ${data.id}`);
  return data.id;
}

// ---------------------------------------------------------------------------
// Create GitHub issue on failure
// ---------------------------------------------------------------------------
async function createFailureIssue(slug, platform, error, imageUrl) {
  // Uses gh CLI which is available in GitHub Actions
  const title = `Social media post failed: ${slug} on ${platform}`;
  const body = [
    `## Social Media Posting Failure`,
    ``,
    `| Field | Value |`,
    `|-------|-------|`,
    `| **Recipe** | \`${slug}\` |`,
    `| **Platform** | ${platform} |`,
    `| **Error** | ${error.message} |`,
    `| **Image URL** | ${imageUrl || "N/A"} |`,
    `| **Timestamp** | ${new Date().toISOString()} |`,
    ``,
    `### Error Details`,
    `\`\`\``,
    `${error.stack || error.message}`,
    `\`\`\``,
    ``,
    `### Recovery`,
    `Re-run the backfill workflow for this recipe, or manually post.`,
  ].join("\n");

  try {
    const { execSync } = await import("child_process");
    execSync(
      `gh issue create --title "${title}" --body "${body.replace(/"/g, '\\"')}" --label "social-media-failure"`,
      { stdio: "inherit" }
    );
  } catch (issueErr) {
    console.error("Failed to create GitHub issue:", issueErr.message);
  }
}

// ---------------------------------------------------------------------------
// Process a single recipe
// ---------------------------------------------------------------------------
async function processRecipe(enFilePath, log, options = {}) {
  const enData = parseRecipe(enFilePath);
  const slug = enData.slug;
  const shouldPostInstagram =
    options.platform === "both" || options.platform === "instagram";
  const shouldPostPinterest =
    options.platform === "both" || options.platform === "pinterest";

  console.log(`\n${"=".repeat(60)}`);
  console.log(`Processing: ${slug}`);
  console.log(`${"=".repeat(60)}`);

  // Check idempotency
  const existing = log[slug] || {};
  const instagramDone = existing.instagram?.id;
  const pinterestDone = existing.pinterest?.id;

  if (instagramDone && pinterestDone) {
    console.log(`Skipping ${slug}: already posted to both platforms`);
    return;
  }
  if (instagramDone && shouldPostInstagram && !shouldPostPinterest) {
    console.log(`Skipping ${slug}: already posted to Instagram`);
    return;
  }
  if (pinterestDone && shouldPostPinterest && !shouldPostInstagram) {
    console.log(`Skipping ${slug}: already posted to Pinterest`);
    return;
  }

  // Wait for deploy if not in backfill mode (backfill assumes already deployed)
  if (!options.backfill) {
    await waitForDeploy(slug);
  }

  // Resolve hero image URL from live site
  const heroImageUrl = await resolveHeroImageUrl(slug);
  console.log(`Hero image: ${heroImageUrl}`);

  // Find FR translation for bilingual Instagram caption
  const frData = findFrTranslation(slug);

  // Generate captions
  console.log("Generating captions...");
  const captions = await generateCaptions(enData, frData);

  const recipeUrl = `${SITE_URL}/en/recipes/${slug}/`;
  const results = { ...existing };

  // Post to Instagram
  if (shouldPostInstagram && !instagramDone) {
    try {
      const igPostId = await postToInstagram(heroImageUrl, captions.instagram_caption);
      if (igPostId) {
        results.instagram = { id: igPostId, postedAt: new Date().toISOString() };
      }
    } catch (err) {
      console.error(`Instagram failed for ${slug}:`, err.message);
      await createFailureIssue(slug, "Instagram", err, heroImageUrl);
      results.instagram = { error: err.message, failedAt: new Date().toISOString() };
    }
  }

  // Post to Pinterest
  if (shouldPostPinterest && !pinterestDone) {
    try {
      const pinId = await postToPinterest(
        heroImageUrl,
        captions.pinterest_title,
        captions.pinterest_description,
        recipeUrl,
        enData.heroImageAlt
      );
      if (pinId) {
        results.pinterest = { id: pinId, postedAt: new Date().toISOString() };
      }
    } catch (err) {
      console.error(`Pinterest failed for ${slug}:`, err.message);
      await createFailureIssue(slug, "Pinterest", err, heroImageUrl);
      results.pinterest = { error: err.message, failedAt: new Date().toISOString() };
    }
  }

  log[slug] = results;
  writeLog(log);
}

// ---------------------------------------------------------------------------
// Backfill mode: post all existing EN recipes
// ---------------------------------------------------------------------------
async function runBackfill() {
  const log = readLog();
  const platform = PLATFORM;
  const limit = parseInt(RECIPES_PER_RUN, 10);

  const enDir = join(RECIPES_DIR, "en");
  const allRecipes = readdirSync(enDir)
    .filter((f) => f.endsWith(".mdx"))
    .map((f) => join(enDir, f));

  // Filter to recipes not yet posted on the target platform(s)
  const pending = allRecipes.filter((filePath) => {
    const slug = basename(filePath, ".mdx");
    const existing = log[slug] || {};
    if (platform === "both") return !existing.instagram?.id || !existing.pinterest?.id;
    if (platform === "instagram") return !existing.instagram?.id;
    if (platform === "pinterest") return !existing.pinterest?.id;
    return true;
  });

  console.log(`Backfill: ${pending.length} recipes pending, posting up to ${limit}`);

  const batch = pending.slice(0, limit);
  for (const filePath of batch) {
    await processRecipe(filePath, log, { backfill: true, platform });
    // Small delay between posts to be respectful to APIs
    if (batch.indexOf(filePath) < batch.length - 1) {
      console.log("Waiting 10s between posts...");
      await new Promise((r) => setTimeout(r, 10_000));
    }
  }

  console.log(`\nBackfill complete. Posted ${batch.length} recipes.`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  const args = process.argv.slice(2);

  if (args.includes("--backfill")) {
    await runBackfill();
    return;
  }

  // Normal mode: process specific recipe files passed as arguments
  const files = args.filter((a) => a.endsWith(".mdx"));
  if (files.length === 0) {
    console.log("No recipe files to process. Exiting.");
    process.exit(0);
  }

  const log = readLog();
  for (const file of files) {
    await processRecipe(file, log, { platform: "both" });
  }

  console.log(`\nDone. Processed ${files.length} recipe(s).`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
