<template>
  <article
    class="overflow-visible relative rounded-lg border backdrop-blur-xl transition-all duration-300 dark:bg-gray-900/40 bg-gray-100/80 border-gray-300/50 dark:border-white/10"
  >
    <!-- Poster Container -->
    <div
      class="relative bg-gray-800 overflow-visible rounded-t-lg aspect-[2/3]"
    >
      <!-- Skeleton Poster -->
      <div
        class="overflow-hidden w-full h-full rounded-t-lg skeleton-shimmer"
      ></div>

      <!-- Top-left badges skeleton -->
      <div
        class="flex overflow-visible absolute top-2 left-2 z-10 flex-col gap-2 items-start"
      >
        <!-- Rating Badge Skeleton (sometimes shown) -->
        <div
          v-if="showRating"
          class="px-2 py-1.5 w-12 h-6 rounded-full skeleton-shimmer"
        ></div>
        <!-- Watchlist Badge Skeleton (sometimes shown) -->
        <div
          v-if="showWatchlist"
          class="p-2 w-8 h-8 rounded-full skeleton-shimmer"
        ></div>
        <!-- MediaType Badge Skeleton -->
        <div
          class="px-2 py-1 w-12 h-5 rounded-full skeleton-shimmer"
        ></div>
      </div>

      <!-- Top-right actions skeleton -->
      <div class="overflow-visible absolute top-2 right-2 z-30">
        <div class="p-2 w-8 h-8 rounded-full skeleton-shimmer"></div>
      </div>
    </div>

    <!-- Content skeleton -->
    <div class="p-4">
      <!-- Overview skeleton - 3 lines -->
      <div class="mb-3 space-y-2">
        <div class="h-3 rounded skeleton-shimmer" :style="{ width: '100%' }"></div>
        <div class="h-3 rounded skeleton-shimmer" :style="{ width: '95%' }"></div>
        <div class="h-3 rounded skeleton-shimmer" :style="{ width: '85%' }"></div>
      </div>

      <!-- Providers skeleton - 6 small logos -->
      <div class="flex flex-wrap gap-2">
        <div
          v-for="i in 6"
          :key="i"
          class="w-4 h-4 md:w-8 md:h-8 rounded skeleton-shimmer"
        ></div>
      </div>
    </div>
  </article>
</template>

<script setup lang="ts">
interface Props {
  showRating?: boolean;
  showWatchlist?: boolean;
}

withDefaults(defineProps<Props>(), {
  showRating: true,
  showWatchlist: false,
});
</script>

<style scoped>
.skeleton-shimmer {
  background: linear-gradient(
    90deg,
    rgba(255, 255, 255, 0.1) 0%,
    rgba(255, 255, 255, 0.2) 50%,
    rgba(255, 255, 255, 0.1) 100%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s ease-in-out infinite;
}

@keyframes shimmer {
  0% {
    background-position: -200% 0;
  }
  100% {
    background-position: 200% 0;
  }
}

/* Respect prefers-reduced-motion */
@media (prefers-reduced-motion: reduce) {
  .skeleton-shimmer {
    animation: none;
    background: rgba(255, 255, 255, 0.1);
  }
}

/* Dark mode adjustments */
.dark .skeleton-shimmer {
  background: linear-gradient(
    90deg,
    rgba(255, 255, 255, 0.05) 0%,
    rgba(255, 255, 255, 0.1) 50%,
    rgba(255, 255, 255, 0.05) 100%
  );
  background-size: 200% 100%;
}

@media (prefers-reduced-motion: reduce) {
  .dark .skeleton-shimmer {
    background: rgba(255, 255, 255, 0.05);
  }
}
</style>

