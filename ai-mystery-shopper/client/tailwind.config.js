/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        surface: {
          950: "#09090b",
          925: "#0f0f13",
          900: "#111118",
        },
      },
      boxShadow: {
        card: "0 10px 30px rgba(0,0,0,0.35)",
      },
      backgroundImage: {
        "sentinel-grid":
          "linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)",
      },
    },
  },
  plugins: [],
};
