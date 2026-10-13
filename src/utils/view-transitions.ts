// Cross-document View Transitions: a card's photo and title carry the same
// `view-transition-name` as the post's hero photo and h1, so the photo grows
// into the hero when the reader opens the post (DESIGN.md, Motion).
//
// A name may appear only once per page, or the browser skips the whole
// transition. Every name goes through `transitionStyle`, which remembers the
// names already given out during this page's render (in `Astro.locals`) and
// returns nothing for a repeat: the same spot shown twice on one page keeps
// its name on the first copy only. `validate-build` fails a page that still
// ends up with a duplicate.

export type TransitionKind = "spot" | "chef" | "recipe";
export type TransitionPart = "photo" | "title";

const CLAIMED = Symbol.for("dmd.viewTransitionNames");

/** `spot-giwa-photo`: kind, the post's id (its slug), part. */
export function transitionName(kind: TransitionKind, id: string, part: TransitionPart): string {
  return `${kind}-${id.toLowerCase().replace(/[^a-z0-9_-]+/g, "-")}-${part}`;
}

/** Inline style for one element, or undefined when the name is already used on this page. */
export function transitionStyle(locals: object, kind: TransitionKind, id: string, part: TransitionPart): string | undefined {
  const store = locals as Record<symbol, Set<string> | undefined>;
  const claimed = (store[CLAIMED] ??= new Set<string>());
  const name = transitionName(kind, id, part);
  if (claimed.has(name)) return undefined;
  claimed.add(name);
  return `view-transition-name:${name};view-transition-class:vt-${part}`;
}
