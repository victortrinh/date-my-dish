// scripts/notion-story/fields.mjs
//
// Declarative description of the Notion Story database properties for each
// Post Type / Spot Type. This single table drives:
//   - which shared (locale-neutral) properties `map.mjs` reads off the row
//   - the "missing field" report a failed Story produces
//   - the contract test that keeps notion/templates/*.md in sync
//
// Locale-specific copy is never read from individual Notion properties. It
// is supplied as two Notion "code" blocks (English, then Canadian French)
// on the Story page, each a JSON object shaped exactly like the matching
// content-contract's locale copy. See notion/templates/*.md.

// Properties every Post Type shares.
export const SHARED_PROPERTIES = [
  "Status",
  "Story #",
  "Post Type",
  "ID",
  "Human reporting",
  "Human translation",
  "DMD-held photograph",
];

// Properties required in addition to SHARED_PROPERTIES, by Post Type. Date
// Spot rows also key off "Spot Type" to pick the right sub-list below.
export const POST_TYPE_PROPERTIES = {
  "date-spot": ["Spot Type", "Name", "City", "Neighbourhood", "Visited", "Published", "Last checked", "Payment", "Map URL", "Verdict", "Price range"],
  "contributor-recipe": ["Contributor name", "Contributor role", "Venue or context", "Supplied source", "Received on", "Published"],
  "extended-profile": ["Subject name", "Subject role", "Subject venue", "Subject neighbourhood", "Companion Date Spot", "Interview date", "Interview source", "Published"],
};

// Date Spot rows additionally require these properties by Spot Type.
export const SPOT_TYPE_PROPERTIES = {
  restaurant: [],
  bar: [],
  activity: ["Category"],
  "chef-led-experience": ["Category", "Host name", "Host role"],
};

// Properties read when filled in and skipped when blank. A Bar takes a
// Category only when it should appear in "Make a night of it" picks.
export const OPTIONAL_PROPERTIES = {
  "date-spot": ["Instagram", "Booking URL", "Google reviews"],
  bar: ["Category"],
};

export function requiredProperties(postType, spotType) {
  const props = [...SHARED_PROPERTIES, ...(POST_TYPE_PROPERTIES[postType] ?? [])];
  if (postType === "date-spot" && spotType) {
    props.push(...(SPOT_TYPE_PROPERTIES[spotType] ?? []));
  }
  return props;
}

export const POST_TYPES = Object.keys(POST_TYPE_PROPERTIES);
export const SPOT_TYPES = Object.keys(SPOT_TYPE_PROPERTIES);
