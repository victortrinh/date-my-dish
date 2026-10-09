// scripts/notion-story/french.mjs
//
// Deterministic checks on the Quebec French the Importer writes
// (docs/editorial-publishing-system.md, "French"; routines/importer.md,
// step 9). The translation itself is the routine's work; these checks make
// sure it kept the English structure and facts:
//
//   - Parity: the FR has the same sections, signals, dish tags, links and
//     dates as the EN, path by path (the content contract only says that the
//     pair disagrees; this says where).
//   - Routes: every internal link in the FR copy is a final /fr/ URL with a
//     trailing slash, and points at the FR page of whatever the EN link
//     points at.
//   - Untranslated copy and France-French usage the site does not use.
//   - For the seven pre-rework reviews, the FR traces to their existing FR
//     MDX (the Verbatim Check, run with the old FR as its source). An FR
//     sentence that does not trace is allowed only where the EN at the same
//     path has Notion text the old EN never had, and is listed for the PR.

import { LOCALE_ONLY_KEYS, STRUCTURAL_KEYS } from "../../src/content-contracts/date-spot.mjs";
import { dateSpotDetailPath, neighbourhoodSlug } from "../../src/content-contracts/date-spot-paths.mjs";
import { proseStrings, sentences, traces, words } from "./verbatim.mjs";

const FR = "fr-CA";

// Mirrors categorySlugs in src/utils/date-spots.ts (a contract test keeps them in step).
export const CATEGORY_SLUGS = Object.freeze({
  "activities-sports": { en: "activities-and-sports", fr: "activites-et-sports" },
  "arts-culture": { en: "arts-and-culture", fr: "arts-et-culture" },
  "games-entertainment": { en: "games-and-entertainment", fr: "jeux-et-divertissement" },
  "nature-scenic": { en: "nature-and-scenic", fr: "nature-et-panoramas" },
});

// First path segment of every live page, EN -> FR (CLAUDE.md, "Route Mapping").
// Recipes and articles are Retired Legacy Content and have no pages.
export const SECTION_ROUTES = Object.freeze({
  reviews: "critiques",
  "date-spots": "lieux",
  chefs: "chefs",
  "recipe-cards": "fiches-recettes",
  about: "a-propos",
  contact: "contact",
  "privacy-policy": "politique-de-confidentialite",
  "terms-of-service": "conditions-dutilisation",
});
const FR_SECTIONS = new Set(Object.values(SECTION_ROUTES));

// France-French words the site writes the Quebec way.
// \b is ASCII-only in JS, so word edges are lookarounds on letters.
const QUEBEC_USAGE = [
  { pattern: /(?<!\p{L})petits?[- ]d[ée]jeuners?(?!\p{L})/iu, use: "déjeuner (Quebec: breakfast)" },
  { pattern: /(?<!\p{L})cuill[eè]res? à caf[ée](?!\p{L})/iu, use: "cuillère à thé" },
  { pattern: /(?<!\p{L})c\. à c\./iu, use: "c. à thé" },
  { pattern: /(?<!\p{L})week-ends?(?!\p{L})/iu, use: "fin de semaine" },
];

const SITE = /^https?:\/\/(?:www\.)?datemydish\.com/i;
const LINK = /\[([^\]]*)\]\(([^)\s]+)\)/g;

/** @param {string} text @returns {string[]} link targets in Markdown link syntax */
export function linkTargets(text) {
  return [...String(text).matchAll(LINK)].map((match) => match[2]);
}

const isInternal = (href) => href.startsWith("/") || SITE.test(href);
const pathOf = (href) => href.replace(SITE, "").replace(/[?#].*$/, "");

/**
 * Every content page's EN and FR path, from the merged collections.
 * @param {{ spots?: any[], recipes?: any[], profiles?: any[] }} collections
 * @returns {{ toFr: Map<string, string>, frPaths: Set<string> }}
 */
export function contentRoutes(collections) {
  const toFr = new Map();
  const add = (en, fr) => toFr.set(en, fr);
  for (const spot of collections.spots ?? []) {
    if (!spot?.locales?.en?.slug || !spot.locales[FR]?.slug || !spot.neighbourhood) continue;
    add(dateSpotDetailPath(spot, "en"), dateSpotDetailPath(spot, "fr"));
    add(`/en/date-spots/neighbourhood/${neighbourhoodSlug(spot.neighbourhood)}/`, `/fr/lieux/quartier/${neighbourhoodSlug(spot.neighbourhood)}/`);
  }
  for (const profile of collections.profiles ?? []) {
    if (profile?.locales?.en?.slug && profile.locales[FR]?.slug) add(`/en/chefs/${profile.locales.en.slug}/`, `/fr/chefs/${profile.locales[FR].slug}/`);
  }
  for (const recipe of collections.recipes ?? []) {
    if (recipe?.locales?.en?.slug && recipe.locales[FR]?.slug) add(`/en/recipe-cards/${recipe.locales.en.slug}/`, `/fr/fiches-recettes/${recipe.locales[FR].slug}/`);
  }
  for (const { en, fr } of Object.values(CATEGORY_SLUGS)) add(`/en/date-spots/category/${en}/`, `/fr/lieux/categorie/${fr}/`);
  for (const [en, fr] of Object.entries(SECTION_ROUTES)) add(`/en/${en}/`, `/fr/${fr}/`);
  add("/en/", "/fr/");
  return { toFr, frPaths: new Set(toFr.values()) };
}

/**
 * The FR target an EN link should become: the same page in French for an
 * internal link, the same URL for an external one. Null when the EN link
 * itself does not resolve to a known page (other checks report that).
 * @param {string} href
 * @param {ReturnType<typeof contentRoutes>} routes
 */
export function expectedFrenchHref(href, routes) {
  if (!isInternal(href)) return href;
  const path = pathOf(href);
  const suffix = href.slice(href.replace(/[?#].*$/, "").length);
  const fr = routes.toFr.get(path.endsWith("/") ? path : `${path}/`);
  return fr ? `${fr}${suffix}` : null;
}

/**
 * Problems with one FR internal link, on its own: it must be a final FR URL.
 * @param {string} href
 * @param {ReturnType<typeof contentRoutes>} routes
 * @returns {string | null}
 */
export function frenchRouteProblem(href, routes) {
  if (!isInternal(href)) return null;
  if (SITE.test(href)) return `"${href}" is an absolute link to the site; use the root-relative path`;
  const path = pathOf(href);
  if (!path.startsWith("/fr/")) return `"${href}" is not a French page; FR copy links to /fr/ routes`;
  if (!path.endsWith("/")) return `"${href}" needs a trailing slash (a missing one 301-redirects)`;
  const section = path.split("/")[2];
  if (section && !FR_SECTIONS.has(section)) return `"${href}" uses "/${section}/", which is not a French route (${[...FR_SECTIONS].map((name) => `/fr/${name}/`).join(", ")})`;
  if (path !== "/fr/" && !routes.frPaths.has(path)) return `"${href}" does not resolve to a published page`;
  return null;
}

/** Reader copy of a locale, by path, with the same exclusions as the Verbatim Check. */
const byPath = (copy) => new Map(proseStrings(copy ?? {}).map(({ path, text }) => [path, text]));

/**
 * Where the FR departs from the EN's structure: a section, field or list
 * item present in one and not the other, a signal state, dish tag, link
 * target or date that differs, or a number that changed.
 * @param {Record<string, any>} en
 * @param {Record<string, any>} fr
 * @returns {string[]}
 */
export function parityDifferences(en, fr, path = "") {
  const at = (key) => (path ? `${path}.${key}` : key);
  if (Array.isArray(en) || Array.isArray(fr)) {
    if (!Array.isArray(en) || !Array.isArray(fr)) return [`${path}: a list in one locale, not in the other`];
    const out = en.length === fr.length ? [] : [`${path}: ${en.length} item(s) in en, ${fr.length} in fr-CA`];
    for (let index = 0; index < Math.min(en.length, fr.length); index++) out.push(...parityDifferences(en[index], fr[index], `${path}[${index}]`));
    return out;
  }
  if (en && typeof en === "object" && fr && typeof fr === "object") {
    const out = [];
    for (const key of new Set([...Object.keys(en), ...Object.keys(fr)])) {
      if (LOCALE_ONLY_KEYS.has(key)) continue;
      const a = en[key];
      const b = fr[key];
      if (a === undefined && b === undefined) continue;
      if (a === undefined) out.push(`${at(key)}: in fr-CA but not in en`);
      else if (b === undefined) out.push(`${at(key)}: in en but missing from fr-CA`);
      else if (typeof a === "string" && typeof b === "string") {
        if (STRUCTURAL_KEYS.has(key) && a !== b) out.push(`${at(key)}: "${a}" in en, "${b}" in fr-CA`);
      } else out.push(...parityDifferences(a, b, at(key)));
    }
    return out;
  }
  if (typeof en !== typeof fr) return [`${path}: different kinds of value in en and fr-CA`];
  if (typeof en !== "string" && en !== fr) return [`${path}: ${JSON.stringify(en)} in en, ${JSON.stringify(fr)} in fr-CA`];
  return [];
}

/**
 * Links in the FR copy: each must be a final FR URL, and each prose field
 * must link to the FR pages of exactly what its EN links to.
 * @param {Record<string, any>} en
 * @param {Record<string, any>} fr
 * @param {ReturnType<typeof contentRoutes>} routes
 */
export function linkProblems(en, fr, routes) {
  const problems = [];
  const enByPath = byPath(en);
  const frByPath = byPath(fr);
  for (const [path, text] of frByPath) {
    const frLinks = linkTargets(text);
    for (const href of frLinks) {
      const problem = frenchRouteProblem(href, routes);
      if (problem) problems.push(`locales.fr-CA.${path}: ${problem}`);
    }
    const wanted = linkTargets(enByPath.get(path) ?? "").map((href) => expectedFrenchHref(href, routes));
    if (wanted.includes(null)) continue; // an EN link that does not resolve is reported elsewhere
    const sorted = (list) => [...list].sort().join(" ");
    if (sorted(wanted) !== sorted(frLinks)) {
      problems.push(`locales.fr-CA.${path}: links to [${frLinks.join(", ")}] but the EN links to [${linkTargets(enByPath.get(path) ?? "").join(", ")}], whose FR pages are [${wanted.join(", ")}]`);
    }
  }
  for (const path of enByPath.keys()) {
    if (!frByPath.has(path) && linkTargets(enByPath.get(path) ?? "").length) problems.push(`locales.fr-CA.${path}: the EN links from here and the FR has no text`);
  }
  return problems;
}

/**
 * FR copy left in English, an EN meta description reused as the FR one,
 * and France-French usage the site writes the Quebec way.
 * @param {Record<string, any>} en
 * @param {Record<string, any>} fr
 */
export function usageProblems(en, fr) {
  const problems = [];
  const enByPath = byPath(en);
  for (const [path, text] of byPath(fr)) {
    // Names, addresses and prices read the same in both languages; a sentence does not.
    if (words(text).length >= 6 && text.trim() === enByPath.get(path)?.trim()) problems.push(`locales.fr-CA.${path}: still in English (identical to the EN)`);
    for (const { pattern, use } of QUEBEC_USAGE) {
      const found = text.match(pattern);
      if (found) problems.push(`locales.fr-CA.${path}: "${found[0]}" is France French; the site writes ${use}`);
    }
  }
  if (fr?.metaDescription && words(fr.metaDescription).join(" ") === words(en?.metaDescription ?? "").join(" ")) {
    problems.push("locales.fr-CA.metaDescription: is the EN meta description; write the FR one from the FR prose");
  }
  return problems;
}

/** Numbers (prices, times, counts) in a string, as a sorted list. */
const numbers = (text) => (String(text).replace(LINK, "$1").match(/\d+(?:[.,]\d+)?/g) ?? []).map((n) => n.replace(",", ".")).sort();

/**
 * Prose fields whose numbers differ between EN and FR. A warning, not a
 * failure: "6 pm" is "18 h" in Quebec French. Listed in the PR for Victor.
 * @param {Record<string, any>} en
 * @param {Record<string, any>} fr
 */
export function numberWarnings(en, fr) {
  const enByPath = byPath(en);
  const warnings = [];
  for (const [path, text] of byPath(fr)) {
    const a = numbers(enByPath.get(path) ?? "");
    const b = numbers(text);
    if (a.join(" ") !== b.join(" ")) warnings.push(`locales.fr-CA.${path}: numbers differ from the EN (en: ${a.join(", ") || "none"}; fr-CA: ${b.join(", ") || "none"}). Check that no price, time or count changed.`);
  }
  return warnings;
}

/**
 * The Verbatim Check for the seven pre-rework reviews, with their existing
 * FR MDX as the source. The FR at a path may carry new (translated)
 * sentences only as many as the EN at that path has sentences the old EN
 * MDX never had: Notion text that is new since the old review.
 * @param {Record<string, any>} en the Notion-derived EN copy (Companion File not merged)
 * @param {Record<string, any>} fr the FR copy, Companion File not merged
 * @param {{ en: { texts: string[] }, fr: { texts: string[] } }} legacy old EN and FR text blocks
 * @returns {{ ok: boolean, offending: { path: string, sentence: string }[], translated: { path: string, sentence: string }[] }}
 */
export function legacyFrenchCheck(en, fr, legacy) {
  const oldEn = legacy.en.texts.map(words);
  const oldFr = legacy.fr.texts.map(words);
  const enByPath = byPath(en);
  const offending = [];
  const translated = [];
  for (const [path, text] of byPath(fr)) {
    const untraced = sentences(text).filter((sentence) => !traces(sentence, oldFr));
    if (untraced.length === 0) continue;
    const newInEn = sentences(enByPath.get(path) ?? "").filter((sentence) => !traces(sentence, oldEn)).length;
    const target = untraced.length <= newInEn ? translated : offending;
    target.push(...untraced.map((sentence) => ({ path, sentence })));
  }
  return { ok: offending.length === 0, offending, translated };
}

/**
 * Every FR check on one record.
 * @param {Record<string, any>} record the Notion-derived record (Companion File not merged)
 * @param {Record<string, any>} merged the record as it will publish (Companion File merged)
 * @param {{ routes: ReturnType<typeof contentRoutes>, legacy?: { en: { texts: string[] }, fr: { texts: string[] } } | null }} options
 * @returns {{ problems: string[], warnings: string[], translated: { path: string, sentence: string }[] }}
 */
export function frenchCheck(record, merged, { routes, legacy }) {
  const id = record.id;
  const en = merged.locales?.en;
  const fr = merged.locales?.[FR];
  if (!en || !fr) return { problems: [`${id}: no ${en ? FR : "en"} copy. Every imported post has an EN and a Quebec French version.`], warnings: [], translated: [] };
  const problems = [
    ...parityDifferences(en, fr).map((line) => `${id}: parity: ${line}`),
    ...linkProblems(en, fr, routes).map((line) => `${id}: ${line}`),
    ...usageProblems(en, fr).map((line) => `${id}: ${line}`),
  ];
  let translated = [];
  if (legacy) {
    const result = legacyFrenchCheck(record.locales?.en ?? {}, record.locales?.[FR] ?? {}, legacy);
    for (const { path, sentence } of result.offending) {
      problems.push(`${id}: locales.fr-CA.${path}: does not trace to the existing FR review after section fitting and the Allowed Edits: "${sentence}"`);
    }
    translated = result.translated;
  }
  return { problems, warnings: numberWarnings(en, fr).map((line) => `${id}: ${line}`), translated };
}
