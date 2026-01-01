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
      v-if="isVisible && shouldShowAlert"
      class="fixed bottom-4 right-4 max-w-md dark:bg-gray-900/40 bg-gray-100/80 backdrop-blur-xl border border-gray-300/50 dark:border-white/10 rounded-3xl shadow-lg p-4 z-50"
      role="alert"
    >
      <div class="flex items-start gap-3">
        <div class="flex-shrink-0">
          <svg
            class="w-5 h-5 text-gray-600 dark:text-gray-400"
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
          <p class="text-sm font-medium text-gray-800 dark:text-gray-200">
            {{ $t('languageAccuracy.alert.title') }}
          </p>
          <p class="mt-1 text-sm text-gray-700 dark:text-gray-300">
            {{ $t('languageAccuracy.alert.message') }}
          </p>
        </div>
        <ToastCloseButton
          :aria-label="$t('languageAccuracy.alert.dismiss')"
          custom-class="flex-shrink-0"
          @click="dismiss"
        />
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import ToastCloseButton from '@/components/ui/ToastCloseButton.vue';

const COOKIE_NAME = 'languageAccuracyAlertDismissed';
const COOKIE_MAX_AGE = 365 * 24 * 60 * 60; // 1 year in seconds

const isVisible = ref(false);
const user = useSupabaseUser();

// Only show alert if user is logged in
const shouldShowAlert = computed(() => {
  return !!user.value;
});

// Helper function to get cookie value
const getCookie = (name: string): string | null => {
  if (typeof document === 'undefined') return null;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) {
    return parts.pop()?.split(';').shift() || null;
  }
  return null;
};

// Helper function to set cookie
const setCookie = (name: string, value: string, maxAge: number) => {
  if (typeof document === 'undefined') return;
  document.cookie = `${name}=${value}; max-age=${maxAge}; path=/; SameSite=Lax`;
};

onMounted(() => {
  // Only show alert if user is logged in and hasn't dismissed it
  if (shouldShowAlert.value) {
    const dismissed = getCookie(COOKIE_NAME);
    if (!dismissed) {
      isVisible.value = true;
    }
  }
});

const dismiss = () => {
  isVisible.value = false;
  // Store dismissal in cookies (persists for 1 year)
  setCookie(COOKIE_NAME, 'true', COOKIE_MAX_AGE);
};
</script>
