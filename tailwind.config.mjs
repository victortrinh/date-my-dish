/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        brand: {
          // Wine Burgundy (primary)
          wine: "#7B2D3B", // Decorative, backgrounds, large text — 9.21:1 on white (AAA)
          "wine-text": "#7B2D3B", // Body text on light backgrounds — same value, passes AAA
          "wine-dark": "#C4697A", // Dark mode primary — lighter rose for contrast on dark bg

          // Rose Gold (accent)
          rose: "#D4A08A", // Decorative only in light mode (2.28:1 — fails WCAG). Safe for text in dark mode.
          "rose-text": "#8B5A45", // Light mode text variant — 5.76:1 on white (AA)
          "rose-dark": "#B8896E", // Hover states in light mode
        },
        warm: {
          50: "#FBF8F7", // Light bg
          100: "#F3EEEB", // Section alt bg
          200: "#E4DBD8", // Borders, dividers
          300: "#CBC0BD", // Muted borders
          400: "#A19491", // Muted text, icons
          500: "#786A68", // Secondary text
          600: "#584C4B", // Body text secondary
          700: "#433739", // Dark borders
          800: "#2D2226", // Body text primary / dark mode card bg
          900: "#1F1A1C", // Dark mode section alt
          950: "#1A1215", // Dark mode body bg
        },
      },
      fontFamily: {
        // font-heading: section titles, recipe titles, card headings (mixed-case, editorial serif)
        heading: ['"Playfair Display"', "serif"],
        // font-body: article prose, descriptions, body text
        body: ['"Source Serif 4"', "serif"],
        // font-handwritten: logo, decorative accents (Caveat)
        handwritten: ["Caveat", "cursive"],
        // font-ui: buttons, labels, nav links, metadata (clean sans-serif)
        ui: ["Inter", "sans-serif"],
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
