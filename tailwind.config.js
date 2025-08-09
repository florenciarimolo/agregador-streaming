/** @type {import('tailwindcss').Config} */
import colors from 'tailwindcss/colors'
export default {
  content: [
    './components/**/*.{vue,js,ts,jsx,tsx}',
    './layouts/**/*.vue',
    './pages/**/*.vue',
    './app.vue',
    './error.vue',
  ],
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: '#2731f5' },
        secondary: { DEFAULT: '#646cff' },
        background: { DEFAULT: '#011627' },
      },
    },
  },
  plugins: [],
};
