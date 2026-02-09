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
import { onMounted, onUnmounted, ref, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';

const router = useRouter();
const route = useRoute();

// Single source of truth: overlay visibility and global state for pages.
// Stopped by app.vue on Transition afterEnter (when new page content is rendered).
const isLoading = useState<boolean>('page-navigation-loading', () => false);

// Fallback: pages with top-level await (e.g. season) don't mount until async setup resolves,
// so the Transition never gets a new child and afterEnter never fires. Stop after max wait.
const FALLBACK_MS = 5000;
const fallbackTimer = ref<ReturnType<typeof setTimeout> | null>(null);

const clearFallback = () => {
  if (fallbackTimer.value !== null) {
    clearTimeout(fallbackTimer.value);
    fallbackTimer.value = null;
  }
};

const startLoading = () => {
  clearFallback();
  isLoading.value = true;
  fallbackTimer.value = setTimeout(() => {
    stopLoading();
  }, FALLBACK_MS);
};

const stopLoading = () => {
  clearFallback();
  isLoading.value = false;
};

// When app.vue sets loading to false (afterEnter), clear fallback so it doesn't run later
watch(isLoading, (val) => {
  if (!val) clearFallback();
});

onMounted(() => {
  router.beforeEach((to, from, next) => {
    if (to.path !== from.path) {
      startLoading();
    }
    next();
  });

  router.onError(() => {
    stopLoading();
  });

  watch(
    () => route.path,
    (newPath, oldPath) => {
      if (newPath !== oldPath && oldPath) {
        startLoading();
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
