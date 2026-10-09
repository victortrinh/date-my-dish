// scripts/social-post.mjs
// Queues Pinterest pins for published Date Spots (Reviews and Planning Spots).
// Spec: docs/editorial-publishing-system.md ("Pinterest").
//
// For every Date Spot in src/content/date-spots.json (with its Companion File
// from src/content/editorial/ merged in) this plans a pin set
// (scripts/lib/pinterest-pins.mjs), renders each new pin's 1000x1500 image
// from the post's own photos into data/pinterest/, and appends the pins to
// data/social-posts-log.json as "pending" with a staggered scheduledFor.
// pinterest-pin-rotation.yml (scripts/pinterest-rotate.mjs) posts them.
//
// This script never calls the Pinterest API, and it is strictly additive:
// it never rewrites, reschedules or removes an existing log entry or pin
// (including the pins posted before the rework, keyed by their old slugs),
// and never overwrites a rendered image that already exists.
//
// Usage:
//   node scripts/social-post.mjs                 # queue pins for every Date Spot not fully queued
//   node scripts/social-post.mjs --only=giwa,othym
//   node scripts/social-post.mjs --dry-run       # print the plan, write nothing

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { loadCollection } from "../src/content-contracts/load.mjs";
import { buildContentUrl, contentTypeForSpot } from "./lib/content-images.mjs";
import { assemblePinCopy, pinAltText, pinImagePath, planPinSet, renderPinImage } from "./lib/pinterest-pins.mjs";

const LOG_FILE = "data/social-posts-log.json";
const DATE_SPOTS_FILE = "src/content/date-spots.json";
const PIN_IMAGE_DIR = "data/pinterest";
const PUBLIC_DIR = "public";
const DAY_MS = 86_400_000;
// pinterest-pin-rotation.yml runs at 10:00 UTC; schedule each pin just before.
const SLOT_HOUR_UTC = 9;

const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");
const ONLY = (args.find((arg) => arg.startsWith("--only=")) ?? "").slice("--only=".length).split(",").filter(Boolean);

// ---------------------------------------------------------------------------
// Log
// ---------------------------------------------------------------------------
function readLog() {
  if (!existsSync(LOG_FILE)) return {};
  return JSON.parse(readFileSync(LOG_FILE, "utf-8"));
}

function writeLog(log) {
  writeFileSync(LOG_FILE, JSON.stringify(log, null, 2) + "\n");
}

// ---------------------------------------------------------------------------
// Scheduling: one queued pin per day, after anything already pending.
// ---------------------------------------------------------------------------
function slotAt(date) {
  const slot = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), SLOT_HOUR_UTC));
  return slot;
}

function firstFreeSlot(log, now) {
  let latest = slotAt(new Date(now.getTime() + DAY_MS)).getTime() - DAY_MS;
  for (const entry of Object.values(log)) {
    for (const pin of entry.pinterest?.pins ?? []) {
      if (pin.status !== "pending" || !pin.scheduledFor) continue;
      latest = Math.max(latest, new Date(pin.scheduledFor).getTime());
    }
  }
  return slotAt(new Date(latest + DAY_MS));
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
function isPublished(spot, today) {
  if (spot.id.startsWith("test-only-")) return false;
  return !spot.freshness?.published || spot.freshness.published <= today;
}

async function main() {
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const log = readLog();
  const spots = loadCollection(DATE_SPOTS_FILE).filter((spot) => isPublished(spot, today) && (ONLY.length === 0 || ONLY.includes(spot.id)));

  // Plan every spot's missing pins first, then interleave them (each spot's
  // first pin, then each spot's second, ...) so one post doesn't hog the queue.
  const plans = [];
  for (const spot of spots) {
    const type = contentTypeForSpot(spot);
    const existing = log[spot.id];
    if (existing && existing.type !== type) {
      console.warn(`Skipping ${spot.id}: the log already has a "${existing.type ?? "recipe"}" entry under that key`);
      continue;
    }
    const known = new Set((existing?.pinterest?.pins ?? []).map((pin) => pin.imageKey));
    const missing = planPinSet(spot).filter((item) => !known.has(item.imageKey));
    if (missing.length === 0) {
      console.log(`${spot.id}: pin set already queued`);
      continue;
    }
    plans.push({ spot, type, url: buildContentUrl(spot), missing });
  }

  const ordered = [];
  for (let round = 0; plans.some((plan) => plan.missing[round]); round++) {
    for (const plan of plans) if (plan.missing[round]) ordered.push({ plan, item: plan.missing[round] });
  }
  if (ordered.length === 0) {
    console.log("Nothing to queue.");
    return;
  }

  let slot = firstFreeSlot(log, now);
  for (const { plan, item } of ordered) {
    const { spot, type, url } = plan;
    const copy = assemblePinCopy(spot, item.variant);
    const imageFile = pinImagePath(spot, item, PIN_IMAGE_DIR);
    const sourcePath = join(PUBLIC_DIR, item.photo.src);
    const pin = {
      imageKey: item.imageKey,
      variant: item.variant,
      photo: item.photo.key,
      sourceImage: sourcePath,
      imageFile,
      title: copy.title,
      description: copy.description,
      altText: pinAltText(item),
      link: url,
      scheduledFor: slot.toISOString(),
      status: "pending",
    };
    console.log(`${spot.id}: queue ${item.imageKey} for ${pin.scheduledFor.slice(0, 10)} -> ${url}`);
    slot = new Date(slot.getTime() + DAY_MS);
    if (DRY_RUN) continue;

    if (!existsSync(sourcePath)) throw new Error(`${spot.id}: photo ${sourcePath} not found`);
    if (!existsSync(imageFile)) {
      mkdirSync(dirname(imageFile), { recursive: true });
      await renderPinImage({ sourcePath, overlay: copy.overlay, outPath: imageFile });
    }

    const entry = log[spot.id] ?? { type, spotId: spot.id, url, pinterest: { pins: [] } };
    entry.pinterest = { ...entry.pinterest, pins: [...(entry.pinterest?.pins ?? []), pin] };
    log[spot.id] = entry;
  }

  if (!DRY_RUN) writeLog(log);
  console.log(`\n${DRY_RUN ? "Would queue" : "Queued"} ${ordered.length} pin(s) across ${plans.length} Date Spot(s).`);
}

// ---------------------------------------------------------------------------
// Instagram (dormant). Instagram only ever posted recipes, which are retired,
// so nothing calls this; how Date Spots reach Instagram is being revisited in
// #505. Kept as it was so that work starts from the existing Graph API calls.
// ---------------------------------------------------------------------------
// eslint-disable-next-line no-unused-vars
async function postToInstagram(imageUrl, caption) {
  const { INSTAGRAM_ACCESS_TOKEN, INSTAGRAM_USER_ID } = process.env;
  if (!INSTAGRAM_ACCESS_TOKEN || !INSTAGRAM_USER_ID) {
    console.log("Skipping Instagram: missing INSTAGRAM_ACCESS_TOKEN or INSTAGRAM_USER_ID");
    return null;
  }

  const containerRes = await fetch(`https://graph.instagram.com/v21.0/${INSTAGRAM_USER_ID}/media`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ image_url: imageUrl, caption, access_token: INSTAGRAM_ACCESS_TOKEN }),
  });
  const containerData = await containerRes.json();
  if (containerData.error) {
    throw new Error(`Instagram container creation failed: ${containerData.error.message} (code: ${containerData.error.code})`);
  }

  const containerId = containerData.id;
  let status = "IN_PROGRESS";
  let attempts = 0;
  while (status === "IN_PROGRESS" && attempts < 30) {
    await new Promise((r) => setTimeout(r, 5000));
    const statusRes = await fetch(`https://graph.instagram.com/v21.0/${containerId}?fields=status_code&access_token=${INSTAGRAM_ACCESS_TOKEN}`);
    const statusData = await statusRes.json();
    status = statusData.status_code;
    attempts++;
  }
  if (status === "ERROR") throw new Error("Instagram media container processing failed");
  if (status !== "FINISHED") throw new Error(`Instagram container not ready after ${attempts} attempts, status: ${status}`);

  const publishRes = await fetch(`https://graph.instagram.com/v21.0/${INSTAGRAM_USER_ID}/media_publish`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ creation_id: containerId, access_token: INSTAGRAM_ACCESS_TOKEN }),
  });
  const publishData = await publishRes.json();
  if (publishData.error) {
    throw new Error(`Instagram publish failed: ${publishData.error.message} (code: ${publishData.error.code})`);
  }
  return publishData.id;
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
