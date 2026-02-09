<template>
  <div>
    <!-- Mobile: Full width image right after navbar -->
    <div
      v-if="season?.poster_path"
      class="-mx-4 -mt-4 w-screen lg:hidden md:-mx-6"
    >
      <div class="relative w-full aspect-[16/9] p-4 pt-6">
        <img
          :src="`https://image.tmdb.org/t/p/w780${season.poster_path}`"
          :alt="season.name"
          class="object-cover object-top absolute inset-0 z-0 w-full h-full"
        />
        <!-- Gradient overlay: black to transparent left to right -->
        <div
          class="absolute inset-0 z-0 bg-gradient-to-r to-transparent from-black/60 via-black/30"
        ></div>
        <!-- Top row: Back button, Rating - aligned horizontally -->
        <div
          class="flex absolute right-4 left-4 top-6 z-30 gap-4 justify-between items-center"
        >
          <!-- Back button - left -->
          <button
            class="inline-flex flex-shrink-0 gap-2 items-center text-sm font-medium text-white transition-opacity hover:opacity-80"
            @click="handleBack"
          >
            <IconArrowLeft icon-class="w-4 h-4" />
            <span class="hidden sm:inline">{{ $t('media.backToSeries') }}</span>
          </button>
          <!-- Rating - right -->
          <div class="flex-shrink-0">
            <RatingBadge
              v-if="season?.vote_average"
              :rating="season.vote_average"
              class="lg:hidden"
            />
          </div>
        </div>
        <!-- Title and Tagline - vertically centered container -->
        <div
          v-if="season?.name || tagline"
          class="flex absolute inset-0 z-10 flex-col gap-2 justify-center items-start px-4 py-2 pointer-events-none"
        >
          <h1
            v-if="season?.name"
            class="text-lg font-bold text-white break-words sm:text-xl line-clamp-2 mt-4"
          >
            {{ season.name }}
          </h1>
          <p
            v-if="tagline"
            class="text-sm italic break-words sm:text-base text-white/90"
          >
            {{ tagline }}
          </p>
          <p
            v-if="season?.overview"
            class="text-xs sm:text-sm text-white/90 break-words line-clamp-3 mt-2"
          >
            {{ season.overview }}
          </p>
        </div>
      </div>
    </div>
    <Section>
      <section
        class="relative flex flex-col items-center justify-between gap-16 pb-8 dark:text-gray-300 text-gray-800 w-full flex-shrink-0 min-h-[400px] lg:flex-row lg:items-start lg:p-16 lg:bg-gray-100/80 dark:lg:bg-gray-900/40 lg:backdrop-blur-xl lg:border lg:gap-14 rounded-3xl lg:border-gray-300/50 lg:dark:border-white/10 lg:shadow-lg lg:shadow-primary/20"
      >
        <div
          class="hidden absolute inset-0 z-0 rounded-3xl lg:block"
          :style="sectionStyle"
        ></div>
        <div
          class="hidden absolute z-0 rounded-3xl lg:block bg-gray-100/90 dark:bg-gray-900/90"
          style="top: 0px; right: 0px; bottom: 0px; left: 0px"
        ></div>
        <!-- Left column: Image + Providers -->
        <div
          class="hidden relative z-10 flex-col flex-shrink-0 gap-14 lg:flex lg:max-w-80 lg:w-80"
        >
          <div
            class="relative w-full lg:max-w-80 lg:w-80 flex-shrink-0 lg:aspect-[2/3]"
            :style="posterFilterStyle"
          >
            <div
              v-if="season?.poster_path"
              class="relative overflow-hidden rounded-3xl w-full aspect-[2/3] h-full max-h-[500px]"
            >
              <img
                :src="`https://image.tmdb.org/t/p/w780${season.poster_path}`"
                :alt="season.name"
                class="object-cover w-full h-full rounded-3xl"
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
            <section v-else class="text-gray-600 dark:text-gray-400">
              <p class="italic">{{ $t('media.noPlatforms') }}</p>
            </section>
          </section>
        </div>
        <!-- Right column: Content -->
        <div
          class="z-10 relative flex flex-col flex-1 gap-6 rounded-lg w-full flex-shrink-0 min-h-[300px]"
        >
          <div class="relative flex-row text-left">
            <button
              class="hidden gap-2 items-center mb-4 text-sm font-medium text-gray-700 transition-colors lg:inline-flex dark:text-gray-300 hover:dark:text-white hover:text-gray-900"
              @click="handleBack"
            >
              <IconArrowLeft icon-class="w-4 h-4" />
              {{ $t('media.backToSeries') }}
            </button>
            <div
              class="flex flex-col gap-2 w-full lg:flex-row lg:items-center lg:justify-between"
            >
              <!-- Title with Rating inline on desktop large -->
              <div
                class="flex flex-wrap gap-3 items-center xl:flex-nowrap xl:flex-1"
              >
                <div class="hidden flex-col gap-2 lg:flex xl:flex-1">
                  <h1
                    class="text-4xl font-bold text-gray-800 break-words dark:text-gray-300"
                  >
                    {{ season?.name }}
                  </h1>
                  <p
                    v-if="tagline"
                    class="text-base italic text-gray-700 break-words dark:text-gray-400"
                  >
                    {{ tagline }}
                  </p>
                  <!-- Episodes seen count (only for logged users) -->
                  <div
                    v-if="hasSession && seenEpisodesCount !== undefined"
                    class="flex gap-2 items-center text-gray-800 dark:text-gray-300"
                  >
                    <IconEye
                      :icon-class="
                        isSeasonSeen
                          ? 'w-5 h-5 text-primary-600 dark:text-primary-400'
                          : 'w-5 h-5 text-gray-500 dark:text-gray-400'
                      "
                    />
                    <span>{{
                      $t(
                        seenEpisodesCount === 1
                          ? 'episodes.episodesSeenCount_one'
                          : 'episodes.episodesSeenCount_other',
                        {
                          count: seenEpisodesCount,
                        }
                      )
                    }}</span>
                  </div>
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
                class="hidden flex-shrink-0 gap-3 items-center lg:flex xl:hidden"
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
              'hidden lg:block dark:text-gray-300 text-gray-800',
              { italic: !season?.overview },
            ]"
            >{{ season?.overview || $t('media.noDescriptionAvailable') }}</p
          >
          <div
            class="flex gap-2 items-center mt-2 text-gray-800 dark:text-gray-300"
          >
            <IconCalendar icon-class="w-5 h-5" />
            <span
              :class="{
                italic: !season?.air_date || season.air_date.trim() === '',
              }"
              >{{
                formatDateByRegion(season?.air_date || '', userRegion, t)
              }}</span
            >
          </div>
          <div class="flex gap-2 items-center text-gray-800 dark:text-gray-300">
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
            <section v-else class="text-gray-600 dark:text-gray-400">
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
import { formatDateByRegion } from '@/utils/formatDate';
import type { WatchProviderTypes } from '@/types/WatchProvider';
import ProviderList from '@/components/ProviderList.vue';
import RatingBadge from '@/components/RatingBadge.vue';
import { MEDIA_TYPE } from '@/constants/domain/mediaType';
import IconArrowLeft from '@/components/icons/IconArrowLeft.vue';
import IconCalendar from '@/components/icons/IconCalendar.vue';
import IconEpisodes from '@/components/icons/IconEpisodes.vue';
import IconEye from '@/components/icons/IconEye.vue';
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
import { useSupabaseUser } from '#imports';

interface Props {
  season: (Season & { providers?: WatchProviderTypes }) | null | undefined;
  tmdbId: number;
  seriesId: string | number;
  seenEpisodesCount?: number;
  isSeasonSeen?: boolean;
  seasonNumber?: number;
}

defineEmits<{
  'mark-season-seen': [];
  'unmark-season': [];
}>();

const props = defineProps<Props>();

const router = useRouter();
const isMobile = ref(false);
const { getUserRegion } = useUserRegion();
const userRegion = ref<string | null>(null);
const { currentLanguage } = useCurrentLanguage();
const { t } = useI18n();
const user = useSupabaseUser();
const hasSession = computed(() => !!user.value);

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

// Poster filter style - use computed to avoid hydration mismatch with CSS variables
// Primary color: #21186E = rgb(33, 24, 110)
const posterFilterStyle = computed(() => ({
  filter:
    'drop-shadow(0 10px 15px -3px rgb(0 0 0 / 0.1)) drop-shadow(0 4px 6px -4px rgb(0 0 0 / 0.1)) drop-shadow(0 0 20px rgb(33 24 110 / 0.3))',
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
