<template>
  <div>
    <!-- Mobile: Full width image right after navbar -->
    <div class="lg:hidden w-screen -mx-4 md:-mx-6 -mt-4">
      <div
        v-if="season?.poster_path"
        class="relative w-full aspect-[16/9] p-4 pt-6"
      >
        <img
          :src="`https://image.tmdb.org/t/p/w780${season.poster_path}`"
          :alt="season.name"
          class="absolute inset-0 w-full h-full object-cover -z-10"
        />
        <!-- Gradient overlay: black to transparent left to right -->
        <div
          class="absolute inset-0 bg-gradient-to-r from-black/60 via-black/30 to-transparent -z-10"
        ></div>
        <!-- Back button - top left -->
        <button
          class="absolute top-6 left-4 inline-flex items-center gap-2 text-sm font-medium text-white transition-opacity hover:opacity-80"
          @click="handleBack"
        >
          <IconArrowLeft icon-class="w-4 h-4" />
          {{ $t('media.backToSeries') }}
        </button>
        <!-- Rating - top right -->
        <div class="absolute top-6 right-4">
          <RatingBadge
            v-if="season?.vote_average"
            :rating="season.vote_average"
            class="lg:hidden"
          />
        </div>
        <!-- Title - left aligned, vertically centered -->
        <div
          v-if="season?.name"
          class="absolute left-4 top-1/2 -translate-y-1/2 right-4 flex flex-col gap-2"
        >
          <h1 class="text-3xl font-bold text-white uppercase break-words">
            {{ season.name }}
          </h1>
          <p v-if="tagline" class="text-base italic text-white/90 break-words">
            {{ tagline }}
          </p>
        </div>
      </div>
    </div>
    <Section>
      <section
        class="relative flex flex-col items-center justify-between gap-16 pb-8 dark:text-gray-300 text-gray-800 w-full flex-shrink-0 min-h-[400px] lg:flex-row lg:items-start lg:p-16 lg:bg-gray-100/80 dark:lg:bg-gray-900/40 lg:backdrop-blur-xl lg:border lg:gap-14 rounded-3xl lg:border-gray-300/50 lg:dark:border-primary-800 lg:shadow-lg lg:shadow-primary/20 py-16"
      >
        <div
          class="absolute inset-0 z-0 hidden lg:block rounded-3xl"
          :style="sectionStyle"
        ></div>
        <div
          class="absolute z-0 hidden lg:block rounded-3xl bg-gray-100/90 dark:bg-gray-900/90"
          style="top: 0px; right: 0px; bottom: 0px; left: 0px"
        ></div>
        <!-- Left column: Image + Providers -->
        <div
          class="hidden lg:flex flex-col gap-14 lg:max-w-80 lg:w-80 flex-shrink-0 relative z-10"
        >
          <div
            class="relative w-full lg:max-w-80 lg:w-80 flex-shrink-0 lg:aspect-[2/3]"
            style="
              filter: drop-shadow(0 10px 15px -3px rgb(0 0 0 / 0.1))
                drop-shadow(0 4px 6px -4px rgb(0 0 0 / 0.1))
                drop-shadow(0 0 20px rgb(var(--color-primary) / 0.3));
            "
          >
            <div
              v-if="season?.poster_path"
              class="relative overflow-hidden rounded-3xl w-full aspect-[2/3] h-full max-h-[500px]"
            >
              <img
                :src="`https://image.tmdb.org/t/p/w780${season.poster_path}`"
                :alt="season.name"
                class="w-full h-full object-cover rounded-3xl"
              />
            </div>
          </div>
          <!-- Providers below image on desktop -->
          <section class="flex flex-col gap-6">
            <section v-if="hasAvailableProviders" class="flex flex-col gap-8">
              <ProviderList
                v-if="season?.providers?.flatrate?.length"
                :media-provider-prop-list="season.providers.flatrate"
                :watch-type-prop="$t('media.watchIn')"
                :media-type="MEDIA_TYPE.TV"
                :media-title="season?.name || ''"
                :tmdb-id="tmdbId"
              />

              <ProviderList
                v-if="season?.providers?.buy?.length"
                :media-provider-prop-list="season.providers.buy"
                :watch-type-prop="$t('media.buyIn')"
                :media-type="MEDIA_TYPE.TV"
                :media-title="season?.name || ''"
                :tmdb-id="tmdbId"
              />

              <ProviderList
                v-if="season?.providers?.rent?.length"
                :media-provider-prop-list="season.providers.rent"
                :watch-type-prop="$t('media.rentIn')"
                :media-type="MEDIA_TYPE.TV"
                :media-title="season?.name || ''"
                :tmdb-id="tmdbId"
              />
            </section>
            <section v-else class="dark:text-gray-400 text-gray-600">
              <p class="italic">{{ $t('media.noPlatforms') }}</p>
            </section>
          </section>
        </div>
        <!-- Right column: Content -->
        <div
          class="z-10 relative flex flex-col flex-1 gap-6 rounded-lg w-full flex-shrink-0 min-h-[300px]"
        >
          <div class="text-left relative flex-row">
            <button
              class="hidden lg:inline-flex items-center gap-2 mb-4 text-sm font-medium dark:text-gray-300 text-gray-700 hover:dark:text-white hover:text-gray-900 transition-colors"
              @click="handleBack"
            >
              <IconArrowLeft icon-class="w-4 h-4" />
              {{ $t('media.backToSeries') }}
            </button>
            <div
              class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-2 w-full"
            >
              <!-- Title with Rating inline on desktop large -->
              <div
                class="flex items-center gap-3 flex-wrap xl:flex-nowrap xl:flex-1"
              >
                <div class="hidden lg:flex flex-col gap-2 xl:flex-1">
                  <h1
                    class="text-4xl font-bold dark:text-gray-300 text-gray-800 break-words uppercase"
                  >
                    {{ season?.name }}
                  </h1>
                  <p
                    v-if="tagline"
                    class="text-base italic text-gray-700 dark:text-gray-400 break-words"
                  >
                    {{ tagline }}
                  </p>
                </div>
                <!-- Rating inline with title on desktop large, hidden on mobile/tablet (shown below) -->
                <div class="hidden xl:block xl:flex-shrink-0">
                  <RatingBadge
                    v-if="season?.vote_average"
                    :rating="season.vote_average"
                  />
                </div>
              </div>
              <!-- Rating row (mobile/tablet only, hidden on desktop large) -->
              <div
                class="hidden lg:flex items-center gap-3 flex-shrink-0 xl:hidden"
              >
                <RatingBadge
                  v-if="season?.vote_average"
                  :rating="season.vote_average"
                />
              </div>
            </div>
          </div>

          <p
            :class="[
              'dark:text-gray-300 text-gray-800',
              { italic: !season?.overview },
            ]"
            >{{ season?.overview || $t('media.noDescriptionAvailable') }}</p
          >
          <div
            class="mt-2 flex items-center gap-2 dark:text-gray-300 text-gray-800"
          >
            <IconCalendar icon-class="w-5 h-5" />
            <span
              :class="{
                italic: !season?.air_date || season.air_date.trim() === '',
              }"
              >{{
                formatDateToSpanish(season?.air_date || '', userRegion)
              }}</span
            >
          </div>
          <div class="flex items-center gap-2 dark:text-gray-300 text-gray-800">
            <IconEpisodes icon-class="w-5 h-5" />
            <span>{{
              $t(
                (season?.episodes?.length || 0) === 1
                  ? 'media.episodesCount_one'
                  : 'media.episodesCount_other',
                {
                  count: season?.episodes?.length || 0,
                }
              )
            }}</span>
          </div>
          <!-- Videos section -->
          <div v-if="trailers || recaps" class="flex flex-col gap-6">
            <VideoSection
              v-if="trailers"
              :videos="trailers"
              :title="$t('media.trailers')"
            />
            <VideoSection
              v-if="recaps"
              :videos="recaps"
              :title="$t('media.recaps')"
            />
          </div>

          <!-- Displaying watch providers (mobile only) -->
          <section class="flex flex-col gap-6 lg:hidden">
            <section v-if="hasAvailableProviders" class="flex flex-col gap-8">
              <ProviderList
                v-if="season?.providers?.flatrate?.length"
                :media-provider-prop-list="season.providers.flatrate"
                :watch-type-prop="$t('media.watchIn')"
                :media-type="MEDIA_TYPE.TV"
                :media-title="season?.name || ''"
                :tmdb-id="tmdbId"
              />

              <ProviderList
                v-if="season?.providers?.buy?.length"
                :media-provider-prop-list="season.providers.buy"
                :watch-type-prop="$t('media.buyIn')"
                :media-type="MEDIA_TYPE.TV"
                :media-title="season?.name || ''"
                :tmdb-id="tmdbId"
              />

              <ProviderList
                v-if="season?.providers?.rent?.length"
                :media-provider-prop-list="season.providers.rent"
                :watch-type-prop="$t('media.rentIn')"
                :media-type="MEDIA_TYPE.TV"
                :media-title="season?.name || ''"
                :tmdb-id="tmdbId"
              />
            </section>
            <section v-else class="dark:text-gray-400 text-gray-600">
              <p class="italic">{{ $t('media.noPlatforms') }}</p>
            </section>
          </section>
        </div>
      </section>
    </Section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import type { Season } from '@/types/TVShow';
import { formatDateToSpanish } from '@/utils/formatDate';
import type { WatchProviderTypes } from '@/types/WatchProvider';
import ProviderList from '@/components/ProviderList.vue';
import RatingBadge from '@/components/RatingBadge.vue';
import { MEDIA_TYPE } from '@/constants/domain/mediaType';
import IconArrowLeft from '@/components/icons/IconArrowLeft.vue';
import IconCalendar from '@/components/icons/IconCalendar.vue';
import IconEpisodes from '@/components/icons/IconEpisodes.vue';
import Section from '@/components/layout/Section.vue';
import { useUserRegion } from '@/composables/useUserRegion';
import { getTitleInLanguage, type MultiLanguageText } from '@/services/titles';
import { useCurrentLanguage } from '@/composables/useCurrentLanguage';
import VideoSection from '@/components/VideoSection.vue';
import {
  getVideosForSeason,
  filterVideosByType,
} from '@/composables/useVideos';
import {
  VIDEO_TYPE_TRAILER,
  VIDEO_TYPE_RECAP,
} from '@/constants/domain/videos';
import type { Video } from '@/types/Video';

interface Props {
  season: (Season & { providers?: WatchProviderTypes }) | null | undefined;
  tmdbId: number;
  seriesId: string | number;
}

const props = defineProps<Props>();

const router = useRouter();
const isMobile = ref(false);
const { getUserRegion } = useUserRegion();
const userRegion = ref<string | null>(null);
const { currentLanguage } = useCurrentLanguage();

// Videos state
const allVideos = ref<Video[] | null>(null);
const trailers = computed(() =>
  allVideos.value
    ? filterVideosByType(allVideos.value, VIDEO_TYPE_TRAILER)
    : null
);
const recaps = computed(() =>
  allVideos.value ? filterVideosByType(allVideos.value, VIDEO_TYPE_RECAP) : null
);

// Detect mobile/tablet screen size (use mobile style for tablet too)
const checkMobile = () => {
  isMobile.value = window.innerWidth < 1024; // lg breakpoint
};

// Handle resize
const handleResize = () => {
  checkMobile();
};

// Get routeWithLang for building language-prefixed links
const { routeWithLang } = useRouteWithLang();

// Handle back navigation - always go back to the series detail page
const handleBack = () => {
  router.push(routeWithLang(`/tv-show/${props.seriesId}`));
};

const hasAvailableProviders = computed(() => {
  return (
    props.season?.providers?.flatrate?.length ||
    props.season?.providers?.buy?.length ||
    props.season?.providers?.rent?.length
  );
});

const backgroundImage = computed(() => {
  if (props.season?.poster_path) {
    return `https://image.tmdb.org/t/p/w780${props.season.poster_path}`;
  }
  return '';
});

const sectionStyle = computed(() => ({
  backgroundImage: isMobile.value ? '' : `url(${backgroundImage.value})`,
  backgroundSize: isMobile.value ? 'contain' : 'cover',
  backgroundPosition: isMobile.value ? 'center' : 'center',
}));

// Extract tagline with language fallback (same logic as overview)
const tagline = computed(() => {
  const seasonData = props.season as Season & {
    tagline?: string | MultiLanguageText;
  };

  if (!seasonData?.tagline) {
    return '';
  }

  // If tagline is a MultiLanguageText object, use getTitleInLanguage
  if (typeof seasonData.tagline === 'object' && seasonData.tagline !== null) {
    return getTitleInLanguage(
      seasonData.tagline as MultiLanguageText,
      currentLanguage.value.i18nCode,
      userRegion.value
    );
  }

  // If tagline is a string, return it directly
  return seasonData.tagline;
});

// Check if tagline is missing and try to get it from the season data
// Note: Seasons don't have tagline in TMDB, but we check anyway for consistency
const checkTagline = () => {
  const seasonData = props.season as Season & {
    tagline?: string | MultiLanguageText;
  };

  // If tagline is missing, we could try to fetch it, but TMDB doesn't provide
  // tagline for seasons, so we just return
  // This is here for consistency with MediaBannerDetail
  if (!seasonData?.tagline) {
    // Tagline not available for seasons in TMDB
    return;
  }
};

onMounted(async () => {
  checkMobile();
  window.addEventListener('resize', handleResize);
  // Get user region for date formatting
  userRegion.value = await getUserRegion();
  // Check tagline (though it's unlikely to exist for seasons)
  checkTagline();
  // Fetch videos
  const videos = await getVideosForSeason(
    props.tmdbId,
    props.season?.season_number || 0
  );
  allVideos.value = videos;
});

onUnmounted(() => {
  window.removeEventListener('resize', handleResize);
});
</script>
