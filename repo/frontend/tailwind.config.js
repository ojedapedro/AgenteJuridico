/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Paleta de colores jurídicos premium (Azules oscuros, dorados y grises)
        court: {
          950: '#0B132B',
          900: '#1C2541',
          800: '#3A506B',
          600: '#5BC0BE',
          400: '#6FFFE9',
          gold: '#C5A880',
          'gold-light': '#E5D5C0',
        }
      },
      fontFamily: {
        serif: ['Merriweather', 'serif'],
        sans: ['Inter', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
