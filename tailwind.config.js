/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "sans-serif"],
      },
      colors: {
        green: {
          50: "#f0fdf4",
          100: "#dcfce7",
          500: "#22C55E",
          600: "#16a34a",
        },
      },
    },
  },
  plugins: [],
}

