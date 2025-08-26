<template>
  <section
    class="relative flex flex-col items-center justify-between gap-20 pb-8 text-white md:flex-row md:p-8 md:bg-gray-800 md:border md:gap-7 rounded-xl md:border-primary"
    :style="sectionStyle"
  >
    <div
      class="absolute inset-0 z-0 hidden overflow-hidden md:block rounded-xl bg-gradient-to-b from-black/70 to-black/90"
    ></div>
    <div
      class="relative overflow-hidden rounded-lg shadow-lg shadow-primary/20 max-w-80"
    >
      <RatingBadge :rating="movieWithProviders.vote_average" />
      <img
        :src="
          `https://image.tmdb.org/t/p/w780` + movieWithProviders.poster_path
        "
        :alt="movieWithProviders.title"
        class="object-cover w-full md:w-80"
      />
    </div>
    <div
      class="z-10 flex flex-col content-start justify-between flex-1 gap-6 rounded-lg md:p-6 md:ml-8"
    >
      <h1 class="text-2xl font-bold text-center md:text-left">{{
        movieWithProviders.title
      }}</h1>
      <p class="text-gray-300">{{ movieWithProviders.overview }}</p>
      <p class="mt-2"
        >Fecha de lanzamiento:
        {{ formatDateToSpanish(movieWithProviders.release_date || '') }}</p
      >
      <MediaStatusBagde
        v-if="mediaType === MediaTypeEnum.tv"
        :in-production="inProduction"
      />
      <p
        >Géneros:
        {{
          movieWithProviders?.genres
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
              movieWithProviders.providers?.flatrate || []
            "
            watch-type-prop="Ver en:"
          />

          <ProviderList
            :media-provider-prop-list="movieWithProviders.providers?.buy || []"
            watch-type-prop="Compra:"
          />

          <ProviderList
            :media-provider-prop-list="movieWithProviders.providers?.rent || []"
            watch-type-prop="Alquiler:"
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

const movieWithProviders = computed(() => props.media as unknown as Movie);

const hasAvailableProviders = computed(() => {
  return (
    (movieWithProviders.value.providers?.flatrate?.length || 0) > 0 ||
    (movieWithProviders.value.providers?.buy?.length || 0) > 0 ||
    (movieWithProviders.value.providers?.rent?.length || 0) > 0
  );
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
  if (movieWithProviders.value.backdrop_path) {
    return `https://image.tmdb.org/t/p/w780${movieWithProviders.value.backdrop_path}`;
  }
  return '';
});

const sectionStyle = computed(() => ({
  backgroundImage: isMobile.value ? '' : `url(${backgroundImage.value})`,
  backgroundSize: isMobile.value ? 'contain' : 'cover',
  backgroundPosition: isMobile.value ? 'center' : 'center',
}));
</script>
