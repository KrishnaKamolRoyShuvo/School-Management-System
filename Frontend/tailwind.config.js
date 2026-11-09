/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["'Source Sans 3'", "'Anek Bangla'", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["'Roboto Mono'", "monospace"],
      },
      colors: {
        brand: {
          DEFAULT: "#0F52BA",
          dark: "#0A3D8F",
          navy: "#071938",
          light: "#EBF3FD",
        },
        primary: "#0F52BA",
      },
      borderRadius: {
        sm: "0.25rem",
      }
    },
  },
  plugins: [],
};
