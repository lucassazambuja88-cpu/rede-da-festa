/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        base: {
          950: "#121212",
          900: "#18181c",
          800: "#202028",
          700: "#2b2b36",
        },
        accent: {
          purple: "#8e44ad",
          pink: "#ff0066",
          blue: "#7dd3fc",
        },
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(255,255,255,0.04), 0 10px 30px rgba(142,68,173,0.25)",
      },
      borderRadius: {
        xl2: "1.25rem",
      },
    },
  },
  plugins: [],
};

