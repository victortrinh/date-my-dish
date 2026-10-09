import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import {
  CATEGORY_SLUGS, contentRoutes, expectedFrenchHref, frenchCheck, frenchRouteProblem, legacyFrenchCheck, linkProblems,
  numberWarnings, parityDifferences, usageProblems,
} from "../../scripts/notion-story/french.mjs";
import { LEGACY_REVIEWS, legacyTexts, readLegacyReview } from "../../scripts/notion-story/legacy.mjs";
import { publishGate } from "../../scripts/notion-story/gate.mjs";
import { dateSpotSchema } from "../../src/content-contracts/date-spot.mjs";
import { dateSpotFixture, extendedProfileFixture } from "./date-spot-fixtures.mjs";

// Mechanical records only: no real post is translated or imported here.

/**
 * A restaurant fixture whose FR is a section-by-section "translation" of the
 * EN: every prose string reworded, structure, signals, tags, links and dates
 * left alone.
 */
function translatedPair(id = "test-only-fr", name = "Test Venue") {
  const record = dateSpotFixture("restaurant", id, name);
  const en = record.locales.en;
  en.room = `${en.room} The bar seats face the [chef](/en/chefs/test-only-profile/) and the [Quarter guide](/en/date-spots/neighbourhood/test-quarter/).`;
  en.opening = "Test Venue opened in 2026 and seats 40 people on a quiet corner of Test Quarter.";
  en.materialUpdates = [{ date: "2026-01-03", note: "Checked the hours again." }];
  const frenchify = (value, key) => {
    if (typeof value === "string") {
      if (["occasion", "assessment", "moment", "tag", "advice", "spotId", "timing", "recipeId", "profileId", "photo", "date", "byline", "slug", "metaTitle"].includes(key)) return value;
      return value
        .replace(/\[TEST ONLY\]/g, "[ESSAI SEULEMENT]")
        .replace(/(^|\s)test\b/g, "$1essai")
        .replace("/en/chefs/test-only-profile/", "/fr/chefs/test-only-profile-fr/")
        .replace("/en/date-spots/neighbourhood/test-quarter/", "/fr/lieux/quartier/test-quarter/");
    }
    if (Array.isArray(value)) return value.map((item) => frenchify(item));
    if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, frenchify(v, k)]));
    return value;
  };
  record.locales["fr-CA"] = { ...frenchify(structuredClone(en)), slug: `${id}-fr` };
  const fr = record.locales["fr-CA"];
  fr.room = fr.room.replace("The bar seats face the", "Les places au bar font face au").replace("and the", "et au");
  fr.opening = "Test Venue a ouvert en 2026 et compte 40 places sur un coin tranquille de Test Quarter.";
  fr.materialUpdates = [{ date: "2026-01-03", note: "Heures vérifiées de nouveau." }];
  fr.metaDescription = `[ESSAI SEULEMENT] fiche mécanique qui décrit un lieu de rendez-vous pour vérifier la route bilingue, ses modules, ses métadonnées et le schéma.`.padEnd(150, ".");
  return record;
}

const collectionsWith = (record) => ({ spots: [record], recipes: [], profiles: [extendedProfileFixture("test-only-profile")] });
const routesFor = (record) => contentRoutes(collectionsWith(record));

test("an imported post has an FR version with the same sections as the EN, and passes every FR check", () => {
  const record = translatedPair();
  const result = frenchCheck(record, record, { routes: routesFor(record) });
  assert.deepEqual(result.problems, []);
  assert.deepEqual(parityDifferences(record.locales.en, record.locales["fr-CA"]), []);
  // The contract agrees: same modules, signals, dish tags and dates.
  assert.deepEqual(publishGate({ spots: [record], recipes: [], profiles: [] }).problems.filter((line) => !/author placeholder/.test(line)), []);
});

test("an FR copy is required", () => {
  const record = translatedPair();
  delete record.locales["fr-CA"];
  assert.match(frenchCheck(record, record, { routes: routesFor(record) }).problems[0], /no fr-CA copy/);
});

test("parity names the module, signal, dish tag, date or count the FR changed", () => {
  const record = translatedPair();
  const fr = record.locales["fr-CA"];
  delete fr.realCost;
  fr.goodFor[0].assessment = "not-for";
  fr.whatToOrder.dishes[1].tag = "order-this";
  fr.materialUpdates[0].date = "2026-01-02";
  fr.reportersNote.visits = 3;
  fr.beforeYouBook.pop();
  const lines = parityDifferences(record.locales.en, fr);
  for (const expected of [
    /^realCost: in en but missing from fr-CA$/,
    /^goodFor\[0\]\.assessment: "ideal" in en, "not-for" in fr-CA$/,
    /^whatToOrder\.dishes\[1\]\.tag: "worth-it" in en, "order-this" in fr-CA$/,
    /^materialUpdates\[0\]\.date: "2026-01-03" in en, "2026-01-02" in fr-CA$/,
    /^reportersNote\.visits: 2 in en, 3 in fr-CA$/,
    /^beforeYouBook: 2 item\(s\) in en, 1 in fr-CA$/,
  ]) assert.ok(lines.some((line) => expected.test(line)), `${expected} in ${JSON.stringify(lines)}`);
  // Per-locale fields (slug, meta) may differ.
  assert.ok(!lines.some((line) => /slug|meta/.test(line)));
});

test("opening hours are locale text: EN and FR may word them differently, but both must have them", () => {
  const record = translatedPair();
  record.locales.en.essentials.hours = "Tue to Sat from 6pm, closed Sun and Mon.";
  record.locales["fr-CA"].essentials.hours = "Du mardi au samedi dès 18 h, fermé le dimanche et le lundi.";
  assert.deepEqual(parityDifferences(record.locales.en, record.locales["fr-CA"]), []);
  assert.equal(dateSpotSchema.safeParse(record).success, true);

  const missing = structuredClone(record);
  delete missing.locales["fr-CA"].essentials.hours;
  assert.deepEqual(parityDifferences(missing.locales.en, missing.locales["fr-CA"]), ["essentials.hours: in en but missing from fr-CA"]);
  assert.equal(dateSpotSchema.safeParse(missing).success, false);

  // The old field name is gone from the essentials card.
  const legacy = structuredClone(record);
  for (const locale of ["en", "fr-CA"]) legacy.locales[locale].essentials.timing = legacy.locales[locale].essentials.hours;
  assert.equal(dateSpotSchema.safeParse(legacy).success, false);
});

test("a Make a night of it pick's timing is still structural and must match across the pair", () => {
  const record = translatedPair();
  for (const locale of ["en", "fr-CA"]) record.locales[locale].makeANight = [{ spotId: "test-only-bar", timing: "after", blurb: locale === "en" ? "A bar blurb." : "Un bar." }];
  assert.deepEqual(parityDifferences(record.locales.en, record.locales["fr-CA"]), []);
  assert.equal(dateSpotSchema.safeParse(record).success, true);
  record.locales["fr-CA"].makeANight[0].timing = "before";
  assert.deepEqual(parityDifferences(record.locales.en, record.locales["fr-CA"]), ['makeANight[0].timing: "after" in en, "before" in fr-CA']);
  assert.equal(dateSpotSchema.safeParse(record).success, false);
});

test("FR links use FR routes and point at the FR page of what the EN links to", () => {
  const record = translatedPair();
  const routes = routesFor(record);
  assert.equal(expectedFrenchHref("/en/chefs/test-only-profile/", routes), "/fr/chefs/test-only-profile-fr/");
  assert.equal(expectedFrenchHref("/en/reviews/test-quarter/test-only-fr/#drinks", routes), "/fr/critiques/test-quarter/test-only-fr-fr/#drinks");
  assert.equal(expectedFrenchHref("/en/date-spots/category/arts-and-culture/", routes), "/fr/lieux/categorie/arts-et-culture/");
  assert.equal(expectedFrenchHref("https://moccione.com/", routes), "https://moccione.com/");

  assert.equal(frenchRouteProblem("/fr/critiques/test-quarter/test-only-fr-fr/", routes), null);
  assert.equal(frenchRouteProblem("/fr/lieux/", routes), null);
  assert.match(frenchRouteProblem("/en/chefs/test-only-profile/", routes) ?? "", /not a French page/);
  assert.match(frenchRouteProblem("/fr/chefs/test-only-profile-fr", routes) ?? "", /trailing slash/);
  assert.match(frenchRouteProblem("/fr/reviews/test-quarter/test-only-fr-fr/", routes) ?? "", /not a French route/);
  assert.match(frenchRouteProblem("/fr/recettes/salade/", routes) ?? "", /not a French route/);
  assert.match(frenchRouteProblem("/fr/chefs/test-only-profile/", routes) ?? "", /does not resolve/);
  assert.match(frenchRouteProblem("https://datemydish.com/fr/lieux/", routes) ?? "", /root-relative/);

  const wrongTarget = translatedPair();
  wrongTarget.locales["fr-CA"].room = wrongTarget.locales["fr-CA"].room.replace("/fr/lieux/quartier/test-quarter/", "/fr/lieux/");
  const missing = translatedPair();
  missing.locales["fr-CA"].room = missing.locales["fr-CA"].room.replace(/\[chef\]\([^)]*\)/, "chef");
  const english = translatedPair();
  english.locales["fr-CA"].room = english.locales["fr-CA"].room.replace("/fr/chefs/test-only-profile-fr/", "/en/chefs/test-only-profile/");
  for (const broken of [wrongTarget, missing, english]) {
    const problems = linkProblems(broken.locales.en, broken.locales["fr-CA"], routesFor(broken));
    assert.ok(problems.some((line) => line.startsWith("locales.fr-CA.room:")), JSON.stringify(problems));
  }
});

test("FR copy left in English, the EN meta reused, and France-French usage are caught", () => {
  const record = translatedPair();
  const fr = record.locales["fr-CA"];
  fr.verdictReason = record.locales.en.verdictReason;
  fr.metaDescription = record.locales.en.metaDescription;
  fr.drinks.intro = "Parfait pour un petit-déjeuner tardif, une cuillère à café de miel dans le thé.";
  const problems = usageProblems(record.locales.en, fr);
  assert.ok(problems.some((line) => /verdictReason: still in English/.test(line)));
  assert.ok(problems.some((line) => /metaDescription: is the EN meta description/.test(line)));
  assert.ok(problems.some((line) => /"petit-déjeuner" is France French/.test(line)));
  assert.ok(problems.some((line) => /"cuillère à café" is France French; the site writes cuillère à thé/.test(line)));
  // Names, addresses and short facts read the same in both languages.
  assert.ok(!problems.some((line) => /essentials\.address|whatToOrder\.dishes\[\d\]\.name/.test(line)));
});

test("a changed number is a warning for Victor, not a failure", () => {
  const record = translatedPair();
  record.locales["fr-CA"].opening = record.locales["fr-CA"].opening.replace("40", "50");
  const result = frenchCheck(record, record, { routes: routesFor(record) });
  assert.deepEqual(result.problems, []);
  assert.equal(numberWarnings(record.locales.en, record.locales["fr-CA"]).length, 1);
  assert.match(result.warnings[0], /opening: numbers differ/);
});

// ---------------------------------------------------------------------------
// The seven pre-rework reviews: FR reused from their old FR MDX
// ---------------------------------------------------------------------------

// The old MDX is retired once the reviews are imported (#541); their EN and
// FR text lives on in each source snapshot's `legacy` block.
const sourcesDir = new URL("../../notion/sources/", import.meta.url);
const snapshots = readdirSync(sourcesDir).filter((file) => file.endsWith(".json")).map((file) => JSON.parse(readFileSync(new URL(file, sourcesDir), "utf8")));
/** @param {number} number */
const legacyFromSnapshot = (number) => snapshots.find((source) => source.notion?.number === number)?.legacy ?? null;

test("the seven pre-rework reviews keep their old EN and FR text in their source snapshots", () => {
  assert.equal(Object.keys(LEGACY_REVIEWS).length, 7);
  for (const [number, name] of Object.entries(LEGACY_REVIEWS)) {
    const legacy = legacyFromSnapshot(Number(number));
    assert.equal(legacy?.name, name, `row #${number}`);
    assert.ok(legacy && legacy.en.texts.length > 20 && legacy.fr.texts.length > 20, name);
  }
  assert.equal(legacyFromSnapshot(125), null);
  assert.equal(readLegacyReview(125), null);
});

test("legacyTexts keeps the reader text of an old review and drops imports, components and markup", () => {
  const { texts, headings } = legacyTexts([
    "---", 'title: "Titre"', "keywords: [\"mot\"]", "faqs:", '  - question: "Faut-il réserver?"', '    answer: "Oui, surtout le vendredi."', "---", "",
    'import { Picture } from "astro:assets";', "", "Premier **paragraphe** sur",
    "deux lignes.", "", "## L'ambiance", "", "<Picture", "  src={img}", '  alt="Une photo"', "/>", "", "- Un élément", "- Un autre", "",
    "| Plat | Avis |", "|---|---|", "| Crudo | Très bon |",
  ].join("\n"));
  assert.deepEqual(headings, ["L'ambiance"]);
  assert.deepEqual(texts, ["Titre", "Faut-il réserver?", "Oui, surtout le vendredi.", "Premier paragraphe sur deux lignes.", "L'ambiance", "Un élément", "Un autre", "Plat", "Avis", "Crudo", "Très bon"]);
});

const moccioneLegacy = /** @type {NonNullable<ReturnType<typeof readLegacyReview>>} */ (legacyFromSnapshot(55));

test("FR prose fitted from the existing FR MDX passes the Verbatim Check against it", () => {
  // EN as the old EN said it; FR moved into the new sections with Allowed
  // Edits only (paragraph split, punctuation, an internal link).
  const en = {
    room: "Walk in and you'll notice the lighting first. Warm, flattering, dimmed just enough to feel intentional.",
    whatToOrder: { dishes: [{ name: "Baba tiramisu", tag: "order-this", note: "Boozy, creamy, coffee-cocoa forward. Do not skip dessert here." }] },
  };
  const fr = {
    room: "Tu remarques l'éclairage en premier.\n\nChaud, flatteur, tamisé juste assez pour que ça paraisse [intentionnel](/fr/lieux/)!",
    whatToOrder: { dishes: [{ name: "Baba tiramisu", tag: "order-this", note: "Imbibé d'alcool, crémeux, dominé par le café-cacao. Ne skippe pas le dessert ici." }] },
  };
  const result = legacyFrenchCheck(en, fr, moccioneLegacy);
  assert.deepEqual(result.offending, []);
  assert.deepEqual(result.translated, []);
});

test("an FR sentence with no counterpart fails, unless the EN at that path is Notion text the old review never had", () => {
  const en = { room: "Walk in and you'll notice the lighting first." };
  const invented = legacyFrenchCheck(en, { room: "Tu remarques l'éclairage en premier. Le pain vaut à lui seul le détour." }, moccioneLegacy);
  assert.deepEqual(invented.offending, [{ path: "room", sentence: "Le pain vaut à lui seul le détour." }]);

  // A flipped opinion does not trace either.
  const flipped = legacyFrenchCheck({ note: "Do not skip dessert here." }, { note: "Skippe le dessert ici." }, moccioneLegacy);
  assert.equal(flipped.ok, false);

  // New Notion text in the EN: its FR is a fresh translation, listed for the PR.
  const updated = legacyFrenchCheck(
    { room: "Walk in and you'll notice the lighting first. Ask for the tables along the wall, they are the quietest in the room." },
    { room: "Tu remarques l'éclairage en premier. Demande les tables le long du mur, ce sont les plus calmes de la salle." },
    moccioneLegacy,
  );
  assert.deepEqual(updated.offending, []);
  assert.deepEqual(updated.translated, [{ path: "room", sentence: "Demande les tables le long du mur, ce sont les plus calmes de la salle." }]);
});

test("frenchCheck runs the legacy Verbatim Check on the Notion-derived FR, not the Companion File fields", () => {
  const record = translatedPair();
  const legacy = { en: { texts: [] }, fr: { texts: [] } };
  const result = frenchCheck(record, record, { routes: routesFor(record), legacy });
  // Nothing in a mechanical fixture traces to an empty old review; the EN is all "new", so the FR is all fresh translation.
  assert.deepEqual(result.problems, []);
  assert.ok(result.translated.length > 0);
});

test("CATEGORY_SLUGS mirrors the site's category slugs", () => {
  const source = readFileSync(new URL("../../src/utils/date-spots.ts", import.meta.url), "utf8");
  for (const [category, { en, fr }] of Object.entries(CATEGORY_SLUGS)) {
    assert.ok(source.includes(`"${category}": { en: "${en}", fr: "${fr}" }`), category);
  }
});
