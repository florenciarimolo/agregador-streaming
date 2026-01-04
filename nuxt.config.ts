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

/**
 * Get site URL based on environment
 * Priority: NUXT_PUBLIC_BASE_URL > VERCEL_URL > VERCEL_ENV > localhost
 */
function getSiteUrl(): string {
  // Use existing NUXT_PUBLIC_BASE_URL if defined
  if (process.env.NUXT_PUBLIC_BASE_URL) {
    return process.env.NUXT_PUBLIC_BASE_URL;
  }
  // Fallback to VERCEL_URL if available
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  // Fallback to VERCEL_ENV
  if (process.env.VERCEL_ENV === 'production') {
    return 'https://getupnext.io';
  }
  if (process.env.VERCEL_ENV === 'preview') {
    return 'https://up-next-dev.vercel.app';
  }
  // Default to localhost
  return 'http://localhost:3000';
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

  modules: [
    '@pinia/nuxt',
    '@nuxtjs/supabase',
    '@nuxtjs/tailwindcss',
    '@nuxtjs/i18n',
    '@nuxtjs/sitemap',
  ],

  supabase: {
    redirect: false, // Disable automatic redirects - we handle them manually in callback.vue, authform.vue, and middleware
    redirectOptions: {
      login: '/', // Redirect to home instead of /login
      callback: '/auth/callback',
      exclude: ['/'], // Homepage is public
    },
    clientOptions: {
      auth: {
        autoRefreshToken: true, // Keep enabled for automatic token refresh
        persistSession: true,
        detectSessionInUrl: true,
        // Suppress refresh token errors - they're expected when tokens are invalid/expired
        flowType: 'pkce',
      },
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
      baseUrl: getSiteUrl(), // Uses NUXT_PUBLIC_BASE_URL or auto-detects environment
      // Alias for SEO and sitemap (same as baseUrl)
      siteUrl: getSiteUrl(),
    },
  },

  // Add compatibility date to avoid warnings
  compatibilityDate: '2024-04-03',

  i18n: {
    langDir: 'locales',
    locales: [
      {
        code: 'es-ES',
        iso: 'es-ES',
        name: 'Español',
        file: 'es-ES.json',
      },
      {
        code: 'ca-ES',
        iso: 'ca-ES',
        name: 'Català',
        file: 'ca-ES.json',
      },
      {
        code: 'eu-ES',
        iso: 'eu-ES',
        name: 'Euskera',
        file: 'eu-ES.json',
      },
      {
        code: 'gl-ES',
        iso: 'gl-ES',
        name: 'Galego',
        file: 'gl-ES.json',
      },
      {
        code: 'en-US',
        iso: 'en-US',
        name: 'English (US)',
        file: 'en-US.json',
      },
      {
        code: 'en-GB',
        iso: 'en-GB',
        name: 'English (GB)',
        file: 'en-GB.json',
      },
    ],
    defaultLocale: 'es-ES',
    strategy: 'no_prefix',
    vueI18n: 'i18n/i18n.config.ts',
    detectBrowserLanguage: {
      useCookie: true,
      cookieKey: 'i18n_redirected',
      redirectOn: 'root',
      alwaysRedirect: true, // Enable automatic browser language detection on first visit
      fallbackLocale: 'es-ES',
      // Map generic language codes to specific locales
      // When browser detects "en", try "en-US" first, then "en-GB"
      // This prevents warnings about missing "en" locale
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
      ],
    },
  },

  sitemap: {
    // Sitemap configuration
    // The module will use runtimeConfig.public.baseUrl automatically
    exclude: [
      '/auth/**',
      '/auth/callback',
      '/onboarding',
      '/my-account',
      '/preferences',
      '/watchlist',
      '/api/**',
    ],
    // @ts-expect-error - @nuxtjs/sitemap types may not match actual API
    routes: async () => {
      const { getTitleIdsForSitemap } = await import('./server/utils/sitemap');
      const titles = await getTitleIdsForSitemap();

      const routes: Array<{
        url: string;
        lastmod?: string;
        changefreq?: string;
        priority?: number;
      }> = [
        // Static routes
        {
          url: '/',
          changefreq: 'daily',
          priority: 1.0,
        },
        {
          url: '/how-it-works',
          changefreq: 'monthly',
          priority: 0.8,
        },
        {
          url: '/faq',
          changefreq: 'monthly',
          priority: 0.8,
        },
      ];

      // Dynamic routes for movies
      const movies = titles.filter((t) => t.type === 'movie');
      for (const movie of movies) {
        routes.push({
          url: `/movie/${movie.tmdb_id}`,
          lastmod: movie.updated_at
            ? new Date(movie.updated_at).toISOString()
            : undefined,
          changefreq: 'weekly',
          priority: 0.7,
        });
      }

      // Dynamic routes for TV shows
      const tvShows = titles.filter((t) => t.type === 'tv');
      const { getTVShowSeasons } = await import('./server/utils/sitemap');

      // Process TV shows in batches to avoid overwhelming TMDB API
      const batchSize = 10;
      for (let i = 0; i < tvShows.length; i += batchSize) {
        const batch = tvShows.slice(i, i + batchSize);
        const seasonPromises = batch.map(async (tvShow) => {
          const seasons = await getTVShowSeasons(tvShow.tmdb_id);
          return { tvShow, seasons };
        });

        const results = await Promise.all(seasonPromises);

        for (const { tvShow, seasons } of results) {
          // Add TV show route
          routes.push({
            url: `/tv-show/${tvShow.tmdb_id}`,
            lastmod: tvShow.updated_at
              ? new Date(tvShow.updated_at).toISOString()
              : undefined,
            changefreq: 'weekly',
            priority: 0.7,
          });

          // Add season routes
          for (const season of seasons) {
            routes.push({
              url: `/tv-show/${tvShow.tmdb_id}/season/${season.season_number}`,
              lastmod: tvShow.updated_at
                ? new Date(tvShow.updated_at).toISOString()
                : undefined,
              changefreq: 'weekly',
              priority: 0.6,
            });
          }
        }
      }

      return routes;
    },
  },
});
