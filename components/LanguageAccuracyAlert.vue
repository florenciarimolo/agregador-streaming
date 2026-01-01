<template>
  <Transition
    enter-active-class="transition ease-out duration-300"
    enter-from-class="opacity-0 translate-y-2"
    enter-to-class="opacity-100 translate-y-0"
    leave-active-class="transition ease-in duration-200"
    leave-from-class="opacity-100 translate-y-0"
    leave-to-class="opacity-0 translate-y-2"
  >
    <div
      v-if="isVisible"
      class="fixed bottom-4 right-4 max-w-md bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg shadow-lg p-4 z-50"
      role="alert"
    >
      <div class="flex items-start gap-3">
        <div class="flex-shrink-0">
          <svg
            class="w-5 h-5 text-yellow-600 dark:text-yellow-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>
        <div class="flex-1 min-w-0">
          <p class="text-sm font-medium text-yellow-800 dark:text-yellow-200">
            {{ $t('languageAccuracy.alert.title') }}
          </p>
          <p class="mt-1 text-sm text-yellow-700 dark:text-yellow-300">
            {{ $t('languageAccuracy.alert.message') }}
          </p>
        </div>
        <button
          @click="dismiss"
          class="flex-shrink-0 text-yellow-600 dark:text-yellow-400 hover:text-yellow-800 dark:hover:text-yellow-200 transition-colors"
          :aria-label="$t('languageAccuracy.alert.dismiss')"
        >
          <svg
            class="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';

const isVisible = ref(false);

onMounted(() => {
  // Check if user has already dismissed this alert
  const dismissed = localStorage.getItem('languageAccuracyAlertDismissed');
  if (!dismissed) {
    isVisible.value = true;
  }
});

const dismiss = () => {
  isVisible.value = false;
  // Store dismissal in localStorage
  localStorage.setItem('languageAccuracyAlertDismissed', 'true');
};
</script>

