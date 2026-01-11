<template>
  <article
    :class="[
      'overflow-visible relative rounded-3xl border backdrop-blur-xl transition-all duration-300',
      'dark:bg-gray-900/40 bg-gray-100/80 border-gray-300/50 dark:border-white/10',
      'hover:border-primary-800 dark:hover:border-primary-600/50 hover:shadow-lg hover:shadow-gray-900/20',
    ]"
    :aria-label="ariaLabel"
  >
    <!-- Mobile: 3 filas (1 columna) -->
    <!-- Desktop: 1 fila (3 columnas) -->
    <div class="flex flex-col md:flex-row gap-4 p-4">
      <!-- Fila 1 (móvil): 3 columnas (Imagen, Título/Tag/Tagline, Rating/Menu/Badge) -->
      <!-- Desktop: Columna 1 (Imagen) -->
      <div class="flex flex-row gap-4 md:flex-col md:flex-shrink-0">
        <!-- Imagen -->
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

        <!-- Título, tag y tagline (móvil: columna 2) -->
        <div class="flex-1 flex flex-col gap-1 min-w-0 md:hidden">
          <h3 class="text-lg font-semibold text-gray-800 dark:text-gray-300">
            <nuxt-link
              :to="linkTo"
              class="hover:text-primary-800 dark:hover:text-primary-400 transition-colors"
            >
              {{ title }}
            </nuxt-link>
          </h3>
          <!-- Tag (solo para discover lists) -->
          <Badge
            v-if="tag"
            :label="capitalizeTag(tag)"
            size="sm"
            class="self-start mt-1"
          />
          <p
            v-if="displayTagline"
            class="text-sm italic text-gray-600 dark:text-gray-400 mt-1"
          >
            {{ displayTagline }}
          </p>
        </div>

        <!-- RatingBadge, acciones y Badge de tipo (móvil: columna 3) -->
        <div class="flex-shrink-0 flex flex-col gap-2 items-end md:hidden">
          <!-- RatingBadge y acciones en la misma fila -->
          <div class="flex items-center gap-2">
            <RatingBadge v-if="voteAverage" :rating="voteAverage" />
            <!-- Slot para acciones (menú o botón de eliminar) -->
            <div class="overflow-visible">
              <slot name="actions" />
            </div>
          </div>
          <Badge v-if="type && !hideTypeBadge" :type="type" />
        </div>
      </div>

      <!-- Desktop: Columna 2 (Título/Tag/Tagline, Overview, Providers) -->
      <div class="hidden md:flex flex-1 flex-col gap-2 min-w-0">
        <div>
          <h3 class="text-lg font-semibold text-gray-800 dark:text-gray-300">
            <nuxt-link
              :to="linkTo"
              class="hover:text-primary-800 dark:hover:text-primary-400 transition-colors"
            >
              {{ title }}
            </nuxt-link>
          </h3>
          <!-- Tag (solo para discover lists) -->
          <Badge
            v-if="tag"
            :label="capitalizeTag(tag)"
            size="sm"
            class="self-start mt-1"
          />
          <p
            v-if="displayTagline"
            class="text-sm italic text-gray-600 dark:text-gray-400 mt-1"
          >
            {{ displayTagline }}
          </p>
        </div>
        <p
          v-if="overview"
          class="text-sm text-gray-700 dark:text-gray-300 line-clamp-3"
        >
          {{ overview }}
        </p>
        <p v-else class="text-sm italic text-gray-600 dark:text-gray-400">
          {{ $t('media.noDescriptionAvailable') }}
        </p>
        <!-- Providers (logos only, no names) -->
        <div
          v-if="providers && providers.length > 0"
          class="flex flex-wrap gap-2 mt-2"
        >
          <img
            v-for="provider in providersWithLogos"
            :key="provider.provider_id"
            :src="`https://image.tmdb.org/t/p/w45${provider.logo_path}`"
            :alt="provider.provider_name"
            class="object-contain w-4 h-4 md:w-6 md:h-6 rounded"
            :title="provider.provider_name"
          />
        </div>
        <div
          v-else-if="providers !== undefined"
          class="text-xs italic text-gray-600 dark:text-gray-400 mt-2"
        >
          {{ $t('media.noPlatforms') }}
        </div>
      </div>

      <!-- Fila 2 (móvil): Overview -->
      <div class="md:hidden">
        <p
          v-if="overview"
          class="text-sm text-gray-700 dark:text-gray-300 line-clamp-3"
        >
          {{ overview }}
        </p>
        <p v-else class="text-sm italic text-gray-600 dark:text-gray-400">
          {{ $t('media.noDescriptionAvailable') }}
        </p>
      </div>

      <!-- Fila 3 (móvil): Providers -->
      <div class="md:hidden">
        <div
          v-if="providers && providers.length > 0"
          class="flex flex-wrap gap-2"
        >
          <img
            v-for="provider in providersWithLogos"
            :key="provider.provider_id"
            :src="`https://image.tmdb.org/t/p/w45${provider.logo_path}`"
            :alt="provider.provider_name"
            class="object-contain w-4 h-4 rounded"
            :title="provider.provider_name"
          />
        </div>
        <div
          v-else-if="providers !== undefined"
          class="text-xs italic text-gray-600 dark:text-gray-400"
        >
          {{ $t('media.noPlatforms') }}
        </div>
      </div>

      <!-- Desktop: Columna 3 (Rating/Menu/Badge) -->
      <div class="hidden md:flex flex-shrink-0 flex-col gap-2 items-end">
        <!-- RatingBadge y acciones en la misma fila -->
        <div class="flex items-center gap-2">
          <RatingBadge v-if="voteAverage" :rating="voteAverage" />
          <!-- Slot para acciones (menú o botón de eliminar) -->
          <div class="overflow-visible">
            <slot name="actions" />
          </div>
        </div>
        <Badge v-if="type && !hideTypeBadge" :type="type" />
      </div>
    </div>
  </article>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { MEDIA_TYPE } from '@/constants/domain/mediaType';
import { useRouteWithLang } from '@/composables/useRouteWithLang';
import { useFetchTagline } from '@/composables/useFetchTagline';
import type { Provider } from '@/types/Recommendation';
import RatingBadge from '@/components/RatingBadge.vue';
import Badge from '@/components/Badge.vue';
import IconTv from '@/components/icons/IconTv.vue';

// Capitalize first letter of tag
function capitalizeTag(
  tag: string | null | undefined | Record<string, string>
): string {
  if (!tag) return '';
  // Handle case where tag might be an object (defensive programming)
  if (typeof tag !== 'string') return '';
  return tag.charAt(0).toUpperCase() + tag.slice(1).toLowerCase();
}

interface Props {
  title: string;
  posterPath?: string | null;
  tagline?: string | null;
  tag?: string | null;
  overview?: string | null;
  voteAverage?: number | null;
  type?: typeof MEDIA_TYPE.MOVIE | typeof MEDIA_TYPE.TV;
  tmdbId: number;
  providers?: Provider[];
  hideTypeBadge?: boolean;
  ariaLabel?: string;
  linkAriaLabel?: string;
  imageAlt?: string;
  noImageAriaLabel?: string;
}

const props = withDefaults(defineProps<Props>(), {
  posterPath: null,
  tagline: null,
  tag: null,
  overview: null,
  voteAverage: null,
  type: undefined,
  providers: undefined,
  hideTypeBadge: false,
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

// Filter providers that have logos
const providersWithLogos = computed(() => {
  if (!props.providers) return [];
  return props.providers.filter((provider) => provider.logo_path).slice(0, 6);
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
