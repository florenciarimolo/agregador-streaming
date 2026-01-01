<template>
  <div
    class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4"
  >
    <div
      v-for="title in titles"
      :key="title.id"
      class="group relative dark:bg-gray-900/40 bg-gray-100/80 backdrop-blur-xl rounded-lg border border-gray-300/50 dark:border-white/10 hover:border-gray-400/50 dark:hover:border-white/20 transition-all duration-300 hover:shadow-lg hover:shadow-gray-900/20"
    >
      <!-- Poster -->
      <nuxt-link
        :to="`/${title.type === MediaTypeEnum.movie ? 'pelicula' : 'serie'}/${title.tmdb_id}`"
        :aria-label="$t('media.viewDetailsOf', { title: title.title })"
        class="block aspect-[2/3] relative bg-gray-800 rounded-t-lg focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
      >
        <div
          v-if="title.poster_path"
          class="w-full h-full overflow-hidden rounded-t-lg"
        >
          <img
            :src="`https://image.tmdb.org/t/p/w500${title.poster_path}`"
            :alt="$t('media.posterOf', { title: title.title })"
            class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
            decoding="async"
          />
        </div>
        <div
          v-else
          class="w-full h-full flex items-center justify-center text-gray-400 overflow-hidden rounded-t-lg"
          role="img"
          :aria-label="$t('media.noPosterAvailableFor', { title: title.title })"
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

        <!-- Like Button (top-left) -->
        <button
          v-if="onLike"
          type="button"
          :class="[
            'tooltip-container absolute top-2 left-2 z-20 p-2 rounded-full backdrop-blur-sm transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-black/50 pointer-events-auto',
            title.liked === true
              ? 'bg-primary-800 text-white border border-gray-700/50 dark:bg-primary-600/70 dark:border-primary-800 hover:bg-primary-900 dark:hover:bg-primary-600 focus:ring-primary'
              : 'bg-black/50 hover:bg-red-500/80 focus:ring-red-500',
          ]"
          :aria-label="likeLabel || $t('media.liked')"
          :title="likeLabel || $t('media.liked')"
          @click.stop.prevent="onLike(title)"
          @mousedown.stop.prevent
        >
          <svg
            class="w-4 h-4 text-white"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
            />
          </svg>
          <span class="tooltip">{{ likeLabel || $t('media.liked') }}</span>
        </button>

        <!-- Remove Button (top-right) -->
        <button
          v-if="onRemove"
          type="button"
          class="tooltip-container absolute top-2 right-2 z-20 p-2 rounded-full bg-black/50 hover:bg-red-600/80 backdrop-blur-sm transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-black/50 pointer-events-auto"
          :aria-label="removeLabel || $t('common.delete')"
          :title="removeLabel || $t('common.delete')"
          @click.stop.prevent="onRemove(title)"
          @mousedown.stop.prevent
        >
          <svg
            class="w-4 h-4 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
          <span class="tooltip">{{ removeLabel || $t('common.delete') }}</span>
        </button>

        <!-- Hover Overlay (same as RecommendationCard) -->
        <div
          class="absolute bottom-0 left-0 flex flex-col items-center justify-center w-full h-full px-4 transition-all duration-300 opacity-0 group-hover:opacity-100 backdrop-blur-md dark:bg-black/80 bg-white/80"
        >
          <p class="dark:text-gray-300 text-gray-800 font-semibold">
            {{ $t('media.viewDetails') }}
          </p>
        </div>
      </nuxt-link>

      <!-- Title -->
      <div class="p-4">
        <h3
          class="text-sm font-semibold dark:text-gray-300 text-gray-800 truncate mb-1"
        >
          {{ title.title }}
        </h3>
        <p class="text-xs dark:text-gray-300 text-gray-500 mb-2">
          {{
            title.type === MediaTypeEnum.movie
              ? $t('media.movie')
              : $t('media.series')
          }}
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { MediaTypeEnum } from '@/types/enums/MediaTypeEnum';
import { watch } from 'vue';

interface Title {
  id: string;
  title: string;
  type: typeof MediaTypeEnum.movie | typeof MediaTypeEnum.tv;
  poster_path: string | null;
  tmdb_id: number;
  liked?: boolean;
}

interface Props {
  titles: Title[];
  onRemove?: (title: Title) => void;
  removeLabel?: string;
  onLike?: (title: Title) => void;
  likeLabel?: string;
}

const props = defineProps<Props>();

// Debug: log titles with liked status
if (import.meta.dev && props.onLike) {
  watch(
    () => props.titles,
    (titles) => {
      titles.forEach((title) => {
        if (title.liked !== undefined) {
          console.log(
            '[TitleGrid] Title:',
            title.title,
            'liked:',
            title.liked,
            'type:',
            typeof title.liked
          );
        }
      });
    },
    { immediate: true, deep: true }
  );
}
</script>

<style scoped>
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

.tooltip-container:focus-visible .tooltip {
  opacity: 1;
  transform: translateX(-50%) translateY(0);
}

div[class*='group relative'] {
  overflow: visible;
}
</style>
