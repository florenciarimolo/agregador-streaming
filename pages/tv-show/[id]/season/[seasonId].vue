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
            $t('media.loadingSeason')
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
              :message="$t('media.errorLoadingSeason')"
              :show-icon="true"
            />
          </div>
        </div>

        <!-- Content -->
        <div v-else>
          <SeasonBannerDetail
            :season="seasonWithProviders"
            :tmdb-id="parseInt(String(seriesId), 10)"
            :series-id="String(seriesId)"
            :seen-episodes-count="seenEpisodesCount"
            :is-season-seen="isSeasonFullySeen"
            :season-number="seasonWithProviders?.season_number"
            @mark-season-seen="handleMarkSeasonSeen"
            @unmark-season="handleUnmarkSeason"
          />

          <!-- Episodios -->
          <Section>
            <div class="flex items-center justify-between mb-4">
              <SectionTitle>{{ $t('media.episodes') }}</SectionTitle>
              <!-- Season seen button -->
              <SeasonSeenButton
                v-if="seasonWithProviders"
                :is-season-seen="isSeasonFullySeen"
                :season-number="seasonWithProviders.season_number"
                @mark="handleMarkSeasonSeen"
                @unmark="handleUnmarkSeason"
              />
            </div>

            <!-- Mobile: Custom 2-row layout -->
            <div
              v-if="seasonWithProviders?.episodes?.length"
              class="md:hidden space-y-4"
            >
              <article
                v-for="episode in seasonWithProviders.episodes"
                :key="episode.id"
                class="overflow-visible relative rounded-3xl border backdrop-blur-xl transition-all duration-300 dark:bg-gray-900/40 bg-gray-100/80 border-gray-300/50 dark:border-white/10"
              >
                <div class="flex flex-col p-4 gap-3">
                  <!-- Row 1: Image, Title, Time, Rating -->
                  <div class="flex flex-row gap-3">
                    <!-- Horizontal image with eye icon overlay -->
                    <div class="relative flex-shrink-0">
                      <div
                        class="relative bg-gray-800 overflow-hidden rounded-2xl aspect-video w-32"
                      >
                        <img
                          v-if="episode.still_path"
                          :src="`https://image.tmdb.org/t/p/w500${episode.still_path}`"
                          :alt="$t('media.posterOf', { title: episode.name })"
                          class="object-cover w-full h-full"
                          loading="lazy"
                          decoding="async"
                        />
                        <div
                          v-else
                          class="flex justify-center items-center w-full h-full text-gray-600 dark:text-gray-500"
                          role="img"
                          :aria-label="
                            $t('media.noPosterAvailableFor', {
                              title: episode.name,
                            })
                          "
                        >
                          <IconTv icon-class="w-8 h-8" />
                        </div>
                        <!-- Rating badge at top left -->
                        <div
                          v-if="episode.vote_average"
                          class="absolute top-1 left-1 z-10 pointer-events-none"
                        >
                          <RatingBadge :rating="episode.vote_average" />
                        </div>
                      </div>
                    </div>
                    <!-- Title, Time -->
                    <div class="flex flex-col flex-1 gap-1 min-w-0">
                      <div class="flex items-center gap-2">
                        <h3
                          class="text-xs font-semibold text-gray-800 dark:text-gray-300 break-words flex-1"
                        >
                          {{ episode.episode_number }}. {{ episode.name }}
                        </h3>
                        <EpisodeSeenButton
                          :is-seen="
                            isEpisodeSeen(
                              seasonWithProviders.season_number,
                              episode.episode_number
                            )
                          "
                          :season-number="seasonWithProviders.season_number"
                          :episode-number="episode.episode_number"
                          size="small"
                          @click="
                            handleToggleEpisodeSeen(
                              seasonWithProviders.season_number,
                              episode.episode_number
                            )
                          "
                        />
                      </div>
                      <div
                        v-if="episode.runtime"
                        class="text-xs text-gray-600 dark:text-gray-400"
                      >
                        {{ episode.runtime }} min
                      </div>
                    </div>
                  </div>
                  <!-- Row 2: Overview -->
                  <div>
                    <p
                      v-if="episode.overview"
                      class="text-xs text-gray-700 dark:text-gray-300 line-clamp-3"
                    >
                      {{ episode.overview }}
                    </p>
                    <p
                      v-else
                      class="text-xs italic text-gray-600 dark:text-gray-400"
                    >
                      {{ $t('media.noDescriptionAvailable') }}
                    </p>
                  </div>
                </div>
              </article>
            </div>

            <!-- Desktop/Tablet: 3-column mosaic grid -->
            <div
              v-if="seasonWithProviders?.episodes?.length"
              class="hidden md:grid md:grid-cols-3 md:gap-4"
            >
              <div
                v-for="episode in seasonWithProviders.episodes"
                :key="episode.id"
                class="relative"
              >
                <TitleCard
                  :title="episode.name"
                  :poster-path="episode.still_path"
                  aspect-ratio="video"
                  :show-content="true"
                  :show-type="false"
                  :link-to="''"
                  :image-alt="$t('media.posterOf', { title: episode.name })"
                  :no-image-aria-label="
                    $t('media.noPosterAvailableFor', { title: episode.name })
                  "
                  :aria-label="$t('media.viewDetailsOf', { title: episode.name })"
                >
                  <template #top-left-badges>
                    <RatingBadge
                      v-if="episode.vote_average"
                      :rating="episode.vote_average"
                    />
                  </template>
                  <template #top-right-actions>
                    <EpisodeSeenButton
                      :is-seen="
                        isEpisodeSeen(
                          seasonWithProviders.season_number,
                          episode.episode_number
                        )
                      "
                      :season-number="seasonWithProviders.season_number"
                      :episode-number="episode.episode_number"
                      size="medium"
                      @click="
                        handleToggleEpisodeSeen(
                          seasonWithProviders.season_number,
                          episode.episode_number
                        )
                      "
                    />
                  </template>
                  <template #content>
                    <h3
                      class="text-sm font-semibold text-gray-800 dark:text-gray-300 mb-1"
                    >
                      {{ episode.episode_number }}. {{ episode.name }}
                    </h3>
                    <p
                      v-if="episode.runtime"
                      class="text-xs text-gray-600 dark:text-gray-400 mb-2"
                    >
                      {{ episode.runtime }} min
                    </p>
                    <p
                      v-if="episode.overview"
                      class="text-xs text-gray-800 dark:text-gray-300 line-clamp-3"
                    >
                      {{ episode.overview }}
                    </p>
                    <p
                      v-else
                      class="text-xs italic text-gray-600 dark:text-gray-400"
                    >
                      {{ $t('media.noDescriptionAvailable') }}
                    </p>
                  </template>
                </TitleCard>
              </div>
            </div>

            <!-- Empty state -->
            <div
              v-else
              class="py-12 text-center dark:text-gray-400 text-gray-600"
            >
              <div class="text-xl">{{ $t('media.noEpisodes') }}</div>
            </div>
          </Section>
        </div>
      </div>
    </PageContainer>
  </AppShell>
</template>

<script setup lang="ts">
import { useRoute } from 'vue-router';
import { useFetch, useSeoMeta, useHead } from 'nuxt/app';
import { computed, watch, onMounted, ref } from 'vue';
import { useRouteWithLang } from '@/composables/useRouteWithLang';

import type { Season, TVShow } from '@/types/TVShow';
import { WatchProviderTypes } from '@/types/WatchProvider';
import SeasonBannerDetail from '@/components/SeasonBannerDetail.vue';
import AppShell from '@/components/layout/AppShell.vue';
import PageContainer from '@/components/layout/PageContainer.vue';
import Section from '@/components/layout/Section.vue';
import SectionTitle from '@/components/layout/SectionTitle.vue';
import Alert from '@/components/ui/Alert.vue';
import IconTv from '@/components/icons/IconTv.vue';
import EpisodeSeenButton from '@/components/EpisodeSeenButton.vue';
import SeasonSeenButton from '@/components/SeasonSeenButton.vue';
import TitleCard from '@/components/TitleCard.vue';
import RatingBadge from '@/components/RatingBadge.vue';
import { useUserRegion } from '@/composables/useUserRegion';
import { useTVSeasonSchema } from '@/composables/useSchemaOrg';
import { useHreflang } from '@/composables/useHreflang';
import { useCanonical } from '@/composables/useCanonical';
import { useSeasonKeywords } from '@/composables/useSeoKeywords';
import { useEpisodeStatus } from '@/composables/useEpisodeStatus';
import { getSession } from '@/services/auth';
import { useLogger } from '@/composables/useLogger';
import { useUndoToast } from '@/composables/useUndoToast';
import { useSupabaseUser } from '#imports';

const route = useRoute();
const { locale } = useI18n();
const { getUserRegion } = useUserRegion();
const userRegion = ref<string | null>(null);
const { lang } = useRouteWithLang();

// Get current language URL code for API calls
const currentLangUrlCode = computed(() => lang.value);

// Necesitamos obtener el seriesId desde la URL padre y el seasonId de los parámetros actuales
const seriesId = route.params.id;
const seasonId = route.params.seasonId;

// Fetch TV show details to get the series name
const {
  data: tvShowData,
  pending: tvShowPending,
  error: tvShowError,
  refresh: refreshTVShowDetails,
} = await useFetch<TVShow>(`/api/tmdb/tvshows/${seriesId}`, {
  query: { lang: currentLangUrlCode },
});

const {
  data: seasonData,
  pending: seasonPending,
  error: seasonError,
  refresh: refreshSeasonData,
} = await useFetch<Season>(
  `/api/tmdb/tvshows/${seriesId}/seasons/${seasonId}`,
  {
    query: { lang: currentLangUrlCode },
  }
);

const isLoading = computed(
  () =>
    seasonPending.value || seasonProvidersPending.value || tvShowPending.value
);
const hasError = computed(
  () => seasonError.value || seasonProvidersError.value || tvShowError.value
);

const {
  data: seasonProviders,
  pending: seasonProvidersPending,
  error: seasonProvidersError,
  refresh: refreshSeasonProviders,
} = await useFetch<WatchProviderTypes>(
  `/api/tmdb/tvshows/${seriesId}/seasons/${seasonId}/providers`
);

// Watch for locale changes and refresh all data
watch(
  () => locale.value,
  async (newLocale, oldLocale) => {
    if (newLocale && oldLocale && newLocale !== oldLocale) {
      // Development-only logging removed
      // Refresh all data with new language
      await Promise.all([
        refreshTVShowDetails(),
        refreshSeasonData(),
        refreshSeasonProviders(),
      ]);
    }
  },
  { immediate: false }
);

const seasonWithProviders = computed(() => {
  if (!seasonData.value) return null;
  return {
    ...seasonData.value,
    providers: seasonProviders.value,
  } as Season & { providers?: WatchProviderTypes };
});

const { t } = useI18n();

const pageTitle = computed(() => {
  const seriesName = tvShowData.value?.name || '';
  const seasonName = seasonWithProviders.value?.name || '';

  if (seriesName && seasonName) {
    return `${seasonName} – ${seriesName}`;
  }
  if (seasonName) {
    return seasonName;
  }
  if (seriesName) {
    return `${t('media.seasonTitle')} – ${seriesName}`;
  }
  return t('media.seasonTitle');
});

const pageDescription = computed(() => {
  if (seasonWithProviders.value?.overview) {
    return seasonWithProviders.value.overview;
  }
  return t('media.seasonDescription', { seasonId });
});

const posterUrl = computed(() => {
  if (seasonWithProviders.value?.poster_path) {
    return `https://image.tmdb.org/t/p/w500${seasonWithProviders.value.poster_path}`;
  }
  return '';
});

// SEO: Season page - public, indexable
const config = useRuntimeConfig();
const siteUrl = config.public.baseUrl || config.public.siteUrl;

// SEO: hreflang and canonical
const { hreflangLinks } = useHreflang();
const { canonicalUrl: canonicalUrlFromComposable } = useCanonical();

// Schema.org JSON-LD
const seasonSchema = computed(() => {
  if (!seasonWithProviders.value || !tvShowData.value) return null;
  return useTVSeasonSchema(
    seasonWithProviders.value,
    tvShowData.value,
    siteUrl
  );
});

// SEO keywords
const { seoKeywords: seasonKeywords } = useSeasonKeywords(
  computed(() => seasonWithProviders.value as Season | null),
  computed(() => tvShowData.value ?? null)
);
const seoKeywords = seasonKeywords;

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
  script: seasonSchema.value
    ? [
        {
          type: 'application/ld+json',
          innerHTML: JSON.stringify(seasonSchema.value),
        },
      ]
    : [],
});

useSeoMeta({
  title: pageTitle,
  description: pageDescription,
  ogTitle: pageTitle,
  ogDescription: pageDescription,
  ogImage: posterUrl,
  ogImageAlt: computed(() => {
    const seasonName = seasonWithProviders.value?.name || '';
    const seriesName = tvShowData.value?.name || '';
    if (seasonName && seriesName) {
      return t('media.posterOf', { title: `${seasonName} – ${seriesName}` });
    }
    if (seasonName) {
      return t('media.posterOf', { title: seasonName });
    }
    return t('media.seasonTitle');
  }),
  ogType: 'video.tv_show',
  ogUrl: canonicalUrlFromComposable,
  twitterCard: 'summary_large_image',
  twitterTitle: pageTitle,
  twitterDescription: pageDescription,
  twitterImage: posterUrl,
  robots: 'index, follow',
});

// Episode status management
const tmdbSeriesId = computed(() => parseInt(String(seriesId), 10));
const {
  fetchEpisodeStatuses,
  isEpisodeSeen,
  markEpisodeSeen,
  unmarkEpisode,
  markSeasonSeen,
  unmarkSeason,
} = useEpisodeStatus(tmdbSeriesId);

const isSeasonFullySeen = computed(() => {
  if (!seasonWithProviders.value?.episodes) return false;
  const seasonNumber = seasonWithProviders.value.season_number;
  return seasonWithProviders.value.episodes.every((episode) =>
    isEpisodeSeen(seasonNumber, episode.episode_number)
  );
});

const seenEpisodesCount = computed(() => {
  if (!seasonWithProviders.value?.episodes) return 0;
  const seasonNumber = seasonWithProviders.value.season_number;
  return seasonWithProviders.value.episodes.filter((episode) =>
    isEpisodeSeen(seasonNumber, episode.episode_number)
  ).length;
});

const handleToggleEpisodeSeen = async (
  seasonNumber: number,
  episodeNumber: number
) => {
  const { logError } = useLogger();
  try {
    const {
      data: { session },
    } = await getSession();

    if (!session?.access_token) {
      return;
    }

    const currentlySeen = isEpisodeSeen(seasonNumber, episodeNumber);

    if (currentlySeen) {
      await unmarkEpisode(seasonNumber, episodeNumber);
    } else {
      await markEpisodeSeen(seasonNumber, episodeNumber);
    }

    // Refresh episode statuses
    await fetchEpisodeStatuses();
  } catch (error) {
    logError('[SeasonPage] Error toggling episode seen', error as Error, {
      seasonNumber,
      episodeNumber,
    });
  }
};

const { showToast } = useUndoToast();
const user = useSupabaseUser();

const handleMarkSeasonSeen = async () => {
  const { logError } = useLogger();
  try {
    if (!seasonWithProviders.value) {
      return;
    }

    // Check if user is authenticated using useSupabaseUser (reactive, no getSession call)
    if (!user.value) {
      showToast(t('media.authRequired'), null, 3000);
      return;
    }

    // Get session with timeout to prevent hanging
    const getSessionPromise = getSession();
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('getSession timeout after 5s')), 5000);
    });
    
    let sessionResult;
    try {
      sessionResult = await Promise.race([getSessionPromise, timeoutPromise]);
    } catch (error) {
      const { logWarn } = useLogger();
      logWarn('[SeasonPage] getSession timeout or error', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      showToast(t('home.errorUpdatingStatus', { title: t('episodes.seasonMarkAsSeen', { season: seasonWithProviders.value?.season_number || 1 }) }), null, 3000);
      return;
    }
    
    const {
      data: { session },
    } = sessionResult as Awaited<ReturnType<typeof getSession>>;

    if (!session?.access_token) {
      showToast(t('media.authRequired'), null, 3000);
      return;
    }

    const seasonNumber = seasonWithProviders.value.season_number;

    await markSeasonSeen(seasonNumber);
    await fetchEpisodeStatuses();

    // Show success toast with undo
    showToast(
      t('episodes.seasonMarkedAsSeen'),
      {
        label: t('undo.undo'),
        action: async () => {
          await handleUnmarkSeason();
        },
      },
      7000
    );
  } catch (error) {
    logError('[SeasonPage] Error marking season as seen', error as Error);
    const seasonNumber = seasonWithProviders.value?.season_number || '';
    showToast(
      t('home.errorUpdatingStatus', {
        title: t('episodes.seasonMarkAsSeen', { season: seasonNumber }),
      }),
      null,
      3000
    );
  }
};

const handleUnmarkSeason = async () => {
  const { logError } = useLogger();
  try {
    if (!seasonWithProviders.value) return;

    // Check if user is authenticated
    const {
      data: { session },
    } = await getSession();

    if (!session?.access_token) {
      showToast(t('media.authRequired'), null, 3000);
      return;
    }

    const seasonNumber = seasonWithProviders.value.season_number;

    await unmarkSeason(seasonNumber);
    await fetchEpisodeStatuses();

    // Show success toast
    showToast(
      t('episodes.seasonUnmarkAsSeen', { season: seasonNumber }) + ' ✓',
      null,
      3000
    );
  } catch (error) {
    logError('[SeasonPage] Error unmarking season', error as Error);
    const seasonNumber = seasonWithProviders.value?.season_number || '';
    showToast(
      t('home.errorUpdatingStatus', {
        title: t('episodes.seasonUnmarkAsSeen', { season: seasonNumber }),
      }),
      null,
      3000
    );
  }
};

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
