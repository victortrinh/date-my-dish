/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        brand: {
          primary: "#C4704B",
          "primary-dark": "#A85D3D",
          "primary-text": "#9A5439", // Darker terracotta for small text — WCAG AA on white
          accent: "#D4A853",
          "accent-dark": "#B8923F", // Used for hover states; avoid for text (fails WCAG)
          "accent-text": "#7D631C", // Gold text on light backgrounds — WCAG AA (5.72:1)
        },
      },
      fontFamily: {
        // font-heading: section titles, recipe titles, card headings (uppercase, bold)
        heading: ['"Fira Sans"', "sans-serif"],
        // font-body: article prose, descriptions, body text (mixed-case)
        body: ["Bitter", "serif"],
        // font-handwritten: logo, decorative accents (Caveat)
        handwritten: ["Caveat", "cursive"],
        // font-ui: buttons, labels, nav links, metadata (same face as heading, but non-uppercase contexts)
        ui: ['"Fira Sans"', "sans-serif"],
      },
      fontSize: {
        display: ["3.5rem", { lineHeight: "1.1" }],
        "heading-1": ["2.5rem", { lineHeight: "1.2" }],
        "heading-2": ["1.875rem", { lineHeight: "1.3" }],
        "heading-3": ["1.5rem", { lineHeight: "1.4" }],
        "body-lg": ["1.125rem", { lineHeight: "1.7" }],
        "body-sm": ["0.875rem", { lineHeight: "1.6" }],
        caption: ["0.75rem", { lineHeight: "1.5" }],
      },
      spacing: {
        section: "5rem",
        "section-sm": "3rem",
      },
      maxWidth: {
        content: "72rem",
        prose: "56rem",
        narrow: "48rem",
      },
    },
  },
  plugins: [],
};
