/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  darkMode: "class", // включишь тёмную тему, добавив на <html> или <body> класс "dark"
  theme: {
    extend: {
      colors: {
        // главный брендовый цвет строим из CSS-переменной (см. index.css)
        primary: "rgb(var(--color-primary) / <alpha-value>)",
      },
      borderRadius: {
        xl: "var(--radius-xl)",
        "2xl": "1.25rem",
        "3xl": "1.5rem",
      },
      boxShadow: {
        xl: "0 20px 45px -15px rgba(15, 23, 42, 0.25)", // глубокая мягкая тень
      },
      fontFamily: {
        sans: [
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "Noto Sans",
          "Apple Color Emoji",
          "Segoe UI Emoji",
          "Segoe UI Symbol",
          "Noto Color Emoji",
        ],
      },
      container: {
        center: true,
        padding: "1rem",
        screens: {
          sm: "640px",
          md: "768px",
          lg: "1024px",
          xl: "1280px",
          "2xl": "1320px",
        },
      },
    },
  },
  // без плагинов — чтобы ничего дополнительно не ставить
  plugins: [],
};
