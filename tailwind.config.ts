import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        accent: {
          DEFAULT: "#fa6715",
          50: "#fef3ed",
          100: "#fde4d6",
          200: "#fbc5ad",
          300: "#f89a79",
          400: "#f46a45",
          500: "#fa6715",
          600: "#e85a0c",
          700: "#c1470c",
          800: "#9a3911",
          900: "#7c3111",
        },
      },
    },
  },
  plugins: [],
};
export default config;


