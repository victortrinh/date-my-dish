// Worker entry: wraps Astro's Cloudflare handler with a maintenance-mode gate.
//
// Maintenance mode is ON when `MAINTENANCE_MODE` is "true" (wrangler.jsonc `vars`,
// or overridden in the Cloudflare dashboard). It only intercepts static pages when
// `assets.run_worker_first` is true, so flip both together.
//
// Every request gets a 503 + Retry-After so search engines treat the outage as
// temporary and keep existing rankings. Icons and robots.txt pass through.
import { handle } from "@astrojs/cloudflare/handler";

const PASSTHROUGH_PATHS = new Set([
  "/favicon.svg",
  "/favicon-48x48.png",
  "/apple-touch-icon.png",
  "/robots.txt",
]);

const RETRY_AFTER_SECONDS = "3600";

const MAINTENANCE_HTML = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>Back soon | Date My Dish</title>
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<style>
  :root { color-scheme: light dark; --bg: #faf7f5; --text: #1f1a1c; --muted: #584c4b; --accent: #7b2d3b; --rule: #e4dbd8; }
  @media (prefers-color-scheme: dark) {
    :root { --bg: #1e1416; --text: #f3eeeb; --muted: #a19491; --accent: #c4697a; --rule: #433739; }
  }
  * { box-sizing: border-box; }
  body { margin: 0; min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 2rem 1rem; background: var(--bg); color: var(--text); font-family: Georgia, "Times New Roman", serif; text-align: center; }
  main { max-width: 32rem; }
  img { width: 72px; height: 72px; margin-bottom: 1.5rem; }
  h1 { font-style: italic; font-weight: 400; font-size: 2rem; margin: 0 0 0.75rem; color: var(--accent); }
  p { margin: 0; font-size: 1.125rem; line-height: 1.6; color: var(--muted); }
  hr { width: 4rem; border: 0; border-top: 1px solid var(--rule); margin: 2rem auto; }
</style>
</head>
<body>
<main>
  <img src="/favicon.svg" alt="" width="72" height="72">
  <section>
    <h1>We'll be right back</h1>
    <p>Date My Dish is getting a little touch-up. Check back soon.</p>
  </section>
  <hr>
  <section lang="fr">
    <h1>On revient bientôt</h1>
    <p>Date My Dish se refait une beauté. Revenez nous voir sous peu.</p>
  </section>
</main>
</body>
</html>`;

function maintenanceResponse(): Response {
  return new Response(MAINTENANCE_HTML, {
    status: 503,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      "Retry-After": RETRY_AFTER_SECONDS,
      "X-Robots-Tag": "noindex",
    },
  });
}

export default {
  async fetch(request, env, ctx) {
    if (env.MAINTENANCE_MODE === "true") {
      const { pathname } = new URL(request.url);
      if (!PASSTHROUGH_PATHS.has(pathname)) return maintenanceResponse();
    }
    return handle(request, env, ctx);
  },
} satisfies ExportedHandler<Env>;
