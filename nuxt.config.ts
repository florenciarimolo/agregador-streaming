import { defineNuxtConfig } from 'nuxt/config';
import { localStoragePolyfillPlugin } from './vite.localStoragePlugin';

// Mock localStorage for SSR before any modules load
// This is critical for local development where vite-node processes modules
// We check for getItem to ensure localStorage is fully functional
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
  // Disable devtools in development for faster load times
  devtools: {
    enabled: false,
  },

  typescript: {
    typeCheck: false, // Disable during dev for faster startup (use npm run typecheck instead)
  },

  modules: ['@pinia/nuxt', '@nuxtjs/supabase', '@nuxtjs/tailwindcss'],

  supabase: {
    redirectOptions: {
      login: '/', // Redirect to home instead of /login
      callback: '/auth/callback',
      exclude: ['/'], // Homepage is public
    },
  },

  vite: {
    plugins: [localStoragePolyfillPlugin()],
    // Optimize development build
    optimizeDeps: {
      include: ['vue', 'vue-router', 'pinia', '@supabase/supabase-js'],
    },
    // Faster development builds
    build: {
      sourcemap: false,
    },
    // Enable esbuild for faster transpilation
    esbuild: {
      target: 'esnext',
    },
  },

  css: ['./assets/css/main.css'],

  runtimeConfig: {
    tmdbApiKey: process.env.NUXT_TMDB_API_KEY || '',
    public: {
      tmdbBaseUrl: process.env.NUXT_TMDB_BASE_URL || '',
      supabaseUrl: process.env.NUXT_PUBLIC_SUPABASE_URL || '',
      supabaseAnonKey: process.env.NUXT_PUBLIC_SUPABASE_ANON_KEY || '',
      baseUrl: process.env.NUXT_PUBLIC_BASE_URL || 'http://localhost:3000',
    },
  },

  // Add compatibility date to avoid warnings
  compatibilityDate: '2024-04-03',

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
        { property: 'og:image', content: '/logo-banner.png' },
        {
          property: 'og:description',
          content:
            'Descubre y explora películas y series de televisión. Encuentra dónde ver tu contenido favorito en diferentes plataformas de streaming.',
        },
        // Twitter
        { name: 'twitter:card', content: 'summary_large_image' },
        { name: 'twitter:site', content: '@upnext' },
        { name: 'twitter:image', content: '/logo-banner.png' },
      ],
      link: [
        { rel: 'icon', type: 'image/png', href: '/favicon.png' },
        { rel: 'apple-touch-icon', href: '/favicon.png' },
        // Preload critical fonts for faster initial render
        {
          rel: 'preload',
          href: '/fonts/Outfit-Regular.ttf',
          as: 'font',
          type: 'font/ttf',
          crossorigin: 'anonymous',
        },
        {
          rel: 'preload',
          href: '/fonts/SpaceGrotesk-Bold.ttf',
          as: 'font',
          type: 'font/ttf',
          crossorigin: 'anonymous',
        },
      ],
    },
  },
});
