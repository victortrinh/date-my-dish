// scripts/social-post.mjs
// Automatic social media posting for Date My Dish.
// Instagram: recipes only, bilingual EN+FR caption, single post.
// Pinterest: recipes, articles, and reviews. Posts one pin per unique photo
// found on the page (hero + body/step images), staggered over time. Content
// with only one photo falls back to the original 3 title-variant pins on
// that single photo.
//
// This script is strictly additive with respect to data/social-posts-log.json:
// it never rewrites, reschedules, or removes an existing pin entry (posted,
// pending, or failed-with-history). It only appends new pin entries for
// images that aren't represented in the log yet. Editing already-live pins
// is a separate, deliberate, manual tool: scripts/pinterest-update-pins.mjs.
//
// Usage:
//   node scripts/social-post.mjs src/content/recipes/en/slug.mdx [...]
//   node scripts/social-post.mjs src/content/articles/en/slug.mdx [...]
//   node scripts/social-post.mjs src/content/reviews/en/slug.mdx [...]
//   node scripts/social-post.mjs --backfill                # all types
//   CONTENT_TYPE=review node scripts/social-post.mjs --backfill

import { readFileSync, writeFileSync, readdirSync, existsSync } from "fs";
import { join, basename } from "path";
import matter from "gray-matter";
import {
  SITE_URL,
  CONTENT_TYPES,
  buildContentUrl,
  contentDir,
  boardIdForType,
  fetchLiveHtml,
  discoverImagesFromHtml,
  imageKeyFor,
  resolveLocalAsset,
} from "./lib/content-images.mjs";

const LOG_FILE = "data/social-posts-log.json";
const DEPLOY_POLL_INTERVAL_MS = 10_000;
const DEPLOY_MAX_ATTEMPTS = 30;
const MAX_NEW_PINS_PER_ITEM = 8; // safety cap per recipe/article/review per run
const STAGGER_FIRST_GAP_DAYS = 5;
const STAGGER_STEP_DAYS = 7;

// ---------------------------------------------------------------------------
// Env vars
// ---------------------------------------------------------------------------
const {
  INSTAGRAM_ACCESS_TOKEN,
  INSTAGRAM_USER_ID,
  PLATFORM = "both",
  RECIPES_PER_RUN = "50",
  CONTENT_TYPE = "all", // recipe | article | review | all (backfill only)
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
function parseContent(filePath) {
  const raw = readFileSync(filePath, "utf-8");
  const { data } = matter(raw);
  const slug = basename(filePath, ".mdx");
  return { ...data, slug };
}

function typeFromPath(filePath) {
  if (filePath.includes("/articles/")) return "article";
  if (filePath.includes("/reviews/")) return "review";
  return "recipe";
}

function findFrTranslation(type, enSlug) {
  const frDir = contentDir(type, "fr");
  if (!existsSync(frDir)) return null;
  const files = readdirSync(frDir).filter((f) => f.endsWith(".mdx"));
  for (const file of files) {
    const frData = parseContent(join(frDir, file));
    if (frData.translationSlug === enSlug) return frData;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Deploy health check
// ---------------------------------------------------------------------------
async function waitForDeploy(url) {
  console.log(`Waiting for deploy: ${url}`);
  for (let i = 0; i < DEPLOY_MAX_ATTEMPTS; i++) {
    try {
      const res = await fetch(url, { method: "HEAD" });
      if (res.ok) {
        console.log(`Deploy ready after ${((i + 1) * DEPLOY_POLL_INTERVAL_MS) / 1000}s`);
        return;
      }
    } catch {
      // keep polling
    }
    await new Promise((r) => setTimeout(r, DEPLOY_POLL_INTERVAL_MS));
  }
  throw new Error(
    `Deploy not ready after ${(DEPLOY_MAX_ATTEMPTS * DEPLOY_POLL_INTERVAL_MS) / 1000}s: ${url}`
  );
}

// ---------------------------------------------------------------------------
// Image discovery, with local build fallback (mirrors old resolveHeroImageUrl)
// ---------------------------------------------------------------------------
async function discoverContentImages(type, slug, heroAlt) {
  const url = buildContentUrl(type, slug);

  try {
    const html = await fetchLiveHtml(url);
    return { url, images: discoverImagesFromHtml(html, { heroAlt }) };
  } catch (err) {
    console.warn(`Live fetch failed (${err.message}), trying local build...`);
  }

  const localPath = join("dist", "client", "en", CONTENT_TYPES[type].urlSegment, slug, "index.html");
  if (existsSync(localPath)) {
    const html = readFileSync(localPath, "utf-8");
    return { url, images: discoverImagesFromHtml(html, { heroAlt }) };
  }

  throw new Error(
    `Cannot resolve images for ${slug}: live site unreachable and no local build at ${localPath}`
  );
}

// ---------------------------------------------------------------------------
// Caption generation
// ---------------------------------------------------------------------------
function buildInstagramTemplate(enData, frData) {
  const tags = (enData.tags || []).map((t) => `#${t.replace(/\s+/g, "")}`).join(" ");
  const frTitle = frData ? `\n${frData.title}` : "";
  return `${enData.title}${frTitle}\n\n${enData.description}\n\nFull recipe on datemydish.com\n\n${tags}`;
}

function baseDescriptionFor(enData) {
  return enData.socialCaption?.pinterest || enData.description;
}

function timeHookTitle(enData) {
  const timeMatch = enData.totalTime?.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
  const hours = timeMatch?.[1] ? parseInt(timeMatch[1]) : 0;
  const mins = timeMatch?.[2] ? parseInt(timeMatch[2]) : 0;
  const totalMins = hours * 60 + mins;
  const timeStr =
    totalMins >= 120 ? `${Math.round(totalMins / 60)}-Hour` : totalMins > 0 ? `${totalMins}-Minute` : null;
  const cuisine = enData.recipeCuisine || "Homemade";
  const category = enData.recipeCategory?.[0] || "Recipe";
  const categoryLabel = category.charAt(0).toUpperCase() + category.slice(1);
  return timeStr ? `${timeStr} ${cuisine} ${categoryLabel}` : `${cuisine} ${enData.title}`;
}

// Single-photo fallback: the original 3 title-variant pins on one image.
function buildSinglePhotoVariants(enData) {
  const description = baseDescriptionFor(enData);
  return [
    { title: enData.title.slice(0, 100), description },
    { title: timeHookTitle(enData).slice(0, 100), description },
    { title: `${enData.title} | Perfect for Date Night`.slice(0, 100), description },
  ];
}

// Multi-photo case: one pin per unique image, using that image's own alt /
// pinDescription when available, otherwise the content's general caption.
function captionForImage(enData, image, index) {
  if (image.isHero) {
    return {
      title: enData.title.slice(0, 100),
      description: baseDescriptionFor(enData),
    };
  }

  if (image.pinDescription) {
    // Recipe step images carry a ready-made "{Title} - Step N: ..." string
    // (see InstructionSteps.astro). Strip the leading title repeat since the
    // pin's own title field already carries it.
    const prefix = `${enData.title} - `;
    const description = image.pinDescription.startsWith(prefix)
      ? image.pinDescription.slice(prefix.length)
      : image.pinDescription;
    return {
      title: enData.title.slice(0, 100),
      description: description.slice(0, 800),
    };
  }

  // Article/review body photo: lead with the recipe/article/review title,
  // use the photo's own descriptive alt text as the pin description (this is
  // real, hand-written copy from the MDX, e.g. review dish photos).
  return {
    title: `${enData.title} | Photo ${index + 1}`.slice(0, 100),
    description: (image.alt || baseDescriptionFor(enData)).slice(0, 800),
  };
}

function buildInstructionAlt(image, enData) {
  return image.alt || enData.heroImageAlt || "";
}

// ---------------------------------------------------------------------------
// Instagram Graph API (recipes only)
// ---------------------------------------------------------------------------
async function postToInstagram(imageUrl, caption) {
  if (!INSTAGRAM_ACCESS_TOKEN || !INSTAGRAM_USER_ID) {
    console.log("Skipping Instagram: missing INSTAGRAM_ACCESS_TOKEN or INSTAGRAM_USER_ID");
    return null;
  }

  console.log("Creating Instagram media container...");
  const containerRes = await fetch(
    `https://graph.instagram.com/v21.0/${INSTAGRAM_USER_ID}/media`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image_url: imageUrl, caption, access_token: INSTAGRAM_ACCESS_TOKEN }),
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

  if (status === "ERROR") throw new Error("Instagram media container processing failed");
  if (status !== "FINISHED") throw new Error(`Instagram container not ready after ${attempts} attempts, status: ${status}`);

  console.log("Publishing Instagram post...");
  const publishRes = await fetch(
    `https://graph.instagram.com/v21.0/${INSTAGRAM_USER_ID}/media_publish`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ creation_id: containerId, access_token: INSTAGRAM_ACCESS_TOKEN }),
    }
  );
  const publishData = await publishRes.json();
  if (publishData.error) {
    throw new Error(`Instagram publish failed: ${publishData.error.message} (code: ${publishData.error.code})`);
  }
  console.log(`Instagram post published: ${publishData.id}`);
  return publishData.id;
}

// ---------------------------------------------------------------------------
// Pinterest API v5
// ---------------------------------------------------------------------------
async function postToPinterest(boardId, imageUrl, title, description, link, altText) {
  if (!process.env.PINTEREST_ACCESS_TOKEN || !boardId) {
    console.log("Skipping Pinterest: missing PINTEREST_ACCESS_TOKEN or board ID for this content type");
    return null;
  }

  console.log(`Creating Pinterest pin on board ${boardId}...`);
  const res = await fetch("https://api.pinterest.com/v5/pins", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.PINTEREST_ACCESS_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      board_id: boardId,
      title: title.slice(0, 100),
      description: description.slice(0, 800),
      link,
      alt_text: (altText || "").slice(0, 500),
      media_source: { source_type: "image_url", url: imageUrl },
    }),
  });

  if (res.status === 429) {
    const retryAfter = res.headers.get("Retry-After");
    throw new Error(`Pinterest rate limited. Retry after ${retryAfter}s`);
  }

  const data = await res.json();
  if (!res.ok) {
    throw new Error(`Pinterest API error ${data.code || res.status}: ${data.message || JSON.stringify(data)}`);
  }

  console.log(`Pinterest pin created: ${data.id}`);
  return data.id;
}

// ---------------------------------------------------------------------------
// Create GitHub issue on failure
// ---------------------------------------------------------------------------
async function createFailureIssue(slug, type, platform, error, imageUrl) {
  const title = `Social media post failed: ${slug} (${type}) on ${platform}`;
  const body = [
    `## Social Media Posting Failure`,
    ``,
    `| Field | Value |`,
    `|-------|-------|`,
    `| **Content** | \`${slug}\` (${type}) |`,
    `| **Platform** | ${platform} |`,
    `| **Error** | ${error.message} |`,
    `| **Image URL** | ${imageUrl || "N/A"} |`,
    `| **Timestamp** | ${new Date().toISOString()} |`,
    ``,
    `### Error Details`,
    "```",
    `${error.stack || error.message}`,
    "```",
    ``,
    `### Recovery`,
    `Re-run the backfill workflow for this item, or manually post.`,
  ].join("\n");

  try {
    const { execFileSync } = await import("child_process");
    const { writeFileSync, unlinkSync } = await import("fs");
    const { tmpdir } = await import("os");
    const { join: joinPath } = await import("path");
    // Write the body to a temp file rather than interpolating it into a shell
    // string: it can contain backticks, $, and quotes (recipe titles, error
    // stack traces) that would otherwise be misparsed or executed by the shell.
    const bodyFile = joinPath(tmpdir(), `gh-issue-body-${Date.now()}.md`);
    writeFileSync(bodyFile, body);
    try {
      execFileSync(
        "gh",
        ["issue", "create", "--title", title, "--body-file", bodyFile, "--label", "social-media-failure"],
        { stdio: "inherit" }
      );
    } finally {
      unlinkSync(bodyFile);
    }
  } catch (issueErr) {
    console.error("Failed to create GitHub issue:", issueErr.message);
  }
}

// ---------------------------------------------------------------------------
// Idempotency helpers
// ---------------------------------------------------------------------------
function hasLegacyVariantPins(existing) {
  // Old format: 3 fixed variants of the same hero photo. If any of these
  // exist, the hero is already represented in the log; never re-derive a
  // hero-based candidate pin for it.
  if (!existing.pinterest) return false;
  if (existing.pinterest.id) return true; // very old single-pin legacy format
  if (!existing.pinterest.pins) return false;
  return existing.pinterest.pins.some((p) => typeof p.variant === "number");
}

function existingImageKeys(existing) {
  const keys = new Set();
  for (const pin of existing.pinterest?.pins || []) {
    if (pin.imageKey) keys.add(pin.imageKey);
  }
  return keys;
}

function scheduleOffsetDays(index) {
  if (index === 0) return 0;
  return STAGGER_FIRST_GAP_DAYS + (index - 1) * STAGGER_STEP_DAYS;
}

// Best-effort: record the source asset path alongside imageSrc so
// pinterest-rotate.mjs can post this pin's bytes directly later without
// depending on the deployed URL's content hash staying stable until the
// pin's scheduled date. Never blocks posting if the lookup fails.
function tryResolveImageFile(type, slug, imageSrc) {
  try {
    return resolveLocalAsset({ type, slug, imageSrc });
  } catch {
    return undefined;
  }
}

// ---------------------------------------------------------------------------
// Process a single piece of content (recipe, article, or review)
// ---------------------------------------------------------------------------
async function processContent(filePath, type, log, options = {}) {
  const enData = parseContent(filePath);
  const slug = enData.slug;
  const shouldPostInstagram = type === "recipe" && (options.platform === "both" || options.platform === "instagram");
  const shouldPostPinterest = options.platform === "both" || options.platform === "pinterest";

  console.log(`\n${"=".repeat(60)}`);
  console.log(`Processing: ${slug} (${type})`);
  console.log(`${"=".repeat(60)}`);

  const existing = log[slug] || {};
  const instagramDone = !!existing.instagram?.id;

  if (!options.backfill) await waitForDeploy(buildContentUrl(type, slug));

  const url = buildContentUrl(type, slug);
  let discovered;
  try {
    discovered = await discoverContentImages(type, slug, enData.heroImageAlt);
  } catch (err) {
    console.error(`Image discovery failed for ${slug}: ${err.message}`);
    if (shouldPostPinterest) await createFailureIssue(slug, type, "Pinterest", err);
    return;
  }

  const images = discovered.images;
  const results = { ...existing, type };

  // --- Instagram (recipes only, single post, unchanged behavior) ---
  if (shouldPostInstagram && !instagramDone) {
    const frData = findFrTranslation(type, slug);
    const caption = enData.socialCaption?.instagram || buildInstagramTemplate(enData, frData);
    const heroUrl = images.find((i) => i.isHero)?.src || images[0]?.src;
    try {
      const igPostId = await postToInstagram(heroUrl, caption);
      if (igPostId) results.instagram = { id: igPostId, postedAt: new Date().toISOString() };
    } catch (err) {
      console.error(`Instagram failed for ${slug}:`, err.message);
      await createFailureIssue(slug, type, "Instagram", err, heroUrl);
      results.instagram = { error: err.message, failedAt: new Date().toISOString() };
    }
  }

  // --- Pinterest ---
  if (shouldPostPinterest) {
    const boardId = boardIdForType(type);
    const existingPins = existing.pinterest?.pins ? [...existing.pinterest.pins] : [];
    const legacyHeroCovered = hasLegacyVariantPins(existing);
    const knownImageKeys = existingImageKeys(existing);

    let candidateImages;
    if (images.length <= 1) {
      candidateImages = null; // handled by the single-photo variant fallback below
    } else {
      candidateImages = images.filter((img) => {
        const key = imageKeyFor(img);
        if (knownImageKeys.has(key)) return false;
        if (img.isHero && legacyHeroCovered) return false; // hero already posted under old scheme
        return true;
      });
    }

    const newPins = [];

    if (candidateImages === null) {
      // Single-photo content: only fill in the 3 legacy-style variants if
      // none exist yet at all (brand new content). Never touch existing ones.
      if (existingPins.length === 0) {
        const variants = buildSinglePhotoVariants(enData);
        const hero = images[0];
        variants.forEach((v, i) => {
          newPins.push({
            variant: i + 1,
            imageKey: imageKeyFor({ alt: `${hero?.alt || enData.heroImageAlt}__v${i + 1}` }),
            title: v.title,
            description: v.description,
            imageSrc: hero?.src,
            imageFile: hero?.src ? tryResolveImageFile(type, slug, hero.src) : undefined,
            altText: hero?.alt || enData.heroImageAlt,
            scheduledFor:
              i === 0 ? undefined : new Date(Date.now() + scheduleOffsetDays(i) * 86400000).toISOString(),
            status: "pending",
          });
        });
      }
    } else {
      candidateImages.slice(0, MAX_NEW_PINS_PER_ITEM).forEach((img, i) => {
        const scheduleIndex = existingPins.length + i; // keep staggering going past what's already posted
        const caption = captionForImage(enData, img, scheduleIndex);
        newPins.push({
          imageKey: imageKeyFor(img),
          title: caption.title,
          description: caption.description,
          imageSrc: img.src,
          imageFile: tryResolveImageFile(type, slug, img.src),
          altText: buildInstructionAlt(img, enData),
          isHero: img.isHero || undefined,
          scheduledFor:
            scheduleIndex === 0
              ? undefined
              : new Date(Date.now() + scheduleOffsetDays(scheduleIndex) * 86400000).toISOString(),
          status: "pending",
        });
      });
    }

    if (newPins.length === 0 && existingPins.length > 0) {
      console.log(`Pinterest: no new images to add for ${slug} (already covered)`);
    }

    // Post whichever new pin is scheduled for "now" (no scheduledFor / due)
    // immediately; everything else stays pending for pinterest-rotate.mjs.
    for (const pin of newPins) {
      const isDueNow = !pin.scheduledFor || new Date(pin.scheduledFor) <= new Date();
      if (!isDueNow) continue;
      try {
        const pinId = await postToPinterest(boardId, pin.imageSrc, pin.title, pin.description, url, pin.altText);
        if (pinId) {
          pin.id = pinId;
          pin.postedAt = new Date().toISOString();
          pin.status = "posted";
        }
      } catch (err) {
        console.error(`Pinterest pin failed for ${slug}:`, err.message);
        await createFailureIssue(slug, type, "Pinterest", err, pin.imageSrc);
        pin.status = "failed";
        pin.error = err.message;
        pin.failedAt = new Date().toISOString();
      }
    }

    if (newPins.length > 0) {
      results.pinterest = { pins: [...existingPins, ...newPins] };
      console.log(`Pinterest: added ${newPins.length} new pin(s) for ${slug}`);
    }
  }

  log[slug] = results;
  writeLog(log);
}

// ---------------------------------------------------------------------------
// Backfill mode: post all existing content for the requested type(s)
// ---------------------------------------------------------------------------
function allContentFiles(type) {
  const dir = contentDir(type, "en");
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith(".mdx"))
    .map((f) => join(dir, f));
}

async function runBackfill() {
  const log = readLog();
  const platform = PLATFORM;
  const limit = parseInt(RECIPES_PER_RUN, 10);
  const types = CONTENT_TYPE === "all" ? ["recipe", "article", "review"] : [CONTENT_TYPE];

  let allFiles = [];
  for (const type of types) {
    allFiles.push(...allContentFiles(type).map((filePath) => ({ filePath, type })));
  }

  console.log(`Backfill: scanning ${allFiles.length} item(s) across [${types.join(", ")}]`);

  const batch = allFiles.slice(0, limit);
  let processed = 0;
  let failed = 0;
  for (let i = 0; i < batch.length; i++) {
    const { filePath, type } = batch[i];
    try {
      await processContent(filePath, type, log, { backfill: true, platform });
      processed++;
    } catch (err) {
      const slug = basename(filePath, ".mdx");
      console.error(`Failed ${slug}: ${err.message}`);
      failed++;
    }
    if (i < batch.length - 1) {
      console.log("Waiting 10s between items...");
      await new Promise((r) => setTimeout(r, 10_000));
    }
  }

  console.log(`\nBackfill complete. Processed: ${processed}, Failed: ${failed}, Total: ${batch.length}.`);
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

  const files = args.filter((a) => a.endsWith(".mdx"));
  if (files.length === 0) {
    console.log("No content files to process. Exiting.");
    process.exit(0);
  }

  const log = readLog();
  for (const file of files) {
    const type = typeFromPath(file);
    await processContent(file, type, log, { platform: "both" });
  }

  console.log(`\nDone. Processed ${files.length} item(s).`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
