<template>
  <article
    :class="[
      'overflow-visible relative rounded-lg border backdrop-blur-xl transition-all duration-300 group',
      'dark:bg-gray-900/40 bg-gray-100/80 border-gray-300/50 dark:border-white/10',
      'hover:border-gray-400/50 dark:hover:border-white/20 hover:shadow-lg hover:shadow-gray-900/20',
      customClass,
    ]"
    :aria-label="ariaLabel || $t('media.titleCardLabel', { title: title })"
  >
    <!-- Poster Container -->
    <div
      :class="[
        'relative bg-gray-800 overflow-visible',
        showContent ? 'rounded-t-lg' : 'rounded-lg',
        aspectRatio === 'video' ? 'aspect-video' : 'aspect-[2/3]',
      ]"
    >
      <nuxt-link
        :to="linkTo"
        :aria-label="linkAriaLabel"
        :class="[
          'block overflow-hidden relative w-full h-full focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
          showContent ? 'rounded-t-lg' : 'rounded-lg',
        ]"
      >
        <!-- Image or Placeholder -->
        <div
          v-if="posterPath"
          :class="[
            'overflow-hidden w-full h-full',
            showContent ? 'rounded-t-lg' : 'rounded-lg',
          ]"
        >
          <img
            :src="`https://image.tmdb.org/t/p/w500${posterPath}`"
            :alt="imageAlt"
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
            showContent ? 'rounded-t-lg' : 'rounded-lg',
          ]"
          role="img"
          :aria-label="noImageAriaLabel"
        >
          <IconImage icon-class="w-12 h-12" />
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
        class="flex overflow-visible absolute top-2 left-2 z-10 flex-col gap-2 items-start"
      >
        <div class="relative z-20">
          <slot name="top-left-badges" />
        </div>
        <MediaTypeBadge v-if="showType" :type="type" />
      </div>

      <!-- Top-right actions slot - Outside the link to prevent navigation -->
      <div class="overflow-visible absolute top-2 right-2 z-30">
        <slot name="top-right-actions" />
      </div>
    </div>

    <!-- Content slot - Optional content area below the poster -->
    <div v-if="showContent" class="p-4">
      <slot name="content" />
    </div>
  </article>
</template>

<script setup lang="ts">
import { MediaTypeEnum } from '@/types/enums/MediaTypeEnum';
import IconImage from './icons/IconImage.vue';
import MediaTypeBadge from './MediaTypeBadge.vue';

interface Props {
  // Required
  title: string;
  linkTo: string;

  // Optional display
  posterPath?: string | null;
  aspectRatio?: 'poster' | 'video';
  showType?: boolean;
  type?: typeof MediaTypeEnum.movie | typeof MediaTypeEnum.tv;
  showContent?: boolean;

  // Optional customization
  customClass?: string;
  ariaLabel?: string;
  linkAriaLabel?: string;
  imageAlt?: string;
  noImageAriaLabel?: string;
  hoverText?: string;
}

withDefaults(defineProps<Props>(), {
  posterPath: null,
  aspectRatio: 'poster',
  showType: true,
  type: undefined,
  showContent: false,
  customClass: '',
  ariaLabel: undefined,
  linkAriaLabel: undefined,
  imageAlt: undefined,
  noImageAriaLabel: undefined,
  hoverText: undefined,
});
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
