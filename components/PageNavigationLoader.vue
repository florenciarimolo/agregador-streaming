<template>
  <Transition name="fade">
    <div
      v-if="isLoading"
      class="fixed inset-0 z-[9999] flex items-center justify-center bg-background-dark/80 dark:bg-background-dark/80 backdrop-blur-sm"
    >
      <div class="flex items-center gap-2">
        <div
          class="w-3 h-3 rounded-full bg-gradient-to-br from-primary to-accent"
          style="animation-delay: 0s"
        ></div>
        <div
          class="w-3 h-3 rounded-full bg-gradient-to-br from-accent to-pink-500"
          style="animation-delay: 0.2s"
        ></div>
        <div
          class="w-3 h-3 rounded-full bg-gradient-to-br from-pink-500 to-secondary"
          style="animation-delay: 0.4s"
        ></div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';

const router = useRouter();
const route = useRoute();
const isLoading = ref(false);

// Global navigation loading state shared across pages
// This allows pages to detect when a full-page navigation is in progress
// and avoid showing local skeletons at the same time.
const pageNavigationLoading = useState<boolean>(
  'page-navigation-loading',
  () => false
);

const startLoading = () => {
  isLoading.value = true;
  pageNavigationLoading.value = true;
};

const stopLoading = () => {
  isLoading.value = false;
  pageNavigationLoading.value = false;
};

onMounted(() => {
  // Register navigation hooks to show loading indicator
  // These hooks will be called for all navigation, including navigateTo() from Nuxt
  router.beforeEach((to, from, next) => {
    // Only show loading if navigating to a different route
    if (to.path !== from.path) {
      startLoading();
    }
    next();
  });

  router.afterEach(() => {
    if (typeof window !== 'undefined') {
      // Wait for page to be fully loaded and rendered
      // Use nextTick to wait for Vue to finish rendering, then add a small delay
      nextTick(() => {
        // Wait for images and content to load
        window.setTimeout(() => {
          stopLoading();
        }, 500); // Increased delay to ensure page is fully loaded
      });
    } else {
      stopLoading();
    }
  });

  router.onError(() => {
    stopLoading();
  });

  // Also watch for route changes (handles browser back/forward and Nuxt navigation)
  // This ensures loading shows even if router hooks don't fire
  watch(
    () => route.path,
    (newPath, oldPath) => {
      if (newPath !== oldPath && oldPath) {
        startLoading();
        // Stop loading after page is ready
        nextTick(() => {
          if (typeof window !== 'undefined') {
            window.setTimeout(() => {
              stopLoading();
            }, 500);
          } else {
            stopLoading();
          }
        });
      }
    }
  );
});

onUnmounted(() => {
  stopLoading();
});
</script>

<style scoped>
@keyframes bounce {
  0%,
  100% {
    transform: translateY(0);
    opacity: 1;
  }
  50% {
    transform: translateY(-10px);
    opacity: 0.7;
  }
}

.w-3 {
  animation: bounce 1.4s ease-in-out infinite;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
