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
        background: "var(--background)",
        surface: "var(--surface)",
        "surface-2": "var(--surface-2)",
        border: "var(--border)",
        "text-primary": "var(--text-primary)",
        "text-secondary": "var(--text-secondary)",
        "text-tertiary": "var(--text-tertiary)",
        "pink-primary": "var(--pink-primary)",
        "pink-soft": "var(--pink-soft)",
        "pink-muted": "var(--pink-muted)",
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
