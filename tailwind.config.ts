import type { Config } from "tailwindcss";

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "sans-serif",
        ],
        mono: ["SFMono-Regular", "Consolas", "Liberation Mono", "monospace"],
      },
      colors: {
        accent: {
          50: "#eefdf8",
          100: "#d6faef",
          500: "#16a37f",
          600: "#0e8067",
          700: "#0b6654",
        },
      },
      boxShadow: {
        soft: "0 18px 60px rgba(15, 23, 42, 0.08)",
      },
    },
  },
  plugins: [],
} satisfies Config;
