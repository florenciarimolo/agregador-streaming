<template>
  <article
    :class="[
      'overflow-visible relative rounded-3xl border backdrop-blur-xl transition-all duration-300',
      'dark:bg-gray-900/40 bg-gray-100/80 border-gray-300/50 dark:border-white/10',
      'hover:border-primary-800 dark:hover:border-primary-600/50 hover:shadow-lg hover:shadow-gray-900/20',
      hasMenuOpen ? 'z-[99997]' : '',
    ]"
    :aria-label="ariaLabel"
  >
    <!-- Mobile: 1 fila (3 columnas: Imagen | Contenido | Acciones) + Overview en nueva fila -->
    <!-- Desktop: 1 fila (3 columnas) -->
    <div class="flex flex-col p-4">
      <div class="flex flex-row gap-4">
        <!-- Columna 1: Imagen (móvil y desktop) -->
        <div class="relative flex-shrink-0">
          <MediaPoster
            :poster-path="posterPath"
            :link-to="computedLinkTo"
            :link-aria-label="linkAriaLabel"
            :image-alt="imageAlt"
            :no-image-aria-label="noImageAriaLabel"
          />
          <!-- Season seen button overlay - positioned on the poster (mobile only) -->
          <div
            v-if="showSeasonSeenButton"
            class="lg:hidden absolute top-1 right-1 z-30 pointer-events-none"
            @click.stop.prevent
            @touchstart.stop.prevent
          >
            <Tooltip
              :text="
                isSeasonSeen
                  ? $t('episodes.seasonUnmarkAsSeen', { season: seasonNumber })
                  : $t('episodes.seasonMarkAsSeen', { season: seasonNumber })
              "
            >
              <IconButton
                :aria-label="
                  isSeasonSeen
                    ? $t('episodes.seasonUnmarkAsSeen', { season: seasonNumber })
                    : $t('episodes.seasonMarkAsSeen', { season: seasonNumber })
                "
                size="small"
                variant="default"
                :custom-class="
                  isSeasonSeen
                    ? 'p-2 rounded-full bg-primary-600 hover:bg-primary-700 backdrop-blur-sm [&>svg]:text-white pointer-events-auto'
                    : 'p-2 rounded-full bg-black/50 hover:bg-gray-700/80 backdrop-blur-sm [&>svg]:text-white pointer-events-auto'
                "
                @click.stop.prevent="handleSeasonSeenClick"
              >
                <IconEye icon-class="w-4 h-4" />
              </IconButton>
            </Tooltip>
          </div>
          <!-- Status badges overlay - positioned on the poster -->
          <div
            v-if="
              hasSession &&
              (isFollowing ||
                (isLiked && !isFollowing) ||
                ((isSeen && !isLiked) && !isFollowing) ||
                (isNotInterested && !isFollowing) ||
                (isInWatchlist && !isFollowing))
            "
            class="absolute top-1 right-1 z-20 pointer-events-none"
          >
            <div class="flex gap-1">
              <!-- Following badge - highest priority, hide all others when following -->
              <Tooltip
                v-if="isFollowing"
                :text="$t('following.following')"
              >
                <div
                  class="flex justify-center items-center w-6 h-6 rounded-full backdrop-blur-sm bg-primary-600/90 pointer-events-auto"
                >
                  <IconStar icon-class="w-4 h-4 text-white" />
                </div>
              </Tooltip>
              <!-- Other badges - only show if not following -->
              <template v-else>
                <Tooltip v-if="isLiked" :text="$t('media.liked')">
                  <div
                    class="flex justify-center items-center w-6 h-6 rounded-full backdrop-blur-sm bg-primary-600/90 pointer-events-auto"
                  >
                    <IconHeartFilled icon-class="w-4 h-4 text-white" />
                  </div>
                </Tooltip>
                <Tooltip v-else-if="isSeen && !isLiked" :text="$t('media.seen')">
                  <div
                    class="flex justify-center items-center w-6 h-6 rounded-full backdrop-blur-sm bg-primary-600/90 pointer-events-auto"
                  >
                    <IconCheck icon-class="w-4 h-4 text-white" />
                  </div>
                </Tooltip>
                <Tooltip v-if="isNotInterested" :text="$t('media.notInterested')">
                  <div
                    class="flex justify-center items-center w-6 h-6 rounded-full backdrop-blur-sm bg-primary-600/90 pointer-events-auto"
                  >
                    <IconX icon-class="w-4 h-4 text-white" />
                  </div>
                </Tooltip>
                <Tooltip
                  v-if="isInWatchlist && !isLiked && !isSeen && !isNotInterested"
                  :text="$t('media.watchLater')"
                >
                  <div
                    class="flex justify-center items-center w-6 h-6 rounded-full backdrop-blur-sm bg-primary-600/90 pointer-events-auto"
                  >
                    <IconClock icon-class="w-4 h-4 text-white" />
                  </div>
                </Tooltip>
              </template>
            </div>
          </div>
        </div>

        <!-- Columna 2: Contenido (móvil y desktop) -->
        <div class="flex flex-col flex-1 gap-2 justify-between min-w-0">
          <div>
            <div class="flex gap-2 items-center nowrap md:flex-wrap">
              <h3 class="text-sm md:text-lg font-semibold text-gray-800 dark:text-gray-300">
                <nuxt-link
                  v-if="computedLinkTo"
                  :to="computedLinkTo"
                  class="hover:text-primary-800 dark:hover:text-primary-400 transition-colors cursor-pointer"
                >
                  {{ title }}
                </nuxt-link>
                <span v-else>
                  {{ title }}
                </span>
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
            <!-- Slot for content below title (e.g., season seen button) -->
            <div v-if="$slots['below-title']" class="mt-2">
              <slot name="below-title" />
            </div>
            <p
              v-if="displayTagline"
              class="mt-1 text-xs md:text-sm italic text-gray-600 dark:text-gray-400"
            >
              {{ displayTagline }}
            </p>
          </div>
          <!-- Overview - hidden on mobile (shown in new row below) -->
          <p
            v-if="showOverview && overview"
            :class="[
              'hidden lg:block text-xs text-gray-700 dark:text-gray-300',
              truncateOverview ? 'line-clamp-3' : '',
            ]"
          >
            {{ overview }}
          </p>
          <p
            v-else-if="showOverview"
            class="hidden lg:block text-xs italic text-gray-600 dark:text-gray-400"
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
      <!-- Overview - new row on mobile only -->
      <div v-if="showOverview" class="lg:hidden mt-2">
        <p
          v-if="overview"
          :class="[
            'text-xs text-gray-700 dark:text-gray-300',
            truncateOverview ? 'line-clamp-3' : '',
          ]"
        >
          {{ overview }}
        </p>
        <p
          v-else
          class="text-xs italic text-gray-600 dark:text-gray-400"
        >
          {{ $t('media.noDescriptionAvailable') }}
        </p>
      </div>
    </div>

    <!-- Confirmation Modal for unmarking season -->
    <Modal :is-open="showConfirmModal" @close="showConfirmModal = false">
      <div>
        <h3 class="text-lg font-semibold mb-2">
          {{ $t('episodes.confirmUnmarkSeason') }}
        </h3>
        <p class="mb-4">
          {{ $t('episodes.confirmUnmarkSeasonMessage', { season: seasonNumber }) }}
        </p>
        <div class="flex gap-2 justify-end">
          <Button variant="ghost" @click="showConfirmModal = false">
            {{ $t('common.cancel') }}
          </Button>
          <Button variant="primary" @click="confirmUnmark">
            {{ $t('common.confirm') }}
          </Button>
        </div>
      </div>
    </Modal>
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
import Tooltip from '@/components/ui/Tooltip.vue';
import IconHeartFilled from '@/components/icons/IconHeartFilled.vue';
import IconCheck from '@/components/icons/IconCheck.vue';
import IconX from '@/components/icons/IconX.vue';
import IconClock from '@/components/icons/IconClock.vue';
import IconStar from '@/components/icons/IconStar.vue';
import IconEye from '@/components/icons/IconEye.vue';
import IconButton from '@/components/ui/IconButton.vue';
import Button from '@/components/ui/Button.vue';
import { useSupabaseUser } from '#imports';
import { ref } from 'vue';
import Modal from '@/components/ui/Modal.vue';

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
  hasMenuOpen?: boolean; // Whether a menu inside this item is open
  isFollowing?: boolean;
  isLiked?: boolean;
  isSeen?: boolean;
  isNotInterested?: boolean;
  isInWatchlist?: boolean;
  showSeasonSeenButton?: boolean;
  isSeasonSeen?: boolean;
  seasonNumber?: number;
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
  hasMenuOpen: false,
  isFollowing: false,
  isLiked: false,
  isSeen: false,
  isNotInterested: false,
  isInWatchlist: false,
  showSeasonSeenButton: false,
  isSeasonSeen: false,
  seasonNumber: undefined,
});

const { routeWithLang } = useRouteWithLang();
const user = useSupabaseUser();
const hasSession = computed(() => !!user.value);

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

// Season seen button handlers
const showConfirmModal = ref(false);

const emit = defineEmits<{
  'season-seen-mark': [];
  'season-seen-unmark': [];
}>();

const handleSeasonSeenClick = () => {
  if (props.isSeasonSeen) {
    // Show confirmation modal before unmarking
    showConfirmModal.value = true;
  } else {
    // Mark season as seen (no confirmation needed)
    emit('season-seen-mark');
  }
};

const confirmUnmark = () => {
  showConfirmModal.value = false;
  emit('season-seen-unmark');
};

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
