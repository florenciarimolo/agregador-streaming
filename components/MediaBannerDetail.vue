<template>
  <section
    class="relative flex flex-col items-center justify-between gap-16 dark:text-gray-300 text-gray-800 w-full min-w-full flex-shrink-0 min-h-[400px] md:flex-row md:items-stretch md:p-16 md:bg-gray-100/80 dark:md:bg-gray-900/40 md:backdrop-blur-xl md:border md:gap-7 rounded-3xl md:border-gray-300/50 md:dark:border-primary-800 md:shadow-lg md:shadow-primary/20 py-8"
  >
    <div
      class="absolute inset-0 z-0 hidden md:block rounded-3xl"
      :style="sectionStyle"
    ></div>
    <div
      class="absolute z-0 hidden md:block rounded-3xl bg-gray-100/90 dark:bg-gray-900/90"
      style="top: 0px; right: 0px; bottom: 0px; left: 0px"
    ></div>
    <div
      class="relative overflow-hidden rounded-lg shadow-lg shadow-primary/30 w-full max-w-80 md:w-80 flex-shrink-0"
    >
      <RatingBadge :rating="mediaWithProviders.vote_average" />
      <img
        :src="
          `https://image.tmdb.org/t/p/w780` + mediaWithProviders.poster_path
        "
        :alt="mediaWithProviders.title"
        class="object-cover w-full md:w-80"
      />
    </div>
    <div
      class="z-10 relative flex flex-col flex-1 gap-6 rounded-lg md:p-6 md:ml-8 w-full min-w-[300px] flex-shrink-0 min-h-[300px]"
    >
      <div class="text-left relative flex-row">
        <nuxt-link
          to="/"
          class="inline-flex items-center gap-2 mb-4 text-sm font-medium dark:text-gray-300 text-gray-700 hover:dark:text-white hover:text-gray-900 transition-colors"
        >
          <IconArrowLeft icon-class="w-4 h-4" />
          Volver
        </nuxt-link>
        <div class="flex flex-row items-center justify-between gap-2">
          <div>
            <h1 class="text-2xl font-bold dark:text-gray-300 text-gray-800">{{
              mediaWithProviders.title || (mediaWithProviders as any).name
            }}</h1>
          </div>
          <!-- MediaStatusBagde positioned to the right in desktop -->
          <MediaStatusBagde
            v-if="mediaType === MediaTypeEnum.tv || inTheaters"
            :in-production="inProduction"
            :in-theaters="inTheaters"
          />
        </div>
      </div>

      <p
        :class="[
          'dark:text-gray-300 text-gray-800',
          { italic: !mediaWithProviders.overview },
        ]"
        >{{ mediaWithProviders.overview || 'Sin descripción disponible' }}</p
      >
      <div
        class="mt-2 flex items-center gap-2 dark:text-gray-300 text-gray-800"
      >
        <IconCalendar icon-class="w-5 h-5" />
        <span>{{
          formatDateToSpanish(
            mediaWithProviders.release_date ||
              (mediaWithProviders as any).first_air_date ||
              ''
          )
        }}</span>
      </div>
      <div class="flex items-center gap-2 dark:text-gray-300 text-gray-800">
        <IconTag icon-class="w-5 h-5" />
        <span>{{
          mediaWithProviders?.genres
            ?.map((genre: Genre) => genre.name)
            .join(', ') || 'No disponible'
        }}</span>
      </div>
      <!-- Displaying watch providers with their logos-->
      <section class="flex flex-col gap-6">
        <section v-if="hasAvailableProviders" class="flex flex-col gap-8">
          <ProviderList
            :media-provider-prop-list="
              mediaWithProviders.providers?.flatrate || []
            "
            watch-type-prop="Ver en:"
            :media-title="
              mediaWithProviders.title || (mediaWithProviders as any).name || ''
            "
            :original-title="
              mediaWithProviders.original_title ||
              (mediaWithProviders as any).original_name ||
              ''
            "
            :alternative-titles="alternativeTitles"
            :media-type="mediaType"
          />

          <ProviderList
            :media-provider-prop-list="mediaWithProviders.providers?.buy || []"
            watch-type-prop="Compra:"
            :media-title="
              mediaWithProviders.title || (mediaWithProviders as any).name || ''
            "
            :original-title="
              mediaWithProviders.original_title ||
              (mediaWithProviders as any).original_name ||
              ''
            "
            :alternative-titles="alternativeTitles"
            :media-type="mediaType"
          />

          <ProviderList
            :media-provider-prop-list="mediaWithProviders.providers?.rent || []"
            watch-type-prop="Alquiler:"
            :media-title="
              mediaWithProviders.title || (mediaWithProviders as any).name || ''
            "
            :original-title="
              mediaWithProviders.original_title ||
              (mediaWithProviders as any).original_name ||
              ''
            "
            :alternative-titles="alternativeTitles"
            :media-type="mediaType"
          />
        </section>
        <section v-else class="dark:text-gray-400 text-gray-600">
          <p class="italic">No disponible en ninguna plataforma</p>
        </section>
      </section>
    </div>
  </section>
</template>

<script setup lang="ts">
import RatingBadge from './RatingBadge.vue';
import type { Media } from '@/types/Media';
import { computed, onMounted, PropType, ref } from 'vue';
import { onUnmounted } from 'vue';
import { formatDateToSpanish } from '@/utils/formatDate';
import type { Genre } from '@/types/Genre';
import ProviderList from './ProviderList.vue';
import type { Movie } from '@/types/Movie';
import { MediaTypeEnum } from '@/types/enums/MediaTypeEnum';
import MediaStatusBagde from './MediaStatusBagde.vue';
import IconArrowLeft from './icons/IconArrowLeft.vue';
import IconCalendar from './icons/IconCalendar.vue';
import IconTag from './icons/IconTag.vue';

const props = defineProps({
  media: {
    type: Object as PropType<Media>,
    required: true,
  },
  mediaType: {
    type: String as PropType<MediaTypeEnum>,
    required: true,
  },
  inProduction: {
    type: Boolean,
    required: false,
  },
  inTheaters: {
    type: Boolean,
    required: false,
    default: false,
  },
});

const mediaWithProviders = computed(() => props.media as unknown as Movie);

const hasAvailableProviders = computed(() => {
  return (
    (mediaWithProviders.value.providers?.flatrate?.length || 0) > 0 ||
    (mediaWithProviders.value.providers?.buy?.length || 0) > 0 ||
    (mediaWithProviders.value.providers?.rent?.length || 0) > 0
  );
});

// Extract alternative titles for Spain (with types)
const alternativeTitles = computed(() => {
  const media = mediaWithProviders.value as Movie & {
    alternative_titles?: {
      titles: Array<{ title: string; type: string; iso_3166_1: string }>;
    };
  };
  if (media.alternative_titles?.titles) {
    // Filter for Spain and return objects with title and type
    return media.alternative_titles.titles
      .filter((alt) => alt.iso_3166_1 === 'ES')
      .map((alt) => ({ title: alt.title, type: alt.type }));
  }
  return [];
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
});

onUnmounted(() => {
  window.removeEventListener('resize', handleResize);
});

const backgroundImage = computed(() => {
  if (mediaWithProviders.value.backdrop_path) {
    return `https://image.tmdb.org/t/p/w780${mediaWithProviders.value.backdrop_path}`;
  }
  return '';
});

const sectionStyle = computed(() => ({
  backgroundImage: isMobile.value ? '' : `url(${backgroundImage.value})`,
  backgroundSize: isMobile.value ? 'contain' : 'cover',
  backgroundPosition: isMobile.value ? 'center' : 'center',
}));
</script>
