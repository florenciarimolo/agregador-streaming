<template>
  <Section>
    <section
      class="relative flex flex-col items-center justify-between gap-16 dark:text-gray-300 text-gray-800 w-full flex-shrink-0 min-h-[400px] lg:flex-row lg:items-stretch lg:p-16 lg:bg-gray-100/80 dark:lg:bg-gray-900/40 lg:backdrop-blur-xl lg:border lg:gap-7 rounded-3xl lg:border-gray-300/50 lg:dark:border-primary-800 lg:shadow-lg lg:shadow-primary/20 py-8"
    >
      <!-- Poster skeleton -->
      <div
        class="relative w-full max-w-80 lg:w-80 flex-shrink-0 lg:aspect-[2/3]"
        style="filter: drop-shadow(0 10px 15px -3px rgb(0 0 0 / 0.1)) drop-shadow(0 4px 6px -4px rgb(0 0 0 / 0.1)) drop-shadow(0 0 20px rgb(33 24 110 / 0.3))"
      >
        <div
          class="relative overflow-hidden rounded-3xl w-full max-h-[400px] lg:h-full lg:max-h-[500px] skeleton-shimmer"
        ></div>
      </div>

      <!-- Content skeleton -->
      <div
        class="z-10 relative flex flex-col flex-1 gap-6 rounded-lg lg:p-6 lg:ml-8 w-full flex-shrink-0 min-h-[300px]"
      >
        <!-- Back button skeleton -->
        <div class="relative flex-row text-left">
          <div class="inline-flex gap-2 items-center mb-4 w-20 h-5 rounded skeleton-shimmer"></div>

          <!-- Title and badges row -->
          <div
            class="flex flex-col gap-2 w-full xl:flex-row xl:items-center xl:justify-between"
          >
            <!-- Title skeleton -->
            <div
              class="flex flex-wrap gap-3 items-center xl:flex-nowrap xl:flex-1 xl:min-w-0"
            >
              <div class="h-8 w-3/4 xl:w-full rounded skeleton-shimmer"></div>
              <!-- Rating badge skeleton (desktop) -->
              <div class="hidden xl:block xl:flex-shrink-0 w-16 h-6 rounded-full skeleton-shimmer"></div>
            </div>
            <!-- Rating and badges row (mobile) -->
            <div class="flex flex-shrink-0 gap-3 items-center xl:gap-2">
              <!-- Rating badge skeleton (mobile) -->
              <div class="xl:hidden w-16 h-6 rounded-full skeleton-shimmer"></div>
              <!-- Status badge skeleton -->
              <div class="w-20 h-6 rounded-full skeleton-shimmer"></div>
              <!-- Menu button skeleton -->
              <div class="w-8 h-8 rounded-full skeleton-shimmer"></div>
            </div>
          </div>
        </div>

        <!-- Description skeleton -->
        <div class="space-y-2">
          <div class="h-4 rounded skeleton-shimmer" style="width: 100%"></div>
          <div class="h-4 rounded skeleton-shimmer" style="width: 95%"></div>
          <div class="h-4 rounded skeleton-shimmer" style="width: 90%"></div>
          <div class="h-4 rounded skeleton-shimmer" style="width: 85%"></div>
        </div>

        <!-- Date skeleton -->
        <div class="flex gap-2 items-center">
          <div class="w-5 h-5 rounded skeleton-shimmer"></div>
          <div class="h-5 w-32 rounded skeleton-shimmer"></div>
        </div>

        <!-- Genres skeleton -->
        <div class="flex gap-2 items-center">
          <div class="w-5 h-5 rounded skeleton-shimmer"></div>
          <div class="h-5 w-48 rounded skeleton-shimmer"></div>
        </div>

        <!-- Providers skeleton -->
        <div class="flex flex-col gap-6">
          <div class="flex flex-col gap-4">
            <div class="h-5 w-24 rounded skeleton-shimmer"></div>
            <div class="flex flex-wrap gap-2">
              <div
                v-for="i in 6"
                :key="i"
                class="w-12 h-12 rounded skeleton-shimmer"
              ></div>
            </div>
          </div>
        </div>
      </div>
    </section>
  </Section>
</template>

<script setup lang="ts">
// No props needed - this is a pure skeleton component
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

