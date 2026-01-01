<template>
  <article
    class="group relative dark:bg-gray-900/40 bg-gray-100/80 backdrop-blur-xl rounded-lg border border-gray-300/50 dark:border-white/10 hover:border-gray-400/50 dark:hover:border-white/20 transition-all duration-300 hover:shadow-lg hover:shadow-gray-900/20"
    :aria-label="$t('media.recommendationLabel', { title: props.title.title })"
  >
    <!-- Poster -->
    <nuxt-link
      :to="`/${mediaType}/${props.title.tmdb_id}`"
      :aria-label="$t('media.viewDetailsOf', { title: props.title.title })"
      class="block aspect-[2/3] relative bg-gray-800 rounded-t-lg focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
    >
      <div
        v-if="props.title.poster_path"
        class="w-full h-full overflow-hidden rounded-t-lg"
      >
        <img
          :src="`https://image.tmdb.org/t/p/w500${props.title.poster_path}`"
          :alt="$t('media.posterOf', { title: props.title.title })"
          class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
          decoding="async"
        />
      </div>
      <div
        v-else
        class="w-full h-full flex items-center justify-center text-gray-600 dark:text-gray-500 overflow-hidden rounded-t-lg"
        role="img"
        :aria-label="
          $t('media.noPosterAvailableFor', { title: props.title.title })
        "
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

      <!-- Rating Badge (top-left) -->
      <RatingBadge
        v-if="props.title.vote_average"
        :rating="props.title.vote_average"
        class="absolute top-2 left-2 z-10"
      />

      <!-- Watchlist Badge (top-left, below rating if rating exists) -->
      <div
        v-if="props.title.in_watchlist"
        class="absolute left-2 z-10 p-2 rounded-full bg-primary/80 backdrop-blur-sm"
        :class="props.title.vote_average ? 'top-12' : 'top-2'"
        :title="$t('media.savedWatchlist')"
      >
        <IconClock icon-class="w-4 h-4 text-white" />
      </div>

      <!-- Actions Menu (top-right) -->
      <div class="absolute top-2 right-2 z-20">
        <button
          type="button"
          :aria-label="$t('media.actionsMenuFor', { title: props.title.title })"
          class="menu-button p-2 rounded-full bg-black/50 hover:bg-gray-700/80 backdrop-blur-sm transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-black/50"
          @click.stop.prevent="showMenu = !showMenu"
          @mousedown.stop.prevent
        >
          <IconMoreVertical icon-class="w-4 h-4 text-white" />
        </button>

        <!-- Dropdown Menu -->
        <Transition
          enter-active-class="transition duration-200 ease-out"
          enter-from-class="transform scale-95 opacity-0"
          enter-to-class="transform scale-100 opacity-100"
          leave-active-class="transition duration-150 ease-in"
          leave-from-class="transform scale-100 opacity-100"
          leave-to-class="transform scale-95 opacity-0"
        >
          <div
            v-if="showMenu"
            class="absolute right-0 mt-2 w-48 dark:bg-gray-900/40 bg-gray-100/80 backdrop-blur-xl rounded-lg border border-gray-300/50 dark:border-white/10 z-50"
            @click.stop
          >
            <div class="p-4">
              <button
                type="button"
                class="w-full px-4 py-2 text-sm dark:text-gray-300 text-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors text-left flex items-center gap-2 mb-2"
                @click.stop.prevent="handleAction(TitleStatus.SEEN)"
              >
                <svg
                  class="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                {{ $t('media.seen') }}
              </button>
              <button
                type="button"
                class="w-full px-4 py-2 text-sm dark:text-gray-300 text-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors text-left flex items-center gap-2 mb-2"
                @click.stop.prevent="handleAction('liked')"
              >
                <svg
                  class="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                  />
                </svg>
                {{ $t('media.liked') }}
              </button>
              <button
                type="button"
                class="w-full px-4 py-2 text-sm dark:text-gray-300 text-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors text-left flex items-center gap-2 mb-2"
                @click.stop.prevent="handleAction(TitleStatus.NOT_INTERESTED)"
              >
                <svg
                  class="w-4 h-4"
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
                {{ $t('media.notInterested') }}
              </button>
              <button
                type="button"
                class="w-full px-4 py-2 text-sm dark:text-gray-300 text-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors text-left flex items-center gap-2"
                @click.stop.prevent="handleAction(TitleStatus.WATCHLIST)"
              >
                <svg
                  class="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                {{ $t('media.watchLater') }}
              </button>
            </div>
          </div>
        </Transition>
      </div>

      <!-- Hover Overlay (same as MediaCarousel) -->
      <div
        class="absolute bottom-0 left-0 flex flex-col items-center justify-center w-full h-full px-4 transition-all duration-300 opacity-0 group-hover:opacity-100 backdrop-blur-md dark:bg-black/80 bg-white/80"
      >
        <p class="dark:text-gray-300 text-gray-800 font-semibold">
          {{ $t('media.viewDetails') }}
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
      <p class="text-xs dark:text-gray-300 text-gray-700 mb-2">
        {{
          props.title.type === MediaTypeEnum.movie
            ? $t('media.movie')
            : $t('media.series')
        }}
      </p>

      <!-- Overview (instead of explanation) -->
      <p
        v-if="props.title.overview"
        class="text-xs dark:text-gray-300 text-gray-800 mb-3 line-clamp-3"
      >
        {{ props.title.overview }}
      </p>
      <p v-else class="text-xs dark:text-gray-300 text-gray-700 mb-3 italic">
        {{ $t('media.noDescriptionAvailable') }}
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
      <div v-else class="text-xs dark:text-gray-300 text-gray-700 italic">
        {{ $t('media.noPlatforms') }}
      </div>
    </div>
  </article>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import RatingBadge from './RatingBadge.vue';
import IconMoreVertical from './icons/IconMoreVertical.vue';
import IconClock from './icons/IconClock.vue';
import { TitleStatus } from '@/types/TitleStatus';
import { MediaTypeEnum } from '@/types/enums/MediaTypeEnum';
import type { Recommendation } from '@/types/Recommendation';

interface Props {
  title: Recommendation;
}

const props = defineProps<Props>();

const showMenu = ref(false);

const emit = defineEmits<{
  'mark-seen': [title: Recommendation];
  'mark-not-interested': [title: Recommendation];
  'mark-liked': [title: Recommendation];
  'mark-watchlist': [title: Recommendation];
}>();

const handleAction = (action: TitleStatus | 'liked') => {
  showMenu.value = false;
  if (action === TitleStatus.SEEN) {
    emit('mark-seen', props.title);
  } else if (action === 'liked') {
    emit('mark-liked', props.title);
  } else if (action === TitleStatus.NOT_INTERESTED) {
    emit('mark-not-interested', props.title);
  } else if (action === TitleStatus.WATCHLIST) {
    emit('mark-watchlist', props.title);
  }
};

// Close menu when clicking outside
const handleClickOutside = (event: MouseEvent) => {
  const target = event.target as HTMLElement;
  if (!target.closest('.menu-button') && !target.closest('.absolute.right-0')) {
    showMenu.value = false;
  }
};

onMounted(() => {
  document.addEventListener('click', handleClickOutside);
});

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
});

const mediaType = computed(() =>
  props.title.type === MediaTypeEnum.movie ? 'pelicula' : 'serie'
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

/* Poster link - no overflow-hidden here to allow tooltips to escape */
article > a {
  border-radius: 0.5rem 0.5rem 0 0;
  position: relative;
  overflow: visible;
}

/* Image container needs overflow-hidden to contain scaled image */
article > a > div:first-of-type {
  overflow: hidden;
  border-radius: 0.5rem 0.5rem 0 0;
}

/* Buttons container needs to escape overflow for tooltips */
article > a > div[role='group'] {
  overflow: visible;
  position: absolute;
  z-index: 30;
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
