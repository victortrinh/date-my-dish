// scripts/notion-story/parse.mjs
//
// Pulls the two Locale Pair code blocks (English, then Canadian French) out
// of a Notion Story page body. The body is otherwise free-form; only the
// code blocks are mechanically read.

/**
 * @param {Array<{type: string, text?: string, language?: string|null}>} blocks
 *   Output of scripts/notion-utils.mjs traverseBlocks/groupListItems.
 * @returns {{ locales: { en: object, "fr-CA": object } | null, problems: string[] }}
 */
export function parseLocalePair(blocks) {
  const problems = [];
  const codeBlocks = blocks.filter((b) => b?.type === "code");

  if (codeBlocks.length < 2) {
    problems.push(
      `Expected two JSON code blocks on the Story page (English, then Canadian French); found ${codeBlocks.length}.`
    );
    return { locales: null, problems };
  }
  if (codeBlocks.length > 2) {
    problems.push(`Expected exactly two JSON code blocks; found ${codeBlocks.length}. Remove the extra block(s).`);
  }

  const [enBlock, frBlock] = codeBlocks;
  const en = parseJsonBlock(enBlock, "English", problems);
  const fr = parseJsonBlock(frBlock, "Canadian French", problems);

  if (problems.length > 0) return { locales: null, problems };
  return { locales: { en, "fr-CA": fr }, problems };
}

function parseJsonBlock(block, label, problems) {
  try {
    const parsed = JSON.parse(block.text);
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      problems.push(`${label} code block must contain a JSON object.`);
      return null;
    }
    return parsed;
  } catch (err) {
    problems.push(`${label} code block is not valid JSON: ${err.message}`);
    return null;
  }
}

// Additional Date Spot photos are image blocks captioned "photo:<key>",
// optionally followed by "| credit: <name>". The copy references them by key.
const PHOTO_CAPTION = /^photo:\s*([a-z0-9]+(?:-[a-z0-9]+)*)\s*(?:\|\s*credit:\s*(.+))?$/i;

/**
 * @param {Array<{type: string, url?: string, caption?: string}>} blocks
 * @returns {{ url: string, key: string, credit?: string }[]}
 */
export function photoBlocks(blocks) {
  return blocks
    .filter((block) => block.type === "image")
    .map((block) => ({ block, match: String(block.caption ?? "").trim().match(PHOTO_CAPTION) }))
    .filter(({ match }) => match)
    .map(({ block, match }) => ({ url: block.url, key: match[1].toLowerCase(), credit: match[2]?.trim() }));
}
