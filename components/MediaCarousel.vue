<template>
  <!-- Mobile: List View -->
  <section
    class="flex overflow-x-hidden relative z-0 flex-col gap-4 py-4 w-full max-w-full mobile-list-view md:hidden"
  >
    <article
      v-for="mediaObject in mediaList"
      :key="mediaObject.id"
      class="flex overflow-hidden gap-2 items-center p-2 w-full max-w-full rounded-xl transition-all sm:gap-4 dark:bg-black/20 bg-gray-100/50 sm:p-4 dark:hover:bg-black/30 hover:bg-gray-200/50"
    >
      <nuxt-link :to="mediaObject.path" class="flex-shrink-0 self-center">
        <div
          class="relative w-20 sm:w-24 aspect-[2/3] overflow-hidden rounded-lg"
        >
          <img
            :src="`https://image.tmdb.org/t/p/w780${mediaObject.poster_path}`"
            :alt="mediaObject.title ? mediaObject.title : mediaObject.name"
            class="object-cover w-full h-full rounded-lg shadow-md"
            loading="lazy"
            decoding="async"
          />
          <!-- Badge positioned at bottom-left to avoid navbar overlap -->
          <div
            :class="{
              'bg-green-500': mediaObject.vote_average >= 7,
              'bg-yellow-500':
                mediaObject.vote_average >= 5 && mediaObject.vote_average < 7,
              'bg-gray-500':
                mediaObject.vote_average === 0 || !mediaObject.vote_average,
              'bg-red-500':
                mediaObject.vote_average && mediaObject.vote_average < 5,
            }"
            class="absolute bottom-1 left-1 z-10 p-1.5 text-xs font-semibold rounded shadow-xl shadow-black/20"
          >
            <span class="font-bold text-white">
              ⭐
              {{
                mediaObject.vote_average?.toFixed(1) === '0.0' ||
                mediaObject.vote_average === 0 ||
                !mediaObject.vote_average
                  ? $t('media.notAvailableShort')
                  : mediaObject.vote_average?.toFixed(1)
              }}
            </span>
          </div>
        </div>
      </nuxt-link>
      <div
        class="flex overflow-hidden flex-col flex-1 justify-between w-0 min-w-0"
      >
        <div class="w-full min-w-0">
          <h3
            class="mb-1 text-sm font-semibold text-gray-800 break-words sm:text-base dark:text-gray-300 line-clamp-2"
          >
            {{ mediaObject.title ? mediaObject.title : mediaObject.name }}
          </h3>
          <p
            v-if="mediaObject.release_date || mediaObject.first_air_date"
            class="mb-1 text-xs text-gray-700 sm:text-sm dark:text-gray-100 sm:mb-2"
          >
            {{
              formatDateToSpanish(
                (mediaObject.release_date || mediaObject.first_air_date) ?? ''
              )
            }}
          </p>
          <p
            v-if="mediaObject.overview"
            class="mb-1 text-xs text-gray-500 sm:text-sm dark:text-gray-300 line-clamp-3 sm:mb-2"
          >
            {{ mediaObject.overview }}
          </p>
        </div>
        <div class="flex justify-end items-center mt-2">
          <!-- Mobile: Link -->
          <nuxt-link
            :to="mediaObject.path"
            class="text-xs font-semibold uppercase text-primary hover:text-secondary sm:text-sm md:hidden"
          >
            {{ $t('media.viewDetails') }}
          </nuxt-link>
          <!-- Desktop: Button -->
          <nuxt-link :to="mediaObject.path" class="hidden md:block">
            <Button
              size="small"
              variant="primary"
              custom-class="px-3 py-1.5 w-auto text-xs text-white bg-gradient-to-r shadow-lg sm:px-4 sm:py-2 sm:text-sm from-primary via-accent to-secondary hover:from-secondary hover:via-pink-500 hover:to-primary shadow-primary/30"
            >
              {{ $t('media.viewDetails') }}
            </Button>
          </nuxt-link>
        </div>
      </div>
    </article>
  </section>

  <!-- Desktop/Tablet: Carousel View -->
  <section
    class="hidden gap-0 justify-between items-center py-4 desktop-carousel md:flex"
  >
    <!-- Flecha izquierda -->
    <Button
      type="button"
      variant="primary"
      size="small"
      custom-class="z-10 flex-shrink-0 p-1 mb-20 text-white bg-gradient-to-r rounded-full shadow-lg from-primary to-accent disabled:opacity-30 shadow-primary/30 hover:from-accent hover:to-secondary"
      :disabled="currentPage === 0"
      @click="prevPage"
    >
      ‹
    </Button>

    <div class="flex flex-row flex-1 gap-3 justify-center no-scrollbar">
      <article
        v-for="mediaObject in pagedMedia"
        :key="mediaObject.id"
        class="relative flex-shrink-0 w-full rounded-xl transition-all duration-300 md:w-40 group hover:scale-105"
      >
        <nuxt-link :to="mediaObject.path" class="block">
          <div class="relative aspect-[2/3] overflow-hidden rounded-xl">
            <RatingBadge :rating="mediaObject.vote_average" />
            <img
              :src="`https://image.tmdb.org/t/p/w780${mediaObject.poster_path}`"
              :alt="mediaObject.title ? mediaObject.title : mediaObject.name"
              class="object-cover overflow-hidden w-full h-full rounded-xl shadow-md shadow-primary/30"
              loading="lazy"
              decoding="async"
            />
            <div
              class="flex absolute bottom-0 left-0 flex-col justify-center items-center px-4 w-full h-full rounded-xl border opacity-0 backdrop-blur-md transition-all duration-300 group-hover:opacity-100 group-hover:shadow-primary/40 group-hover:shadow-xl w-inherit dark:bg-black/80 bg-white/80 border-primary/20"
            >
              <p class="font-semibold text-gray-800 dark:text-gray-300">{{
                $t('media.viewDetails')
              }}</p>
            </div>
          </div>
        </nuxt-link>
        <p
          class="mt-2 text-base font-semibold text-center text-gray-800 dark:text-gray-300"
        >
          {{ mediaObject.title ? mediaObject.title : mediaObject.name }}
        </p>
        <p
          v-if="mediaObject.release_date || mediaObject.first_air_date"
          class="text-sm text-center text-gray-700 dark:text-gray-100"
        >
          {{
            formatDateToSpanish(
              (mediaObject.release_date || mediaObject.first_air_date) ?? ''
            )
          }}
        </p>
      </article>
    </div>
    <!-- Flecha derecha -->
    <Button
      type="button"
      variant="primary"
      size="small"
      custom-class="z-10 flex-shrink-0 p-1 mb-20 text-white bg-gradient-to-r rounded-full shadow-lg shadow-primary/30 from-primary to-accent disabled:opacity-30 hover:from-accent hover:to-secondary"
      :disabled="endReached"
      @click="nextPage"
    >
      ›
    </Button>
  </section>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { formatDateToSpanish } from '@/utils/formatDate';
import type { Media } from '@/types/Media';
import RatingBadge from './RatingBadge.vue';
import { MediaTypeEnum } from '@/types/enums/MediaTypeEnum';
import Button from '@/components/ui/Button.vue';

const props = defineProps({
  mediaTrendingList: {
    type: Array as () => Media[],
    required: true,
  },
});

// Initialize based on environment
// During SSR, we can't detect screen size, so we'll use CSS to handle it
// On client, we'll detect and update
const isMobile = ref(false);
const isTablet = ref(false);

// Detect mobile screen size
const checkMobile = () => {
  if (typeof window !== 'undefined') {
    isMobile.value = window.innerWidth < 768;
    isTablet.value = window.innerWidth < 1024;
  }
};

const itemsPerPage = computed(() =>
  isMobile.value ? 1 : isTablet.value ? 3 : 6
);
const currentPage = ref(0);

const totalPages = computed(() =>
  Math.ceil(props.mediaTrendingList.length / itemsPerPage.value)
);

const nextPage = () => {
  if (currentPage.value < totalPages.value - 1) {
    currentPage.value++;
  }
};

const prevPage = () => {
  if (currentPage.value > 0) {
    currentPage.value--;
  }
};

const pagedMedia = computed(() =>
  mediaList.value.slice(
    currentPage.value * itemsPerPage.value,
    (currentPage.value + 1) * itemsPerPage.value
  )
);

const endReached = computed(() => currentPage.value >= totalPages.value - 1);

// Reactive list to handle media items
const mediaList = ref<Media[]>(props.mediaTrendingList);

// Handle resize
const handleResize = () => {
  checkMobile();
};

onMounted(() => {
  // Check on mount (client-side only)
  if (typeof window !== 'undefined') {
    checkMobile();
    window.addEventListener('resize', handleResize);
  }
});

onUnmounted(() => {
  window.removeEventListener('resize', handleResize);
});

watch(
  () => props.mediaTrendingList,
  (newList) => {
    mediaList.value = newList;

    mediaList.value.forEach((media) => {
      if (media.media_type === MediaTypeEnum.movie) {
        media.path = `/movie/${media.id}`;
      } else {
        media.path = `/tv-show/${media.id}`;
      }
    });
    currentPage.value = 0; // Reset to first page when the list changes
  },
  { immediate: true }
);
</script>

<style scoped>
button:disabled {
  cursor: not-allowed;
}

/* Ocultar scroll en WebKit (Chrome, Safari) */
.no-scrollbar::-webkit-scrollbar {
  display: none;
}

/* Firefox */
.no-scrollbar {
  scrollbar-width: none;
}

/* Ensure desktop carousel is completely hidden on mobile */
@media (max-width: 767px) {
  section.desktop-carousel {
    display: none !important;
    visibility: hidden !important;
    opacity: 0 !important;
    pointer-events: none !important;
    position: fixed !important;
    top: -9999px !important;
    left: -9999px !important;
    width: 0 !important;
    height: 0 !important;
    overflow: hidden !important;
    z-index: -1 !important;
  }

  section.desktop-carousel * {
    display: none !important;
    visibility: hidden !important;
    opacity: 0 !important;
  }

  /* Ensure mobile section is visible and above everything */
  section.mobile-list-view {
    display: flex !important;
    visibility: visible !important;
    opacity: 1 !important;
    position: relative !important;
    z-index: 1 !important;
    width: 100% !important;
    max-width: 100vw !important;
    height: auto !important;
    overflow-x: hidden !important;
    overflow-y: visible !important;
    pointer-events: auto !important;
    box-sizing: border-box !important;
    padding-left: 0 !important;
    padding-right: 0 !important;
  }

  section.mobile-list-view article {
    width: 100% !important;
    max-width: 100% !important;
    box-sizing: border-box !important;
    margin-left: 0 !important;
    margin-right: 0 !important;
  }

  section.mobile-list-view article > * {
    box-sizing: border-box !important;
  }
}
</style>
