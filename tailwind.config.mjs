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
          "primary-text": "#9A5439", // Darker terracotta for small text — WCAG AA on cream/white
          accent: "#D4A853",
          "accent-dark": "#B8923F", // Legacy — avoid for text, fails WCAG
          "accent-text": "#7D631C", // Gold text on light backgrounds — WCAG AA (5.72:1)
          cream: "#FDF6EC", // Legacy — kept for reference only
          "cream-dark": "#F5EDDF", // Legacy — kept for reference only
        },
      },
      fontFamily: {
        display: ['"Fraunces"', "serif"],
        heading: ['"Fira Sans"', "sans-serif"],
        body: ["Bitter", "serif"],
        handwritten: ["Caveat", "cursive"],
        ui: ['"Fira Sans"', "sans-serif"],
      },
      fontSize: {
        "display-xl": [
          "clamp(3rem, 6vw + 1rem, 6rem)",
          { lineHeight: "1.05", letterSpacing: "-0.02em" },
        ],
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
