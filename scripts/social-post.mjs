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
const FETCH_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (compatible; DateMyDishBot/1.0; +https://datemydish.com)",
};

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
      const res = await fetch(url, { method: "HEAD", headers: FETCH_HEADERS });
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
  const res = await fetch(url, { headers: FETCH_HEADERS });

  if (!res.ok) {
    throw new Error(
      `Failed to fetch ${url}: HTTP ${res.status} ${res.statusText}`
    );
  }

  const html = await res.text();

  // Extract the first JSON-LD script (Recipe schema)
  const match = html.match(
    /<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/
  );
  if (!match) {
    console.error(`Page HTML length: ${html.length}, first 500 chars: ${html.slice(0, 500)}`);
    throw new Error(`No JSON-LD found on ${url}`);
  }

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
    max_tokens: 2500,
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

WRITING RULES (follow strictly):
- Write like a real person, not a marketing bot. Vary sentence length and structure.
- NEVER use these AI-tell words: elevate, unlock, discover, master, journey, vibrant, nestled, tapestry, testament, showcase, underscore, highlight (as verb), landscape (abstract), pivotal, crucial, fostering, encompassing, delve, interplay, intricate.
- NEVER use em-dashes (--). Use commas, periods, or semicolons instead.
- NEVER use the rule of three pattern (listing exactly 3 adjectives or phrases in parallel).
- NEVER use "Not only X, but Y" or "It's not just X, it's Y" constructions.
- NEVER use -ing participial phrases tacked onto sentences for fake depth (e.g., "showcasing how...", "ensuring that...", "reflecting the...").
- NEVER use "serves as", "stands as", or "marks a" when "is" works fine.
- NEVER start with "Discover", "Unlock", "Master", "Elevate", or "Dive into".
- Avoid promotional puffery: "game-changing", "next-level", "restaurant-quality" (use sparingly if at all).
- Be specific and concrete. Say what the food tastes like, not that it's "impressive".
- Keep it cheeky and confident, like you're texting a friend who loves food.
- Each variant should sound genuinely different, not the same idea with synonym swaps.

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

2. "pinterest_title": English only, catchy, max 100 characters (Pin variant 1: straightforward recipe title)

3. "pinterest_description": English only, SEO-friendly, max 500 characters. Mention key ingredients and cooking method naturally. Do NOT include the recipe URL, it's handled separately via the pin link.

4. "pinterest_title_v2": Alternate angle pin title: focus on the occasion or date night vibe. Max 100 characters.

5. "pinterest_description_v2": Alternate angle description: emphasize the occasion, date night tips, or how it makes people feel. Max 500 characters. Do NOT include the recipe URL.

6. "pinterest_title_v3": Seasonal/lifestyle angle: focus on cuisine, difficulty, or time. Max 100 characters.

7. "pinterest_description_v3": Seasonal/lifestyle angle description: emphasize ease, cuisine style, or when to make it. Max 500 characters. Do NOT include the recipe URL.

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
// Build pin variants array from captions
// ---------------------------------------------------------------------------
function buildPinVariants(captions, existingPins = []) {
  const now = new Date();
  const pin2Date = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000);
  const pin3Date = new Date(now.getTime() + 12 * 24 * 60 * 60 * 1000);

  // Keep existing pins as-is, fill in missing variants
  const pins = [...existingPins];

  if (!pins.find((p) => p.variant === 1)) {
    pins.push({
      variant: 1,
      title: captions.pinterest_title,
      description: captions.pinterest_description,
      status: "pending",
    });
  }

  if (!pins.find((p) => p.variant === 2)) {
    pins.push({
      variant: 2,
      title: captions.pinterest_title_v2,
      description: captions.pinterest_description_v2,
      scheduledFor: pin2Date.toISOString(),
      status: "pending",
    });
  }

  if (!pins.find((p) => p.variant === 3)) {
    pins.push({
      variant: 3,
      title: captions.pinterest_title_v3,
      description: captions.pinterest_description_v3,
      scheduledFor: pin3Date.toISOString(),
      status: "pending",
    });
  }

  return pins.sort((a, b) => a.variant - b.variant);
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
// Check if Pinterest pin 1 is already posted (multi-pin format)
// ---------------------------------------------------------------------------
function isPinterestPin1Done(existing) {
  if (!existing.pinterest) return false;
  // New format: pins array
  if (existing.pinterest.pins) {
    return existing.pinterest.pins.some((p) => p.variant === 1 && p.status === "posted");
  }
  // Legacy format: single id at top level
  return !!existing.pinterest.id;
}

function isPinterestFullyScheduled(existing) {
  if (!existing.pinterest?.pins) return false;
  return [1, 2, 3].every((v) =>
    existing.pinterest.pins.some((p) => p.variant === v && (p.status === "posted" || p.status === "pending"))
  );
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
  const pinterestPin1Done = isPinterestPin1Done(existing);
  const pinterestFullyScheduled = isPinterestFullyScheduled(existing);

  if (instagramDone && pinterestFullyScheduled) {
    console.log(`Skipping ${slug}: already posted to both platforms (all variants scheduled)`);
    return;
  }
  if (instagramDone && shouldPostInstagram && !shouldPostPinterest) {
    console.log(`Skipping ${slug}: already posted to Instagram`);
    return;
  }
  if (pinterestFullyScheduled && shouldPostPinterest && !shouldPostInstagram) {
    console.log(`Skipping ${slug}: Pinterest all variants scheduled`);
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

  // Generate captions (now includes all 3 pin variants)
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

  // Post Pinterest pin 1 and schedule variants 2-3
  if (shouldPostPinterest && !pinterestFullyScheduled) {
    const existingPins = existing.pinterest?.pins || [];
    const pins = buildPinVariants(captions, existingPins);

    // Post pin variant 1 immediately
    const pin1 = pins.find((p) => p.variant === 1);
    if (pin1 && pin1.status !== "posted") {
      try {
        const pinId = await postToPinterest(
          heroImageUrl,
          pin1.title,
          pin1.description,
          recipeUrl,
          enData.heroImageAlt
        );
        if (pinId) {
          pin1.id = pinId;
          pin1.postedAt = new Date().toISOString();
          pin1.status = "posted";
        }
      } catch (err) {
        console.error(`Pinterest pin 1 failed for ${slug}:`, err.message);
        await createFailureIssue(slug, "Pinterest", err, heroImageUrl);
        pin1.status = "failed";
        pin1.error = err.message;
        pin1.failedAt = new Date().toISOString();
      }
    }

    results.pinterest = { pins };
    console.log(`Pinterest: pin 1 ${pin1?.status}, variants 2-3 scheduled`);
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
    if (platform === "both") return !existing.instagram?.id || !isPinterestFullyScheduled(existing);
    if (platform === "instagram") return !existing.instagram?.id;
    if (platform === "pinterest") return !isPinterestFullyScheduled(existing);
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
