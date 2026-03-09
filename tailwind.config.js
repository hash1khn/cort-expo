/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",     // Expo Router screens & layouts
    "./src/**/*.{js,jsx,ts,tsx}",     // Your feature-based architecture
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary: "#FF5A00",

        background: "#0d0c12",
        sheet: '#1F1F1D',
        surface: {

          background: '#1c1c1e',
          light: "#3D3D3F",
        },

        segmented: "#5b5a60",

        text: {
          primary: "#ffffff",
          muted: "#8b8a8f",
        },

        border: {
          more: "#4a4a4c",
          surface: "#2e2e2f",
          background: "#080808",
        },
      },
    },
  },
  plugins: [],
};
