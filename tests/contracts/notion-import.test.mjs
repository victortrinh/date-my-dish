import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";
import { isEligible, venueKey, ELIGIBLE_POST_TYPES } from "../../scripts/notion-story/fields.mjs";
import { rowFromBlock } from "../../scripts/notion-story/notion.mjs";
import { mapHeading, HEADING_MAP } from "../../scripts/notion-story/headings.mjs";
import { parseBody, parseMetadata, sourceTexts, unmappedHeadings } from "../../scripts/notion-story/parse.mjs";
import { verbatimCheck, traceHeading, traces, unplacedText, sentences } from "../../scripts/notion-story/verbatim.mjs";
import { mergeCompanion, proposeCompanion, writeCompanion } from "../../scripts/notion-story/companion.mjs";
import { classifyRows, eligibleRows, findDuplicates, nextWork } from "../../scripts/notion-story/rows.mjs";
import {
  publishGate, checkDatedUpdate, checkGoogleReviewsAppendOnly, checkUpdateLinesAppendOnly, checkLeftovers, checkDuplicateVenues,
} from "../../scripts/notion-story/gate.mjs";
import { IMAGE_BUDGETS, imageFilename, optimiseImage } from "../../scripts/notion-story/images.mjs";
import { failureBody, failureTitle, openOrUpdateFailureIssue } from "../../scripts/notion-story/report.mjs";
import { dueForRecheck } from "../../scripts/notion-story/maintenance.mjs";
import { dateSpotFixture, token } from "./date-spot-fixtures.mjs";

const fixture = (name) => JSON.parse(readFileSync(new URL(`./fixtures/notion/${name}`, import.meta.url), "utf8"));
// The real Notion page of the Moccione review (Notion row #55), as notion.mjs reads it.
const moccione = parseBody(fixture("moccione-page.json"));
// The headings of the nine Notion reviews, read from the live database on 2026-10-08.
const reviewHeadings = fixture("review-headings.json");

// ---------------------------------------------------------------------------
// Fetch: which rows are read
// ---------------------------------------------------------------------------

const row = (number, postType, status, title = `Row ${number}`, lastEditedTime = 1_790_000_000_000) => ({
  pageId: `page-${number}`, number, title, postType, status, borough: null, publishDate: null, lastEditedTime,
});

// Mirrors the live database on 2026-10-08: 96 rows across every Post Type.
const liveLikeRows = [
  row(3, "Recipes", "Published"), row(4, "Recipes", "Ready to Publish"), row(5, "Recipes", "Draft"), row(6, "Recipes", ""),
  row(30, "Informative Posts", "Ready to Publish"), row(31, "Informative Posts", "In Progress"),
  row(40, "Affiliate Links", "Ready to Publish"), row(41, "", "Draft"),
  row(50, "Restaurant Reviews", "In Progress", "Ratafia, Little Italy: Dessert Wine Bar Review"),
  row(53, "Restaurant Reviews", "Published", "McKiernan Brunch Review: Food, Prices, and the Canal Walk"),
  row(55, "Restaurant Reviews", "Published", "Moccione Review: Handmade Pasta and Date-Night Details"),
  row(85, "Date Spots", "Draft", "Parcours Gouin, Ahuntsic-Cartierville: Activities and Sports Date Idea"),
  row(125, "Restaurant Reviews", "Ready to Publish", "Cabaret l'Enfer Review: Tasting Menu, Chef's Counter, and What to Know"),
  row(130, "Chef Interviews", "Ready to Publish", "Luca Cianciulli: Dinner and a Date"),
  row(131, "Date Spots", "Ready to Publish", "Parc La Fontaine, Plateau-Mont-Royal: Activities and Sports Date Idea"),
];

test("only Restaurant Reviews, Date Spots and Chef Interviews that are Ready to Publish or Published are eligible", () => {
  assert.deepEqual(eligibleRows(liveLikeRows).map((r) => r.number), [53, 55, 125, 130, 131]);
  for (const ignored of ["Recipes", "Informative Posts", "Affiliate Links", ""]) {
    assert.equal(isEligible(row(1, ignored, "Published")), false, ignored);
  }
  assert.equal(isEligible(row(1, "Date Spots", "Draft")), false);
  assert.equal(isEligible(row(1, "Restaurant Reviews", "In Progress")), false);
  assert.deepEqual(Object.keys(ELIGIBLE_POST_TYPES), ["Restaurant Reviews", "Date Spots", "Chef Interviews"]);
});

test("rowFromBlock reads the existing properties by name through the collection schema", () => {
  const schema = {
    title: { name: "Post Title", type: "title" }, "WQ}M": { name: "Post Type", type: "select" }, "]?xo": { name: "Status", type: "select" },
    BXcM: { name: "Borough", type: "select" }, "Lc}w": { name: "Recipe #", type: "auto_increment_id" }, "=\\eP": { name: "Publish Date", type: "date" },
  };
  const block = {
    type: "page", last_edited_time: 1790222110337,
    properties: {
      title: [["Moccione Review: Handmade Pasta"]], "WQ}M": [["Restaurant Reviews"]], "]?xo": [["Published"]],
      BXcM: [["Villeray–Saint-Michel–Parc-Extension"]], "Lc}w": [["55"]], "=\\eP": [["‣", [["d", { type: "date", start_date: "2026-03-23" }]]]],
    },
  };
  assert.deepEqual(rowFromBlock("651befd8", block, schema), {
    pageId: "651befd8", number: 55, title: "Moccione Review: Handmade Pasta", postType: "Restaurant Reviews", status: "Published",
    borough: "Villeray–Saint-Michel–Parc-Extension", publishDate: "2026-03-23", lastEditedTime: 1790222110337,
  });
});

// ---------------------------------------------------------------------------
// Heading map
// ---------------------------------------------------------------------------

test("the heading map places every section heading used in the nine Notion reviews", () => {
  assert.equal(reviewHeadings.length, 9);
  for (const review of reviewHeadings) {
    for (const { level, text } of review.headings) {
      if (level === 3) continue; // an H3 stays inside the section above it
      assert.ok(mapHeading(text, level), `#${review.number} "${text}" is not in the heading map`);
    }
  }
});

test("the heading map covers the spec's examples and leaves unknown headings for the agent", () => {
  assert.equal(mapHeading("The Vibe", 2)?.section, "room");
  assert.equal(mapHeading("What to Order", 2)?.section, "whatToOrder");
  assert.equal(mapHeading("What I ate", 2)?.section, "whatToOrder");
  assert.equal(mapHeading("Before and After", 2)?.section, "makeANight");
  assert.equal(mapHeading("The Real Cost", 2)?.section, "realCost");
  assert.equal(mapHeading("Internal links, eight", 2)?.section, "editorial:internalLinks");
  assert.equal(mapHeading("Moccione", 1)?.section, "opening");
  assert.equal(mapHeading("The history, which is the reason to write about it", 2), null);
  assert.ok(HEADING_MAP.length > 0);
});

// ---------------------------------------------------------------------------
// Body parsing
// ---------------------------------------------------------------------------

test("parseBody turns a free-form review page into ordered sections without losing a block", () => {
  assert.deepEqual(moccione.sections.filter((s) => s.heading).map((s) => s.section), [
    "opening", "verdict", "goodFor", "room", "meetChef", "drinks", "whatToOrder", "realCost", "reportersNote", "makeANight", "atHome", "beforeYouBook", "essentials",
  ]);
  assert.deepEqual(unmappedHeadings(moccione.sections), []);
  assert.equal(moccione.metadata.Slug, "moccione");
  assert.equal(moccione.metadata["Meta title"], "Moccione, Villeray: Review & Date Night Guide");
  assert.match(moccione.metadata["Meta desc"], /^Luca Cianciulli's modern Italian in Villeray, .* why it suits a date\.$/);

  const verdict = moccione.sections.find((s) => s.section === "verdict");
  assert.deepEqual(verdict?.blocks.map((b) => b.kind), ["paragraph", "subheading", "paragraph"]);
  const goodFor = moccione.sections.find((s) => s.section === "goodFor")?.blocks[0];
  assert.equal(goodFor?.kind, "table");
  assert.deepEqual(goodFor?.kind === "table" && goodFor.rows[1], ["Anniversary", "Ideal", "Cozy, celebratory, and built for a long dinner. Exactly the room it was made for."]);

  // Author notes stay in the snapshot, labelled, and never count as traceable prose.
  const notes = moccione.sections.flatMap((s) => s.blocks).filter((b) => "note" in b && b.note);
  assert.ok(notes.some((b) => b.kind === "callout" && /^INTERNAL/.test(b.lines[0])));
  assert.ok(notes.some((b) => b.kind === "quote" && /PULL QUOTE NEEDED/.test(b.text)));
  assert.ok(!sourceTexts(moccione).some((text) => /^INTERNAL|ANSWER NEEDED/.test(text)));
});

test("parseMetadata reads the author's key-value block and drops their character tallies", () => {
  const meta = parseMetadata("URL:   /en/reviews/plateau/x/\nMeta title:   X, the Plateau: An Honest Review  (46/60)\nMeta desc:    First line\n              second line.  (156/150-160)\nH1:   X, the Plateau");
  assert.deepEqual(meta, { URL: "/en/reviews/plateau/x/", "Meta title": "X, the Plateau: An Honest Review", "Meta desc": "First line second line.", H1: "X, the Plateau" });
  assert.equal(parseMetadata('{ "json": true }'), null);
});

test("photos take the author's alt text from the list item they sit in, or the item just before them", () => {
  const image = (id, file) => ({ id, type: "image", text: "", file, source: `attachment:${id}:${file}`, url: `https://file.notion.com/${file}`, children: [] });
  const item = (id, text, children = []) => ({ id, type: "numbered_list", text, children });
  const { images, sections } = parseBody([
    { id: "h", type: "sub_header", text: "Alt text for the photos", children: [] },
    item("1", "A cook plating at the pass", [image("i1", "DSCF7458.jpg")]),
    item("2", "A cook piping red filling into rolled crisps"),
    image("i2", "DSCF7453.jpg"),
  ]);
  assert.deepEqual(images.map((i) => [i.alt, i.file]), [["A cook plating at the pass", "DSCF7458.jpg"], ["A cook piping red filling into rolled crisps", "DSCF7453.jpg"]]);
  assert.equal(sections[0].section, "editorial:imageAlt");
});

// ---------------------------------------------------------------------------
// Verbatim Check
// ---------------------------------------------------------------------------

/** Moccione's English copy, built from its Notion page with Allowed Edits only. */
function moccioneCopy() {
  return {
    opening: "Chef Luca Cianciulli cooks modern Italian with handmade pasta on Saint-Denis, and has built one of the few rooms in Villeray where a long dinner still feels like an occasion.",
    verdictHeadline: "Worth the money when the night is the point",
    // Paragraph split, plus an internal link on existing words.
    room: "Moccione feels special without being stiff. The room is open and welcoming, with a view of the [kitchen](/en/chefs/luca-cianciulli/).\n\nYou can dress up, but good jeans and a jacket also fit.",
    drinks: {
      intro: "Order the first drink before you open the menu.",
      // Em-dash removed: "To start — a cocktail." becomes a pick.
      picks: [{ moment: "to-start", name: "A cocktail", note: "Dialled in and not overly sweet, which is what you want ahead of Italian food." }],
    },
    whatToOrder: {
      strategy: "Order in layers so the table keeps changing while you talk. For two: one crudo or tartare, one fried bite, one pasta, one main, one dessert, two digestifs.",
      dishes: [
        // A spelling fix ("granita" misspelt in a draft would still trace) and punctuation edits.
        { name: "Caramelle", tag: "order-this", note: "Candy-shaped stuffed pasta with ricotta, artichoke and rabbit; finished with tomato-sage sauce. Tender pasta, creamy filling, bright sauce! If you order one thing, this." },
        { name: "Beef", tag: "skip", note: "Beef with topinambour, trompette mushrooms and sea-asparagus salsa verde. Tender and earthy, but mine came under seasoned. I'd pick another protein next time." },
      ],
    },
    essentials: { address: "7495 rue Saint-Denis, Montreal, QC H2R 2E5", cost: "$120 to $200", canYouTalk: "Yes, easily" },
    paymentDisclosure: "paid",
    // Companion File fields are DMD's own copy and are not traced.
    metaDescription: "Anything DMD writes for search engines.",
    imageAlt: "A plate of caramelle under tomato-sage sauce",
  };
}

test("the Verbatim Check passes a page that has only Allowed Edits", () => {
  const result = verbatimCheck(moccioneCopy(), moccione, { venueName: "Moccione" });
  assert.deepEqual(result.offending, []);
  assert.equal(result.ok, true);
});

test("the Verbatim Check fails a page with an added sentence and names it", () => {
  const copy = moccioneCopy();
  copy.room += " The bread service alone is worth the trip across town.";
  const result = verbatimCheck(copy, moccione);
  assert.equal(result.ok, false);
  assert.deepEqual(result.offending, [{ path: "room", sentence: "The bread service alone is worth the trip across town." }]);
});

test("a one-word sentence traces only to that exact word, not a near spelling", () => {
  assert.equal(traces("Paid", [["a", "pair", "of", "pain"]]), false);
  assert.equal(traces("Paid", [["victor", "one", "visit", "paid"]]), true);
});

test("the Verbatim Check fails a changed opinion, a changed fact and text lifted from an INTERNAL note", () => {
  const opinion = moccioneCopy();
  opinion.whatToOrder.dishes[0].note = opinion.whatToOrder.dishes[0].note.replace("If you order one thing, this.", "If you order one thing, skip this.");
  const fact = moccioneCopy();
  fact.opening = fact.opening.replace("Saint-Denis", "Saint-Laurent").replace("one of the few rooms", "the only room");
  const internal = moccioneCopy();
  internal.room = "Michelin. Selected in the Guide Québec 2026. No star, no Bib. Never imply one.";
  const short = moccioneCopy();
  short.essentials.canYouTalk = "Not really";
  for (const copy of [opinion, fact, internal, short]) assert.equal(verbatimCheck(copy, moccione).ok, false);
});

test("an H2 may be rephrased as the question a searcher would type, without changing its meaning", () => {
  const headings = ["The real cost", "What to order", "Before you book"];
  assert.equal(traceHeading("What does dinner at Moccione really cost?", headings, "Moccione"), true);
  assert.equal(traceHeading("What to order at Moccione", headings, "Moccione"), true);
  assert.equal(traceHeading("Is Moccione the best Italian restaurant in Montreal?", headings, "Moccione"), false);
  const result = verbatimCheck({}, moccione, { venueName: "Moccione", headings: [{ path: "h2.realCost", text: "How much does dinner at Moccione cost?" }, { path: "h2.room", text: "Why is Moccione the most romantic room in town?" }] });
  assert.deepEqual(result.offending.map((o) => o.path), ["h2.room"]);
});

test("unplacedText lists the Notion sentences a page leaves out, so nothing is dropped silently", () => {
  const unplaced = unplacedText(moccioneCopy(), moccione);
  assert.ok(unplaced.includes("The tables along the wall are the ones to ask for."));
  assert.ok(!unplaced.includes("Order the first drink before you open the menu."));
  assert.ok(!unplaced.some((sentence) => /INTERNAL|ANSWER NEEDED/.test(sentence)));
  assert.deepEqual(sentences("One. Two? Three!"), ["One.", "Two?", "Three!"]);
});

// ---------------------------------------------------------------------------
// Companion File
// ---------------------------------------------------------------------------

test("the Importer proposes Companion File fields from the author's metadata", () => {
  const proposal = proposeCompanion(moccione, { slug: "moccione", postType: "review", publishDate: "2026-03-23", heroAlt: "The dining room" });
  assert.deepEqual(proposal, {
    id: "moccione", spotType: "restaurant", reviewVerdict: "favourite", neighbourhood: "Villeray", lastChecked: "2026-03-23", instagram: "moccione.restaurant",
    locales: { en: { metaTitle: "Moccione, Villeray: Review & Date Night Guide", metaDescription: moccione.metadata["Meta desc"], imageAlt: "The dining room" } },
  });
});

test("the Importer proposes the borough from the row's Borough property when it is a known borough", () => {
  const context = { slug: "moccione", postType: "review", publishDate: "2026-03-23" };
  assert.equal(proposeCompanion({ ...moccione, notion: { borough: "Villeray–Saint-Michel–Parc-Extension" } }, context).borough, "Villeray–Saint-Michel–Parc-Extension");
  assert.equal(proposeCompanion({ ...moccione, notion: { borough: "Laval" } }, context).borough, undefined);
  assert.equal(proposeCompanion({ ...moccione, notion: { borough: null } }, context).borough, undefined);
});

test("a re-import keeps a hand-edited Companion File unchanged", () => {
  const dir = mkdtempSync(join(tmpdir(), "dmd-companion-"));
  try {
    const handEdited = {
      id: "moccione",
      spotType: "restaurant",
      reviewVerdict: "conditional",
      neighbourhood: "Villeray",
      lastChecked: "2026-09-30",
      instagram: "moccione.restaurant",
      locales: { en: { metaTitle: "Moccione, Villeray: Victor's Own Title", metaDescription: "V".repeat(150), verdictReason: "Victor's own reason.", imageAlt: "Victor's alt text" } },
    };
    const path = join(dir, "moccione.json");
    const before = `${JSON.stringify(handEdited, null, 4)}\n`;
    writeFileSync(path, before);
    const proposal = proposeCompanion(moccione, { slug: "moccione", postType: "review", publishDate: "2026-03-23", heroAlt: "The dining room" });
    const { added } = writeCompanion(proposal, dir);
    assert.deepEqual(added, []);
    assert.equal(readFileSync(path, "utf8"), before);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a later import only fills Companion File fields that are still missing", () => {
  const { companion, added } = mergeCompanion(
    { id: "x", reviewVerdict: "pass", locales: { en: { metaTitle: "Kept" } } },
    { id: "x", reviewVerdict: "favourite", neighbourhood: "Villeray", locales: { en: { metaTitle: "Proposed", imageAlt: "Proposed alt" }, "fr-CA": { imageAlt: "Texte" } } },
  );
  assert.deepEqual(companion, { id: "x", reviewVerdict: "pass", neighbourhood: "Villeray", locales: { en: { metaTitle: "Kept", imageAlt: "Proposed alt" }, "fr-CA": { imageAlt: "Texte" } } });
  assert.deepEqual(added, ["neighbourhood", "locales.en.imageAlt", "locales.fr-CA.imageAlt"]);
});

// ---------------------------------------------------------------------------
// Duplicates and updates
// ---------------------------------------------------------------------------

test("two rows that resolve to the same venue are flagged, not published twice", () => {
  assert.equal(venueKey("Giwa Review: Modern Korean Cooking in Verdun"), "giwa");
  assert.equal(venueKey("McKiernan Brunch Review: Food, Prices, and the Canal Walk"), "mckiernan");
  assert.equal(venueKey("Ratafia, Little Italy: Dessert Wine Bar Review"), "ratafia");
  assert.equal(venueKey("Giwa (Verdun) Review: Pretty Plates"), "giwa");
  const rows = [
    row(83, "Restaurant Reviews", "Published", "Giwa Review: Modern Korean Cooking in Verdun"),
    row(140, "Restaurant Reviews", "Ready to Publish", "Giwa (Verdun) Review: A Second Visit"),
    row(106, "Date Spots", "Ready to Publish", "TOHU, Saint-Michel: Arts and Culture Date Idea"),
    row(118, "Date Spots", "Ready to Publish", "TOHU, Saint-Michel: Arts and Culture Date Idea"),
  ];
  assert.deepEqual(findDuplicates(rows), [{ key: "tohu", numbers: [106, 118] }, { key: "giwa", numbers: [83, 140] }].sort((a, b) => a.numbers[0] - b.numbers[0]));
  const work = classifyRows(rows, { entries: { 83: { slug: "giwa", notionLastEdited: 1_790_000_000_000 } } });
  assert.deepEqual(work.map((w) => [w.row.number, w.state]), [[83, "unchanged"], [106, "duplicate"], [118, "duplicate"], [140, "duplicate"]]);
  assert.equal(nextWork(work), null);
});

test("a published row whose Notion last-edited time moved is an update; new rows come first", () => {
  const rows = [
    row(55, "Restaurant Reviews", "Published", "Moccione Review", 1_790_222_110_337),
    row(84, "Restaurant Reviews", "Published", "Île Flottante Review", 1_788_000_000_000),
    row(125, "Restaurant Reviews", "Ready to Publish", "Cabaret l'Enfer Review", 1_790_222_144_279),
  ];
  const published = { entries: {
    55: { slug: "moccione", notionLastEdited: 1_790_000_000_000 },
    // Entries from before the importer only carry a sync date.
    84: { slug: "ile-flottante-montreal", lastSyncedDate: "2026-09-04" },
  } };
  const work = classifyRows(rows, published);
  assert.deepEqual(work.map((w) => [w.row.number, w.state]), [[55, "updated"], [84, "unchanged"], [125, "new"]]);
  assert.equal(nextWork(work)?.row.number, 125);
  assert.equal(nextWork(work, new Set([125]))?.row.number, 55);
});

// ---------------------------------------------------------------------------
// Publish gate
// ---------------------------------------------------------------------------

/** A valid review without the "[TEST ONLY]" brackets, which read as an author placeholder. */
const cleanFixture = (id = "test-only-gate", name = "Test Gate") =>
  JSON.parse(JSON.stringify(dateSpotFixture("restaurant", id, name)).replaceAll(token, "TEST ONLY"));

test("the publish gate passes a valid collection and names the field a record is missing", () => {
  assert.deepEqual(publishGate({ spots: [cleanFixture()], recipes: [], profiles: [] }).problems, []);
  const missing = cleanFixture();
  delete missing.locales["fr-CA"].opening;
  const result = publishGate({ spots: [missing], recipes: [], profiles: [] });
  assert.equal(result.ok, false);
  assert.ok(result.problems.some((p) => p.includes("test-only-gate: locales.fr-CA.opening")), result.problems.join("\n"));
});

test("the publish gate rejects author placeholders, em-dashes and the same venue twice", () => {
  const spot = cleanFixture();
  spot.locales.en.room = "Victor · [X] visits, [MONTH YEAR] · paid";
  spot.locales["fr-CA"].room = "Une salle — bruyante.";
  const problems = checkLeftovers(spot);
  assert.ok(problems.some((p) => /placeholder left in: "\[X\]"/.test(p)));
  assert.ok(problems.some((p) => /em-dash/.test(p)));
  assert.deepEqual(checkLeftovers(cleanFixture()), []);
  assert.deepEqual(checkLeftovers({ id: "x", room: "See [Cinéma du Parc](/en/date-spots/cinema-du-parc/)." }), []);
  assert.equal(checkDuplicateVenues([cleanFixture("test-only-a", "Same"), cleanFixture("test-only-b", "Same")]).length, 1);
});

test("Google snapshots and update lines are append-only; a changed verdict needs a new dated update", () => {
  const previous = cleanFixture();
  previous.googleReviews = [{ average: 4.6, count: 312, asOf: "2026-01-03" }];
  const appended = structuredClone(previous);
  appended.googleReviews.push({ average: 4.5, count: 340, asOf: "2026-02-01" });
  assert.deepEqual(checkGoogleReviewsAppendOnly(appended, previous), []);
  const edited = structuredClone(previous);
  edited.googleReviews[0].count = 300;
  assert.equal(checkGoogleReviewsAppendOnly(edited, previous).length, 1);

  const withUpdate = structuredClone(previous);
  withUpdate.reviewVerdict = "favourite";
  withUpdate.freshness.lastChecked = "2026-02-01";
  for (const locale of ["en", "fr-CA"]) withUpdate.locales[locale].materialUpdates = [{ date: "2026-02-01", note: "TEST ONLY verdict changed" }];
  assert.deepEqual(checkDatedUpdate(withUpdate, previous), []);
  const silent = structuredClone(previous);
  silent.reviewVerdict = "favourite";
  assert.equal(checkDatedUpdate(silent, previous).length, 2);
  // A changed or removed signal row needs one too; a row added for a new occasion does not.
  const changedSignal = structuredClone(previous);
  changedSignal.locales.en.goodFor[0].assessment = changedSignal.locales.en.goodFor[0].assessment === "ideal" ? "caveat" : "ideal";
  assert.equal(checkDatedUpdate(changedSignal, previous).length, 2);
  const removedSignal = structuredClone(previous);
  removedSignal.locales.en.goodFor.pop();
  assert.equal(checkDatedUpdate(removedSignal, previous).length, 2);
  const addedSignal = structuredClone(previous);
  addedSignal.locales.en.goodFor = previous.locales.en.goodFor.filter(({ occasion }) => occasion !== "solo-at-the-bar");
  const base = structuredClone(addedSignal);
  addedSignal.locales.en.goodFor.push({ occasion: "solo-at-the-bar", assessment: "ideal", reason: token });
  assert.deepEqual(checkDatedUpdate(addedSignal, base), []);

  const dropped = structuredClone(withUpdate);
  dropped.locales.en.materialUpdates = [];
  assert.equal(checkUpdateLinesAppendOnly(dropped, withUpdate).length, 1);

  const gate = publishGate({ spots: [silent], recipes: [], profiles: [] }, { spots: [previous] });
  assert.equal(gate.ok, false);
});

// ---------------------------------------------------------------------------
// Images
// ---------------------------------------------------------------------------

test("photos get real descriptive filenames, never camera names", () => {
  const taken = new Set();
  assert.equal(imageFilename("cabaret-lenfer", "A cook plating at the pass, seen from the counter", 0, taken), "cabaret-lenfer-cook-plating-at-pass-seen-from.webp");
  assert.equal(imageFilename("cabaret-lenfer", "A cook plating at the pass, seen from the counter", 1, taken), "cabaret-lenfer-cook-plating-at-pass-seen-from-2.webp");
  assert.equal(imageFilename("cabaret-lenfer", "", 4), "cabaret-lenfer-photo-5.webp");
  assert.equal(imageFilename("cabaret-lenfer", "The Cabaret l'Enfer nameplate on the concrete facade", 0), "cabaret-lenfer-nameplate-on-concrete-facade.webp");
});

test("optimiseImage fits the hero under 1200px and 200 KB, other photos under 900px", async () => {
  const width = 3000;
  const height = 2000;
  const noise = Buffer.alloc(width * height * 3);
  for (let i = 0; i < noise.length; i++) noise[i] = (i * 2654435761) % 251;
  const input = await sharp(noise, { raw: { width, height, channels: 3 } }).jpeg({ quality: 95 }).toBuffer();
  const hero = await optimiseImage(input, IMAGE_BUDGETS.hero);
  assert.ok(hero.width <= 1200 && hero.data.length <= 200 * 1024, `${hero.width}px, ${hero.data.length} bytes`);
  const other = await optimiseImage(input, IMAGE_BUDGETS.other);
  assert.ok(other.width <= 900 && other.data.length <= 150 * 1024, `${other.width}px, ${other.data.length} bytes`);
  assert.equal((await sharp(other.data).metadata()).format, "webp");
});

// ---------------------------------------------------------------------------
// Failure
// ---------------------------------------------------------------------------

test("a blocked import opens a notion-story issue, or updates the open one for the same row", () => {
  const blocked = { number: 125, title: "Cabaret l'Enfer Review", pageId: "3e4c3484-e8de-81d9-b3b6-f7af3edf00e6" };
  const title = failureTitle(blocked);
  const body = failureBody(blocked, ["locales.en.room: does not trace to the Notion source"], "2026-10-08");
  assert.equal(title, "Notion import blocked: #125 Cabaret l'Enfer Review");
  assert.match(body, /Nothing on the site changed/);
  assert.match(body, /- \[ \] locales\.en\.room/);

  const calls = [];
  const fake = (open) => (args, input) => {
    calls.push([args, input]);
    return args[1] === "list" ? JSON.stringify(open) : "";
  };
  assert.deepEqual(openOrUpdateFailureIssue({ title, body }, fake([])), { action: "created" });
  assert.deepEqual(calls.at(-1)?.[0].slice(0, 6), ["issue", "create", "--title", title, "--label", "notion-story"]);
  calls.length = 0;
  assert.deepEqual(openOrUpdateFailureIssue({ title, body }, fake([{ number: 77, title }])), { action: "updated", number: 77 });
  assert.deepEqual(calls[1], [["issue", "edit", "77", "--body-file", "-"], body]);
});

// ---------------------------------------------------------------------------
// Venue maintenance (unchanged by the importer)
// ---------------------------------------------------------------------------

test("dueForRecheck flags Date Spots last checked over six months ago, and seasonal ones", () => {
  const old = [{ id: "old", name: "Old Spot", spotType: "restaurant", freshness: { lastChecked: "2025-01-01" }, locales: { en: {} } }];
  assert.match(dueForRecheck(old, "2026-09-23")[0].reason, /six months/);
  const fresh = [{ id: "fresh", name: "Fresh Spot", spotType: "restaurant", freshness: { lastChecked: "2026-09-01" }, locales: { en: {} } }];
  assert.deepEqual(dueForRecheck(fresh, "2026-09-23"), []);
  const seasonal = [{ id: "seasonal", name: "Seasonal Spot", spotType: "activity", freshness: { lastChecked: "2026-09-01" }, locales: { en: { season: "winter" } } }];
  assert.match(dueForRecheck(seasonal, "2026-09-23")[0].reason, /Seasonal/);
});
