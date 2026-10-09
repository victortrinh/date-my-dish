import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, statSync } from "node:fs";
import sharp from "sharp";
import { buildContentUrl, contentTypeForSpot } from "../../scripts/lib/content-images.mjs";
import {
  PIN_HEIGHT, PIN_WIDTH, VERDICT_LABELS, assemblePinCopy, cleanCopy, planPinSet, postPhotos, verdictLine, wrapText,
} from "../../scripts/lib/pinterest-pins.mjs";
import { loadCollection } from "../../src/content-contracts/load.mjs";

const EM_DASH = "—";

/** A minimal Date Spot shape: only the fields pins read. */
function spot(overrides = {}) {
  const { en = {}, ...rest } = overrides;
  return {
    id: "test-only-venue",
    spotType: "restaurant",
    name: "Test Venue",
    neighbourhood: "Côte-des-Neiges",
    reviewVerdict: "conditional",
    image: { src: "/images/date-spots/test-venue-hero.webp", width: 720, height: 1080 },
    photos: {},
    ...rest,
    locales: {
      en: {
        slug: "test-venue",
        metaTitle: "Test Venue, Côte-des-Neiges: Review & Date Guide",
        metaDescription: "A meta description for the test venue that says what to order, what it costs and who it suits.",
        verdictReason: "Good for a celebration, less so for a first date.",
        imageAlt: "The hero photo of the test venue",
        ...en,
      },
      "fr-CA": { slug: "lieu-test" },
    },
  };
}

// ---------------------------------------------------------------------------
// URLs
// ---------------------------------------------------------------------------

test("Venue Review pins link to the nested English review URL", () => {
  assert.equal(buildContentUrl(spot()), "https://datemydish.com/en/reviews/cote-des-neiges/test-venue/");
  assert.equal(buildContentUrl(spot({ spotType: "bar", neighbourhood: "the Village" })), "https://datemydish.com/en/reviews/the-village/test-venue/");
  assert.equal(contentTypeForSpot(spot()), "review");
});

test("Planning Spot pins link to the English Date Spot URL", () => {
  const activity = spot({ spotType: "activity" });
  assert.equal(buildContentUrl(activity), "https://datemydish.com/en/date-spots/test-venue/");
  assert.equal(contentTypeForSpot(activity), "date-spot");
});

test("A pin URL needs an English slug", () => {
  assert.throws(() => buildContentUrl({ id: "x", spotType: "restaurant", neighbourhood: "Verdun", locales: {} }), /English slug/);
});

// ---------------------------------------------------------------------------
// Copy
// ---------------------------------------------------------------------------

test("Pin copy is the meta title, meta description and verdict line, nothing else", () => {
  const record = spot();
  const titleVariant = assemblePinCopy(record, "title");
  assert.equal(titleVariant.title, record.locales.en.metaTitle);
  assert.equal(
    titleVariant.description,
    `${record.locales.en.metaDescription} ${VERDICT_LABELS.conditional}: ${record.locales.en.verdictReason}`,
  );
  assert.deepEqual(titleVariant.overlay, { kicker: "Depends on the night", heading: "Test Venue, Côte-des-Neiges", subheading: "Review & Date Guide" });

  const verdictVariant = assemblePinCopy(record, "verdict");
  assert.equal(verdictVariant.title, record.locales.en.metaTitle);
  assert.equal(verdictVariant.description, `${verdictLine(record)} ${record.locales.en.metaDescription}`);
  assert.equal(verdictVariant.overlay.heading, record.locales.en.verdictReason);
  assert.equal(verdictVariant.overlay.subheading, "Test Venue, Côte-des-Neiges");
});

test("Verdict line uses the page's label and only the first paragraph of the reason", () => {
  const record = spot({ reviewVerdict: "favourite", en: { verdictReason: "First line.\n\nSecond paragraph stays on the page." } });
  assert.equal(verdictLine(record), "A favourite: First line.");
});

test("Pin copy never carries an em-dash", () => {
  const record = spot({ en: { metaDescription: `Seasonal plates ${EM_DASH} and a long wine list ${EM_DASH} in a quiet room on a side street.`, verdictReason: `Go${EM_DASH}but book.` } });
  for (const variant of ["title", "verdict"]) {
    const copy = assemblePinCopy(record, variant);
    for (const value of [copy.title, copy.description, ...Object.values(copy.overlay)]) assert.ok(!value.includes(EM_DASH), value);
  }
  assert.equal(cleanCopy(`a ${EM_DASH} b`), "a, b");
});

test("Pin copy is English only and fails without meta fields", () => {
  const record = spot();
  record.locales["fr-CA"] = { slug: "lieu-test", metaTitle: "Titre FR", metaDescription: "Description FR" };
  assert.ok(!assemblePinCopy(record).description.includes("FR"));
  assert.throws(() => assemblePinCopy(spot({ en: { metaTitle: undefined } })), /meta title/);
});

test("Pin titles and descriptions stay within Pinterest limits", () => {
  const long = "word ".repeat(400).trim();
  const copy = assemblePinCopy(spot({ en: { metaTitle: long, metaDescription: long } }));
  assert.ok(copy.title.length <= 100);
  assert.ok(copy.description.length <= 800);
});

// ---------------------------------------------------------------------------
// Pin sets
// ---------------------------------------------------------------------------

test("A single-photo post gets both variants on its hero", () => {
  const plan = planPinSet(spot());
  assert.deepEqual(plan.map((item) => item.imageKey), ["test-only-venue--hero--title", "test-only-venue--hero--verdict"]);
});

test("A multi-photo post gets one pin per real photo, in page order, each once", () => {
  const record = spot({
    photos: {
      "dining-room": { src: "/images/date-spots/test-venue-room.webp", width: 720, height: 1080 },
      unused: { src: "/images/date-spots/test-venue-unused.webp", width: 720, height: 1080 },
    },
    en: { roomPhoto: { photo: "dining-room", alt: "The room" }, other: [{ photo: "dining-room", alt: "Again" }] },
  });
  assert.deepEqual(postPhotos(record).map((photo) => [photo.key, photo.alt]), [["hero", "The hero photo of the test venue"], ["dining-room", "The room"]]);
  assert.deepEqual(planPinSet(record).map((item) => item.imageKey), ["test-only-venue--hero--title", "test-only-venue--dining-room--verdict"]);
});

test("The generic placeholder image never becomes a pin", () => {
  assert.deepEqual(planPinSet(spot({ image: { src: "/images/og-default.jpg", width: 1200, height: 630 } })), []);
});

test("wrapText keeps words whole", () => {
  assert.deepEqual(wrapText("one two three four", 9), ["one two", "three", "four"]);
});

// ---------------------------------------------------------------------------
// The queued backfill
// ---------------------------------------------------------------------------

// The eight reviews migrated in #541. Spots published later are queued by
// social-post-on-deploy.yml after their publish PR merges, so they are only
// checked once they have a log entry.
const MIGRATED_REVIEWS = ["cabaret-lenfer", "giwa", "hoogan-et-beaufort", "ile-flottante", "mckiernan", "moccione", "oncle-lee-kao", "othym"];

test("Queued pin sets use nested URLs, assembled copy and real-photo images", async () => {
  const log = JSON.parse(readFileSync("data/social-posts-log.json", "utf8"));
  const spots = loadCollection("src/content/date-spots.json").filter((record) => !record.id.startsWith("test-only-"));
  for (const id of MIGRATED_REVIEWS) assert.ok(log[id], `${id} has no queued pins`);
  for (const record of spots) {
    const entry = log[record.id];
    if (!entry) continue;
    const url = buildContentUrl(record);
    assert.equal(entry.url, url);
    assert.ok(entry.pinterest.pins.length > 0, `${record.id} has an empty pin set`);
    for (const pin of entry.pinterest.pins) {
      assert.equal(pin.link, url);
      assert.ok(pin.scheduledFor, `${pin.imageKey} needs a scheduledFor for the rotation to post it`);
      for (const value of [pin.title, pin.description, pin.altText]) assert.ok(!value.includes(EM_DASH), `${pin.imageKey}: ${value}`);
      assert.ok(pin.sourceImage.startsWith("public/images/date-spots/"), `${pin.imageKey} must come from the post's own photos`);
      assert.ok(existsSync(pin.imageFile), `${pin.imageFile} is missing`);
      const meta = await sharp(pin.imageFile).metadata();
      assert.equal(meta.width, PIN_WIDTH);
      assert.equal(meta.height, PIN_HEIGHT);
      assert.ok(statSync(pin.imageFile).size < 400_000, `${pin.imageFile} is over 400 KB`);
    }
  }
});

test("Pins posted before the rework are kept untouched", () => {
  const log = JSON.parse(readFileSync("data/social-posts-log.json", "utf8"));
  const legacy = ["hoogan-et-beaufort-montreal", "mckiernan-montreal"].flatMap((key) => log[key]?.pinterest?.pins ?? []);
  assert.equal(legacy.length, 16);
  assert.ok(legacy.every((pin) => pin.status === "posted" && pin.id));
});
