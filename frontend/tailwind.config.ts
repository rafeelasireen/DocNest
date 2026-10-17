/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "#FDFCF8",
        primary: {
          DEFAULT: "#064E3B",
          foreground: "#FFFFFF",
        },
        score: {
          high: "#16A34A",
          mid: "#EA580C",
          low: "#DC2626",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
