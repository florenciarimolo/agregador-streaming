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
 *
 * CRITICAL: Always returns URL without trailing slash to prevent double slashes (//)
 * when concatenating with paths that start with /
 */
function getSiteUrl(): string {
  let url: string;

  // Use existing NUXT_PUBLIC_BASE_URL if defined
  if (process.env.NUXT_PUBLIC_BASE_URL) {
    url = process.env.NUXT_PUBLIC_BASE_URL;
  }
  // Fallback to VERCEL_URL if available
  else if (process.env.VERCEL_URL) {
    url = `https://${process.env.VERCEL_URL}`;
  }
  // Fallback to VERCEL_ENV
  else if (process.env.VERCEL_ENV === 'production') {
    url = 'https://getupnext.io';
  } else if (process.env.VERCEL_ENV === 'preview') {
    url = 'https://up-next-dev.vercel.app';
  }
  // Default to localhost
  else {
    url = 'http://localhost:3000';
  }

  // CRITICAL: Remove trailing slash to prevent // when concatenating with paths
  // Example: baseUrl = "http://127.0.0.1:3000/" + "/es" = "http://127.0.0.1:3000//es" ❌
  // Correct: baseUrl = "http://127.0.0.1:3000" + "/es" = "http://127.0.0.1:3000/es" ✅
  return url.replace(/\/$/, '');
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
    // @pinia/nuxt removed - Pinia is now registered client-side only via plugins/pinia.client.ts
    // This prevents SSR serialization errors on error pages (404/500)
    '@nuxtjs/supabase',
    '@nuxtjs/tailwindcss',
    '@nuxtjs/i18n',
    '@nuxtjs/sitemap',
  ],

  supabase: {
    redirect: false, // Disable automatic redirects - we handle them manually in callback.vue, authform.vue, and middleware
    redirectOptions: {
      login: '/', // Redirect to home instead of /login (will be handled with language prefix by legacy-redirect middleware)
      callback: '/auth/callback', // Will be handled dynamically with language prefix in useAuth.ts
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
    resendApiKey: process.env.RESEND_API_KEY || '',
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
        code: 'es',
        iso: 'es-ES',
        name: 'Español',
        file: 'es-ES.json',
      },
      {
        code: 'ca',
        iso: 'ca-ES',
        name: 'Català',
        file: 'ca-ES.json',
      },
      {
        code: 'eu',
        iso: 'eu-ES',
        name: 'Euskera',
        file: 'eu-ES.json',
      },
      {
        code: 'gl',
        iso: 'gl-ES',
        name: 'Galego',
        file: 'gl-ES.json',
      },
      {
        code: 'en',
        iso: 'en-US',
        name: 'English (US)',
        file: 'en-US.json',
      },
      {
        code: 'en-gb',
        iso: 'en-GB',
        name: 'English (GB)',
        file: 'en-GB.json',
      },
    ],
    defaultLocale: 'en',
    strategy: 'prefix',
    vueI18n: 'i18n/i18n.config.ts',
    detectBrowserLanguage: false, // Disabled - we handle / redirect manually in legacy-redirect middleware
    rootRedirect: null, // Disabled - we handle / redirect manually in legacy-redirect middleware
    skipSettingLocaleOnNavigate: false, // Enable automatic locale sync from URL - the middleware ensures it matches
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
        // Note: twitter:image is updated dynamically in app.vue based on language
        // This is a fallback for default language (en)
        // CRITICAL: Twitter cards require absolute URLs, not relative paths
        { name: 'twitter:card', content: 'summary_large_image' },
        { name: 'twitter:site', content: '@upnext' },
        {
          name: 'twitter:image',
          content: `${getSiteUrl()}/twitter-cards/en-twitter-card.jpg`,
        },
      ],
      link: [
        { rel: 'icon', type: 'image/png', href: '/favicon.png' },
        { rel: 'apple-touch-icon', href: '/favicon.png' },
      ],
    },
  },

  sitemap: {
    // @nuxtjs/sitemap v7 uses urls() - this is the correct API
    // The sitemap will be served at /sitemap.xml
    // CRITICAL: siteUrl must be set explicitly and must NOT have trailing slash
    // This prevents double slashes (//) when concatenating with loc paths
    siteUrl: getSiteUrl(),
    exclude: [
      '/:lang/auth/**',
      '/:lang/auth/callback',
      '/:lang/onboarding',
      '/:lang/my-account',
      '/:lang/preferences',
      '/:lang/watchlist',
      '/:lang/lists',
      '/api/**',
    ],
    urls: async () => {
      const {
        getTitleIdsForSitemap,
        getDiscoverListsForSitemap,
        getSeasonsForSitemap,
      } = await import('./server/utils/sitemap');

      // Supported languages with URL codes
      const supportedLanguages = [
        { urlCode: 'es', i18nCode: 'es-ES' },
        { urlCode: 'ca', i18nCode: 'ca-ES' },
        { urlCode: 'eu', i18nCode: 'eu-ES' },
        { urlCode: 'gl', i18nCode: 'gl-ES' },
        { urlCode: 'en', i18nCode: 'en-US' },
        { urlCode: 'en-gb', i18nCode: 'en-GB' },
      ];

      // Define static routes (without language prefix - will be added per language)
      const staticRoutes = [
        '/',
        '/how-it-works',
        '/faq',
        '/privacy',
        '/discover',
      ];

      // Fetch data
      const titles = await getTitleIdsForSitemap();
      const discoverLists = await getDiscoverListsForSitemap();
      const seasons = await getSeasonsForSitemap();

      const urls: Array<{ loc: string; lastmod: string }> = [];

      // Generate routes for each language
      for (const lang of supportedLanguages) {
        // Static routes per language
        for (const staticRoute of staticRoutes) {
          urls.push({
            loc: `/${lang.urlCode}${staticRoute}`,
            lastmod: new Date().toISOString(),
          });
        }

        // Dynamic routes for Discover lists per language
        for (const list of discoverLists) {
          if (list.updated_at) {
            urls.push({
              loc: `/${lang.urlCode}/discover/list/${list.slug}`,
              lastmod: new Date(list.updated_at).toISOString(),
            });
          }
        }

        // Dynamic routes for movies per language
        // Filter movies and sort by tmdb_id for stable order (DX improvement, not SEO)
        const movies = titles
          .filter((t) => t.type === 'movie')
          .sort((a, b) => a.tmdb_id - b.tmdb_id);
        for (const movie of movies) {
          urls.push({
            loc: `/${lang.urlCode}/movie/${movie.tmdb_id}`,
            // updated_at is NOT NULL in schema, so it's always present
            lastmod: new Date(movie.updated_at).toISOString(),
          });
        }

        // Dynamic routes for TV shows per language
        // Filter TV shows and sort by tmdb_id for stable order (DX improvement, not SEO)
        const tvShows = titles
          .filter((t) => t.type === 'tv')
          .sort((a, b) => a.tmdb_id - b.tmdb_id);
        for (const tvShow of tvShows) {
          urls.push({
            loc: `/${lang.urlCode}/tv-show/${tvShow.tmdb_id}`,
            // updated_at is NOT NULL in schema, so it's always present
            lastmod: new Date(tvShow.updated_at).toISOString(),
          });
        }

        // Dynamic routes for seasons per language
        // Sort by tv_tmdb_id and season_number for stable order (DX improvement, not SEO)
        const sortedSeasons = [...seasons].sort((a, b) => {
          if (a.tv_tmdb_id !== b.tv_tmdb_id) {
            return a.tv_tmdb_id - b.tv_tmdb_id;
          }
          return a.season_number - b.season_number;
        });
        for (const season of sortedSeasons) {
          urls.push({
            loc: `/${lang.urlCode}/tv-show/${season.tv_tmdb_id}/season/${season.season_number}`,
            // updated_at is NOT NULL in schema, so it's always present
            lastmod: new Date(season.updated_at).toISOString(),
          });
        }
      }

      if (urls.length === 0) {
        console.error('[Sitemap] ERROR: No URLs generated!');
      }

      return urls;
    },
  },
});
