<template>
  <div
    class="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6"
  >
    <div
      v-for="title in titles"
      :key="title.id"
      class="relative rounded-lg border backdrop-blur-xl transition-all duration-300 group dark:bg-gray-900/40 bg-gray-100/80 border-gray-300/50 dark:border-white/10 hover:border-gray-400/50 dark:hover:border-white/20 hover:shadow-lg hover:shadow-gray-900/20"
    >
      <!-- Poster -->
      <nuxt-link
        :to="`/${title.type === MediaTypeEnum.movie ? 'pelicula' : 'serie'}/${title.tmdb_id}`"
        :aria-label="$t('media.viewDetailsOf', { title: title.title })"
        class="block aspect-[2/3] relative bg-gray-800 rounded-t-lg focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
      >
        <div
          v-if="title.poster_path"
          class="overflow-hidden w-full h-full rounded-t-lg"
        >
          <img
            :src="`https://image.tmdb.org/t/p/w500${title.poster_path}`"
            :alt="$t('media.posterOf', { title: title.title })"
            class="object-cover w-full h-full transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
            decoding="async"
          />
        </div>
        <div
          v-else
          class="flex overflow-hidden justify-center items-center w-full h-full text-gray-400 rounded-t-lg"
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
        <IconButton
          v-if="onLike"
          :aria-label="likeLabel || $t('media.liked')"
          size="small"
          variant="default"
          :custom-class="`tooltip-container absolute top-2 left-2 z-20 p-2 rounded-full backdrop-blur-sm pointer-events-auto ${
            title.liked === true
              ? 'bg-primary-800 text-white border border-gray-700/50 dark:bg-primary-600/70 dark:border-primary-800 hover:bg-primary-900 dark:hover:bg-primary-600'
              : 'bg-black/50 hover:bg-red-500/80'
          }`"
          @click.stop.prevent="onLike(title)"
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
        </IconButton>

        <!-- Remove Button (top-right) -->
        <IconButton
          v-if="onRemove"
          :aria-label="removeLabel || $t('common.delete')"
          size="small"
          variant="default"
          custom-class="absolute top-2 right-2 z-20 p-2 rounded-full backdrop-blur-sm pointer-events-auto tooltip-container bg-black/50 hover:bg-red-600/80"
          @click.stop.prevent="onRemove(title)"
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
        </IconButton>

        <!-- Hover Overlay (same as RecommendationCard) -->
        <div
          class="flex absolute bottom-0 left-0 flex-col justify-center items-center px-4 w-full h-full opacity-0 backdrop-blur-md transition-all duration-300 group-hover:opacity-100 dark:bg-black/80 bg-white/80"
        >
          <p class="font-semibold text-gray-800 dark:text-gray-300">
            {{ $t('media.viewDetails') }}
          </p>
        </div>
      </nuxt-link>

      <!-- Title -->
      <div class="p-4">
        <h3
          class="mb-1 text-sm font-semibold text-gray-800 truncate dark:text-gray-300"
        >
          {{ title.title }}
        </h3>
        <p class="mb-2 text-xs text-gray-500 dark:text-gray-300">
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
import IconButton from '@/components/ui/IconButton.vue';

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
