/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}"],
  theme: {
    extend: {
      colors: {
        brand: {
          blue: "#1863DC",
          green: "#5A822B",
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
