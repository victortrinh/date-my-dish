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
 *
 * Run: node scripts/validate-build.mjs   (also runs automatically via `postbuild`)
 */
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, relative } from "node:path";

const DIST = "dist";
const REDIRECTS_FILE = "public/_redirects";
const MIN_DESC = 120;
const MAX_DESC = 160;
const IMG_MAX_BYTES = 500_000;
const SITE = "https://datemydish.com";
// Namespaces that should always resolve to a translation; a raw "<ns>.<slug>"
// in rendered output means a missing i18n key.
const I18N_LEAK = /\b(tags|cuisines|occasion|categories|category)\.[a-z][a-z0-9-]+/;

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

  // 4. internal links -> redirect source
  for (const a of html.match(/<a\s[^>]*href="([^"]+)"/g) || []) {
    const url = a.match(/href="([^"]+)"/)[1];
    const pathname = pathnameOf(url);
    if (!pathname) continue;
    if (isRedirectSource(pathname)) err(`[link-redirect] ${rel} links to a redirecting URL: ${url}`);
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
  console.error(`\n❌ validate-build: ${errors.length} SEO issue(s) found:\n`);
  for (const e of errors.sort()) console.error("  " + e);
  console.error("\nFix these before deploying (see CLAUDE.md SEO lessons).");
  process.exit(1);
}
console.log("✅ validate-build: hreflang, sitemap, descriptions, links, i18n keys, and image sizes all pass.");
