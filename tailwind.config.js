/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: {
          50: "#faf5ff",
          100: "#f3e8ff",
          200: "#e9d5ff",
          300: "#d8b4fe",
          400: "#c084fc",
          500: "#a855f7",
          600: "#9333ea",
          700: "#7e22ce",
          800: "#6b21a8",
          900: "#581c87",
        },
        accent: {
          50: "#fef3c7",
          100: "#fde68a",
          200: "#fcd34d",
          300: "#fbbf24",
          400: "#f59e0b",
          500: "#d97706",
          600: "#b45309",
          700: "#92400e",
          800: "#78350f",
          900: "#451a03",
        },
        game: {
          red: "#ef4444",
          blue: "#3b82f6",
          green: "#10b981",
          yellow: "#fbbf24",
          purple: "#a855f7",
          orange: "#fb923c",
          pink: "#ec4899",
          teal: "#14b8a6",
        },
        dice: {
          white: "#fafafa",
          black: "#18181b",
        },
      },
      fontFamily: {
        game: ["Fredoka", "Comic Sans MS", "cursive"],
      },
      animation: {
        "bounce-slow": "bounce 2s infinite",
        wiggle: "wiggle 1s ease-in-out infinite",
        roll: "roll 0.5s ease-in-out",
        float: "float 3s ease-in-out infinite",
        "pulse-slow": "pulse 3s infinite",
      },
      keyframes: {
        wiggle: {
          "0%, 100%": { transform: "rotate(-3deg)" },
          "50%": { transform: "rotate(3deg)" },
        },
        roll: {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-10px)" },
        },
      },
      boxShadow: {
        game: "0 4px 14px 0 rgba(168, 85, 247, 0.3)",
        "game-hover": "0 8px 20px 0 rgba(168, 85, 247, 0.4)",
        dice: "0 2px 8px 0 rgba(0, 0, 0, 0.2)",
      },
      backgroundImage: {
        "game-pattern":
          'url(\'data:image/svg+xml,%3Csvg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="%239333ea" fill-opacity="0.03"%3E%3Cpath d="M0 38.59l2.83-2.83 1.41 1.41L1.41 40H0v-1.41zM0 1.4l2.83 2.83 1.41-1.41L1.41 0H0v1.41zM38.59 40l-2.83-2.83 1.41-1.41L40 38.59V40h-1.41zM40 1.41l-2.83 2.83-1.41-1.41L38.59 0H40v1.41zM20 18.6l2.83-2.83 1.41 1.41L21.41 20l2.83 2.83-1.41 1.41L20 21.41l-2.83 2.83-1.41-1.41L18.59 20l-2.83-2.83 1.41-1.41L20 18.59z"%3E%3C/path%3E%3C/g%3E%3C/svg%3E\')',
      },
    },
  },
  plugins: [],
};
