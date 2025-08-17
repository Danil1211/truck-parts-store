/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: { primary: "rgb(var(--color-primary) / <alpha-value>)" },
      borderRadius: { xl: "16px", "2xl": "20px", "3xl": "28px" },
      boxShadow: { glow: "0 10px 30px -10px rgba(59,130,246,.45)" },
    },
  },
  plugins: [],
};
