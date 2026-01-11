<template>
  <article
    class="overflow-visible relative rounded-3xl border backdrop-blur-xl transition-all duration-300 dark:bg-gray-900/40 bg-gray-100/80 border-gray-300/50 dark:border-white/10"
  >
    <div class="flex flex-row gap-4 p-4">
      <!-- Columna 1: Skeleton de imagen del poster -->
      <div class="flex-shrink-0">
        <div
          class="rounded-2xl bg-gray-800 aspect-[2/3] w-24 md:w-32 skeleton-shimmer"
        ></div>
      </div>

      <!-- Columna 2: Skeleton de título, tagline, overview -->
      <div class="flex-1 flex flex-col gap-2 min-w-0">
        <div>
          <!-- Título skeleton -->
          <div class="h-6 w-3/4 rounded skeleton-shimmer mb-2"></div>
          <!-- Tagline skeleton -->
          <div class="h-4 w-2/3 rounded skeleton-shimmer"></div>
        </div>
        <!-- Overview skeleton - 3 lines -->
        <div class="mt-2 space-y-1.5">
          <div class="h-3 rounded skeleton-shimmer" style="width: 100%"></div>
          <div class="h-3 rounded skeleton-shimmer" style="width: 95%"></div>
          <div class="h-3 rounded skeleton-shimmer" style="width: 80%"></div>
        </div>
      </div>

      <!-- Columna 3: Skeleton de RatingBadge, Badge y Actions -->
      <div class="flex-shrink-0 flex flex-col gap-2 items-end">
        <!-- Rating Badge Skeleton -->
        <div
          v-if="showRating"
          class="px-2 py-1.5 w-12 h-6 rounded-full skeleton-shimmer"
        ></div>
        <!-- MediaType Badge Skeleton -->
        <div class="px-2 py-1 w-12 h-5 rounded-full skeleton-shimmer"></div>
        <!-- Actions skeleton -->
        <div class="p-2 w-8 h-8 rounded-full skeleton-shimmer mt-auto"></div>
      </div>
    </div>
  </article>
</template>

<script setup lang="ts">
interface Props {
  showRating?: boolean;
}

withDefaults(defineProps<Props>(), {
  showRating: true,
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
