import type { APIRoute } from "astro";

interface RatingData {
  total: number;
  count: number;
}

export const prerender = false;

export const GET: APIRoute = async ({ request, locals }) => {
  const url = new URL(request.url);
  const slug = url.searchParams.get("slug");

  if (!slug || !/^[a-z0-9-]+$/.test(slug)) {
    return new Response(JSON.stringify({ error: "Invalid slug" }), {
      status: 400,
      headers: corsHeaders(request),
    });
  }

  const env = (locals as any).runtime?.env;
  const kv = env?.RATINGS;

  if (!kv) {
    return new Response(JSON.stringify({ averageRating: 0, ratingCount: 0 }), {
      status: 200,
      headers: corsHeaders(request),
    });
  }

  const data = await kv.get(`rating:${slug}`, "json") as RatingData | null;

  if (!data) {
    return new Response(JSON.stringify({ averageRating: 0, ratingCount: 0 }), {
      status: 200,
      headers: corsHeaders(request),
    });
  }

  return new Response(
    JSON.stringify({
      averageRating: Math.round((data.total / data.count) * 10) / 10,
      ratingCount: data.count,
    }),
    { status: 200, headers: corsHeaders(request) },
  );
};

export const POST: APIRoute = async ({ request, locals }) => {
  const origin = request.headers.get("origin") || "";
  if (!origin.includes("datemydish.com") && !origin.includes("localhost")) {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: corsHeaders(request),
    });
  }

  let body: { slug?: string; rating?: number };
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: corsHeaders(request),
    });
  }

  const { slug, rating } = body;

  if (!slug || !/^[a-z0-9-]+$/.test(slug)) {
    return new Response(JSON.stringify({ error: "Invalid slug" }), {
      status: 400,
      headers: corsHeaders(request),
    });
  }

  if (!rating || !Number.isInteger(rating) || rating < 1 || rating > 5) {
    return new Response(JSON.stringify({ error: "Rating must be 1-5" }), {
      status: 400,
      headers: corsHeaders(request),
    });
  }

  const env = (locals as any).runtime?.env;
  const kv = env?.RATINGS;

  if (!kv) {
    return new Response(JSON.stringify({ error: "Ratings unavailable" }), {
      status: 503,
      headers: corsHeaders(request),
    });
  }

  // Rate limiting: one rating per IP per slug per 24h
  const ip = request.headers.get("cf-connecting-ip") || "unknown";
  const rateLimitKey = `ratelimit:${slug}:${ip}`;
  const existing = await kv.get(rateLimitKey);

  if (existing) {
    return new Response(JSON.stringify({ error: "Already rated" }), {
      status: 429,
      headers: corsHeaders(request),
    });
  }

  // Update rating aggregate
  const data = (await kv.get(`rating:${slug}`, "json") as RatingData | null) || {
    total: 0,
    count: 0,
  };

  data.total += rating;
  data.count += 1;

  await kv.put(`rating:${slug}`, JSON.stringify(data));
  await kv.put(rateLimitKey, "1", { expirationTtl: 86400 });

  return new Response(
    JSON.stringify({
      averageRating: Math.round((data.total / data.count) * 10) / 10,
      ratingCount: data.count,
    }),
    { status: 200, headers: corsHeaders(request) },
  );
};

export const OPTIONS: APIRoute = async ({ request }) => {
  return new Response(null, { status: 204, headers: corsHeaders(request) });
};

function corsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get("origin") || "";
  const allowed =
    origin.includes("datemydish.com") || origin.includes("localhost");
  return {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": allowed ? origin : "",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}
