/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}"],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: "#C4704B",
          "primary-dark": "#A85D3D",
          accent: "#D4A853",
          "accent-dark": "#B8923F",
          cream: "#FDF6EC",
        },
      },
      fontFamily: {
        heading: ["Bitter", "serif"],
        body: ["Fira Sans Condensed", "sans-serif"],
        handwritten: ["Caveat", "cursive"],
        ui: ["Raleway", "sans-serif"],
      },
    },
  },
  plugins: [],
};
