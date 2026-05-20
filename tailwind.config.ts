import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Black & Pink Dark Mode Palette
        background: "#0A0A0A",
        surface: "#111111",
        "surface-2": "#18181B",
        border: "#27272A",
        "text-primary": "#FAFAFA",
        "text-secondary": "#A1A1AA",
        "pink-primary": "#EC4899",
        "pink-soft": "#F472B6",
        "pink-muted": "#BE185D",
        gray: {
          600: "#52525B",
          700: "#3F3F46",
        },
      },
    },
  },
  plugins: [],
};

export default config;
