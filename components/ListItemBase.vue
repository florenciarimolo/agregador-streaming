<template>
  <article
    :class="[
      'overflow-visible relative rounded-3xl border backdrop-blur-xl transition-all duration-300',
      'dark:bg-gray-900/40 bg-gray-100/80 border-gray-300/50 dark:border-white/10',
      'hover:border-primary-800 dark:hover:border-primary-600/50 hover:shadow-lg hover:shadow-gray-900/20',
    ]"
    :aria-label="ariaLabel"
  >
    <div class="flex flex-row gap-4 p-4">
      <!-- Columna 1: Imagen del poster -->
      <div class="flex-shrink-0">
        <nuxt-link
          :to="linkTo"
          :aria-label="linkAriaLabel"
          class="group relative block overflow-hidden rounded-2xl bg-gray-800 aspect-[2/3] w-24 md:w-32 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
        >
          <!-- Image or Placeholder -->
          <div class="overflow-hidden w-full h-full rounded-2xl">
            <img
              v-if="posterPath"
              :src="`https://image.tmdb.org/t/p/w500${posterPath}`"
              :alt="imageAlt"
              class="object-cover w-full h-full transition-transform duration-300 group-hover:scale-105"
              loading="lazy"
              decoding="async"
            />
            <div
              v-else
              class="flex justify-center items-center w-full h-full text-gray-600 dark:text-gray-500"
              role="img"
              :aria-label="noImageAriaLabel"
            >
              <IconTv icon-class="w-8 h-8" />
            </div>
          </div>

          <!-- Hover Overlay -->
          <div
            class="flex absolute bottom-0 left-0 flex-col justify-center items-center px-4 w-full h-full opacity-0 backdrop-blur-md transition-all duration-300 pointer-events-none group-hover:opacity-100 dark:bg-black/80 bg-white/80 rounded-2xl"
          >
            <p class="font-semibold text-gray-800 dark:text-gray-300">
              {{ $t('media.viewDetails') }}
            </p>
          </div>
        </nuxt-link>
      </div>

      <!-- Columna 2: Título, tagline, overview -->
      <div class="flex-1 flex flex-col gap-2 min-w-0">
        <div>
          <h3 class="text-lg font-semibold text-gray-800 dark:text-gray-300">
            <nuxt-link
              :to="linkTo"
              class="hover:text-primary-800 dark:hover:text-primary-400 transition-colors"
            >
              {{ title }}
            </nuxt-link>
          </h3>
          <p
            v-if="displayTagline"
            class="text-sm italic text-gray-600 dark:text-gray-400 mt-1"
          >
            {{ displayTagline }}
          </p>
        </div>
        <p
          v-if="overview"
          class="text-sm text-gray-700 dark:text-gray-300 line-clamp-3 mt-2"
        >
          {{ overview }}
        </p>
        <p v-else class="text-sm italic text-gray-600 dark:text-gray-400 mt-2">
          {{ $t('media.noDescriptionAvailable') }}
        </p>
      </div>

      <!-- Columna 3: RatingBadge con acciones al lado, y Badge de tipo -->
      <div class="flex-shrink-0 flex flex-col gap-2 items-end">
        <!-- RatingBadge y acciones en la misma fila -->
        <div class="flex items-center gap-2">
          <RatingBadge v-if="voteAverage" :rating="voteAverage" />
          <!-- Slot para acciones (menú o botón de eliminar) -->
          <div class="overflow-visible">
            <slot name="actions" />
          </div>
        </div>
        <Badge v-if="type" :type="type" />
      </div>
    </div>
  </article>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { MEDIA_TYPE } from '@/constants/domain/mediaType';
import { useRouteWithLang } from '@/composables/useRouteWithLang';
import { useFetchTagline } from '@/composables/useFetchTagline';
import RatingBadge from '@/components/RatingBadge.vue';
import Badge from '@/components/Badge.vue';
import IconTv from '@/components/icons/IconTv.vue';

interface Props {
  title: string;
  posterPath?: string | null;
  tagline?: string | null;
  overview?: string | null;
  voteAverage?: number | null;
  type?: typeof MEDIA_TYPE.MOVIE | typeof MEDIA_TYPE.TV;
  tmdbId: number;
  ariaLabel?: string;
  linkAriaLabel?: string;
  imageAlt?: string;
  noImageAriaLabel?: string;
}

const props = withDefaults(defineProps<Props>(), {
  posterPath: null,
  tagline: null,
  overview: null,
  voteAverage: null,
  type: undefined,
  ariaLabel: undefined,
  linkAriaLabel: undefined,
  imageAlt: undefined,
  noImageAriaLabel: undefined,
});

const { routeWithLang } = useRouteWithLang();

const mediaType = computed(() =>
  props.type === MEDIA_TYPE.MOVIE ? 'movie' : 'tv-show'
);

// Computed link with language prefix
const linkTo = computed(() => {
  return routeWithLang(`/${mediaType.value}/${props.tmdbId}`);
});

// Fetch tagline from TMDB if missing
const { tagline: fetchedTagline, fetchTaglineIfMissing } = useFetchTagline(
  props.tagline,
  props.tmdbId,
  props.type || MEDIA_TYPE.MOVIE
);

// Use fetched tagline if available, otherwise use prop
const displayTagline = computed(() => {
  return fetchedTagline.value || props.tagline || null;
});

onMounted(async () => {
  await fetchTaglineIfMissing();
});
</script>

<style scoped>
/* Ensure article allows dropdown overflow while maintaining rounded corners */
article {
  overflow: visible;
  position: relative;
}
</style>
