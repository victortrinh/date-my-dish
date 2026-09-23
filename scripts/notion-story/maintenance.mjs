// scripts/notion-story/maintenance.mjs
//
// Pure helpers for the venue-maintenance reminder workflow. These never
// touch content: they only decide what to put on a reminder checklist.
// Recheck cadence follows docs/editorial-publishing-system.md:
// "Recheck venue facts every six months and seasonal Date Spots before the
// relevant season."

const RECHECK_INTERVAL_DAYS = 182; // ~6 months

function daysBetween(fromISODate, toISODate) {
  const from = new Date(`${fromISODate}T00:00:00Z`);
  const to = new Date(`${toISODate}T00:00:00Z`);
  return Math.floor((to - from) / (1000 * 60 * 60 * 24));
}

/**
 * @param {object[]} spots parsed content of src/content/date-spots.json
 * @param {string} todayISODate YYYY-MM-DD
 * @returns {{ id: string, name: string, lastChecked: string, reason: string }[]}
 */
export function dueForRecheck(spots, todayISODate) {
  const due = [];
  for (const spot of spots) {
    const { lastChecked } = spot.freshness;
    const overdueBySix = daysBetween(lastChecked, todayISODate) >= RECHECK_INTERVAL_DAYS;
    if (overdueBySix) {
      due.push({ id: spot.id, name: spot.name, lastChecked, reason: "Last checked over six months ago" });
      continue;
    }
    const isSeasonal = spot.spotType === "activity" || spot.spotType === "chef-led-experience";
    const season = isSeasonal ? spot.locales.en.season : undefined;
    if (season) {
      due.push({ id: spot.id, name: spot.name, lastChecked, reason: `Seasonal (${season}): recheck before the season starts` });
    }
  }
  return due.sort((a, b) => a.lastChecked.localeCompare(b.lastChecked));
}
