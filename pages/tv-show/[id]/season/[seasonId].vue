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
          />

          <!-- Episodios -->
          <Section>
            <SectionTitle>{{ $t('media.episodes') }}</SectionTitle>

            <div v-if="seasonWithProviders?.episodes?.length" class="space-y-4">
              <ListItemBase
                v-for="(episode, index) in seasonWithProviders.episodes"
                :key="episode.id"
                :title="`${index + 1}. ${episode.name}`"
                :poster-path="episode.still_path"
                :overview="episode.overview"
                :vote-average="episode.vote_average"
                :tmdb-id="episode.id"
                :hide-type-badge="true"
                :show-overview="true"
                :aria-label="$t('media.viewDetailsOf', { title: episode.name })"
                :link-aria-label="
                  $t('media.viewDetailsOf', { title: episode.name })
                "
                :image-alt="$t('media.posterOf', { title: episode.name })"
                :no-image-aria-label="
                  $t('media.noPosterAvailableFor', { title: episode.name })
                "
              >
                <template #actions>
                  <!-- Additional episode info: Date and Duration -->
                  <div class="flex flex-col gap-2 items-end">
                    <div
                      class="flex items-center gap-2 dark:text-gray-300 text-gray-800 text-xs"
                    >
                      <IconCalendar icon-class="w-3 h-3" />
                      <span>{{
                        formatDateByRegion(episode.air_date, userRegion, t)
                      }}</span>
                    </div>
                    <div
                      v-if="episode.runtime"
                      class="flex items-center gap-2 dark:text-gray-300 text-gray-800 text-xs"
                    >
                      <IconClock icon-class="w-3 h-3" />
                      <span>{{ episode.runtime }} min</span>
                    </div>
                  </div>
                </template>
              </ListItemBase>
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
import { useFetch } from 'nuxt/app';
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
import IconCalendar from '@/components/icons/IconCalendar.vue';
import IconClock from '@/components/icons/IconClock.vue';
import ListItemBase from '@/components/ListItemBase.vue';
import { formatDateByRegion } from '@/utils/formatDate';
import { useUserRegion } from '@/composables/useUserRegion';

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
      if (import.meta.dev) {
        console.log(
          '[tv-show/[id]/season/[seasonId].vue] Language changed, refreshing season data:',
          {
            oldLocale,
            newLocale,
          }
        );
      }
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

useHead({
  title: pageTitle,
});

useSeoMeta({
  title: pageTitle,
  description: computed(() => {
    if (seasonWithProviders.value?.overview) {
      return seasonWithProviders.value.overview;
    }
    return t('media.seasonDescription', { seasonId });
  }),
});

onMounted(async () => {
  // Get user region for date formatting
  userRegion.value = await getUserRegion();
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
