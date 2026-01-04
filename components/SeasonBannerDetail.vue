<template>
  <Section>
    <section
      class="relative flex flex-col items-center justify-between gap-16 pb-8 dark:text-gray-300 text-gray-800 w-full flex-shrink-0 min-h-[400px] lg:flex-row lg:items-center lg:p-16 lg:bg-gray-100/80 dark:lg:bg-gray-900/40 lg:backdrop-blur-xl lg:border lg:gap-7 rounded-3xl lg:border-gray-300/50 lg:dark:border-primary-800 lg:shadow-lg lg:shadow-primary/20 py-16"
    >
      <div
        class="absolute inset-0 z-0 hidden lg:block rounded-3xl"
        :style="sectionStyle"
      ></div>
      <div
        class="absolute z-0 hidden lg:block rounded-3xl bg-gray-100/90 dark:bg-gray-900/90"
        style="top: 0px; right: 0px; bottom: 0px; left: 0px"
      ></div>
      <div
        class="relative w-full max-w-[60%] mx-auto lg:max-w-80 lg:w-80 lg:mx-0 flex-shrink-0 lg:aspect-[2/3]"
        style="
          filter: drop-shadow(0 10px 15px -3px rgb(0 0 0 / 0.1))
            drop-shadow(0 4px 6px -4px rgb(0 0 0 / 0.1))
            drop-shadow(0 0 20px rgb(var(--color-primary) / 0.3));
        "
      >
        <div
          v-if="season?.poster_path"
          class="relative overflow-hidden rounded-3xl w-full aspect-[2/3] max-h-[300px] lg:h-full lg:max-h-[500px]"
        >
          <img
            :src="`https://image.tmdb.org/t/p/w780${season.poster_path}`"
            :alt="season.name"
            class="w-full h-full object-cover lg:rounded-3xl"
          />
        </div>
      </div>
      <div
        class="z-10 relative flex flex-col flex-1 gap-6 rounded-lg lg:p-6 lg:ml-8 w-full flex-shrink-0 min-h-[300px]"
      >
        <div class="text-left relative flex-row">
          <button
            class="inline-flex items-center gap-2 mb-4 text-sm font-medium dark:text-gray-300 text-gray-700 hover:dark:text-white hover:text-gray-900 transition-colors"
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
              <h1
                class="text-2xl font-bold dark:text-gray-300 text-gray-800 break-words xl:flex-1"
                >{{ season?.name }}</h1
              >
              <!-- Rating inline with title on desktop large, hidden on mobile/tablet (shown below) -->
              <div class="hidden xl:block xl:flex-shrink-0">
                <RatingBadge
                  v-if="season?.vote_average"
                  :rating="season.vote_average"
                />
              </div>
            </div>
            <!-- Rating row (mobile/tablet only, hidden on desktop large) -->
            <div class="flex items-center gap-3 flex-shrink-0 xl:hidden">
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
          <span>{{ formatDateToSpanish(season?.air_date || '', userRegion) }}</span>
        </div>
        <div class="flex items-center gap-2 dark:text-gray-300 text-gray-800">
          <IconEpisodes icon-class="w-5 h-5" />
          <span>{{
            $t('media.episodesCount', {
              count: season?.episodes?.length || 0,
            })
          }}</span>
        </div>

        <!-- Displaying watch providers -->
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
    </section>
  </Section>
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

// Detect mobile/tablet screen size (use mobile style for tablet too)
const checkMobile = () => {
  isMobile.value = window.innerWidth < 1024; // lg breakpoint
};

// Handle resize
const handleResize = () => {
  checkMobile();
};

// Handle back navigation - always go back to the series detail page
const handleBack = () => {
  router.push(`/tv-show/${props.seriesId}`);
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

onMounted(async () => {
  checkMobile();
  window.addEventListener('resize', handleResize);
  // Get user region for date formatting
  userRegion.value = await getUserRegion();
});

onUnmounted(() => {
  window.removeEventListener('resize', handleResize);
});
</script>
