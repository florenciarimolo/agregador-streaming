<template>
  <div
    class="group relative dark:bg-gray-800/50 bg-white rounded-lg overflow-hidden border border-primary/20 hover:border-primary/40 transition-all duration-300 hover:shadow-lg hover:shadow-primary/10"
  >
    <!-- Poster -->
    <nuxt-link
      :to="`/${mediaType}/${title.tmdb_id}`"
      class="block aspect-[2/3] relative overflow-hidden bg-gray-800"
    >
      <img
        v-if="title.poster_path"
        :src="`https://image.tmdb.org/t/p/w500${title.poster_path}`"
        :alt="title.title"
        class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
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

      <!-- Overlay on hover -->
      <div
        class="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-4"
      >
        <div class="text-white">
          <p class="text-sm font-medium mb-1">{{ title.title }}</p>
          <p class="text-xs text-gray-300">{{ title.explanation }}</p>
        </div>
      </div>
    </nuxt-link>

    <!-- Content -->
    <div class="p-4">
      <div class="flex items-start justify-between mb-2">
        <div class="flex-1 min-w-0">
          <h3
            class="text-sm font-semibold dark:text-white text-gray-900 truncate mb-1"
          >
            {{ title.title }}
          </h3>
          <p class="text-xs dark:text-gray-300 text-gray-500 mb-2">
            {{ mediaType === 'movie' ? 'Película' : 'Serie' }}
          </p>
        </div>
        <RatingBadge
          v-if="title.vote_average"
          :rating="title.vote_average"
          class="flex-shrink-0"
        />
      </div>

      <!-- Explanation -->
      <p class="text-xs dark:text-gray-300 text-gray-600 mb-3 line-clamp-2">
        {{ title.explanation }}
      </p>

      <!-- Providers -->
      <div v-if="title.providers && title.providers.length > 0" class="mb-3">
        <p class="text-xs dark:text-gray-400 text-gray-500 mb-2">
          Disponible en:
        </p>
        <div class="flex flex-wrap gap-2">
          <div
            v-for="provider in title.providers.slice(0, 4)"
            :key="provider.provider_id"
            class="flex items-center gap-1.5 px-2 py-1 bg-gray-100 dark:bg-gray-700/50 rounded-md"
          >
            <img
              v-if="provider.logo_path"
              :src="`https://image.tmdb.org/t/p/w45${provider.logo_path}`"
              :alt="provider.provider_name"
              class="w-5 h-5 object-contain"
            />
            <span class="text-xs dark:text-gray-300 text-gray-600">
              {{ provider.provider_name }}
            </span>
          </div>
          <span
            v-if="title.providers.length > 4"
            class="text-xs dark:text-gray-400 text-gray-500 px-2 py-1"
          >
            +{{ title.providers.length - 4 }} más
          </span>
        </div>
      </div>
      <div v-else class="text-xs dark:text-gray-400 text-gray-500 italic mb-3">
        No disponible en ninguna plataforma
      </div>

      <!-- Actions -->
      <div class="flex gap-2">
        <nuxt-link
          :to="`/${mediaType}/${title.tmdb_id}`"
          class="flex-1 px-3 py-2 bg-gradient-to-r from-primary via-accent to-secondary hover:from-secondary hover:via-pink-500 hover:to-primary text-white text-xs font-medium rounded-lg transition-all duration-300 text-center"
        >
          Ver ahora
        </nuxt-link>
        <button
          type="button"
          class="px-3 py-2 border border-primary/30 text-primary dark:text-primary-400 text-xs font-medium rounded-lg hover:bg-primary/10 transition-colors"
          @click="$emit('save-for-later', title)"
        >
          Guardar
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
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
</script>
