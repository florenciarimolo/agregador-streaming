<template>
  <ClientOnly>
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
        class="fixed bottom-0 left-0 right-0 z-50 w-full"
      >
        <AppShell>
          <div class="rounded-3xl border shadow-md backdrop-blur-xl dark:bg-gray-900/40 bg-gray-100/80 border-gray-300/50 dark:border-white/10 py-4 px-4 md:px-6 mb-4">
            <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <!-- Text Content -->
              <div class="flex-1">
                <p class="text-sm text-gray-800 dark:text-gray-300">
                  {{ $t('cookies.message') }}
                  <nuxt-link
                    :to="privacyRoute"
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
        </AppShell>
      </div>
    </Transition>
  </ClientOnly>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useCookieConsent } from '@/composables/useCookieConsent';
import Button from '@/components/ui/Button.vue';
import AppShell from '@/components/layout/AppShell.vue';

const { isUnset, acceptCookies, rejectCookies } = useCookieConsent();
const { routeWithLang } = useRouteWithLang();

// Computed route with language prefix
const privacyRoute = computed(() => routeWithLang('/privacy'));
</script>

