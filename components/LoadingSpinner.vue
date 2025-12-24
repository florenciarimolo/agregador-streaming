<template>
  <Transition name="fade">
    <div
      v-if="isLoading"
      class="fixed inset-0 z-[9999] flex items-center justify-center bg-background-dark/80 dark:bg-background-dark/80 backdrop-blur-sm"
    >
      <div class="flex items-center gap-2">
        <div
          class="w-3 h-3 rounded-full bg-primary"
          style="animation-delay: 0s"
        ></div>
        <div
          class="w-3 h-3 rounded-full bg-primary"
          style="animation-delay: 0.2s"
        ></div>
        <div
          class="w-3 h-3 rounded-full bg-primary"
          style="animation-delay: 0.4s"
        ></div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();
const isLoading = ref(false);

const startLoading = () => {
  isLoading.value = true;
};

const stopLoading = () => {
  isLoading.value = false;
};

onMounted(() => {
  router.beforeEach(() => {
    startLoading();
  });

  router.afterEach(() => {
    if (typeof window !== 'undefined') {
      window.setTimeout(() => {
        stopLoading();
      }, 300);
    } else {
      stopLoading();
    }
  });

  router.onError(() => {
    stopLoading();
  });
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
