/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
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
        background: {
          DEFAULT: '#011627',
          dark: '#011627',
          light: '#ffffff',
        },
      },
      backgroundColor: {
        dark: '#011627',
        light: '#ffffff',
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
};
