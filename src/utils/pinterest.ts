// The link behind every Save button: Pinterest's pin builder, prefilled with
// the page, the photo (both absolute) and the description.
export function pinUrl(page: string, media: string, description: string): string {
  const params = new URLSearchParams({ url: page, media, description });
  return `https://www.pinterest.com/pin/create/button/?${params}`;
}

// Absolute page and photo URLs for the pin builder, from the site in astro.config.
export function pinFor(astro: { site?: URL; url: URL }, src: string, description: string): string {
  const site = astro.site ?? astro.url;
  return pinUrl(new URL(astro.url.pathname, site).href, new URL(src, site).href, description);
}
