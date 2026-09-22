import type { APIRoute } from "astro";
import { SITE_URL } from "@utils/constants";

export const GET: APIRoute = () => new Response([
  "# Date My Dish",
  "",
  `- [Home (EN)](${SITE_URL}/en/)`,
  `- [Accueil (FR)](${SITE_URL}/fr/)`,
  "",
].join("\n"), { headers: { "Content-Type": "text/plain; charset=utf-8" } });
