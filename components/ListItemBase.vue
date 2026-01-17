<template>
  <article
    :class="[
      'overflow-visible relative rounded-3xl border backdrop-blur-xl transition-all duration-300',
      'dark:bg-gray-900/40 bg-gray-100/80 border-gray-300/50 dark:border-white/10',
      'hover:border-primary-800 dark:hover:border-primary-600/50 hover:shadow-lg hover:shadow-gray-900/20',
    ]"
    :aria-label="ariaLabel"
  >
    <!-- Mobile: 1 fila (3 columnas: Imagen | Contenido | Acciones) -->
    <!-- Desktop: 1 fila (3 columnas) -->
    <div class="flex flex-row gap-4 p-4">
      <!-- Columna 1: Imagen (móvil y desktop) -->
      <div class="flex-shrink-0">
        <MediaPoster
          :poster-path="posterPath"
          :link-to="computedLinkTo"
          :link-aria-label="linkAriaLabel"
          :image-alt="imageAlt"
          :no-image-aria-label="noImageAriaLabel"
        />
      </div>

      <!-- Columna 2: Contenido (móvil y desktop) -->
      <div class="flex flex-col flex-1 gap-2 justify-between min-w-0">
        <div>
          <div class="flex gap-2 items-center nowrap md:flex-wrap">
            <h3 class="text-sm md:text-lg font-semibold text-gray-800 dark:text-gray-300">
              <component
                :is="computedLinkTo ? 'nuxt-link' : 'span'"
                :to="computedLinkTo || undefined"
                :class="
                  computedLinkTo
                    ? 'hover:text-primary-800 dark:hover:text-primary-400 transition-colors'
                    : ''
                "
              >
                {{ title }}
              </component>
            </h3>
            <!-- Tag (solo para discover lists) -->
            <Badge
              v-if="tag"
              :label="capitalizeTag(tag)"
              size="sm"
              class="flex-shrink-0"
            />
            <!-- RatingBadge -->
            <RatingBadge v-if="voteAverage" :rating="voteAverage" />
          </div>
          <p
            v-if="displayTagline"
            class="mt-1 text-xs md:text-sm italic text-gray-600 dark:text-gray-400"
          >
            {{ displayTagline }}
          </p>
        </div>
        <p
          v-if="showOverview && overview"
          :class="[
            'text-sm text-gray-700 dark:text-gray-300',
            truncateOverview ? 'line-clamp-3' : '',
          ]"
        >
          {{ overview }}
        </p>
        <p
          v-else-if="showOverview"
          class="text-sm italic text-gray-600 dark:text-gray-400"
        >
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
            class="object-contain w-4 h-4 rounded md:w-6 md:h-6"
            :title="provider.provider_name"
          />
        </div>
        <div
          v-else-if="providers !== undefined"
          class="mt-2 text-xs italic text-gray-600 dark:text-gray-400"
        >
          {{ $t('media.noPlatforms') }}
        </div>
      </div>

      <!-- Columna 3: Acciones y Badge (móvil y desktop) -->
      <div class="flex flex-col flex-shrink-0 gap-2 items-end">
        <!-- Actions -->
        <div class="flex gap-2 items-center">
          <!-- Slot para acciones (menú o botón de eliminar, o info adicional como fecha/duración) -->
          <div class="flex overflow-visible items-end">
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
import { capitalizeTag } from '@/utils/capitalizeTag';
import RatingBadge from '@/components/RatingBadge.vue';
import Badge from '@/components/Badge.vue';
import MediaPoster from '@/components/ui/MediaPoster.vue';

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
  showOverview?: boolean;
  ariaLabel?: string;
  linkAriaLabel?: string;
  imageAlt?: string;
  noImageAriaLabel?: string;
  linkTo?: string; // Optional custom link that overrides the computed link
  truncateOverview?: boolean; // Whether to truncate the overview with line-clamp
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
  showOverview: false,
  ariaLabel: undefined,
  linkAriaLabel: undefined,
  imageAlt: undefined,
  noImageAriaLabel: undefined,
  linkTo: undefined,
  truncateOverview: false,
});

const { routeWithLang } = useRouteWithLang();

const mediaType = computed(() =>
  props.type === MEDIA_TYPE.MOVIE ? 'movie' : 'tv-show'
);

// Computed link with language prefix
// If custom linkTo is provided, use it; otherwise compute from type and tmdbId
// If type is not provided and no custom link, don't create a link (for episodes, etc.)
const computedLinkTo = computed(() => {
  const result =
    props.linkTo !== undefined
      ? props.linkTo
      : !props.type
        ? ''
        : routeWithLang(`/${mediaType.value}/${props.tmdbId}`);
  return result;
});

// Fetch tagline from TMDB if missing (only if type is provided)
const { tagline: fetchedTagline, fetchTaglineIfMissing } = props.type
  ? useFetchTagline(props.tagline, props.tmdbId, props.type)
  : {
      tagline: computed(() => props.tagline || null),
      fetchTaglineIfMissing: async () => {
        // No-op for items without type (e.g., seasons, episodes)
      },
    };

// Use fetched tagline if available, otherwise use prop
const displayTagline = computed(() => {
  return fetchedTagline.value || props.tagline || null;
});

// Filter providers that have logos
const providersWithLogos = computed(() => {
  if (!props.providers) return [];
  return props.providers.filter((provider) => provider.logo_path).slice(0, 6);
});

// Note: Removed all click handlers from nuxt-link
// Having ANY @click handler on nuxt-link interferes with its native navigation
// The component renders as 'nuxt-link' when there's a valid link, and 'div' when there isn't
// Actions are positioned outside the link, so they won't interfere

onMounted(async () => {
  // Only fetch tagline if type is provided
  if (props.type) {
    await fetchTaglineIfMissing();
  }
});
</script>

<style scoped>
/* Ensure article allows dropdown overflow while maintaining rounded corners */
article {
  overflow: visible;
  position: relative;
}
</style>
