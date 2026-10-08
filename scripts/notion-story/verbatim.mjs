// scripts/notion-story/verbatim.mjs
//
// The Verbatim Check: every sentence on a published page must trace back to
// its Notion source after the Allowed Edits (docs/editorial-publishing-system.md,
// "Edit policy"). The comparison is word by word, so the allowed edits pass
// on their own:
//   - punctuation and em-dash removal: punctuation is not compared
//   - internal links on existing words: Markdown link syntax is stripped
//   - paragraph splits: each sentence is traced on its own
//   - spelling and grammar: a misspelt word matches its fix, and a long
//     sentence may differ by about one word in five (an article, a verb form)
//   - an H2 phrased as a question: see traceHeading()
// An added sentence, a changed opinion or an invented fact does not trace.

import { sourceHeadings, sourceTexts } from "./parse.mjs";

/**
 * @param {string} text
 * @returns {string[]} lower-case words with punctuation removed
 */
export function words(text) {
  return String(text)
    .normalize("NFKC")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .toLowerCase()
    .replace(/['‘’`]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

const segmenter = new Intl.Segmenter("en", { granularity: "sentence" });

/** @param {string} text */
export function sentences(text) {
  const plain = String(text).replace(/\[([^\]]*)\]\([^)]*\)/g, "$1");
  return [...segmenter.segment(plain)].map((part) => part.segment.trim()).filter((sentence) => words(sentence).length > 0);
}

function levenshtein(a, b) {
  if (a === b) return 0;
  let previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i++) {
    const row = [i];
    for (let j = 1; j <= b.length; j++) {
      row[j] = Math.min(previous[j] + 1, row[j - 1] + 1, previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    previous = row;
  }
  return previous[b.length];
}

/** A spelling fix: "recieve" and "receive" are the same word. */
function sameWord(a, b) {
  if (a === b) return true;
  const shorter = Math.min(a.length, b.length);
  if (shorter < 4) return false;
  return levenshtein(a, b) <= (shorter >= 8 ? 2 : 1);
}

/** Word edits a sentence of `length` words may carry: none up to five words, then about one per eight. */
export function allowedEdits(length) {
  return length <= 5 ? 0 : Math.max(1, Math.floor(length / 8));
}

// Words that flip an opinion or a fact when added, dropped or swapped. A
// grammar fix never touches them, so editing one costs more than any budget.
const LOCKED = new Set(["not", "no", "never", "nothing", "none", "nobody", "without", "skip", "dont", "doesnt", "didnt", "isnt", "wasnt", "arent", "cant", "couldnt", "wont", "wouldnt", "only", "best", "worst",
  // French, for the FR copy of the seven pre-rework reviews (traced against their old FR text).
  "pas", "jamais", "rien", "aucun", "aucune", "sans", "seulement", "meilleur", "meilleure", "meilleurs", "pire", "ne", "nest"]);
const UNAFFORDABLE = 1000;
const locked = (word) => LOCKED.has(word) || /\d/.test(word);
const editCost = (word) => (locked(word) ? UNAFFORDABLE : 1);

/**
 * Smallest word-level edit distance between `needle` and any contiguous
 * run of words in `haystack` (approximate substring match).
 * @param {string[]} needle
 * @param {string[]} haystack
 */
export function bestMatchCost(needle, haystack) {
  let previous = new Array(haystack.length + 1).fill(0);
  for (let i = 1; i <= needle.length; i++) {
    const row = [previous[0] + editCost(needle[i - 1])];
    for (let j = 1; j <= haystack.length; j++) {
      const a = needle[i - 1];
      const b = haystack[j - 1];
      const substitute = sameWord(a, b) && locked(a) === locked(b) && (!/\d/.test(a) || a === b) ? 0 : Math.max(editCost(a), editCost(b));
      row[j] = Math.min(previous[j] + editCost(a), row[j - 1] + editCost(b), previous[j - 1] + substitute);
    }
    previous = row;
  }
  return Math.min(...previous);
}

/**
 * @param {string} sentence
 * @param {string[][]} sourceWordLists the source, one word list per block
 */
export function traces(sentence, sourceWordLists) {
  const needle = words(sentence);
  if (needle.length === 0) return true;
  // A one-word sentence has no context to tell a spelling fix from a
  // different word ("Paid" is not "pair"), so it must match exactly.
  if (needle.length === 1) return sourceWordLists.some((haystack) => haystack.includes(needle[0]));
  const budget = allowedEdits(needle.length);
  return sourceWordLists.some((haystack) => haystack.length >= needle.length - budget && bestMatchCost(needle, haystack) <= budget);
}

// Words a question form adds to a heading without changing its meaning.
const QUESTION_WORDS = new Set([
  "what", "whats", "how", "is", "are", "does", "do", "where", "when", "which", "who", "why", "should", "can", "much", "many",
  "it", "its", "worth", "the", "a", "an", "at", "in", "to", "for", "of", "on", "i", "we", "you", "there", "this",
]);

/**
 * An H2 rephrased as the question a searcher would type, without changing
 * its meaning: "The real cost" -> "What does dinner at Moccione really cost?"
 * passes; a heading that brings in a new claim does not. The question may
 * add question words and the venue's name, and at most one other word
 * (such as "dinner"); at least half the words of the original heading must stay.
 * @param {string} candidate
 * @param {string[]} headings source headings
 * @param {string} [venueName]
 */
export function traceHeading(candidate, headings, venueName = "") {
  const venue = new Set(words(venueName));
  const content = (text) => words(text).filter((word) => !QUESTION_WORDS.has(word) && !venue.has(word));
  const asked = content(candidate);
  return headings.some((heading) => {
    if (traces(candidate, [words(heading)])) return true;
    // "What to order" -> "What to order at Moccione": the venue's name may be added.
    const named = words(candidate).filter((word) => !venue.has(word));
    while (["at", "in", "of", "for"].includes(named.at(-1) ?? "")) named.pop();
    if (named.join(" ") === words(heading).join(" ")) return true;
    if (!candidate.trim().endsWith("?")) return false;
    const original = content(heading);
    if (original.length === 0) return false;
    const missing = original.filter((word) => !asked.some((other) => sameWord(word, other) || other.startsWith(word) || word.startsWith(other)));
    const added = asked.filter((word) => !original.some((other) => sameWord(word, other) || other.startsWith(word) || word.startsWith(other)));
    return missing.length <= Math.floor(original.length / 2) && missing.length < original.length && added.length <= 1;
  });
}

// Fields in a record's locale copy that are not Notion prose: identifiers,
// enums, dates, and the Companion File's own fields (meta, alt text),
// which DMD writes and the spec allows.
export const UNCHECKED_KEYS = new Set([
  "slug", "metaTitle", "metaDescription", "imageAlt", "alt", "imageCredit", "imageCaption", "sourceNotes", "factNotes",
  "photo", "spotId", "recipeId", "profileId", "moment", "tag", "occasion", "assessment", "timing", "advice", "byline",
  "date", "role", "credit", "walkMinutes", "visits", "courses",
]);

/**
 * Every reader-facing string in a locale copy, with its path.
 * @param {unknown} value
 * @param {string} [path]
 * @returns {{ path: string, text: string }[]}
 */
export function proseStrings(value, path = "") {
  if (typeof value === "string") return [{ path, text: value }];
  if (Array.isArray(value)) return value.flatMap((item, index) => proseStrings(item, `${path}[${index}]`));
  if (value && typeof value === "object") {
    return Object.entries(value).flatMap(([key, item]) => (UNCHECKED_KEYS.has(key) ? [] : proseStrings(item, path ? `${path}.${key}` : key)));
  }
  return [];
}

/**
 * @param {Record<string, unknown>} copy the English locale copy of a record, as published
 * @param {{ metadata?: Record<string, string>, sections: import("./parse.mjs").SourceSection[] }} source the Notion source snapshot
 * @param {{ venueName?: string, headings?: { path: string, text: string }[] }} [options] headings: page H2s that are not in the copy
 * @returns {{ ok: boolean, offending: { path: string, sentence: string }[] }}
 */
export function verbatimCheck(copy, source, options = {}) {
  const sourceWordLists = sourceTexts(source).map(words);
  const offending = [];
  for (const { path, text } of proseStrings(copy)) {
    for (const sentence of sentences(text)) {
      if (!traces(sentence, sourceWordLists)) offending.push({ path, sentence });
    }
  }
  const headings = sourceHeadings(source);
  for (const { path, text } of options.headings ?? []) {
    if (!traceHeading(text, headings, options.venueName)) offending.push({ path, sentence: text });
  }
  return { ok: offending.length === 0, offending };
}

/**
 * Source sentences the page does not use: Unplaced Text for the PR, so
 * nothing is dropped silently. Author notes and editorial sections are not
 * reader prose and are not listed.
 * @param {Record<string, unknown>} copy
 * @param {{ metadata?: Record<string, string>, sections: import("./parse.mjs").SourceSection[] }} source
 * @returns {string[]}
 */
export function unplacedText(copy, source) {
  const used = proseStrings(copy).map(({ text }) => words(text));
  const metadataValues = new Set(Object.values(source.metadata ?? {}));
  const unplaced = [];
  for (const text of sourceTexts({ ...source, metadata: {} }, { proseCellsOnly: true })) {
    if (metadataValues.has(text)) continue;
    for (const sentence of sentences(text)) {
      if (!traces(sentence, used)) unplaced.push(sentence);
    }
  }
  return [...new Set(unplaced)];
}
