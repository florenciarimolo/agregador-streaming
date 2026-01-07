<template>
  <nuxt-link
    ref="cardRef"
    :to="`/discover/list/${list.slug}`"
    class="block h-full overflow-hidden rounded-2xl border backdrop-blur-xl transition-all duration-300 dark:bg-gray-900/40 bg-gray-100/80 border-gray-300/50 dark:border-white/10 hover:border-primary-800 dark:hover:border-primary-600/50 hover:shadow-lg hover:shadow-gray-900/20 flashlight-card flex flex-col"
    :aria-label="$t('discover.viewList', { title: list.title })"
    :style="flashlightCardStyle"
  >
    <div class="p-6 relative z-10 flex flex-col flex-1">
      <div class="flex items-start justify-between gap-4 mb-3">
        <h3 class="text-xl font-semibold text-gray-800 dark:text-gray-300">
          {{ list.title }}
        </h3>
        <Badge
          v-if="list.itemCount !== undefined && list.itemCount !== null"
          :label="`${list.itemCount} ${$t('discover.items')}`"
          size="sm"
          class="flex-shrink-0"
        />
      </div>
      <p
        v-if="list.description"
        class="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-4 flex-shrink-0"
      >
        {{ list.description }}
      </p>
      <!-- Preview images fan -->
      <div
        v-if="list.previewPosters && list.previewPosters.length > 0"
        class="flex items-center gap-2 mt-auto"
      >
        <div class="flex -space-x-3">
          <div
            v-for="(poster, index) in list.previewPosters.slice(0, 4)"
            :key="index"
            class="relative w-12 h-16 rounded overflow-hidden"
            :style="{
              zIndex: 10 - index,
              boxShadow: getShadowStyle(index, list.previewPosters.slice(0, 4).length),
            }"
          >
            <img
              v-if="poster"
              :src="getPosterUrl(poster)"
              :alt="`${list.title} preview ${index + 1}`"
              class="w-full h-full object-cover"
            />
            <div
              v-else
              class="w-full h-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center"
            >
              <svg
                class="w-6 h-6 text-gray-400"
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
          </div>
        </div>
        <span
          v-if="list.itemCount && list.itemCount > list.previewPosters.length"
          class="text-sm text-gray-600 dark:text-gray-400 ml-2"
        >
          {{ $t('discover.andMore', { count: list.itemCount - list.previewPosters.length }) }}
        </span>
      </div>
    </div>
  </nuxt-link>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRuntimeConfig } from '#app';
import type { DiscoverList } from '@/composables/database/discoverLists';
import Badge from './Badge.vue';
import { useTheme } from '@/composables/useTheme';
import { Theme } from '@/types/enums/Theme';
import { useFlashlight } from '@/composables/useFlashlight';

interface ExtendedDiscoverList extends DiscoverList {
  itemCount?: number;
  previewPosters?: (string | null)[];
}

interface Props {
  list: ExtendedDiscoverList;
}

const props = defineProps<Props>();
const config = useRuntimeConfig();
const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';
const { theme } = useTheme();
const isDark = computed(() => theme.value === Theme.DARK);

const cardRef = ref<HTMLElement | null>(null);
const { styles, isHovering } = useFlashlight(cardRef);

const flashlightCardStyle = computed(() => {
  if (!isHovering.value) {
    return {
      '--flashlight-bg': 'transparent',
      '--flashlight-border-top': 'transparent',
      '--flashlight-border-right': 'transparent',
      '--flashlight-border-bottom': 'transparent',
      '--flashlight-border-left': 'transparent',
    } as Record<string, string>;
  }
  
  return {
    '--flashlight-bg': styles.value.backgroundStyle,
    '--flashlight-border-top': styles.value.borderTopStyle,
    '--flashlight-border-right': styles.value.borderRightStyle,
    '--flashlight-border-bottom': styles.value.borderBottomStyle,
    '--flashlight-border-left': styles.value.borderLeftStyle,
  } as Record<string, string>;
});

function getPosterUrl(posterPath: string | null): string {
  if (!posterPath) return '';
  if (posterPath.startsWith('http')) return posterPath;
  return `${TMDB_IMAGE_BASE_URL}${posterPath}`;
}

function getShadowStyle(index: number, totalImages: number): string {
  // Add right shadow to all images using a light tone of primary color (#c7d2fe = primary-200)
  return `1px 0 2px rgba(199, 210, 254, 0.4)`;
}
</script>

<style scoped>
.flashlight-card::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  pointer-events: none;
  background: var(--flashlight-bg, transparent);
  opacity: var(--flashlight-opacity, 0);
  transition: opacity 0.2s ease-out;
  z-index: 1;
}

.flashlight-card::after {
  content: '';
  position: absolute;
  inset: -1px;
  border-radius: inherit;
  pointer-events: none;
  background-image: 
    var(--flashlight-border-top, transparent),
    var(--flashlight-border-right, transparent),
    var(--flashlight-border-bottom, transparent),
    var(--flashlight-border-left, transparent);
  background-size: 100% 1px, 1px 100%, 100% 1px, 1px 100%;
  background-position: top, right, bottom, left;
  background-repeat: no-repeat;
  opacity: var(--flashlight-opacity, 0);
  transition: opacity 0.2s ease-out;
  z-index: 0;
  mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  mask-composite: exclude;
  -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  padding: 1px;
}

.flashlight-card:hover::before,
.flashlight-card:hover::after {
  --flashlight-opacity: 1;
}
</style>

