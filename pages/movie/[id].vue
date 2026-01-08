<template>
  <AppShell>
    <PageContainer>
      <div class="w-full pt-0 pb-6 lg:pt-6">
        <!-- Loading state -->
        <div
          v-if="isLoading"
          class="flex items-center justify-center min-h-[80dvh]"
        >
          <div class="text-xl dark:text-gray-300 text-gray-800">{{
            $t('common.loading')
          }}</div>
        </div>

        <!-- Error state -->
        <div
          v-else-if="hasError"
          class="flex items-center justify-center min-h-[80dvh]"
        >
          <div class="w-full max-w-2xl px-4">
            <Alert
              variant="error"
              :message="$t('media.errorLoadingMovie')"
              :show-icon="true"
            />
          </div>
        </div>

        <!-- Content -->
        <MediaBannerDetail
          v-else
          :media="movieWithProviders as unknown as Media"
          :media-type="MEDIA_TYPE.MOVIE"
          :in-production="false"
          :in-theaters="isInTheaters"
        />
      </div>
    </PageContainer>
  </AppShell>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useFetch, useSeoMeta, useHead } from 'nuxt/app';
import { useRouteWithLang } from '@/composables/useRouteWithLang';
import type { Movie } from '@/types/Movie';
import { WatchProviderTypes } from '@/types/WatchProvider';
import MediaBannerDetail from '@/components/MediaBannerDetail.vue';
import { MEDIA_TYPE } from '@/constants/domain/mediaType';
import type { Media } from '@/types/Media';
import type { AlternativeTitlesResponse } from '@/types/AlternativeTitle';
import { isMovieInTheaters } from '@/utils/movieStatus';
import { useMovieSchema } from '@/composables/useSchemaOrg';
import { getMovieSeoExperience } from '@/composables/useSeoExperience';
import AppShell from '@/components/layout/AppShell.vue';
import PageContainer from '@/components/layout/PageContainer.vue';
import Alert from '@/components/ui/Alert.vue';

const route = useRoute();
const movieId = route.params.id as string;
const { locale } = useI18n();
const { lang } = useRouteWithLang();

// Get current language URL code for API calls
const currentLangUrlCode = computed(() => lang.value);

// Fetch movie details
const {
  data: movieDetails,
  pending: moviePending,
  error: movieError,
  refresh: refreshMovieDetails,
} = await useFetch(`/api/tmdb/movies/${movieId}`, {
  query: { lang: currentLangUrlCode },
});

// Fetch providers
const {
  data: providersData,
  pending: providersPending,
  error: providersError,
  refresh: refreshProviders,
} = await useFetch(`/api/tmdb/movies/${movieId}/providers`, {
  query: { lang: currentLangUrlCode },
});

// Fetch alternative titles
const {
  data: alternativeTitlesData,
  pending: alternativeTitlesPending,
  error: alternativeTitlesError,
  refresh: refreshAlternativeTitles,
} = await useFetch(`/api/tmdb/movies/${movieId}/alternative-titles`, {
  query: { lang: currentLangUrlCode },
});

// Watch for locale changes and refresh all data
watch(
  () => locale.value,
  async (newLocale, oldLocale) => {
    if (newLocale && oldLocale && newLocale !== oldLocale) {
      if (import.meta.dev) {
        console.log(
          '[movie/[id].vue] Language changed, refreshing movie data:',
          {
            oldLocale,
            newLocale,
          }
        );
      }
      // Refresh all data with new language
      await Promise.all([
        refreshMovieDetails(),
        refreshProviders(),
        refreshAlternativeTitles(),
      ]);
    }
  },
  { immediate: false }
);

// Computed para manejar los datos
const movie = computed<Movie>(
  () => (movieDetails.value as Movie) || ({} as Movie)
);
const providers = computed<WatchProviderTypes>(
  () => (providersData.value as WatchProviderTypes) || {}
);

const alternativeTitles = computed<AlternativeTitlesResponse>(
  () =>
    (alternativeTitlesData.value as AlternativeTitlesResponse) || {
      id: 0,
      titles: [],
    }
);

const movieWithProviders = computed<Movie>(() => {
  return {
    ...movie.value,
    providers: providers.value,
    alternative_titles: alternativeTitles.value,
  };
});

// Check if movie is in theaters
const isInTheaters = computed(() => {
  return isMovieInTheaters(movie.value?.release_date);
});

const isMobile = ref(false);

// Detect mobile screen size
const checkMobile = () => {
  isMobile.value = window.innerWidth < 768;
};

// Handle resize
const handleResize = () => {
  checkMobile();
};

onMounted(() => {
  checkMobile();
  window.addEventListener('resize', handleResize);

  // Save the previous route if it exists and is from within the app
  if (import.meta.client) {
    const referrer = document.referrer;
    const currentOrigin = window.location.origin;

    // Only save if the referrer is from the same origin (within the app)
    if (referrer && referrer.startsWith(currentOrigin)) {
      try {
        const referrerPath = new URL(referrer).pathname;
        // Don't save if we're coming from another detail page (to avoid loops)
        // Check for paths with language prefix (e.g., /es/movie/, /en/tv-show/)
        const hasLangPrefix = referrerPath
          .split('/')
          .filter(Boolean)[0]
          ?.match(/^(es|ca|eu|gl|en|en-gb)$/i);
        const pathWithoutLang = hasLangPrefix
          ? '/' + referrerPath.split('/').slice(2).join('/')
          : referrerPath;

        if (
          !pathWithoutLang.startsWith('/movie/') &&
          !pathWithoutLang.startsWith('/tv-show/')
        ) {
          sessionStorage.setItem('previousRoute', referrerPath);
        }
      } catch {
        // If URL parsing fails, try to use router's previous route
        // This is a fallback
      }
    }
  }
});

onUnmounted(() => {
  window.removeEventListener('resize', handleResize);
});

// Loading state
const isLoading = computed(
  () =>
    moviePending.value ||
    providersPending.value ||
    alternativeTitlesPending.value
);

// Error state
const hasError = computed(
  () => movieError.value || providersError.value || alternativeTitlesError.value
);

// SEO: Movie page - public, indexable
const config = useRuntimeConfig();
const siteUrl = config.public.baseUrl || config.public.siteUrl;

// Meta tags dinámicos
const { t } = useI18n();

// Get SEO experience based on genre
const seoExperienceKey = computed(() => getMovieSeoExperience(movie.value));
const seoExperience = computed(() => t(seoExperienceKey.value));

const pageTitle = computed(() => {
  const title = movie.value?.title || t('media.movie');
  return `${title} – ${t('seo.moviePrefix')} ${seoExperience.value}`;
});

const pageDescription = computed(() => {
  const title = movie.value?.title || t('media.movie');
  const experience = seoExperience.value;
  return t('seo.movieDescription', { title, experience });
});

const ogImage = computed(() => {
  if (movie.value?.backdrop_path) {
    return `https://image.tmdb.org/t/p/w1280${movie.value.backdrop_path}`;
  }

  return '';
});

// SEO: hreflang and canonical
const { hreflangLinks } = useHreflang();
const { canonicalUrl: canonicalUrlFromComposable } = useCanonical();

// Schema.org JSON-LD
const movieSchema = computed(() => {
  if (!movie.value) return null;
  // Auto-imported composable
  return useMovieSchema(movie.value, siteUrl);
});

useHead({
  title: pageTitle,
  meta: [
    {
      name: 'description',
      content: pageDescription,
    },
    {
      name: 'robots',
      content: 'index, follow',
    },
  ],
  link: [
    ...hreflangLinks.value,
    {
      rel: 'canonical',
      href: canonicalUrlFromComposable,
    },
  ],
  script: movieSchema.value
    ? [
        {
          type: 'application/ld+json',
          innerHTML: JSON.stringify(movieSchema.value),
        },
      ]
    : [],
});

useSeoMeta({
  title: pageTitle,
  description: pageDescription,
  ogTitle: pageTitle,
  ogDescription: pageDescription,
  ogImage: ogImage,
  ogType: 'video.movie',
  ogUrl: canonicalUrlFromComposable,
  twitterCard: 'summary_large_image',
  twitterTitle: pageTitle,
  twitterDescription: pageDescription,
  twitterImage: ogImage,
  robots: 'index, follow',
});
</script>
<style scoped></style>
