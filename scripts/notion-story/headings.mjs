// scripts/notion-story/headings.mjs
//
// The fixed heading map: the headings authors actually use on Notion pages,
// mapped onto the design's sections. Built from the real Notion pages of the
// nine reviews (seven Published, Cabaret l'Enfer Ready to Publish, Ratafia
// In Progress), the Date Spot drafts, and the spec's examples. A heading the
// map does not know is placed by the Importer agent and listed in the PR;
// nothing is dropped silently.
//
// Sections are the content-contract field names (src/content-contracts/),
// so the agent knows exactly where the text goes. "editorial:*" sections are
// author notes for DMD, not reader prose: they feed the Companion File (alt
// text, internal links) or the PR checklist, and never render as written.

/** @typedef {{ section: string, label: string }} Placement */

/** @type {Array<[RegExp, Placement]>} */
export const HEADING_MAP = [
  // Review (Restaurant and Bar share one template)
  [/^the verdict$|^verdict$|^is .+ worth it$/, { section: "verdict", label: "The verdict (verdictHeadline, verdictDetail, verdict reason)" }],
  [/^good for$/, { section: "goodFor", label: "Good for" }],
  [/^the room$|^the vibe$/, { section: "room", label: "The room" }],
  [/^meet the chef$/, { section: "meetChef", label: "Meet the chef" }],
  [/^meet the bartender$/, { section: "meetTheBartender", label: "Meet the bartender" }],
  [/^the drinks$/, { section: "drinks", label: "The drinks" }],
  [/^what to order$|^what i ate$/, { section: "whatToOrder", label: "What to order" }],
  [/^what to eat$/, { section: "whatToEat", label: "What to eat" }],
  [/^the real cost$/, { section: "realCost", label: "The real cost" }],
  [/^my note$|^the part thats just my opinion$/, { section: "reportersNote", label: "My note" }],
  [/^make a night of it$|^before and after$/, { section: "makeANight", label: "Make a night of it" }],
  [/^what the chef cooks at home$|^what the chef would make for a date night$/, { section: "atHome", label: "What the chef would make for a date night" }],
  [/^before you book$|^before you go$/, { section: "beforeYouBook", label: "Before you book" }],
  [/^the essentials card$|^the essentials$|^know before you go$/, { section: "essentials", label: "The essentials card" }],
  // Date Spot
  [/^when it works$/, { section: "whenItWorks", label: "When it works" }],
  [/^what it actually is$/, { section: "whatItIs", label: "What it actually is" }],
  [/^how to do it well$/, { section: "howToDoItWell", label: "How to do it well" }],
  [/^pair it with$/, { section: "pairItWith", label: "Pair it with" }],
  // Chef
  [/^the short version$/, { section: "shortVersion", label: "The short version" }],
  [/^dinner and a date$/, { section: "dinnerAndADate", label: "Dinner and a date" }],
  // Author notes for DMD, never reader prose
  [/^alt text for the photos$|^alt text$/, { section: "editorial:imageAlt", label: "Alt text (Companion File)" }],
  [/^internal links\b/, { section: "editorial:internalLinks", label: "Internal links (Companion File)" }],
  [/^before publishing$/, { section: "editorial:checklist", label: "Pre-publish checklist (PR only)" }],
];

/** "The Part That's Just My Opinion" -> "the part thats just my opinion". */
export function normalizeHeading(heading) {
  return String(heading)
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/**
 * @param {string} heading
 * @param {number} level 1 for the page H1, 2 for a section, 3 for a subheading
 * @returns {Placement | null} null when the agent has to place it
 */
export function mapHeading(heading, level) {
  // The H1 is the venue name; the paragraphs under it are the opening and byline.
  if (level === 1) return { section: "opening", label: "H1 and opening" };
  const key = normalizeHeading(heading);
  for (const [pattern, placement] of HEADING_MAP) if (pattern.test(key)) return placement;
  return null;
}

/** True for sections that are author notes rather than reader prose. */
export const isEditorialSection = (section) => typeof section === "string" && section.startsWith("editorial:");
