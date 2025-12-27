<template>
  <div
    class="group relative dark:bg-gray-800/50 bg-white rounded-lg overflow-hidden border border-primary/20 hover:border-primary/40 transition-all duration-300 hover:shadow-lg hover:shadow-primary/10"
  >
    <!-- Poster -->
    <nuxt-link
      :to="`/${mediaType}/${props.title.tmdb_id}`"
      class="block aspect-[2/3] relative overflow-hidden bg-gray-800 rounded-t-lg"
    >
      <img
        v-if="props.title.poster_path"
        :src="`https://image.tmdb.org/t/p/w500${props.title.poster_path}`"
        :alt="props.title.title"
        class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
        loading="lazy"
        decoding="async"
      />
      <div
        v-else
        class="w-full h-full flex items-center justify-center text-gray-400"
      >
        <svg
          class="w-12 h-12"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
      </div>

      <!-- Rating Badge (top-right) -->
      <RatingBadge
        v-if="props.title.vote_average"
        :rating="props.title.vote_average"
        class="absolute top-2 right-2 z-10"
      />

      <!-- Bookmark Icon (top-left) -->
      <button
        type="button"
        aria-label="Guardar para después"
        class="absolute top-2 left-2 z-10 p-2 rounded-full bg-black/50 hover:bg-black/70 backdrop-blur-sm transition-all duration-300"
        @click.stop="$emit('save-for-later', props.title)"
      >
        <svg
          class="w-5 h-5 text-white"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
          />
        </svg>
      </button>

      <!-- Hover Overlay (same as MediaCarousel) -->
      <div
        class="absolute bottom-0 left-0 flex flex-col items-center justify-center w-full h-full px-4 transition-all duration-300 opacity-0 rounded-xl group-hover:opacity-100 group-hover:shadow-primary/40 group-hover:shadow-xl backdrop-blur-md dark:bg-black/80 bg-white/80 border border-primary/20"
      >
        <RatingBadge
          v-if="props.title.vote_average"
          :rating="props.title.vote_average"
        />
        <p class="mt-4 dark:text-white text-gray-900 font-semibold">
          Ver detalles
        </p>
      </div>
    </nuxt-link>

    <!-- Content -->
    <div class="p-4">
      <h3
        class="text-sm font-semibold dark:text-white text-gray-900 truncate mb-1"
      >
        {{ props.title.title }}
      </h3>
      <p class="text-xs dark:text-gray-300 text-gray-500 mb-2">
        {{ props.title.type === 'movie' ? 'Película' : 'Serie' }}
      </p>

      <!-- Overview (instead of explanation) -->
      <p
        v-if="props.title.overview"
        class="text-xs dark:text-gray-300 text-gray-600 mb-3 line-clamp-3"
      >
        {{ props.title.overview }}
      </p>
      <p v-else class="text-xs dark:text-gray-300 text-gray-600 mb-3 italic">
        Sin descripción disponible
      </p>

      <!-- Providers (logos only, no names) -->
      <div
        v-if="props.title.providers && props.title.providers.length > 0"
        class="flex flex-wrap gap-2"
      >
        <img
          v-for="provider in providersWithLogos"
          :key="provider.provider_id"
          :src="`https://image.tmdb.org/t/p/w45${provider.logo_path}`"
          :alt="provider.provider_name"
          class="w-8 h-8 object-contain rounded"
          :title="provider.provider_name"
        />
      </div>
      <div v-else class="text-xs dark:text-gray-400 text-gray-500 italic">
        No disponible en ninguna plataforma
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import RatingBadge from './RatingBadge.vue';

interface Provider {
  provider_id: number;
  provider_name: string;
  logo_path: string | null;
}

interface Recommendation {
  id: string;
  tmdb_id: number;
  title: string;
  type: 'movie' | 'tv';
  poster_path: string | null;
  overview: string | null;
  vote_average: number | null;
  genres: number[] | null;
  release_date: string | null;
  first_air_date: string | null;
  explanation: string;
  providers?: Provider[];
}

interface Props {
  title: Recommendation;
}

const props = defineProps<Props>();

defineEmits<{
  'save-for-later': [title: Recommendation];
}>();

const mediaType = computed(() =>
  props.title.type === 'movie' ? 'pelicula' : 'serie'
);

// Filter providers that have logos
const providersWithLogos = computed(() => {
  if (!props.title.providers) return [];
  return props.title.providers
    .filter((provider) => provider.logo_path)
    .slice(0, 6);
});
</script>
