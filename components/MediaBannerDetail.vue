<template>
  <section
    class="relative flex flex-col items-center justify-between gap-20 pb-8 text-white w-full min-w-full flex-shrink-0 min-h-[400px] md:flex-row md:items-stretch md:p-8 md:bg-gray-800 md:border md:gap-7 rounded-xl md:border-primary"
    :style="sectionStyle"
  >
    <div
      class="absolute inset-0 z-0 hidden overflow-hidden md:block rounded-xl bg-gradient-to-b from-black/70 to-black/90"
    ></div>
    <div
      class="relative overflow-hidden rounded-lg shadow-lg shadow-primary/20 w-full max-w-80 md:w-80 flex-shrink-0"
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
      class="z-10 flex flex-col content-start justify-between flex-1 gap-6 rounded-lg md:p-6 md:ml-8 w-full min-w-[300px] flex-shrink-0 min-h-[300px]"
    >
      <div class="text-center md:text-left">
        <h1 class="text-2xl font-bold">{{
          mediaWithProviders.title || (mediaWithProviders as any).name
        }}</h1>
      </div>
      <p class="text-gray-300">{{ mediaWithProviders.overview }}</p>
      <p class="mt-2"
        >Fecha de lanzamiento:
        {{ formatDateToSpanish(mediaWithProviders.release_date || '') }}</p
      >
      <MediaStatusBagde
        v-if="mediaType === MediaTypeEnum.tv"
        :in-production="inProduction"
      />
      <p
        >Géneros:
        {{
          mediaWithProviders?.genres
            ?.map((genre: Genre) => genre.name)
            .join(', ') || 'No disponible'
        }}</p
      >
      <!-- Displaying watch providers with their logos-->
      <section class="flex flex-col gap-6">
        <h2 class="font-semibold text-md">Plataformas</h2>
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
        <section v-else class="text-gray-400">
          <p>No disponible en ninguna plataforma</p>
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
