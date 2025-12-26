import { defineNuxtConfig } from 'nuxt/config';
import { localStoragePolyfillPlugin } from './vite.localStoragePlugin';

// Mock localStorage for SSR before any modules load
// Note: Node.js 25 may show a warning about --localstorage-file, but it's harmless
// since we're using a polyfill. The warning is suppressed via NODE_OPTIONS in package.json
// This is critical for local development where vite-node processes modules
// Node.js 25+ has a broken localStorage, so we need to check for getItem too
const needsPolyfill =
  typeof globalThis.localStorage === 'undefined' ||
  typeof globalThis.localStorage.getItem !== 'function';

if (needsPolyfill) {
  const storage: Record<string, string> = {};
  globalThis.localStorage = {
    getItem: (key: string) => storage[key] || null,
    setItem: (key: string, value: string) => {
      storage[key] = value;
    },
    removeItem: (key: string) => {
      delete storage[key];
    },
    clear: () => {
      Object.keys(storage).forEach((k) => delete storage[k]);
    },
    get length() {
      return Object.keys(storage).length;
    },
    key: (index: number) => Object.keys(storage)[index] || null,
  } as Storage;
}

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-12-23',
  devtools: { enabled: true },
  modules: ['@pinia/nuxt'],
  vite: {
    plugins: [localStoragePolyfillPlugin()],
    ssr: {
      noExternal: [],
    },
  },
  css: ['./assets/css/main.css'],
  postcss: {
    plugins: {
      '@tailwindcss/postcss': {},
    },
  },
  runtimeConfig: {
    tmdbApiKey: process.env.NUXT_TMDB_API_KEY || '',
    public: {
      tmdbBaseUrl: process.env.NUXT_TMDB_BASE_URL || '',
    },
  },
  app: {
    head: {
      title: 'UpNext',
      titleTemplate: '%s | UpNext',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        {
          name: 'description',
          content:
            'Descubre y explora películas y series de televisión. Encuentra dónde ver tu contenido favorito en diferentes plataformas de streaming.',
        },
        // Open Graph / Facebook
        { property: 'og:type', content: 'website' },
        { property: 'og:site_name', content: 'UpNext' },
        {
          property: 'og:description',
          content:
            'Descubre y explora películas y series de televisión. Encuentra dónde ver tu contenido favorito en diferentes plataformas de streaming.',
        },
        // Twitter
        { name: 'twitter:card', content: 'summary_large_image' },
        { name: 'twitter:site', content: '@upnext' },
      ],
      link: [
        { rel: 'icon', type: 'image/png', href: '/logo.png' },
        { rel: 'alternate icon', type: 'image/x-icon', href: '/favicon.ico' },
        // Preload Outfit fonts (body)
        {
          rel: 'preload',
          as: 'font',
          type: 'font/ttf',
          href: '/fonts/Outfit-Regular.ttf',
          crossorigin: 'anonymous',
        },
        {
          rel: 'preload',
          as: 'font',
          type: 'font/ttf',
          href: '/fonts/Outfit-SemiBold.ttf',
          crossorigin: 'anonymous',
        },
        // Preload Space Grotesk fonts (headings)
        {
          rel: 'preload',
          as: 'font',
          type: 'font/ttf',
          href: '/fonts/SpaceGrotesk-Regular.ttf',
          crossorigin: 'anonymous',
        },
        {
          rel: 'preload',
          as: 'font',
          type: 'font/ttf',
          href: '/fonts/SpaceGrotesk-SemiBold.ttf',
          crossorigin: 'anonymous',
        },
      ],
    },
  },
  // Los aliases se manejan automáticamente por Nuxt
});
