/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        primary: "rgb(var(--color-primary) / <alpha-value>)",
      },
      borderRadius: {
        xl: "var(--radius-xl)",
        "2xl": "1.25rem",
        "3xl": "1.75rem",
      },
      boxShadow: {
        xl: "0 24px 60px -30px rgba(2, 6, 23, .45)",
        glow: "0 0 0 1px rgba(255,255,255,.06), 0 10px 30px -10px rgba(59,130,246,.45)",
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
        screens: { sm: "640px", md: "768px", lg: "1024px", xl: "1280px", "2xl": "1320px" },
      },
      keyframes: {
        aurora: {
          "0%": { transform: "translateX(-20%)" },
          "50%": { transform: "translateX(20%)" },
          "100%": { transform: "translateX(-20%)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-10px)" },
        },
        fadeup: {
          "0%": { opacity: 0, transform: "translateY(12px)" },
          "100%": { opacity: 1, transform: "translateY(0)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "0% 50%" },
          "100%": { backgroundPosition: "200% 50%" },
        },
      },
      animation: {
        aurora: "aurora 16s ease-in-out infinite",
        float: "float 6s ease-in-out infinite",
        fadeup: "fadeup .5s ease-out forwards",
        shimmer: "shimmer 2.8s linear infinite",
      },
      backgroundImage: {
        grid:
          "radial-gradient(circle at 1px 1px, rgba(148,163,184,.18) 1px, transparent 0)",
      },
      backgroundSize: {
        grid: "22px 22px",
      },
      dropShadow: {
        brand: "0 8px 24px rgba(59,130,246,.45)",
      },
    },
  },
  plugins: [],
};
