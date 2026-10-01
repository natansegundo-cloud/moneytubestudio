/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Geist", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["Geist Mono", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      colors: {
        ink: "#11110f",
        paper: "#f2f0e9",
        ember: "#d59a68",
      },
      boxShadow: {
        quiet: "0 20px 45px -30px rgba(0, 0, 0, 0.7)",
      },
    },
  },
  plugins: [],
};
