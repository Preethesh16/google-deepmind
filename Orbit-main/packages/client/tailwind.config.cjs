/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        orbit: {
          bg: '#08080C',
          card: 'rgba(15, 15, 22, 0.65)',
          border: 'rgba(255, 255, 255, 0.08)',
          cyan: '#00F2FE',
          purple: '#4FACFE',
          active: '#10B981',
          warning: '#F59E0B'
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
