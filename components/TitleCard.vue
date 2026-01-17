<template>
  <article
    :class="[
      'overflow-visible relative rounded-3xl border backdrop-blur-xl transition-all duration-300',
      'dark:bg-gray-900/40 bg-gray-100/80 border-gray-300/50 dark:border-white/10',
      'hover:border-primary-800 dark:hover:border-primary-600/50 hover:shadow-lg hover:shadow-gray-900/20',
      customClass,
    ]"
    :aria-label="computedAriaLabel"
  >
    <!-- Poster Container -->
    <div
      :class="[
        'relative bg-gray-800 overflow-visible',
        showContent ? 'rounded-t-3xl' : 'rounded-3xl',
        aspectRatio === 'video' ? 'aspect-video' : 'aspect-[2/3]',
      ]"
    >
      <nuxt-link
        :to="computedLinkTo"
        :aria-label="computedLinkAriaLabel"
        :class="[
          'block overflow-hidden relative w-full h-full focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 group',
          showContent ? 'rounded-t-3xl' : 'rounded-3xl',
        ]"
        @click="handleLinkClick"
      >
        <!-- Image or Placeholder -->
        <div
          v-if="computedPosterPath"
          :class="[
            'overflow-hidden w-full h-full',
            showContent ? 'rounded-t-3xl' : 'rounded-3xl',
          ]"
        >
          <img
            :src="`https://image.tmdb.org/t/p/w500${computedPosterPath}`"
            :alt="computedImageAlt"
            class="object-cover w-full h-full transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
            decoding="async"
          />
        </div>
        <div
          v-else
          :class="[
            'flex overflow-hidden justify-center items-center w-full h-full',
            'text-gray-600 dark:text-gray-500',
            showContent ? 'rounded-t-3xl' : 'rounded-3xl',
          ]"
          role="img"
          :aria-label="computedNoImageAriaLabel"
        >
          <IconTv icon-class="w-12 h-12" />
        </div>

        <!-- Hover Overlay -->
        <div
          class="flex absolute bottom-0 left-0 flex-col justify-center items-center px-4 w-full h-full opacity-0 backdrop-blur-md transition-all duration-300 pointer-events-none group-hover:opacity-100 dark:bg-black/80 bg-white/80"
        >
          <p class="font-semibold text-gray-800 dark:text-gray-300">
            {{ hoverText || $t('media.viewDetails') }}
          </p>
        </div>
      </nuxt-link>

      <!-- Top-left badges slot and type badge - Outside the link to allow tooltips to escape -->
      <div
        class="flex overflow-visible absolute top-2 left-2 z-10 flex-col items-start"
      >
        <div class="relative z-20">
          <slot name="top-left-badges">
            <!-- Default recommendation badges if recommendation prop is provided -->
            <template v-if="recommendation">
              <RatingBadge
                v-if="recommendation.vote_average"
                :rating="recommendation.vote_average"
              />
              <div
                v-if="recommendation.in_watchlist"
                class="p-2 rounded-full backdrop-blur-sm bg-primary/80"
                :class="recommendation.vote_average ? 'mt-2' : ''"
                :title="t('media.savedWatchlist')"
              >
                <IconClock icon-class="w-4 h-4 text-white" />
              </div>
            </template>
          </slot>
        </div>
        <!-- Show type badge or tag badge for discover lists -->
        <!-- Only add margin-top when there's content in the slot above -->
        <Badge
          v-if="showType && isDiscoverList && tag"
          :label="capitalizeTag(tag)"
          size="xs"
          :class="
            hasTopLeftContent !== undefined
              ? hasTopLeftContent
                ? 'mt-2'
                : ''
              : recommendation?.vote_average ||
                recommendation?.in_watchlist
              ? 'mt-2'
              : ''
          "
        />
        <Badge
          v-else-if="showType && !(isDiscoverList && tag)"
          :type="computedType"
          size="xs"
          :class="
            hasTopLeftContent !== undefined
              ? hasTopLeftContent
                ? 'mt-2'
                : ''
              : recommendation?.vote_average ||
                recommendation?.in_watchlist
              ? 'mt-2'
              : ''
          "
        />
      </div>

      <!-- Top-right actions slot - Outside the link to prevent navigation -->
      <!-- Use pointer-events-none on container, pointer-events-auto on menu itself -->
      <div
        class="overflow-visible absolute top-2 right-2 z-30 pointer-events-none"
      >
        <div class="pointer-events-auto">
          <slot name="top-right-actions">
            <!-- Default recommendation action menu if recommendation prop is provided -->
            <template v-if="recommendation && showRecommendationActions">
              <div class="overflow-visible">
                <ActionMenu ref="dropdownRef" width="w-48" position="right">
                  <template #trigger>
                    <IconButton
                      :icon="IconMoreVertical"
                      :aria-label="
                        t('media.actionsMenuFor', {
                          title: recommendation.title,
                        })
                      "
                      size="small"
                      variant="default"
                      custom-class="menu-button p-2 rounded-full bg-black/50 hover:bg-gray-700/80 backdrop-blur-sm transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-black/50 [&>svg]:text-white [&>svg]:w-3 [&>svg]:h-3"
                    />
                  </template>
                  <div class="p-4">
                    <!-- If title has a state, only show option to remove that state -->
                    <!-- All remove actions use IconX -->
                    <Button
                      v-if="recommendation.liked"
                      type="button"
                      variant="ghost"
                      size="small"
                      custom-class="justify-start w-full text-left"
                      @click.stop.prevent="handleAction('remove-liked')"
                    >
                      <template #icon>
                        <IconX icon-class="w-4 h-4" />
                      </template>
                      {{ t('media.removeFromLiked') }}
                    </Button>
                    <Button
                      v-else-if="recommendation.in_watchlist"
                      type="button"
                      variant="ghost"
                      size="small"
                      custom-class="justify-start w-full text-left"
                      @click.stop.prevent="handleAction(TITLE_STATUS.WATCHLIST)"
                    >
                      <template #icon>
                        <IconX icon-class="w-4 h-4" />
                      </template>
                      {{ t('media.removeFromWatchlist') }}
                    </Button>
                    <!-- If title has no state, show all options to add states -->
                    <template v-else>
                      <Button
                        type="button"
                        variant="ghost"
                        size="small"
                        custom-class="justify-start mb-2 w-full text-left"
                        @click.stop.prevent="handleAction(TITLE_STATUS.SEEN)"
                      >
                        <template #icon>
                          <IconCheck icon-class="w-4 h-4" />
                        </template>
                        {{ t('media.seen') }}
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
                        {{ t('media.liked') }}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="small"
                        custom-class="justify-start mb-2 w-full text-left"
                        @click.stop.prevent="
                          handleAction(TITLE_STATUS.NOT_INTERESTED)
                        "
                      >
                        <template #icon>
                          <IconX icon-class="w-4 h-4" />
                        </template>
                        {{ t('media.notInterested') }}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="small"
                        custom-class="justify-start w-full text-left"
                        @click.stop.prevent="
                          handleAction(TITLE_STATUS.WATCHLIST)
                        "
                      >
                        <template #icon>
                          <IconClock icon-class="w-4 h-4" />
                        </template>
                        {{ t('media.watchLater') }}
                      </Button>
                    </template>
                  </div>
                </ActionMenu>
              </div>
            </template>
          </slot>
        </div>
      </div>

      <!-- Informative icons overlay (only show if user has session and status is provided) -->
      <!-- Positioned to the left of actions menu to avoid overlap -->
      <div
        v-if="
          hasSession &&
          (isLiked || (isSeen && !isLiked) || isNotInterested || isInWatchlist)
        "
        class="flex absolute top-2 right-12 gap-2 z-20"
      >
        <Tooltip v-if="isLiked" :text="$t('media.liked')">
          <div
            class="flex justify-center items-center w-8 h-8 rounded-full backdrop-blur-sm bg-primary-600/90"
          >
            <IconHeartFilled icon-class="w-5 h-5 text-white" />
          </div>
        </Tooltip>
        <Tooltip v-else-if="isSeen && !isLiked" :text="$t('media.seen')">
          <div
            class="flex justify-center items-center w-8 h-8 rounded-full backdrop-blur-sm bg-primary-600/90"
          >
            <IconCheck icon-class="w-5 h-5 text-white" />
          </div>
        </Tooltip>
        <Tooltip v-if="isNotInterested" :text="$t('media.notInterested')">
          <div
            class="flex justify-center items-center w-8 h-8 rounded-full backdrop-blur-sm bg-primary-600/90"
          >
            <IconX icon-class="w-5 h-5 text-white" />
          </div>
        </Tooltip>
        <Tooltip
          v-if="isInWatchlist && !isLiked && !isSeen && !isNotInterested"
          :text="$t('media.watchLater')"
        >
          <div
            class="flex justify-center items-center w-8 h-8 rounded-full backdrop-blur-sm bg-primary-600/90"
          >
            <IconClock icon-class="w-5 h-5 text-white" />
          </div>
        </Tooltip>
      </div>
    </div>

    <!-- Content slot - Optional content area below the poster -->
    <section v-if="showContent" class="p-4">
      <slot name="content">
        <!-- Default recommendation content if recommendation prop is provided -->
        <template v-if="recommendation">
          <section class="flex flex-col gap-3">
            <!-- Overview -->
            <p
              v-if="recommendation.overview"
              class="text-xs text-gray-800 dark:text-gray-300 line-clamp-3"
            >
              {{ recommendation.overview }}
            </p>
            <p v-else class="text-xs italic text-gray-700 dark:text-gray-300">
              {{ t('media.noDescriptionAvailable') }}
            </p>

            <!-- Providers (logos only, no names) -->
            <div
              v-if="
                recommendation.providers && recommendation.providers.length > 0
              "
              class="flex flex-wrap gap-2"
            >
              <img
                v-for="provider in providersWithLogos"
                :key="provider.provider_id"
                :src="`https://image.tmdb.org/t/p/w45${provider.logo_path}`"
                :alt="provider.provider_name"
                class="object-contain w-4 h-4 md:w-8 md:h-8 rounded"
                :title="provider.provider_name"
              />
            </div>
            <div v-else class="text-xs italic text-gray-700 dark:text-gray-300">
              {{ t('media.noPlatforms') }}
            </div>
          </section>
        </template>
      </slot>
    </section>
  </article>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { MEDIA_TYPE } from '@/constants/domain/mediaType';
import type { Recommendation } from '@/types/Recommendation';
import {
  TITLE_STATUS,
  type TitleStatusType,
} from '@/constants/domain/titleStatus';
import IconTv from './icons/IconTv.vue';
import Badge from './Badge.vue';
import RatingBadge from './RatingBadge.vue';
import IconMoreVertical from './icons/IconMoreVertical.vue';
import IconClock from './icons/IconClock.vue';
import IconCheck from './icons/IconCheck.vue';
import IconHeart from './icons/IconHeart.vue';
import IconHeartFilled from './icons/IconHeartFilled.vue';
import IconX from './icons/IconX.vue';
import IconButton from './ui/IconButton.vue';
import Button from './ui/Button.vue';
import ActionMenu from './ui/ActionMenu.vue';
import Tooltip from './ui/Tooltip.vue';
import { useSupabaseUser } from '#imports';

const { t } = useI18n();

interface Props {
  // Required - either title/linkTo OR recommendation
  title?: string;
  linkTo?: string;
  recommendation?: Recommendation;

  // Optional display
  posterPath?: string | null;
  aspectRatio?: 'poster' | 'video';
  showType?: boolean;
  type?: typeof MEDIA_TYPE.MOVIE | typeof MEDIA_TYPE.TV;
  showContent?: boolean;
  showRecommendationActions?: boolean;

  // Optional customization
  customClass?: string;
  ariaLabel?: string;
  linkAriaLabel?: string;
  imageAlt?: string;
  noImageAriaLabel?: string;
  hoverText?: string;

  // Title status (for informative icons)
  isLiked?: boolean;
  isSeen?: boolean;
  isNotInterested?: boolean;
  isInWatchlist?: boolean;

  // Tag for discover lists (extracted from JSONB, already in current language)
  // Should be string | null, but handle object case defensively
  tag?: string | null | Record<string, string>;
  // Flag to indicate if this is a discover list card (to show tag instead of type badge)
  isDiscoverList?: boolean;
  // Flag to indicate if there's content in the top-left-badges slot (for spacing)
  hasTopLeftContent?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  title: undefined,
  linkTo: undefined,
  recommendation: undefined,
  posterPath: undefined,
  aspectRatio: 'poster',
  showType: true,
  type: undefined,
  showContent: false,
  showRecommendationActions: true,
  customClass: '',
  ariaLabel: undefined,
  linkAriaLabel: undefined,
  imageAlt: undefined,
  noImageAriaLabel: undefined,
  hoverText: undefined,
  isLiked: false,
  isSeen: false,
  isNotInterested: false,
  isInWatchlist: false,
  tag: undefined,
  isDiscoverList: false,
  hasTopLeftContent: undefined,
});

const user = useSupabaseUser();
const hasSession = computed(() => !!user.value);
const { routeWithLang } = useRouteWithLang();

const emit = defineEmits<{
  'mark-seen': [title: Recommendation];
  'mark-not-interested': [title: Recommendation];
  'mark-liked': [title: Recommendation];
  'remove-liked': [title: Recommendation];
  'mark-watchlist': [title: Recommendation];
}>();

const dropdownRef = ref<InstanceType<typeof ActionMenu> | null>(null);

// Computed values based on recommendation or individual props
const computedTitle = computed(
  () => props.recommendation?.title || props.title || ''
);
const computedLinkTo = computed(() => {
  if (props.recommendation) {
    const mediaType =
      props.recommendation.type === MEDIA_TYPE.MOVIE ? 'movie' : 'tv-show';
    return routeWithLang(`/${mediaType}/${props.recommendation.tmdb_id}`);
  }
  // If linkTo is provided, use it as-is (it should already have language prefix)
  // Otherwise return default
  return props.linkTo || '#';
});
const computedPosterPath = computed(
  () => props.posterPath ?? props.recommendation?.poster_path ?? null
);
const computedType = computed(() => props.type || props.recommendation?.type);
const computedImageAlt = computed(() => {
  if (props.imageAlt) return props.imageAlt;
  if (props.recommendation)
    return t('media.posterOf', { title: props.recommendation.title });
  return '';
});
const computedNoImageAriaLabel = computed(() => {
  if (props.noImageAriaLabel) return props.noImageAriaLabel;
  if (props.recommendation)
    return t('media.noPosterAvailableFor', {
      title: props.recommendation.title,
    });
  return '';
});
const computedLinkAriaLabel = computed(() => {
  if (props.linkAriaLabel) return props.linkAriaLabel;
  if (props.recommendation)
    return t('media.viewDetailsOf', { title: props.recommendation.title });
  return '';
});
const computedAriaLabel = computed(() => {
  if (props.ariaLabel) return props.ariaLabel;
  if (props.recommendation)
    return t('media.recommendationLabel', {
      title: props.recommendation.title,
    });
  return t('media.titleCardLabel', { title: computedTitle.value });
});

// Filter providers that have logos
const providersWithLogos = computed(() => {
  if (!props.recommendation?.providers) return [];
  return props.recommendation.providers
    .filter((provider) => provider.logo_path)
    .slice(0, 6);
});

const handleAction = (action: TitleStatusType | 'liked' | 'remove-liked') => {
  if (!props.recommendation) return;

  // Close dropdown when action is triggered
  dropdownRef.value?.close();

  if (action === TITLE_STATUS.SEEN) {
    emit('mark-seen', props.recommendation);
  } else if (action === 'liked') {
    emit('mark-liked', props.recommendation);
  } else if (action === 'remove-liked') {
    emit('remove-liked', props.recommendation);
  } else if (action === TITLE_STATUS.NOT_INTERESTED) {
    emit('mark-not-interested', props.recommendation);
  } else if (action === TITLE_STATUS.WATCHLIST) {
    emit('mark-watchlist', props.recommendation);
  }
};

// Capitalize first letter of tag
function capitalizeTag(
  tag: string | null | undefined | Record<string, string>
): string {
  if (!tag) return '';
  // Handle case where tag might be an object (defensive programming)
  // This should not happen if server extraction works correctly
  if (typeof tag !== 'string') {
    if (typeof tag === 'object' && tag !== null) {
      console.warn('[TitleCard] Tag is an object instead of string:', tag);
      // Try to extract string from object if possible (fallback)
      const tagObj = tag as Record<string, string>;
      const firstKey = Object.keys(tagObj)[0];
      if (firstKey && typeof tagObj[firstKey] === 'string') {
        const tagValue = tagObj[firstKey];
        return tagValue.charAt(0).toUpperCase() + tagValue.slice(1);
      }
    }
    return '';
  }
  return tag.charAt(0).toUpperCase() + tag.slice(1);
}

// Handle link click explicitly to ensure navigation works
// This ensures navigation works even if other elements are blocking the default nuxt-link behavior
function handleLinkClick(event: MouseEvent) {
  // Don't navigate if clicking on the action menu or its trigger
  const target = event.target as HTMLElement;
  const actionMenuElement =
    target.closest('[data-action-menu]') || target.closest('.menu-button');
  if (actionMenuElement) {
    event.preventDefault();
    event.stopPropagation();
    return;
  }

  // If linkTo is '#', prevent navigation
  if (computedLinkTo.value === '#') {
    event.preventDefault();
    return;
  }

  // If the event was already prevented (by ActionMenu or other handler),
  // manually navigate using navigateTo
  if (event.defaultPrevented) {
    event.stopPropagation();
    const linkPath = computedLinkTo.value;
    if (linkPath && linkPath !== '#') {
      navigateTo(linkPath);
    }
  }
  // Otherwise, let nuxt-link handle it normally
}
</script>

<style scoped>
/* Ensure article allows dropdown overflow while maintaining rounded corners */
article {
  overflow: visible;
  position: relative;
}

/* Poster container - allows dropdown to escape */
article > div:first-child {
  position: relative;
  overflow: visible;
}

/* Poster link - overflow-hidden to contain image but allow tooltips to escape */
article > div:first-child > a {
  position: relative;
  overflow: hidden;
}

/* Image container needs overflow-hidden to contain scaled image */
article > div:first-child > a > div:first-of-type {
  overflow: hidden;
}
</style>
