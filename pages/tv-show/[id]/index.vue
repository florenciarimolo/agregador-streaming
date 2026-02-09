<template>
  <AppShell>
    <PageContainer>
      <div class="w-full pt-0 pb-6 lg:pt-6">
        <!-- Loading state: spinner + text first, then skeleton after delay -->
        <div
          v-if="isLoading && !showSkeleton"
          class="flex items-center justify-center min-h-[80dvh]"
        >
          <Spinner :message="$t('media.loadingTvShow')" />
        </div>
        <template v-else-if="showSkeleton && isLoading">
          <SkeletonMediaDetail />
        </template>

        <!-- Error state -->
        <div
          v-else-if="hasError"
          class="flex items-center justify-center min-h-[80dvh]"
        >
          <div class="w-full max-w-2xl px-4">
            <Alert
              variant="error"
              :message="$t('media.errorLoadingTvShow')"
              :show-icon="true"
            />
          </div>
        </div>

        <!-- Content -->
        <template v-else-if="!isLoading">
          <section class="pt-0 pb-6 w-full space-y-4 md:space-y-8 lg:pt-6">
            <MediaBannerDetail
              :media="tvShowWithProviders as unknown as Media"
              :media-type="MEDIA_TYPE.TV"
              :in-production="tvShowWithProviders.in_production"
            />
          </section>
          <Section>
            <div class="space-y-4">
              <div class="flex items-center gap-3">
                <h2
                  class="text-2xl font-semibold text-gray-800 md:text-3xl dark:text-gray-300 font-heading"
                >
                  {{ $t('media.seasons') }}
                </h2>
                <Badge
                  v-if="tvShowWithProviders.number_of_seasons"
                  :label="String(tvShowWithProviders.number_of_seasons)"
                  size="md"
                />
              </div>
            </div>
            <div class="flex flex-col gap-4 mt-4">
              <ListItemBase
                v-for="season in tvShowWithProviders.seasons"
                :key="season.id"
                :title="season.name"
                :poster-path="season.poster_path"
                :overview="season.overview"
                :vote-average="season.vote_average"
                :tmdb-id="season.id"
                :show-overview="true"
                :link-to="
                  routeWithLang(
                    `/tv-show/${tvShowId}/season/${season.season_number}`
                  )
                "
                :aria-label="$t('media.viewDetailsOf', { title: season.name })"
                :link-aria-label="
                  $t('media.viewDetailsOf', { title: season.name })
                "
                :image-alt="$t('media.posterOf', { title: season.name })"
                :no-image-aria-label="
                  $t('media.noPosterAvailableFor', { title: season.name })
                "
                :hide-type-badge="true"
                :truncate-overview="true"
                :show-season-seen-button="hasSession"
                :is-season-seen="isSeasonFullySeen(season.season_number, season.episode_count || 0)"
                :season-number="season.season_number"
                @season-seen-mark="handleMarkSeasonSeen(season.season_number)"
                @season-seen-unmark="handleUnmarkSeason(season.season_number)"
              >
                <template #below-title>
                  <!-- Mobile: season meta (date, episodes, seen) under title -->
                  <div class="mt-2 flex flex-col gap-1 lg:hidden">
                    <div
                      class="flex items-center gap-2 dark:text-gray-300 text-gray-800 text-xs"
                    >
                      <IconCalendar icon-class="w-3 h-3" />
                      <span
                        :class="{
                          italic:
                            !season.air_date || season.air_date.trim() === '',
                        }"
                        >{{
                          formatDateByRegion(season.air_date, userRegion, t)
                        }}</span
                      >
                    </div>
                    <div
                      class="flex items-center gap-2 dark:text-gray-300 text-gray-800 text-xs"
                    >
                      <IconEpisodes icon-class="w-3 h-3" />
                      <span>{{
                        $t(
                          (season.episode_count || 0) === 1
                            ? 'media.episodesCount_one'
                            : 'media.episodesCount_other',
                          {
                            count: season.episode_count || 0,
                          }
                        )
                      }}</span>
                    </div>
                    <div
                      v-if="hasSession && seenEpisodesCountBySeason[season.season_number] !== undefined"
                      class="flex items-center gap-2 dark:text-gray-300 text-gray-800 text-xs"
                    >
                      <IconEye
                        icon-class="w-3 h-3 text-primary-600 dark:text-primary-400"
                      />
                      <span>{{
                        $t(
                          seenEpisodesCountBySeason[season.season_number] === 1
                            ? 'episodes.episodesSeenCount_one'
                            : 'episodes.episodesSeenCount_other',
                          {
                            count: seenEpisodesCountBySeason[season.season_number],
                          }
                        )
                      }}</span>
                    </div>
                  </div>

                  <!-- Desktop: season seen button below title -->
                  <div v-if="hasSession" class="mt-2 hidden lg:block">
                    <SeasonSeenButton
                      :is-season-seen="isSeasonFullySeen(season.season_number, season.episode_count || 0)"
                      :season-number="season.season_number"
                      @mark="handleMarkSeasonSeen(season.season_number)"
                      @unmark="handleUnmarkSeason(season.season_number)"
                    />
                  </div>
                </template>
                <template #actions>
                  <!-- Desktop: season meta (date, episodes, seen) aligned to the right -->
                  <div class="hidden lg:flex flex-col gap-2 items-end">
                    <div
                      class="flex items-center gap-2 dark:text-gray-300 text-gray-800 text-xs"
                    >
                      <IconCalendar icon-class="w-3 h-3" />
                      <span
                        :class="{
                          italic:
                            !season.air_date || season.air_date.trim() === '',
                        }"
                        >{{
                          formatDateByRegion(season.air_date, userRegion, t)
                        }}</span
                      >
                    </div>
                    <div
                      class="flex items-center gap-2 dark:text-gray-300 text-gray-800 text-xs"
                    >
                      <IconEpisodes icon-class="w-3 h-3" />
                      <span>{{
                        $t(
                          (season.episode_count || 0) === 1
                            ? 'media.episodesCount_one'
                            : 'media.episodesCount_other',
                          {
                            count: season.episode_count || 0,
                          }
                        )
                      }}</span>
                    </div>
                    <!-- Episodes seen count (only for logged users) -->
                    <div
                      v-if="hasSession && seenEpisodesCountBySeason[season.season_number] !== undefined"
                      class="flex items-center gap-2 dark:text-gray-300 text-gray-800 text-xs"
                    >
                      <IconEye
                        icon-class="w-3 h-3 text-primary-600 dark:text-primary-400"
                      />
                      <span>{{
                        $t(
                          seenEpisodesCountBySeason[season.season_number] === 1
                            ? 'episodes.episodesSeenCount_one'
                            : 'episodes.episodesSeenCount_other',
                          {
                            count: seenEpisodesCountBySeason[season.season_number],
                          }
                        )
                      }}</span>
                    </div>
                  </div>
                </template>
              </ListItemBase>
            </div>
          </Section>
        </template>
      </div>
    </PageContainer>
  </AppShell>
</template>

<script setup lang="ts">
import { useRoute } from 'vue-router';
import { useFetch, useSeoMeta, useHead } from 'nuxt/app';
import { computed, onMounted, watch, ref } from 'vue';
import { useRouteWithLang } from '@/composables/useRouteWithLang';
import { useUserRegion } from '@/composables/useUserRegion';

import type { TVShow } from '@/types/TVShow';
import { formatDateByRegion } from '@/utils/formatDate';
import { WatchProviderTypes } from '@/types/WatchProvider';
import MediaBannerDetail from '@/components/MediaBannerDetail.vue';
import { MEDIA_TYPE } from '@/constants/domain/mediaType';
import type { Media } from '@/types/Media';
import IconCalendar from '@/components/icons/IconCalendar.vue';
import IconEpisodes from '@/components/icons/IconEpisodes.vue';
import IconEye from '@/components/icons/IconEye.vue';
import Badge from '@/components/Badge.vue';
import ListItemBase from '@/components/ListItemBase.vue';
import { useEpisodeStatus } from '@/composables/useEpisodeStatus';
import { useSupabaseUser } from '#imports';
import { getSession } from '@/services/auth';
import { useLogger } from '@/composables/useLogger';
import { useTVShowSchema } from '@/composables/useSchemaOrg';
import { getTVShowSeoExperience } from '@/composables/useSeoExperience';
import { useTVShowKeywords } from '@/composables/useSeoKeywords';
import AppShell from '@/components/layout/AppShell.vue';
import PageContainer from '@/components/layout/PageContainer.vue';
import Section from '@/components/layout/Section.vue';
import Alert from '@/components/ui/Alert.vue';
import SeasonSeenButton from '@/components/SeasonSeenButton.vue';
import { useUndoToast } from '@/composables/useUndoToast';

const route = useRoute();
const { getUserRegion } = useUserRegion();
const userRegion = ref<string | null>(null);
const { lang } = useRouteWithLang();
const user = useSupabaseUser();
const hasSession = computed(() => !!user.value);
const { logError } = useLogger();
const { showToast } = useUndoToast();

// Get current language URL code for API calls
const currentLangUrlCode = computed(() => lang.value);

const tvShowId = route.params.id;
const tmdbSeriesId = computed(() => parseInt(String(tvShowId), 10));

// Episode status management
const {
  fetchEpisodeStatuses,
  isEpisodeSeen,
  markSeasonSeen,
  unmarkSeason,
} = useEpisodeStatus(tmdbSeriesId);

// No await: page mounts immediately and shows loading state (text then skeleton)
const {
  data: tvShowDetails,
  pending: tvShowPending,
  error: tvShowError,
  refresh: refreshTVShowDetails,
} = useFetch<TVShow>(`/api/tmdb/tvshows/${tvShowId}`, {
  query: { lang: currentLangUrlCode },
});

const {
  data: tvProviders,
  pending: tvProvidersPending,
  error: tvProvidersError,
  refresh: refreshTVProviders,
} = useFetch(`/api/tmdb/tvshows/${tvShowId}/providers`, {
  query: { lang: currentLangUrlCode },
});

// Watch for language changes in URL and refresh all data
// CRITICAL: Watch lang.value (from route.params.lang) instead of locale.value
// The URL is the source of truth for language
watch(
  () => lang.value,
  async (newLang, oldLang) => {
    if (newLang && oldLang && newLang !== oldLang) {
      // Development-only logging removed
      // Refresh all data with new language
      await Promise.all([refreshTVShowDetails(), refreshTVProviders()]);
    }
  },
  { immediate: false }
);

const isLoading = computed(
  () => tvShowPending.value || tvProvidersPending.value
);
const hasError = computed(() => tvShowError.value || tvProvidersError.value);

// Skeleton loading state with delay (500-700ms)
const showSkeleton = ref(false);
let skeletonTimeoutId: ReturnType<typeof setTimeout> | null = null;

// Watch isLoading to show skeleton after delay
watch(isLoading, (isLoadingValue) => {
  if (isLoadingValue) {
    // Clear any existing timeout
    if (skeletonTimeoutId) {
      clearTimeout(skeletonTimeoutId);
    }
    // Show skeleton after 600ms delay
    skeletonTimeoutId = setTimeout(() => {
      if (isLoading.value) {
        showSkeleton.value = true;
      }
    }, 600);
  } else {
    // Clear timeout and hide skeleton immediately when loading stops
    if (skeletonTimeoutId) {
      clearTimeout(skeletonTimeoutId);
      skeletonTimeoutId = null;
    }
    showSkeleton.value = false;
  }
});

const tvShow = computed<TVShow>(() => {
  if (!tvShowDetails.value) {
    return {} as TVShow;
  }
  return tvShowDetails.value as TVShow;
});
const tvShowProviders = computed(
  () => (tvProviders.value as WatchProviderTypes) || ({} as WatchProviderTypes)
);

const tvShowWithProviders = computed<TVShow>(() => {
  return {
    ...tvShow.value,
    providers: tvShowProviders.value,
  };
});

// SEO: TV Show page - public, indexable
const config = useRuntimeConfig();
const siteUrl = config.public.baseUrl || config.public.siteUrl;

const { t } = useI18n();
const { routeWithLang } = useRouteWithLang();

// Get SEO experience based on genre
const seoExperienceKey = computed(() => getTVShowSeoExperience(tvShow.value));
const seoExperience = computed(() => t(seoExperienceKey.value));

// Meta tags dinámicos
const pageTitle = computed(() => {
  const name = tvShow.value?.name || t('media.series');
  return `${name} – ${t('seo.tvShowPrefix')} ${seoExperience.value}`;
});

const pageDescription = computed(() => {
  const title = tvShow.value?.name || t('media.series');
  const experience = seoExperience.value;
  return t('seo.tvShowDescription', { title, experience });
});

const posterUrl = computed(() => {
  if (tvShow.value?.poster_path) {
    return `https://image.tmdb.org/t/p/w500${tvShow.value.poster_path}`;
  }
  return '';
});

const ogImage = computed(() => posterUrl.value);

// Canonical URL - ensure unique, avoid duplicates with /tv-show/[id]/index
// SEO: hreflang and canonical
const { hreflangLinks } = useHreflang();
const { canonicalUrl: canonicalUrlFromComposable } = useCanonical();

// Schema.org JSON-LD
const tvShowSchema = computed(() => {
  if (!tvShow.value) return null;
  return useTVShowSchema(tvShow.value, siteUrl);
});

// SEO keywords
const { seoKeywords: tvShowKeywords } = useTVShowKeywords(
  computed(() => tvShow.value)
);
const seoKeywords = tvShowKeywords;

useHead({
  title: pageTitle,
  meta: [
    {
      name: 'description',
      content: pageDescription,
    },
    {
      name: 'keywords',
      content: seoKeywords,
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
  script: tvShowSchema.value
    ? [
        {
          type: 'application/ld+json',
          innerHTML: JSON.stringify(tvShowSchema.value),
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
  ogImageAlt: computed(() => {
    const name = tvShow.value?.name || t('media.series');
    return t('media.posterOf', { title: name });
  }),
  ogType: 'video.tv_show',
  ogUrl: canonicalUrlFromComposable,
  twitterCard: 'summary_large_image',
  twitterTitle: pageTitle,
  twitterDescription: pageDescription,
  twitterImage: ogImage,
  robots: 'index, follow',
});

// Calculate seen episodes count for all seasons
const seenEpisodesCountBySeason = computed(() => {
  const counts: Record<number, number> = {};
  if (!tvShowWithProviders.value?.seasons) return counts;
  
  tvShowWithProviders.value.seasons.forEach((season) => {
    if (!season.episode_count) {
      counts[season.season_number] = 0;
      return;
    }
    
    // Count seen episodes in this season
    let seenCount = 0;
    for (let episodeNumber = 1; episodeNumber <= season.episode_count; episodeNumber++) {
      if (isEpisodeSeen(season.season_number, episodeNumber)) {
        seenCount++;
      }
    }
    counts[season.season_number] = seenCount;
  });
  
  return counts;
});

// Check if a season is fully seen (all episodes seen)
const isSeasonFullySeen = (seasonNumber: number, episodeCount: number) => {
  if (!episodeCount || episodeCount === 0) return false;
  
  for (let episodeNumber = 1; episodeNumber <= episodeCount; episodeNumber++) {
    if (!isEpisodeSeen(seasonNumber, episodeNumber)) {
      return false;
    }
  }
  
  return true;
};

// Handlers for season seen actions
const handleMarkSeasonSeen = async (seasonNumber: number) => {
  try {
    // Check if user is authenticated
    const {
      data: { session },
    } = await getSession();

    if (!session?.access_token) {
      showToast(t('media.authRequired'), null, 3000);
      return;
    }

    await markSeasonSeen(seasonNumber);
    await fetchEpisodeStatuses();

    // Show success toast with undo
    showToast(
      t('episodes.seasonMarkedAsSeen'),
      {
        label: t('undo.undo'),
        action: async () => {
          await handleUnmarkSeason(seasonNumber);
        },
      },
      7000
    );
  } catch (error) {
    logError('[TV Show Detail] Error marking season as seen', error as Error, {
      seasonNumber,
      tmdbSeriesId: tmdbSeriesId.value,
    });
    showToast(
      t('home.errorUpdatingStatus', {
        title: t('episodes.seasonMarkAsSeen', { season: seasonNumber }),
      }),
      null,
      3000
    );
  }
};

const handleUnmarkSeason = async (seasonNumber: number) => {
  try {
    // Check if user is authenticated
    const {
      data: { session },
    } = await getSession();

    if (!session?.access_token) {
      showToast(t('media.authRequired'), null, 3000);
      return;
    }

    await unmarkSeason(seasonNumber);
    await fetchEpisodeStatuses();

    // Show success toast
    showToast(
      t('episodes.seasonUnmarkAsSeen', { season: seasonNumber }) + ' ✓',
      null,
      3000
    );
  } catch (error) {
    logError('[TV Show Detail] Error unmarking season', error as Error, {
      seasonNumber,
      tmdbSeriesId: tmdbSeriesId.value,
    });
    showToast(
      t('home.errorUpdatingStatus', {
        title: t('episodes.seasonUnmarkAsSeen', { season: seasonNumber }),
      }),
      null,
      3000
    );
  }
};

// Save the previous route when mounting
onMounted(async () => {
  // Get user region for date formatting
  userRegion.value = await getUserRegion();
  
  // Fetch episode statuses if user is authenticated
  const {
    data: { session },
  } = await getSession();
  if (session?.access_token) {
    await fetchEpisodeStatuses();
  }
  if (import.meta.client) {
    const referrer = document.referrer;
    const currentOrigin = window.location.origin;

    // Only save if the referrer is from the same origin (within the app)
    if (referrer && referrer.startsWith(currentOrigin)) {
      try {
        const referrerPath = new URL(referrer).pathname;
        // Don't save if we're coming from another detail page or season page (to avoid loops)
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
        // If URL parsing fails, ignore
      }
    }
  }
});
</script>

<style scoped>
.line-clamp-1 {
  overflow: hidden;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 1;
  line-clamp: 1;
}

.line-clamp-3 {
  overflow: hidden;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
  line-clamp: 3;
}
</style>
