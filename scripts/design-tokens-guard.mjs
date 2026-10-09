/**
 * Design-system guard (redesign, lesson 27). Components, layouts and pages
 * take colour, shadow and radius from the tokens in src/styles/global.css,
 * never from one-off values. Fails on:
 *   - a raw hex colour (#abc, #aabbcc, #aabbccdd), outside <meta name="theme-color">
 *   - an arbitrary shadow or radius utility: shadow-[...], rounded-[...]
 *   - an arbitrary colour utility: text-[#...], bg-[#...], border-[#...] and kin
 */

const HEX = /(?<![&\w])#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3})(?![\w-])/g;
const ARBITRARY = /(?<![\w-])(?:[a-z-]+:)*(shadow|rounded(?:-[a-z]+)?)-\[[^\]]*\]/g;
const ARBITRARY_COLOUR = /(?<![\w-])(?:[a-z-]+:)*(?:text|bg|border|fill|stroke|from|via|to|ring|outline|decoration|placeholder|caret|accent)-\[#[^\]]*\]/g;

/** Returns one message per violation found in a source file's content. */
export function findDesignViolations(content, file) {
  const out = [];
  content.split("\n").forEach((line, i) => {
    const where = `${file}:${i + 1}`;
    if (!/name="theme-color"/.test(line)) {
      for (const m of line.matchAll(HEX)) out.push(`[design] ${where}: raw hex colour ${m[0]}; use a semantic token (DESIGN.md)`);
    }
    for (const m of line.matchAll(ARBITRARY)) out.push(`[design] ${where}: arbitrary ${m[1].replace(/-.*/, "")} value ${m[0]}; use the radius and surface tokens`);
    for (const m of line.matchAll(ARBITRARY_COLOUR)) out.push(`[design] ${where}: arbitrary colour ${m[0]}; use a semantic token`);
  });
  return out;
}
