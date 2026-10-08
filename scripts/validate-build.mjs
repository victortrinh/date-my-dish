#!/usr/bin/env node
/**
 * Post-build SEO guard. Runs against the built `dist/` output plus
 * `public/_redirects`, and fails (exit 1) on the regressions that the
 * Jun 2026 Ahrefs Site Audit surfaced:
 *
 *   1. Hreflang -> redirect/broken   (every <link hreflang> must be 200 + trailing slash)
 *   2. Sitemap hygiene               (no noindex page, no bare root, no redirecting URL)
 *   3. Meta description length       (indexable pages must be 120-160 chars)
 *   4. Internal links -> redirect    (no <a href> may point at a _redirects source)
 *   5. Untranslated i18n key leak    (no "tags.x"/"cuisines.x"/... in <title>/<meta>)
 *   6. Oversized image variants      (no dist/_astro image over IMG_MAX_BYTES)
 *   7. Rating markup in JSON-LD      (no Review, AggregateRating, Rating or FAQPage)
 *
 * and enforces the performance budgets (docs/editorial-publishing-system.md,
 * "Performance budgets"); the Lighthouse PR check covers the rest:
 *
 *   7. JavaScript per post page      (first-party JS on a review, Date Spot, chef or
 *                                     recipe card page must be <= JS_MAX_BYTES)
 *   8. Hero image weight             (the fetchpriority="high" hero, every source, <= HERO_MAX_BYTES)
 *   9. Image dimensions              (every <img> sets width and height, so nothing shifts)
 *  10. Lazy below-the-fold images    (on post pages every non-hero <img> is loading="lazy")
 *  11. No third-party embeds on load (no off-site <iframe> in the initial HTML; the map is a link)
 *
 * Run: node scripts/validate-build.mjs   (also runs automatically via `postbuild`)
 */
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, relative } from "node:path";

const DIST = "dist/client";
const REDIRECTS_FILE = "public/_redirects";
const MIN_DESC = 120;
const MAX_DESC = 160;
const IMG_MAX_BYTES = 500_000;
const KB = 1024;
const JS_MAX_BYTES = 15 * KB;
const HERO_MAX_BYTES = 200 * KB;
// Post detail pages (one per Date Spot, Extended Profile and Contributor Recipe).
// Listing, category and neighbourhood pages are not posts.
const POST_PAGE = [
  /^\/(en\/reviews|fr\/critiques)\/[^/]+\/[^/]+\/$/,
  /^\/en\/date-spots\/(?!category\/|neighbourhood\/)[^/]+\/$/,
  /^\/fr\/lieux\/(?!categorie\/|quartier\/)[^/]+\/$/,
  /^\/(en|fr)\/chefs\/[^/]+\/$/,
  /^\/(en\/recipe-cards|fr\/fiches-recettes)\/[^/]+\/$/,
];
const isPostPage = (rel) => POST_PAGE.some((re) => re.test(rel));
const SITE = "https://datemydish.com";
// Namespaces that should always resolve to a translation; a raw "<ns>.<slug>"
// in rendered output means a missing i18n key.
const I18N_LEAK = /\b(tags|cuisines|occasion|categories|category)\.[a-z][a-z0-9-]+/;

// DMD publishes no numbers of its own and no FAQ rich results: the verdict
// is qualitative and the Google rating is the venue's (docs/editorial-publishing-system.md).
const FORBIDDEN_LD_TYPES = new Set(["Review", "AggregateRating", "Rating", "FAQPage", "CriticReview", "UserReview", "EmployerAggregateRating"]);
const FORBIDDEN_LD_KEYS = new Set(["review", "reviews", "reviewRating", "aggregateRating", "ratingValue", "bestRating", "worstRating"]);

function forbiddenMarkup(node, found = []) {
  if (Array.isArray(node)) node.forEach((item) => forbiddenMarkup(item, found));
  else if (node && typeof node === "object") {
    for (const type of [node["@type"]].flat()) if (FORBIDDEN_LD_TYPES.has(type)) found.push(`@type ${type}`);
    for (const [key, value] of Object.entries(node)) {
      if (FORBIDDEN_LD_KEYS.has(key)) found.push(key);
      forbiddenMarkup(value, found);
    }
  }
  return found;
}

const errors = [];
const err = (msg) => errors.push(msg);

// ---- helpers ---------------------------------------------------------------

function walk(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

function htmlFiles() {
  return walk(DIST).filter((f) => f.endsWith("index.html"));
}

function decode(s) {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/gi, "'");
}

// Map a same-site URL/path to its built file; returns null for off-site links.
function pathnameOf(href) {
  let p;
  if (href.startsWith(SITE)) p = href.slice(SITE.length);
  else if (href.startsWith("/")) p = href;
  else return null; // external, mailto:, #anchor, tel:, etc.
  p = p.split("#")[0].split("?")[0];
  return p || "/";
}

function distFileFor(pathname) {
  if (pathname === "/") return join(DIST, "index.html");
  return join(DIST, pathname.replace(/^\/+|\/+$/g, ""), "index.html");
}

// ---- load _redirects sources ----------------------------------------------

function loadRedirectMatchers() {
  if (!existsSync(REDIRECTS_FILE)) return [];
  const matchers = [];
  for (const raw of readFileSync(REDIRECTS_FILE, "utf-8").split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const from = line.split(/\s+/)[0];
    if (!from?.startsWith("/")) continue;
    if (from.includes("*")) {
      const re = new RegExp("^" + from.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*") + "$");
      matchers.push((pathname) => re.test(pathname));
    } else {
      // Match with or without trailing slash so /x and /x/ both count.
      const a = from.replace(/\/$/, "");
      matchers.push((pathname) => {
        const b = pathname.replace(/\/$/, "");
        return b === a;
      });
    }
  }
  return matchers;
}

// ---- performance budget helpers -------------------------------------------

// Built file for a same-site asset URL (/_astro/x.js, /images/hero.webp?v=1),
// or null when the asset is off-site.
function distAssetFor(url) {
  if (url.startsWith("//")) return null;
  const pathname = pathnameOf(decode(url));
  if (!pathname) return null;
  return join(DIST, pathname.replace(/^\/+/, ""));
}

// First-party JavaScript a page ships: inline scripts (JSON-LD excluded) plus
// same-site <script src> files. Third-party tags (analytics, Pinterest) are
// not on disk to weigh; the Lighthouse mobile score covers their cost.
function firstPartyJsBytes(html) {
  let bytes = 0;
  for (const [, attrs, body] of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
    const type = (attrs.match(/\stype=["']([^"']+)["']/i) || [, ""])[1].toLowerCase();
    if (type && !/^(module|text\/javascript|application\/javascript)$/.test(type)) continue;
    const src = (attrs.match(/\ssrc=["']([^"']+)["']/i) || [])[1];
    if (src) {
      const file = distAssetFor(src);
      if (file && existsSync(file)) bytes += statSync(file).size;
    } else {
      bytes += Buffer.byteLength(body, "utf-8");
    }
  }
  return bytes;
}

// Every URL a hero offers the browser: the <img> src plus each srcset candidate
// of the <img> and of any <source> in its <picture>.
function heroUrls(block) {
  const urls = [];
  for (const [, src] of block.matchAll(/\ssrc=["']([^"']+)["']/gi)) urls.push(src);
  for (const [, set] of block.matchAll(/\ssrcset=["']([^"']+)["']/gi)) {
    for (const candidate of set.split(",")) {
      const url = candidate.trim().split(/\s+/)[0];
      if (url) urls.push(url);
    }
  }
  return urls;
}

const redirectMatchers = loadRedirectMatchers();
const isRedirectSource = (pathname) => redirectMatchers.some((m) => m(pathname));

// ---- per-page checks -------------------------------------------------------

for (const file of htmlFiles()) {
  const html = readFileSync(file, "utf-8");
  const rel = "/" + relative(DIST, file).replace(/index\.html$/, "");
  const noindex = /<meta[^>]+name=["']robots["'][^>]*noindex/i.test(html);
  const title = decode((html.match(/<title>([^<]*)<\/title>/) || [, ""])[1]);
  const descMatch = html.match(/<meta name="description" content="([^"]*)"/);
  const desc = descMatch ? decode(descMatch[1]) : null;

  // 3. meta description length (indexable only)
  if (!noindex && desc !== null && (desc.length < MIN_DESC || desc.length > MAX_DESC)) {
    err(`[desc] ${rel} meta description is ${desc.length} chars (want ${MIN_DESC}-${MAX_DESC})`);
  }

  // 5. untranslated i18n key leak
  for (const [label, text] of [["title", title], ["description", desc || ""]]) {
    const m = text.match(I18N_LEAK);
    if (m) err(`[i18n-key] ${rel} ${label} contains untranslated key "${m[0]}"`);
  }

  // 1. hreflang integrity
  for (const href of html.match(/<link[^>]+rel="alternate"[^>]+hreflang="[a-z-]+"[^>]+href="([^"]+)"/g) || []) {
    const url = href.match(/href="([^"]+)"/)[1];
    const pathname = pathnameOf(url);
    if (!pathname) continue;
    if (!pathname.endsWith("/")) err(`[hreflang] ${rel} hreflang target lacks trailing slash: ${url}`);
    else if (!existsSync(distFileFor(pathname))) err(`[hreflang] ${rel} hreflang target is broken/redirecting: ${url}`);
  }

  // 7. no rating, review or FAQ structured data
  for (const block of html.match(/<script type="application\/ld\+json"[^>]*>[\s\S]*?<\/script>/g) || []) {
    const json = block.replace(/^<script[^>]*>/, "").replace(/<\/script>$/, "");
    let data;
    try { data = JSON.parse(json); } catch { err(`[json-ld] ${rel} has JSON-LD that does not parse`); continue; }
    for (const hit of new Set(forbiddenMarkup(data))) err(`[json-ld] ${rel} emits ${hit}; DMD structured data carries no rating, review or FAQ markup`);
  }

  // 4. internal links -> redirect source
  for (const a of html.match(/<a\s[^>]*href="([^"]+)"/g) || []) {
    const url = a.match(/href="([^"]+)"/)[1];
    const pathname = pathnameOf(url);
    if (!pathname) continue;
    if (isRedirectSource(pathname)) err(`[link-redirect] ${rel} links to a redirecting URL: ${url}`);
  }

  // 7. JavaScript budget per post page
  const post = isPostPage(rel);
  if (post) {
    const jsBytes = firstPartyJsBytes(html);
    if (jsBytes > JS_MAX_BYTES) {
      err(`[perf-js] ${rel} ships ${(jsBytes / KB).toFixed(1)} KB of JavaScript (max ${JS_MAX_BYTES / KB} KB)`);
    }
  }

  // 8. hero image weight: the fetchpriority="high" image and its <picture> sources
  const heroImg = html.match(/<img\b[^>]*fetchpriority=["']high["'][^>]*>/i)?.[0];
  if (heroImg) {
    const picture = [...html.matchAll(/<picture\b[\s\S]*?<\/picture>/gi)].find((m) => m[0].includes(heroImg))?.[0];
    for (const url of new Set(heroUrls(picture || heroImg))) {
      const file = distAssetFor(url);
      if (!file || !existsSync(file)) continue;
      const bytes = statSync(file).size;
      if (bytes > HERO_MAX_BYTES) {
        err(`[perf-hero] ${rel} hero ${url} is ${(bytes / KB).toFixed(0)} KB (max ${HERO_MAX_BYTES / KB} KB)`);
      }
    }
  }

  // 9. every <img> sets width and height; 10. non-hero images on post pages are lazy
  const visibleHtml = html.replace(/<noscript>[\s\S]*?<\/noscript>/gi, "");
  for (const [img] of html.matchAll(/<img\b[^>]*>/gi)) {
    const src = (img.match(/\ssrc=["']([^"']*)["']/i) || [, "(no src)"])[1];
    if (!/\swidth=["']?\d/i.test(img) || !/\sheight=["']?\d/i.test(img)) {
      err(`[perf-img-size] ${rel} <img src="${src}"> is missing width and height`);
    }
    if (post && img !== heroImg && visibleHtml.includes(img) && !/\sloading=["']lazy["']/i.test(img)) {
      err(`[perf-img-lazy] ${rel} below-the-fold <img src="${src}"> is not loading="lazy"`);
    }
  }

  // 11. no third-party iframe in the initial HTML (embeds such as maps load on click)
  for (const [iframe] of html.matchAll(/<iframe\b[^>]*>/gi)) {
    const src = (iframe.match(/\ssrc=["']([^"']+)["']/i) || [])[1];
    if (src && (src.startsWith("//") || (/^https?:/i.test(src) && !src.startsWith(SITE)))) {
      err(`[perf-embed] ${rel} loads a third-party iframe on page load: ${src}`);
    }
  }
}

// ---- 2. sitemap hygiene ----------------------------------------------------

const sitemapPath = join(DIST, "sitemap-0.xml");
if (existsSync(sitemapPath)) {
  const xml = readFileSync(sitemapPath, "utf-8");
  const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  for (const loc of locs) {
    const pathname = pathnameOf(loc);
    if (pathname === "/") err(`[sitemap] bare root ${loc} must not be in sitemap (it redirects)`);
    if (isRedirectSource(pathname)) err(`[sitemap] redirecting URL in sitemap: ${loc}`);
    const f = distFileFor(pathname);
    if (existsSync(f) && /<meta[^>]+name=["']robots["'][^>]*noindex/i.test(readFileSync(f, "utf-8"))) {
      err(`[sitemap] noindex page in sitemap: ${loc}`);
    }
  }
} else {
  err("[sitemap] dist/sitemap-0.xml not found");
}

// ---- 6. oversized image variants -------------------------------------------

const astroDir = join(DIST, "_astro");
if (existsSync(astroDir)) {
  for (const f of readdirSync(astroDir)) {
    if (!/\.(png|jpe?g|webp|avif|gif)$/i.test(f)) continue;
    const bytes = statSync(join(astroDir, f)).size;
    if (bytes > IMG_MAX_BYTES) {
      err(`[image] _astro/${f} is ${(bytes / 1024).toFixed(0)}KB (max ${IMG_MAX_BYTES / 1024}KB)`);
    }
  }
}

// ---- report ----------------------------------------------------------------

if (errors.length) {
  console.error(`\n❌ validate-build: ${errors.length} SEO/performance issue(s) found:\n`);
  for (const e of errors.sort()) console.error("  " + e);
  console.error("\nFix these before deploying (see CLAUDE.md SEO lessons and the performance budgets in docs/editorial-publishing-system.md).");
  process.exit(1);
}
console.log("✅ validate-build: hreflang, sitemap, descriptions, links, i18n keys, image sizes, and performance budgets all pass.");
