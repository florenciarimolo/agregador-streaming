<template>
  <Transition
    enter-active-class="transition-all duration-300 ease-out"
    enter-from-class="translate-y-full opacity-0"
    enter-to-class="translate-y-0 opacity-100"
    leave-active-class="transition-all duration-300 ease-in"
    leave-from-class="translate-y-0 opacity-100"
    leave-to-class="translate-y-full opacity-0"
  >
    <div
      v-if="isUnset"
      class="fixed bottom-0 left-0 right-0 z-50 w-full px-4 py-4 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm border-t border-gray-200 dark:border-gray-700 shadow-lg"
    >
      <div class="container mx-auto max-w-7xl">
        <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <!-- Text Content -->
          <div class="flex-1">
            <p class="text-sm text-gray-800 dark:text-gray-300">
              {{ $t('cookies.message') }}
              <nuxt-link
                to="/privacy"
                class="text-gray-800 dark:text-gray-300 hover:text-primary dark:hover:text-primary-400 transition-colors font-medium"
              >
                {{ $t('cookies.privacyLink') }}
              </nuxt-link>
            </p>
          </div>

          <!-- Actions -->
          <div class="flex flex-row gap-2 items-center">
            <Button
              variant="outline"
              size="small"
              @click="rejectCookies"
            >
              {{ $t('cookies.reject') }}
            </Button>
            <Button
              variant="primary"
              size="small"
              @click="acceptCookies"
            >
              {{ $t('cookies.accept') }}
            </Button>
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { useCookieConsent } from '@/composables/useCookieConsent';
import Button from '@/components/ui/Button.vue';

const { isUnset, acceptCookies, rejectCookies } = useCookieConsent();
</script>

