<template>
  <!-- Use nuxt-link when there's a link, div when there isn't -->
  <nuxt-link
    v-if="linkTo"
    :to="linkTo"
    :aria-label="linkAriaLabel"
    :class="[
      'group relative cursor-pointer',
      'block overflow-hidden rounded-2xl bg-gray-800 aspect-[2/3] w-20 md:w-24',
      'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
      containerClass,
    ]"
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
      v-if="showHoverOverlay"
      class="flex absolute bottom-0 left-0 flex-col justify-center items-center px-4 w-full h-full rounded-2xl opacity-0 backdrop-blur-md transition-all duration-300 pointer-events-none group-hover:opacity-100 dark:bg-black/80 bg-white/80"
    >
      <p class="text-xs font-semibold text-center text-gray-800 dark:text-gray-300">
        {{ hoverText || $t('media.viewDetails') }}
      </p>
    </div>
  </nuxt-link>
  <!-- Non-link version (when linkTo is empty) -->
  <div
    v-else
    :aria-label="linkAriaLabel"
    :class="[
      'relative block overflow-hidden rounded-2xl bg-gray-800 aspect-[2/3] w-20 md:w-24',
      containerClass,
    ]"
  >
    <!-- Image or Placeholder -->
    <div class="overflow-hidden w-full h-full rounded-2xl">
      <img
        v-if="posterPath"
        :src="`https://image.tmdb.org/t/p/w500${posterPath}`"
        :alt="imageAlt"
        class="object-cover w-full h-full"
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
  </div>
</template>

<script setup lang="ts">
import IconTv from '@/components/icons/IconTv.vue';

interface Props {
  posterPath?: string | null;
  linkTo?: string;
  linkAriaLabel?: string;
  imageAlt?: string;
  noImageAriaLabel?: string;
  hoverText?: string;
  showHoverOverlay?: boolean;
  containerClass?: string;
}

withDefaults(defineProps<Props>(), {
  posterPath: null,
  linkTo: undefined,
  linkAriaLabel: undefined,
  imageAlt: undefined,
  noImageAriaLabel: undefined,
  hoverText: undefined,
  showHoverOverlay: true,
  containerClass: '',
});
</script>
