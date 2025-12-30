<template>
  <article
    class="group relative dark:bg-gray-800/60 bg-white/90 backdrop-blur-sm rounded-lg border border-gray-700/30 dark:border-gray-600/30 hover:border-gray-600/50 dark:hover:border-gray-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-gray-900/20"
    :aria-label="`Recomendación: ${props.title.title}`"
  >
    <!-- Poster -->
    <nuxt-link
      :to="`/${mediaType}/${props.title.tmdb_id}`"
      :aria-label="`Ver detalles de ${props.title.title}`"
      class="block aspect-[2/3] relative bg-gray-800 rounded-t-lg focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
    >
      <div
        v-if="props.title.poster_path"
        class="w-full h-full overflow-hidden rounded-t-lg"
      >
        <img
          :src="`https://image.tmdb.org/t/p/w500${props.title.poster_path}`"
          :alt="`Poster de ${props.title.title}`"
          class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
          decoding="async"
        />
      </div>
      <div
        v-else
        class="w-full h-full flex items-center justify-center text-gray-400 overflow-hidden rounded-t-lg"
        role="img"
        :aria-label="`Sin poster disponible para ${props.title.title}`"
      >
        <svg
          class="w-12 h-12"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
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

      <!-- Action Buttons (top-left) -->
      <div
        class="absolute top-2 left-2 z-20 flex gap-2 pointer-events-auto"
        role="group"
        aria-label="Acciones de recomendación"
        @click.stop.prevent
        @mousedown.stop.prevent
      >
        <button
          type="button"
          :aria-label="`Marcar ${props.title.title} como ya vista`"
          class="tooltip-container p-2 rounded-full bg-black/50 hover:bg-green-600/80 backdrop-blur-sm transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:ring-offset-black/50"
          @click.stop.prevent="$emit('mark-seen', props.title)"
          @mousedown.stop.prevent
        >
          <svg
            class="w-4 h-4 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M5 13l4 4L19 7"
            />
          </svg>
          <span class="tooltip">Ya la he visto</span>
        </button>
        <button
          type="button"
          :aria-label="`Marcar ${props.title.title} como no me interesa`"
          class="tooltip-container p-2 rounded-full bg-black/50 hover:bg-red-600/80 backdrop-blur-sm transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-black/50"
          @click.stop.prevent="$emit('mark-not-interested', props.title)"
          @mousedown.stop.prevent
        >
          <svg
            class="w-4 h-4 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
          <span class="tooltip">No me interesa</span>
        </button>
      </div>

      <!-- Hover Overlay (same as MediaCarousel) -->
      <div
        class="absolute bottom-0 left-0 flex flex-col items-center justify-center w-full h-full px-4 transition-all duration-300 opacity-0 rounded-xl group-hover:opacity-100 group-hover:shadow-primary/40 group-hover:shadow-xl backdrop-blur-md dark:bg-black/80 bg-white/80 border border-primary/20"
      >
        <RatingBadge
          v-if="props.title.vote_average"
          :rating="props.title.vote_average"
        />
        <p class="mt-4 dark:text-gray-300 text-gray-800 font-semibold">
          Ver detalles
        </p>
      </div>
    </nuxt-link>

    <!-- Content -->
    <div class="p-4">
      <h3
        class="text-sm font-semibold dark:text-gray-300 text-gray-800 truncate mb-1"
      >
        {{ props.title.title }}
      </h3>
      <p class="text-xs dark:text-gray-300 text-gray-500 mb-2">
        {{ props.title.type === 'movie' ? 'Película' : 'Serie' }}
      </p>

      <!-- Overview (instead of explanation) -->
      <p
        v-if="props.title.overview"
        class="text-xs dark:text-gray-300 text-gray-800 mb-3 line-clamp-3"
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
  </article>
</template>

<script setup lang="ts">
import RatingBadge from './RatingBadge.vue';
import type { Recommendation } from '@/types/Recommendation';

interface Props {
  title: Recommendation;
}

const props = defineProps<Props>();

defineEmits<{
  'mark-seen': [title: Recommendation];
  'mark-not-interested': [title: Recommendation];
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

<style scoped>
/* Tooltip styles */
.tooltip-container {
  position: relative;
  z-index: 20;
}

/* Ensure tooltips can escape overflow containers */
.tooltip-container:hover,
.tooltip-container:focus {
  z-index: 10000;
}

.tooltip {
  position: absolute;
  top: calc(100% + 8px);
  left: 50%;
  transform: translateX(-50%) translateY(4px);
  background-color: rgba(0, 0, 0, 0.95);
  color: white;
  padding: 6px 10px;
  border-radius: 6px;
  font-size: 12px;
  white-space: nowrap;
  pointer-events: none;
  opacity: 0;
  transition:
    opacity 0.2s ease-in-out,
    transform 0.2s ease-in-out;
  z-index: 9999;
  margin-top: 0;
}

.tooltip::after {
  content: '';
  position: absolute;
  bottom: 100%;
  left: 50%;
  transform: translateX(-50%);
  border: 4px solid transparent;
  border-bottom-color: rgba(0, 0, 0, 0.95);
}

.tooltip-container:hover .tooltip,
.tooltip-container:focus .tooltip {
  opacity: 1;
  transform: translateX(-50%) translateY(0);
}

/* Ensure tooltip is visible on focus for keyboard navigation */
.tooltip-container:focus-visible .tooltip {
  opacity: 1;
  transform: translateX(-50%) translateY(0);
}

/* Ensure article allows tooltip overflow while maintaining rounded corners */
article {
  overflow: visible;
}

/* Poster link doesn't need overflow-hidden anymore - handled by inner div */
article > a {
  border-radius: 0.5rem 0.5rem 0 0;
}

/* Ensure content area also has proper overflow and rounded corners */
article > div:last-child {
  overflow: hidden;
  border-radius: 0 0 0.5rem 0.5rem;
}

/* Ensure buttons container can show tooltips outside overflow */
article > a > div[role='group'] {
  overflow: visible;
}
</style>
