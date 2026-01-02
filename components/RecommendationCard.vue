<template>
  <article
    class="relative rounded-lg border backdrop-blur-xl transition-all duration-300 group dark:bg-gray-900/40 bg-gray-100/80 border-gray-300/50 dark:border-white/10 hover:border-gray-400/50 dark:hover:border-white/20 hover:shadow-lg hover:shadow-gray-900/20 overflow-visible"
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
        <IconImage icon-class="w-12 h-12" />
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
      <div class="absolute top-2 right-2 z-20" :data-dropdown-id="dropdownId">
        <IconButton
          :icon="IconMoreVertical"
          :aria-label="$t('media.actionsMenuFor', { title: props.title.title })"
          size="small"
          variant="default"
          custom-class="menu-button p-2 rounded-full bg-black/50 hover:bg-gray-700/80 backdrop-blur-sm transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-black/50 [&>svg]:text-white"
          @click.stop.prevent="toggle()"
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
            v-if="isOpen"
            :data-dropdown-id="dropdownId"
            class="absolute left-0 z-[100] mt-2 w-48 max-w-[calc(100vw-2rem)] md:right-0 md:left-auto rounded-lg border backdrop-blur-xl dark:bg-gray-900/40 bg-gray-100/80 border-gray-300/50 dark:border-white/10"
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
                  <IconCheck icon-class="w-4 h-4" />
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
                  <IconHeart icon-class="w-4 h-4" />
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
                  <IconX icon-class="w-4 h-4" />
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
                  <IconClock icon-class="w-4 h-4" />
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
import { onMounted, onUnmounted, computed } from 'vue';
import RatingBadge from './RatingBadge.vue';
import IconMoreVertical from './icons/IconMoreVertical.vue';
import IconClock from './icons/IconClock.vue';
import IconImage from './icons/IconImage.vue';
import IconCheck from './icons/IconCheck.vue';
import IconHeart from './icons/IconHeart.vue';
import IconX from './icons/IconX.vue';
import { TitleStatus } from '@/types/TitleStatus';
import { MediaTypeEnum } from '@/types/enums/MediaTypeEnum';
import type { Recommendation } from '@/types/Recommendation';
import IconButton from '@/components/ui/IconButton.vue';
import Button from '@/components/ui/Button.vue';
import { useDropdownManager } from '@/composables/useDropdownManager';

interface Props {
  title: Recommendation;
}

const props = defineProps<Props>();

// Generate unique ID for this dropdown
const dropdownId = `recommendation-${props.title.tmdb_id}-${props.title.type}`;
const { isOpen, toggle, close, handleClickOutside } =
  useDropdownManager(dropdownId);

const emit = defineEmits<{
  'mark-seen': [title: Recommendation];
  'mark-not-interested': [title: Recommendation];
  'mark-liked': [title: Recommendation];
  'mark-watchlist': [title: Recommendation];
}>();

const handleAction = (action: TitleStatus | 'liked') => {
  close();
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
