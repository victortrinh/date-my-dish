// scripts/notion-import.mjs
//
// The Importer's deterministic steps, run by the cloud routine
// (routines/importer.md) and again by CI. Notion is read-only: nothing here
// writes to it. The prose a post publishes is the Notion text, fitted into
// sections by the routine; these commands fetch it, keep a snapshot of it,
// and check the page against it.
//
//   node scripts/notion-import.mjs list [--json]
//       Every eligible row (Post Type Restaurant Reviews, Date Spots or Chef
//       Interviews; Status Ready to Publish or Published) with its state:
//       new, updated, unchanged or duplicate.
//
//   node scripts/notion-import.mjs next [--row <Recipe #>] [--skip <#,#>] [--hero <index>]
//       Fetch the next new or updated row, write its source snapshot to
//       notion/sources/{slug}.json, download and optimise its photos,
//       pre-fill the Companion File (missing fields only), and record the
//       sync in notion/published.json. Prints a JSON summary for the PR.
//
//   node scripts/notion-import.mjs companion <slug> <proposal.json>
//       Merge the agent's Companion File proposal. Fields already in the
//       file are never overwritten.
//
//   node scripts/notion-import.mjs check [--base <git ref>] [--report]
//       The Verbatim Check and the publish gate over every published post.
//       With --base, also the append-only and dated-update rules against
//       the PR's base. --report writes notion/story-report.md on failure.
//       The French checks run here too: EN and FR parity path by path, FR
//       routes and links, untranslated copy and Quebec usage, and for the
//       seven pre-rework reviews the Verbatim Check against their old FR.
//       It prints the FR sentences that are new translations (no FR
//       counterpart) and number warnings for the PR.
//
//   node scripts/notion-import.mjs fail --row <Recipe #> --report-file <path>
//       Open or update the `notion-story` issue for a blocked row.

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";
import { applyCompanion } from "../src/content-contracts/companion.mjs";
import { DEFAULT_EDITORIAL_DIR, readCompanions } from "../src/content-contracts/load.mjs";
import { ELIGIBLE_POST_TYPES, venueKey } from "./notion-story/fields.mjs";
import { fetchPage, fetchRows } from "./notion-story/notion.mjs";
import { parseBody, unmappedHeadings } from "./notion-story/parse.mjs";
import { classifyRows, nextWork } from "./notion-story/rows.mjs";
import { IMAGE_BUDGETS, downloadImages } from "./notion-story/images.mjs";
import { proposeCompanion, writeCompanion } from "./notion-story/companion.mjs";
import { publishGate } from "./notion-story/gate.mjs";
import { unplacedText, verbatimCheck } from "./notion-story/verbatim.mjs";
import { contentRoutes, frenchCheck } from "./notion-story/french.mjs";
import { readLegacyReview } from "./notion-story/legacy.mjs";
import { failureBody, failureTitle, openOrUpdateFailureIssue } from "./notion-story/report.mjs";
import { PUBLISHED_JSON, readPublishedJson } from "./notion-utils.mjs";

export const SOURCES_DIR = "notion/sources";
const REPORT_FILE = "notion/story-report.md";
const COLLECTION_PATHS = {
  spots: "src/content/date-spots.json",
  recipes: "src/content/contributor-recipes.json",
  profiles: "src/content/extended-profiles.json",
};

const args = process.argv.slice(2);
const command = args[0];
const option = (name) => {
  const index = args.indexOf(`--${name}`);
  return index === -1 ? undefined : args[index + 1];
};
const flag = (name) => args.includes(`--${name}`);
const today = () => new Date().toISOString().slice(0, 10);
const readJson = (path, fallback) => (existsSync(path) ? JSON.parse(readFileSync(path, "utf8")) : fallback);
const writeJson = (path, value) => writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);

/** Every source snapshot, keyed by the record ids it feeds. */
function readSources(dir = SOURCES_DIR) {
  const byRecord = new Map();
  if (!existsSync(dir)) return byRecord;
  for (const file of readdirSync(dir).filter((name) => name.endsWith(".json")).sort()) {
    const source = JSON.parse(readFileSync(join(dir, file), "utf8"));
    for (const id of source.records ?? [source.slug]) byRecord.set(id, { file: join(dir, file), source });
  }
  return byRecord;
}

async function list() {
  const work = classifyRows(await fetchRows(), readPublishedJson());
  if (flag("json")) {
    console.log(JSON.stringify(work.map(({ row, state, key, duplicateOf }) => ({ ...row, state, venue: key, duplicateOf })), null, 2));
    return;
  }
  console.log(`${work.length} eligible row(s):`);
  for (const { row, state, duplicateOf } of work) {
    const edited = row.lastEditedTime ? new Date(row.lastEditedTime).toISOString().slice(0, 10) : "?";
    console.log(`  #${row.number}  ${row.postType} | ${row.status} | ${state}${duplicateOf ? ` (same venue as #${duplicateOf.join(", #")})` : ""} | edited ${edited} | ${row.title}`);
  }
}

async function next() {
  const published = readPublishedJson();
  const work = classifyRows(await fetchRows(), published);
  const skip = new Set(String(option("skip") ?? "").split(",").filter(Boolean).map(Number));
  const wanted = option("row");
  const item = wanted ? work.find((entry) => String(entry.row.number) === wanted) : nextWork(work, skip);
  if (!item) {
    console.log(JSON.stringify({ found: false, duplicates: work.filter((entry) => entry.state === "duplicate").map((entry) => entry.row.number) }));
    return;
  }
  if (item.state === "duplicate") throw new Error(`Row #${item.row.number} resolves to the same venue as #${item.duplicateOf?.join(", #")}. Flag it; it is not imported twice.`);

  const { row } = item;
  const { postType } = ELIGIBLE_POST_TYPES[/** @type {keyof typeof ELIGIBLE_POST_TYPES} */ (row.postType)];
  const page = await fetchPage(row.pageId);
  const { metadata, sections, images } = parseBody(page.nodes);
  const slug = (metadata.Slug ?? "").trim() || venueKey(row.title);
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) throw new Error(`Row #${row.number}: "${slug}" is not a usable slug.`);

  const heroIndex = Number(option("hero") ?? 0);
  const photos = images.length ? await downloadImages(images, { slug, postType, heroIndex }) : [];

  mkdirSync(SOURCES_DIR, { recursive: true });
  const snapshotPath = join(SOURCES_DIR, `${slug}.json`);
  const previous = readJson(snapshotPath, null);
  const snapshot = {
    slug,
    records: previous?.records ?? [slug],
    notion: { pageId: row.pageId, number: row.number, postType: row.postType, status: row.status, title: row.title, borough: row.borough, publishDate: row.publishDate, lastEditedTime: page.lastEditedTime ?? row.lastEditedTime },
    metadata,
    // Signed image URLs expire; the snapshot keeps the Notion file names and where each photo landed.
    sections: sections.map((section) => ({
      ...section,
      blocks: section.blocks.map((block) => (block.kind === "image" ? { kind: "image", image: { alt: block.image.alt, file: block.image.file } } : block)),
    })),
    photos,
  };
  // The seven pre-rework reviews keep their published FR: its text goes in
  // the snapshot so the FR Verbatim Check survives the old MDX's retirement.
  const legacy = previous?.legacy ?? readLegacyReview(row.number);
  if (legacy) snapshot.legacy = legacy;
  writeJson(snapshotPath, snapshot);

  const companion = writeCompanion(proposeCompanion(snapshot, { slug, postType, publishDate: row.publishDate, heroAlt: photos.find((photo) => photo.hero)?.alt }));

  published.entries[String(row.number)] = {
    ...published.entries[String(row.number)],
    notionTitle: row.title,
    slug,
    type: postType,
    pageId: row.pageId,
    notionLastEdited: snapshot.notion.lastEditedTime,
    publishedDate: published.entries[String(row.number)]?.publishedDate ?? row.publishDate ?? today(),
    lastSyncedDate: today(),
    status: "published",
  };
  writeJson(PUBLISHED_JSON, published);

  console.log(JSON.stringify({
    found: true,
    state: item.state,
    number: row.number,
    title: row.title,
    slug,
    postType,
    snapshot: snapshotPath,
    mapping: sections.filter((section) => section.heading).map((section) => ({ heading: section.heading, section: section.section })),
    unmappedHeadings: unmappedHeadings(sections),
    // "translate" for a new post; "reuse" for a pre-rework review whose FR is fitted from its old MDX.
    french: legacy ? { mode: "reuse", from: `src/content/reviews/fr/${legacy.name}.mdx` } : { mode: "translate" },
    photos,
    companion,
  }, null, 2));
}

function companion() {
  const [, slug, proposalPath] = args;
  if (!slug || !proposalPath) throw new Error("Usage: companion <slug> <proposal.json>");
  const proposal = { ...JSON.parse(readFileSync(proposalPath, "utf8")), id: slug };
  console.log(JSON.stringify(writeCompanion(proposal), null, 2));
}

/** A file as it is at a git ref, or null when it did not exist there. */
function readAtRef(ref, path) {
  try {
    return execFileSync("git", ["show", `${ref}:${path}`], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
  } catch {
    return null;
  }
}

/** The merged collections as they are at a git ref (the PR's base). */
function collectionsAtRef(ref) {
  const companions = new Map();
  let names = "";
  try {
    names = execFileSync("git", ["ls-tree", "--name-only", `${ref}:${DEFAULT_EDITORIAL_DIR}`], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
  } catch {
    names = "";
  }
  for (const name of names.split("\n").filter((file) => file.endsWith(".json"))) {
    const companionFile = JSON.parse(readAtRef(ref, `${DEFAULT_EDITORIAL_DIR}/${name}`) ?? "null");
    if (companionFile?.id) companions.set(companionFile.id, companionFile);
  }
  /** @type {Record<string, any[]>} */
  const collections = {};
  for (const [key, path] of Object.entries(COLLECTION_PATHS)) {
    const records = JSON.parse(readAtRef(ref, path) ?? "[]");
    collections[key] = records.map((record) => (companions.has(record.id) ? applyCompanion(record, companions.get(record.id)) : record));
  }
  return collections;
}

async function imageProblems(record) {
  const problems = [];
  const hero = record.image?.src;
  const paths = [hero, ...Object.values(record.photos ?? {}).map((photo) => photo.src)].filter(Boolean);
  for (const src of paths) {
    const file = join("public", src);
    if (!existsSync(file)) continue; // validate-date-spots reports missing files
    const budget = src === hero ? IMAGE_BUDGETS.hero : IMAGE_BUDGETS.other;
    const bytes = readFileSync(file).length;
    const { width = 0 } = await sharp(file).metadata();
    if (bytes > budget.maxBytes) problems.push(`${record.id}: ${src} is ${Math.round(bytes / 1024)} KB; the budget is ${budget.maxBytes / 1024} KB`);
    if (width > budget.maxWidth) problems.push(`${record.id}: ${src} is ${width}px wide; the budget is ${budget.maxWidth}px`);
  }
  return problems;
}

async function check() {
  const sources = readSources();
  const companions = readCompanions();
  const problems = [];
  const unplaced = [];
  const frWarnings = [];
  const translated = [];
  /** @type {Record<string, any[]>} */
  const merged = {};
  /** @type {Record<string, any[]>} */
  const raw = {};
  for (const [key, path] of Object.entries(COLLECTION_PATHS)) {
    raw[key] = readJson(path, []);
    merged[key] = raw[key].map((record) => (companions.has(record.id) ? applyCompanion(record, companions.get(record.id)) : record));
  }
  const routes = contentRoutes(merged);
  for (const key of Object.keys(COLLECTION_PATHS)) {
    for (const record of raw[key]) {
      const found = sources.get(record.id);
      if (!found) {
        problems.push(`${record.id}: no Notion source snapshot in ${SOURCES_DIR}/. Every post is imported from Notion (run the Importer).`);
        continue;
      }
      // The Notion-derived record, before the Companion File: its English prose must trace to Notion.
      const result = verbatimCheck(record.locales?.en ?? {}, found.source, { venueName: record.name ?? record.subject?.name ?? "" });
      for (const { path: field, sentence } of result.offending) {
        problems.push(`${record.id}: locales.en.${field}: does not trace to the Notion source after the Allowed Edits: "${sentence}"`);
      }
      const mergedRecord = merged[key].find((entry) => entry.id === record.id);
      for (const sentence of unplacedText(mergedRecord?.locales?.en ?? {}, found.source)) unplaced.push(`${record.id}: ${sentence}`);
      problems.push(...(await imageProblems(record)));
      const fr = frenchCheck(record, mergedRecord ?? record, { routes, legacy: found.source.legacy ?? readLegacyReview(found.source.notion?.number) });
      problems.push(...fr.problems);
      frWarnings.push(...fr.warnings);
      translated.push(...fr.translated.map(({ path: field, sentence }) => `${record.id}: locales.fr-CA.${field}: ${sentence}`));
    }
  }
  const base = option("base");
  const gate = publishGate(/** @type {any} */ (merged), base ? collectionsAtRef(base) : {});
  problems.push(...gate.problems);

  if (unplaced.length) {
    console.log(`Unplaced Text (Notion sentences the pages do not use; list them in the PR):\n${unplaced.map((line) => `  - ${line}`).join("\n")}`);
  }
  if (translated.length) {
    console.log(`FR sentences translated fresh, with no counterpart in the existing FR review (list them in the PR's Translation section):\n${translated.map((line) => `  - ${line}`).join("\n")}`);
  }
  if (frWarnings.length) console.log(`French warnings (for Needs Victor):\n${frWarnings.map((line) => `  - ${line}`).join("\n")}`);
  if (problems.length) {
    console.error(`Notion import check failed:\n${problems.map((line) => `  - ${line}`).join("\n")}`);
    // One problem per line, the format `fail --report-file` reads.
    if (flag("report")) writeFileSync(REPORT_FILE, `${problems.map((line) => `- ${line}`).join("\n")}\n`);
    process.exitCode = 1;
    return;
  }
  const count = Object.values(merged).reduce((sum, records) => sum + records.length, 0);
  console.log(`Notion import check passed for ${count} published post(s).`);
}

async function fail() {
  const number = option("row");
  const reportFile = option("report-file") ?? REPORT_FILE;
  // One problem per "- " line; anything else in the file is ignored.
  const problems = readFileSync(reportFile, "utf8").split("\n").filter((line) => /^\s*-\s+/.test(line)).map((line) => line.replace(/^\s*-\s+/, "").trim());
  if (problems.length === 0) throw new Error(`${reportFile} lists no problems ("- " lines).`);
  let row = null;
  if (number) {
    row = (await fetchRows()).find((candidate) => String(candidate.number) === number) ?? { number: Number(number), title: "" };
  }
  console.log(JSON.stringify(openOrUpdateFailureIssue({ title: failureTitle(row), body: failureBody(row, problems) })));
}

const commands = { list, next, companion, check, fail };
if (!Object.hasOwn(commands, command)) {
  console.error(`Usage: node scripts/notion-import.mjs <${Object.keys(commands).join("|")}> [options]. See the header of this file.`);
  process.exitCode = 1;
} else {
  Promise.resolve(commands[/** @type {keyof typeof commands} */ (command)]()).catch((error) => {
    console.error(`[FATAL] ${error.message}`);
    process.exitCode = 1;
  });
}
