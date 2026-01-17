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
    '@sentry/nuxt/module',
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
    sentryDsn: process.env.SENTRY_DSN || '',
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

  // Site configuration for SEO and sitemap
  // @nuxtjs/sitemap v7 uses site.url instead of sitemap.siteUrl
  site: {
    url: getSiteUrl(), // Uses NUXT_PUBLIC_BASE_URL or auto-detects environment
    name: 'UpNext',
  },

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
    rootRedirect: undefined, // Disabled - we handle / redirect manually in legacy-redirect middleware
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
            'Discover personalized movie and TV show recommendations based on your mood and attention level. Find what to watch today with smart recommendations tailored to you. Find where to watch your favorite content on different streaming platforms.',
        },
        {
          name: 'keywords',
          content:
            'movie recommendations, TV show recommendations, personalized recommendations, streaming platforms, what to watch, mood-based recommendations, attention level, Netflix, HBO, Disney Plus, Amazon Prime, streaming guide, movie finder, series finder, watch recommendations',
        },
        // Open Graph / Facebook
        { property: 'og:type', content: 'website' },
        { property: 'og:site_name', content: 'UpNext' },
        // Default og:image (fallback for default language 'en')
        // Actual og:image is set dynamically in pages/index.vue based on language
        { property: 'og:image', content: '/en-og-image.jpg' },
        {
          property: 'og:description',
          content:
            'Discover personalized movie and TV show recommendations based on your mood and attention level. Find what to watch today with smart recommendations tailored to you. Find where to watch your favorite content on different streaming platforms.',
        },
        // Twitter
        // Note: twitter:image is updated dynamically in app.vue based on language
        // This is a fallback for default language (en)
        // CRITICAL: Twitter cards require absolute URLs, not relative paths
        { name: 'twitter:card', content: 'summary_large_image' },
        { name: 'twitter:site', content: '@upnext' },
        {
          name: 'twitter:title',
          content: 'UpNext - Personalized Movie & TV Show Recommendations',
        },
        {
          name: 'twitter:description',
          content:
            'Discover personalized movie and TV show recommendations based on your mood and attention level. Find what to watch today with smart recommendations tailored to you.',
        },
        {
          name: 'twitter:image',
          content: `${getSiteUrl()}/twitter-cards/en-twitter-card.jpg`,
        },
      ],
      link: [
        // Main favicon.ico (multi-resolution: 16x16, 32x32)
        {
          rel: 'icon',
          type: 'image/x-icon',
          href: `${getSiteUrl()}/favicon.ico`,
        },
        // PNG favicons with sizes for Google SEO (multiples of 48px)
        {
          rel: 'icon',
          type: 'image/png',
          sizes: '48x48',
          href: `${getSiteUrl()}/favicon-48x48.png`,
        },
        {
          rel: 'icon',
          type: 'image/png',
          sizes: '96x96',
          href: `${getSiteUrl()}/favicon-96x96.png`,
        },
        {
          rel: 'icon',
          type: 'image/png',
          sizes: '144x144',
          href: `${getSiteUrl()}/favicon-144x144.png`,
        },
        {
          rel: 'icon',
          type: 'image/png',
          sizes: '192x192',
          href: `${getSiteUrl()}/favicon-192x192.png`,
        },
        // Main favicon.png (fallback, 192x192)
        {
          rel: 'icon',
          type: 'image/png',
          href: `${getSiteUrl()}/favicon.png`,
        },
        // Apple Touch Icon
        {
          rel: 'apple-touch-icon',
          sizes: '180x180',
          href: `${getSiteUrl()}/apple-touch-icon.png`,
        },
      ],
    },
  },

  sitemap: {
    // @nuxtjs/sitemap v7 uses urls() - this is the correct API
    // The sitemap will be served at /sitemap.xml
    // CRITICAL: site.url is set in the site config above (not here)
    // site.url must NOT have trailing slash to prevent double slashes (//)
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
        const { logError } = await import('@/server/utils/logger');
        logError(
          '[Sitemap] No URLs generated',
          new Error('Sitemap generation failed')
        );
      }

      return urls;
    },
  },

  sentry: {
    // DSN from environment variable (required)
    // CRITICAL: If DSN is empty, Sentry will initialize but won't send events
    // Only set dsn if it actually exists, otherwise let it be undefined
    dsn:
      process.env.SENTRY_DSN && process.env.SENTRY_DSN.trim() !== ''
        ? process.env.SENTRY_DSN
        : undefined,

    // Enable in production, or when SENTRY_ENABLED is explicitly set (for testing)
    // Only enable if DSN is also set
    enabled:
      (process.env.NODE_ENV === 'production' ||
        process.env.SENTRY_ENABLED === 'true') &&
      !!process.env.SENTRY_DSN &&
      process.env.SENTRY_DSN.trim() !== '',

    // Performance monitoring - sample 10% of transactions in production, 100% when testing
    tracesSampleRate:
      process.env.SENTRY_ENABLED === 'true'
        ? 1.0
        : process.env.NODE_ENV === 'production'
          ? 0.1
          : 0,

    // Disable features that are not needed
    enableLogs: false,

    sendDefaultPii: false,

    // Enable debug only when explicitly testing Sentry
    debug: process.env.SENTRY_ENABLED === 'true',

    // Disable Session Replay
    replaysSessionSampleRate: 0,

    replaysOnErrorSampleRate: 0,

    // No tunnel endpoint
    tunnel: false,

    // Sourcemaps configuration
    sourcemaps: {
      assets: process.env.NODE_ENV === 'production',
      filesToDeleteAfterUpload: '**/*.map',
    },

    // Server-side configuration
    autoInjectServerSentry: 'top-level-import',
  },

  sourcemap: {
    client: 'hidden',
    server: true,
  },
});
