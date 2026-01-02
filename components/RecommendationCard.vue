<template>
  <article
    class="relative rounded-lg border backdrop-blur-xl transition-all duration-300 group dark:bg-gray-900/40 bg-gray-100/80 border-gray-300/50 dark:border-white/10 hover:border-gray-400/50 dark:hover:border-white/20 hover:shadow-lg hover:shadow-gray-900/20"
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
        class="overflow-hidden w-full h-full rounded-t-lg"
      >
        <img
          :src="`https://image.tmdb.org/t/p/w500${props.title.poster_path}`"
          :alt="$t('media.posterOf', { title: props.title.title })"
          class="object-cover w-full h-full transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
          decoding="async"
        />
      </div>
      <div
        v-else
        class="flex overflow-hidden justify-center items-center w-full h-full text-gray-600 rounded-t-lg dark:text-gray-500"
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
        class="absolute left-2 z-10 p-2 rounded-full backdrop-blur-sm bg-primary/80"
        :class="props.title.vote_average ? 'top-12' : 'top-2'"
        :title="$t('media.savedWatchlist')"
      >
        <IconClock icon-class="w-4 h-4 text-white" />
      </div>

      <!-- Actions Menu (top-right) -->
      <div class="absolute top-2 right-2 z-20">
        <IconButton
          :icon="IconMoreVertical"
          :aria-label="$t('media.actionsMenuFor', { title: props.title.title })"
          size="small"
          variant="default"
          custom-class="menu-button p-2 rounded-full bg-black/50 hover:bg-gray-700/80 backdrop-blur-sm transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-black/50 [&>svg]:text-white"
          @click.stop.prevent="showMenu = !showMenu"
        />

        <!-- Dropdown Menu -->
        <Transition
          enter-active-class="transition duration-200 ease-out"
          enter-from-class="opacity-0 transform scale-95"
          enter-to-class="opacity-100 transform scale-100"
          leave-active-class="transition duration-150 ease-in"
          leave-from-class="opacity-100 transform scale-100"
          leave-to-class="opacity-0 transform scale-95"
        >
          <div
            v-if="showMenu"
            class="absolute right-0 z-50 mt-2 w-48 rounded-lg border backdrop-blur-xl dark:bg-gray-900/40 bg-gray-100/80 border-gray-300/50 dark:border-white/10"
            @click.stop
          >
            <div class="p-4">
              <Button
                type="button"
                variant="ghost"
                size="small"
                custom-class="justify-start mb-2 w-full text-left"
                @click.stop.prevent="handleAction(TitleStatus.SEEN)"
              >
                <template #icon>
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
                </template>
                {{ $t('media.seen') }}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="small"
                custom-class="justify-start mb-2 w-full text-left"
                @click.stop.prevent="handleAction('liked')"
              >
                <template #icon>
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
                </template>
                {{ $t('media.liked') }}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="small"
                custom-class="justify-start mb-2 w-full text-left"
                @click.stop.prevent="handleAction(TitleStatus.NOT_INTERESTED)"
              >
                <template #icon>
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
                </template>
                {{ $t('media.notInterested') }}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="small"
                custom-class="justify-start w-full text-left"
                @click.stop.prevent="handleAction(TitleStatus.WATCHLIST)"
              >
                <template #icon>
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
                </template>
                {{ $t('media.watchLater') }}
              </Button>
            </div>
          </div>
        </Transition>
      </div>

      <!-- Hover Overlay (same as MediaCarousel) -->
      <div
        class="flex absolute bottom-0 left-0 flex-col justify-center items-center px-4 w-full h-full opacity-0 backdrop-blur-md transition-all duration-300 group-hover:opacity-100 dark:bg-black/80 bg-white/80"
      >
        <p class="font-semibold text-gray-800 dark:text-gray-300">
          {{ $t('media.viewDetails') }}
        </p>
      </div>
    </nuxt-link>

    <!-- Content -->
    <div class="p-4">
      <h3
        class="mb-1 text-sm font-semibold text-gray-800 truncate dark:text-gray-300"
      >
        {{ props.title.title }}
      </h3>
      <p class="mb-2 text-xs text-gray-700 dark:text-gray-300">
        {{
          props.title.type === MediaTypeEnum.movie
            ? $t('media.movie')
            : $t('media.series')
        }}
      </p>

      <!-- Overview (instead of explanation) -->
      <p
        v-if="props.title.overview"
        class="mb-3 text-xs text-gray-800 dark:text-gray-300 line-clamp-3"
      >
        {{ props.title.overview }}
      </p>
      <p v-else class="mb-3 text-xs italic text-gray-700 dark:text-gray-300">
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
          class="object-contain w-8 h-8 rounded"
          :title="provider.provider_name"
        />
      </div>
      <div v-else class="text-xs italic text-gray-700 dark:text-gray-300">
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
import IconButton from '@/components/ui/IconButton.vue';
import Button from '@/components/ui/Button.vue';

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
