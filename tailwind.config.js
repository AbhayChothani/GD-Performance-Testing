/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        spreadsheet: {
          header: '#B7E1CD', // Exact header color from Book.xlsx
          green: '#38761D',  // Exact 90-100 green from Book.xlsx
          yellow: '#FFFF00', // Exact 50-89 yellow from Book.xlsx
          red: '#FF0000',    // Exact 0-49 red from Book.xlsx
          border: '#D1D5DB',
        }
      }
    },
  },
  plugins: [],
};
