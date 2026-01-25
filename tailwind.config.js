/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",     // Expo Router screens & layouts
    "./src/**/*.{js,jsx,ts,tsx}",     // Your feature-based architecture
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {},
  },
  plugins: [],
};
