// scripts/fetch-notion-story.mjs
//
// Fetches the next "Ready to Publish" Notion Story (Date Spot, Contributor
// Recipe, or Extended Profile), maps it onto the matching content contract,
// and runs it through the publish gate. Nothing here writes, translates, or
// rewords a single word of reader-facing copy: every field comes verbatim
// from a Notion property or a hand-authored JSON code block on the page.
//
// On success: writes the updated collection JSON, the resized Editorial
// Image, and an updated notion/published.json, then reports what changed so
// a workflow can open a PR.
//
// On failure: writes notion/story-report.md describing exactly what is
// missing or wrong, and exits non-zero. Nothing is published.
//
// Usage:
//   node scripts/fetch-notion-story.mjs
//   node scripts/fetch-notion-story.mjs --fixture path/to/fixture.json   (offline, for tests)

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { dirname } from "path";
import sharp from "sharp";
import {
  createNotionApi,
  withRetry,
  writeGitHubOutput,
  readPublishedJson,
  buildSchemaLookup,
  getRowProperty,
  groupListItems,
  traverseBlocks,
} from "./notion-utils.mjs";
import { requiredProperties } from "./notion-story/fields.mjs";
import { parseLocalePair, photoBlocks } from "./notion-story/parse.mjs";
import { storyToRecord, normalizePostType, normalizeSpotType, MappingError } from "./notion-story/map.mjs";
import { publishGate } from "./notion-story/gate.mjs";

const DATABASE_PAGE_ID = "9ce95183503543d68450194d1010824b";
const STORY_REPORT_FILE = "notion/story-report.md";

const COLLECTION_FILES = {
  "date-spot": "src/content/date-spots.json",
  "contributor-recipe": "src/content/contributor-recipes.json",
  "extended-profile": "src/content/extended-profiles.json",
};

const IMAGE_DIRS = {
  "date-spot": "public/images/date-spots",
  "contributor-recipe": "public/images/contributor-recipes",
  // Matches the image.src pattern in src/content-contracts/extended-profile.mjs.
  "extended-profile": "public/images/profiles",
};

function readCollection(path) {
  if (!existsSync(path)) return [];
  return JSON.parse(readFileSync(path, "utf-8"));
}

function writeReport(problems, story) {
  const lines = [
    "# Notion Story publish report",
    "",
    `Story: ${story?.title ?? "(unknown)"} (#${story?.storyNum ?? "?"})`,
    "",
    "This Story did not publish. Nothing in the site changed. Fix the items",
    "below in Notion, then re-run the fetch.",
    "",
    ...problems.map((p) => `- [ ] ${p}`),
    "",
  ];
  writeFileSync(STORY_REPORT_FILE, lines.join("\n"));
  console.error(`\n${problems.length} problem(s). See ${STORY_REPORT_FILE}.\n`);
  for (const p of problems) console.error(`  - ${p}`);
}

async function resizeImage(inputBuffer, outputPath, maxWidth) {
  mkdirSync(dirname(outputPath), { recursive: true });
  const image = sharp(inputBuffer).rotate();
  const metadata = await image.metadata();
  const width = Math.min(metadata.width ?? maxWidth, maxWidth);
  const resized = image.resize({ width, withoutEnlargement: true });
  const { data, info } = await resized.webp({ quality: 82 }).toBuffer({ resolveWithObject: true });
  writeFileSync(outputPath, data);
  return { width: info.width, height: info.height };
}

async function fetchFromNotion() {
  const api = createNotionApi();
  const recordMap = await withRetry(() => api.getPage(DATABASE_PAGE_ID, { signFileUrls: false }), "getPage(database)");

  const collectionIds = Object.keys(recordMap.collection || {});
  if (collectionIds.length === 0) throw new Error("No collection found. Is the Notion page still public?");
  const collectionId = collectionIds[0];

  const viewIds = Object.keys(recordMap.collection_view || {});
  if (viewIds.length === 0) throw new Error("No collection views found.");
  const viewId = viewIds[0];

  const collData = await withRetry(() => api.getCollectionData(collectionId, viewId), "getCollectionData");
  const collRecord = collData.recordMap?.collection?.[collectionId];
  const collValue = collRecord?.value?.value || collRecord?.value;
  const schema = collValue?.schema;
  if (!schema) throw new Error("Could not extract collection schema. The internal API structure may have changed.");

  const schemaLookup = buildSchemaLookup(schema);
  const schemaPropertyNames = Object.values(schema).map((s) => s.name);

  const blockIds = collData.result?.reducerResults?.collection_group_results?.blockIds || [];
  const blockMap = collData.recordMap?.block || {};

  const rows = [];
  for (const blockId of blockIds) {
    const blockRecord = blockMap[blockId];
    const block = blockRecord?.value?.value || blockRecord?.value;
    if (!block || block.type !== "page") continue;
    rows.push({ pageId: blockId, block, lastEditedTime: block.last_edited_time });
  }

  const getProp = (block) => (name) => getRowProperty(block, name, schemaLookup);

  const status = (block) => getProp(block)("Status").trim();
  const storyNumOf = (block) => parseInt(getProp(block)("Story #") || getProp(block)("Recipe #"), 10);
  const titleOf = (block) => getRowProperty(block, "title", schemaLookup) || getProp(block)("Post Title") || "";

  const ready = rows.filter((r) => status(r.block) === "Ready to Publish" && Number.isFinite(storyNumOf(r.block)));

  const published = readPublishedJson();
  const unpublished = ready
    .filter((r) => !published.entries[String(storyNumOf(r.block))])
    .sort((a, b) => storyNumOf(a.block) - storyNumOf(b.block));

  let selected = null;
  let mode = "publish";
  if (unpublished.length > 0) {
    selected = unpublished[0];
  } else {
    const stale = ready
      .filter((r) => {
        const entry = published.entries[String(storyNumOf(r.block))];
        if (!entry) return false;
        const syncDate = new Date(`${entry.lastSyncedDate}T23:59:59Z`);
        return new Date(r.lastEditedTime) > syncDate;
      })
      .sort((a, b) => storyNumOf(a.block) - storyNumOf(b.block));
    if (stale.length === 0) {
      writeGitHubOutput("found", "false");
      console.log("No new or updated Stories found.");
      return null;
    }
    selected = stale[0];
    mode = "update";
  }

  const pageRecordMap = await withRetry(() => api.getPage(selected.pageId, { signFileUrls: true }), "getPage(story)");
  const pageBlockRecord = pageRecordMap.block[selected.pageId];
  const pageBlock = pageBlockRecord?.value?.value || pageBlockRecord?.value;
  if (!pageBlock) throw new Error("Could not find page block for selected Story.");

  const rawBlocks = traverseBlocks(pageRecordMap.block, pageBlock.content || [], pageRecordMap.signed_urls, 0);
  const blocks = groupListItems(rawBlocks);

  const storyNum = storyNumOf(selected.block);
  const title = titleOf(selected.block);
  const postTypeRaw = getProp(selected.block)("Post Type");
  const spotTypeRaw = getProp(selected.block)("Spot Type");

  // The Editorial Image is the first image block that isn't a keyed photo.
  const extraPhotos = photoBlocks(rawBlocks);
  const imageBlock = rawBlocks.find((b) => b.type === "image" && b.url && !extraPhotos.some((photo) => photo.url === b.url));
  let imageBuffer = null;
  if (imageBlock) {
    const res = await fetch(imageBlock.url);
    if (res.ok) imageBuffer = Buffer.from(await res.arrayBuffer());
  }
  const photoBuffers = [];
  for (const photo of extraPhotos) {
    const res = await fetch(photo.url);
    photoBuffers.push({ ...photo, buffer: res.ok ? Buffer.from(await res.arrayBuffer()) : null });
  }

  return {
    storyNum,
    title,
    mode,
    postTypeRaw,
    spotTypeRaw,
    schemaPropertyNames,
    getProp: getProp(selected.block),
    blocks,
    imageBuffer,
    photoBuffers,
  };
}

function loadFixture(path) {
  const fixture = JSON.parse(readFileSync(path, "utf-8"));
  const getProp = (name) => fixture.properties[name] ?? "";
  return {
    storyNum: fixture.storyNum,
    title: fixture.title,
    mode: fixture.mode ?? "publish",
    postTypeRaw: fixture.properties["Post Type"],
    spotTypeRaw: fixture.properties["Spot Type"],
    schemaPropertyNames: fixture.schemaPropertyNames ?? Object.keys(fixture.properties),
    getProp,
    blocks: fixture.blocks,
    imageBuffer: null,
    photoBuffers: photoBlocks(fixture.blocks).map((photo) => ({ ...photo, buffer: null })),
  };
}

async function main() {
  const fixtureArgIndex = process.argv.indexOf("--fixture");
  const story = fixtureArgIndex === -1 ? await fetchFromNotion() : loadFixture(process.argv[fixtureArgIndex + 1]);
  if (!story) return;

  const problems = [];
  let postType;
  let spotType;
  try {
    postType = normalizePostType(story.postTypeRaw);
    spotType = postType === "date-spot" ? normalizeSpotType(story.spotTypeRaw) : undefined;
  } catch (err) {
    writeReport([err.message], story);
    process.exitCode = 1;
    return;
  }

  for (const propName of requiredProperties(postType, spotType)) {
    const value = story.getProp(propName);
    if (value === "" || value === undefined || value === null) {
      problems.push(`Missing required property: "${propName}"`);
    }
  }

  const { locales, problems: parseProblems } = parseLocalePair(story.blocks);
  problems.push(...parseProblems);

  if (problems.length > 0) {
    writeReport(problems, story);
    process.exitCode = 1;
    return;
  }

  const collectionPath = COLLECTION_FILES[postType];
  const existingCollection = readCollection(collectionPath);

  let image;
  if (fixtureArgIndex !== -1) {
    const publicDir = IMAGE_DIRS[postType].replace(/^public\//, "");
    image = { src: `/${publicDir}/${story.getProp("ID")}.webp`, width: 1200, height: 800 };
  } else if (story.imageBuffer) {
    const outPath = `${IMAGE_DIRS[postType]}/${story.getProp("ID")}.webp`;
    const { width, height } = await resizeImage(story.imageBuffer, outPath, 1200);
    image = { src: `/${outPath.replace(/^public\//, "")}`, width, height };
  } else {
    writeReport(["No Editorial Image found on the Story page."], story);
    process.exitCode = 1;
    return;
  }

  const photos = {};
  for (const photo of story.photoBuffers) {
    if (postType !== "date-spot") {
      problems.push(`Keyed photo "${photo.key}" is only supported on Date Spot Stories.`);
      continue;
    }
    const outPath = `${IMAGE_DIRS[postType]}/${story.getProp("ID")}-${photo.key}.webp`;
    const src = `/${outPath.replace(/^public\//, "")}`;
    if (fixtureArgIndex !== -1) {
      photos[photo.key] = { src, width: 1200, height: 800 };
    } else if (!photo.buffer) {
      problems.push(`Could not download photo "${photo.key}".`);
    } else {
      photos[photo.key] = { src, ...(await resizeImage(photo.buffer, outPath, 1200)) };
    }
    if (photo.credit && photos[photo.key]) photos[photo.key].credit = photo.credit;
  }
  if (problems.length > 0) {
    writeReport(problems, story);
    process.exitCode = 1;
    return;
  }

  let record;
  try {
    record = storyToRecord(story.getProp, postType, locales, image, photos);
  } catch (err) {
    if (err instanceof MappingError) {
      writeReport([err.message], story);
      process.exitCode = 1;
      return;
    }
    throw err;
  }

  const related = {
    spots: readCollection(COLLECTION_FILES["date-spot"]),
    recipes: readCollection(COLLECTION_FILES["contributor-recipe"]),
    profiles: readCollection(COLLECTION_FILES["extended-profile"]),
  };
  const result = publishGate(record, existingCollection, story.getProp, story.schemaPropertyNames, related);
  if (!result.ok) {
    writeReport(result.problems, story);
    process.exitCode = 1;
    return;
  }

  if (fixtureArgIndex === -1) {
    writeFileSync(collectionPath, `${JSON.stringify(result.collection, null, 2)}\n`);

    const published = readPublishedJson();
    published.entries[String(story.storyNum)] = {
      notionTitle: story.title,
      slug: record.locales?.en?.slug ?? record.id,
      type: postType,
      publishedDate: record.freshness?.published ?? record.published,
      lastSyncedDate: new Date().toISOString().slice(0, 10),
      status: "published",
    };
    writeFileSync("notion/published.json", `${JSON.stringify(published, null, 2)}\n`);

    writeGitHubOutput("found", "true");
    writeGitHubOutput("mode", result.mode);
    writeGitHubOutput("post_type", postType);
    writeGitHubOutput("story_num", String(story.storyNum));
  }

  console.log(`Published Story #${story.storyNum} "${story.title}" (${postType}, ${result.mode}).`);
}

main().catch((err) => {
  console.error(`[FATAL] ${err.message}`);
  if (err.stack) console.error(err.stack);
  process.exitCode = 1;
});
