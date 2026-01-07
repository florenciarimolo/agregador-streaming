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
      fontFamily: {
        sans: [
          'Inter',
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'sans-serif',
        ],
        heading: [
          'Satoshi',
          'Inter',
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'sans-serif',
        ],
        body: [
          'Inter',
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'sans-serif',
        ],
      },
      fontSize: {
        // Semantic typography tokens - DO NOT use direct sizes (text-xl, text-sm) for critical typography
        // Use these semantic tokens instead: text-hero, text-h1, text-h2, text-subtitle, text-body, text-label
        // IMPORTANT: 'hero' is ONLY for the main Hero H1. No other section should use this size.
        hero: [
          'clamp(2.5rem, 8vw, 6rem)',
          { lineHeight: '1.1', letterSpacing: '-0.03em' },
        ], // Responsive: 56px-96px - Hero title (LANDING ONLY) - MUY GRANDE para imponer
        h1: ['1.25rem', { lineHeight: '1.2', letterSpacing: '-0.02em' }], // 36px - Page titles (non-hero)
        h2: [
          'clamp(1.25rem, 4vw, 1.65rem)',
          { lineHeight: '1.25', letterSpacing: '-0.01em' },
        ], // Responsive: 20px 26.4px - Section titles (AUMENTADO para mejor jerarquía)
        h3: ['1.15rem', { lineHeight: '1.3', letterSpacing: '0' }], // 17.25px - Subsection titles
        subtitle: ['1.05rem', { lineHeight: '1.5', letterSpacing: '0' }], // 16.8px - Supporting text (increased from 18px)
        body: ['1rem', { lineHeight: '1.6', letterSpacing: '0' }], // 16px - Body text
        label: ['0.75rem', { lineHeight: '1.4', letterSpacing: '0.12em' }], // 12px - UI labels (uppercase)
        overline: ['0.75rem', { lineHeight: '1', letterSpacing: '0.12em' }], // 12px - Section overlines (uppercase)
      },
      letterSpacing: {
        overline: '0.12em', // For section labels and UI labels
      },
      fontWeight: {
        heading: '600', // For H1, H2, H3
        body: '400', // For body text
        label: '500', // For labels and overlines
      },
      colors: {
        primary: {
          DEFAULT: '#21186E',
          50: '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
          800: '#3730a3',
          900: '#312e81',
        },
        secondary: {
          DEFAULT: '#f97316',
          50: '#fff7ed',
          100: '#ffedd5',
          200: '#fed7aa',
          300: '#fdba74',
          400: '#fb923c',
          500: '#f97316',
          600: '#ea580c',
          700: '#c2410c',
          800: '#9a3412',
          900: '#7c2d12',
        },
        accent: {
          DEFAULT: '#8b5cf6',
          50: '#faf5ff',
          100: '#f3e8ff',
          200: '#e9d5ff',
          300: '#d8b4fe',
          400: '#c084fc',
          500: '#a855f7',
          600: '#9333ea',
          700: '#7e22ce',
          800: '#6b21a8',
          900: '#581c87',
        },
        pink: {
          DEFAULT: '#ec4899',
          50: '#fdf2f8',
          100: '#fce7f3',
          200: '#fbcfe8',
          300: '#f9a8d4',
          400: '#f472b6',
          500: '#ec4899',
          600: '#db2777',
          700: '#be185d',
          800: '#9f1239',
          900: '#831843',
        },
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
      spacing: {
        // Tokens semánticos para el sistema de spacing mobile-first
        'section-gap-mobile': '2rem', // space-y-8
        'section-gap-desktop': '3rem', // md:space-y-12
        'title-gap-mobile': '0.75rem', // mb-3
        'title-gap-desktop': '1rem', // md:mb-4
      },
    },
  },
  plugins: [],
};
