/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#C4EA57',       // Hijau Limau
        secondary: '#204B2D',     // Hijau Tua
        alternative: '#4E7212',   // Hijau Zaitun
        surface: '#F5FEFB',       // Background utama
        grayText: '#6E726E',
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'sans-serif'],
      }
    },
  },
  plugins: [],
}