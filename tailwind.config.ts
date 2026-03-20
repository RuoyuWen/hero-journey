import type { Config } from "tailwindcss";

export default {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-geist-sans)", "system-ui", "sans-serif"],
        serif: ["var(--font-literata)", "Georgia", "serif"],
      },
      colors: {
        paper: "#faf6f0",
        ink: "#1c1917",
        sage: "#6b8f71",
        blush: "#e8d5cf",
      },
    },
  },
  plugins: [],
} satisfies Config;
