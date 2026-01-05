<template>
  <footer class="w-full">
    <AppShell>
      <div class="py-6 border-t border-gray-300/50 dark:border-white/10">
        <!-- Desktop Footer -->
        <div class="hidden md:block">
          <div class="flex flex-col gap-6">
            <!-- Top Section: Links and Language Selector -->
            <div class="flex flex-wrap justify-between items-center gap-6">
              <!-- Navigation Links -->
              <nav class="flex flex-wrap gap-6 items-center">
                <nuxt-link
                  :to="howItWorksRoute"
                  class="text-sm text-gray-800 no-underline transition-colors dark:text-gray-300 hover:text-primary dark:hover:text-primary-400"
                >
                  {{ $t('footer.howItWorks') }}
                </nuxt-link>
                <nuxt-link
                  :to="faqRoute"
                  class="text-sm text-gray-800 no-underline transition-colors dark:text-gray-300 hover:text-primary dark:hover:text-primary-400"
                >
                  {{ $t('footer.faq') }}
                </nuxt-link>
                <nuxt-link
                  :to="privacyRoute"
                  class="text-sm text-gray-800 no-underline transition-colors dark:text-gray-300 hover:text-primary dark:hover:text-primary-400"
                >
                  {{ $t('footer.privacy') }}
                </nuxt-link>
              </nav>
              <!-- Language Selector (Desktop only) -->
              <div class="flex items-center gap-2">
                <span class="text-sm text-gray-600 dark:text-gray-400">
                  {{ $t('settings.language.title') }}:
                </span>
                <AppLanguageSelector :open-upward="true" />
              </div>
            </div>
            <!-- Bottom Section: Copyright and Contact -->
            <div
              class="flex flex-col gap-2 pt-4 border-t border-gray-300/50 dark:border-white/10"
            >
              <p class="text-sm text-center text-gray-800 dark:text-gray-300">
                {{ $t('footer.copyright', { year: currentYear }) }}
              </p>
              <div
                class="flex flex-wrap gap-4 items-center justify-center text-sm text-gray-800 dark:text-gray-300"
              >
                <p>
                  {{ $t('footer.developedBy') }}
                  <a
                    href="https://rimobyte.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="text-gray-800 no-underline transition-colors dark:text-gray-300 hover:text-primary dark:hover:text-primary-400"
                  >
                    RimoByte
                  </a>
                </p>
                <span class="text-gray-400">•</span>
                <p>
                  {{ $t('footer.contact') }}
                  <a
                    href="mailto:hello@getupnext.io"
                    class="text-gray-800 no-underline transition-colors dark:text-gray-300 hover:text-primary dark:hover:text-primary-400"
                  >
                    hello@getupnext.io
                  </a>
                </p>
              </div>
            </div>
          </div>
        </div>
        <!-- Mobile Footer -->
        <div class="md:hidden text-center">
          <div class="flex flex-wrap gap-4 justify-center items-center mb-4">
            <nuxt-link
              :to="howItWorksRoute"
              class="text-sm text-gray-800 no-underline transition-colors dark:text-gray-300 hover:text-primary dark:hover:text-primary-400"
            >
              {{ $t('footer.howItWorks') }}
            </nuxt-link>
            <span class="text-gray-400">•</span>
            <nuxt-link
              :to="faqRoute"
              class="text-sm text-gray-800 no-underline transition-colors dark:text-gray-300 hover:text-primary dark:hover:text-primary-400"
            >
              {{ $t('footer.faq') }}
            </nuxt-link>
            <span class="text-gray-400">•</span>
            <nuxt-link
              :to="privacyRoute"
              class="text-sm text-gray-800 no-underline transition-colors dark:text-gray-300 hover:text-primary dark:hover:text-primary-400"
            >
              {{ $t('footer.privacy') }}
            </nuxt-link>
          </div>
          <!-- Language Selector (Mobile) -->
          <div class="flex flex-col gap-2 justify-center items-center mb-4">
            <span class="text-sm text-gray-600 dark:text-gray-400">
              {{ $t('settings.language.title') }}:
            </span>
            <AppLanguageSelector :open-upward="true" />
          </div>
          <p class="mb-2 text-sm text-gray-800 dark:text-gray-300">
            {{ $t('footer.copyright', { year: currentYear }) }}
          </p>
          <p class="text-sm text-gray-800 dark:text-gray-300">
            {{ $t('footer.developedBy') }}
            <a
              href="https://rimobyte.com"
              target="_blank"
              rel="noopener noreferrer"
              class="text-gray-800 no-underline transition-colors dark:text-gray-300 hover:text-primary dark:hover:text-primary-400"
            >
              RimoByte
            </a>
          </p>
          <p class="mt-2 text-sm text-gray-800 dark:text-gray-300">
            {{ $t('footer.contact') }}
            <a
              href="mailto:hello@getupnext.io"
              class="text-gray-800 no-underline transition-colors dark:text-gray-300 hover:text-primary dark:hover:text-primary-400"
            >
              hello@getupnext.io
            </a>
          </p>
        </div>
      </div>
    </AppShell>
  </footer>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import AppShell from '@/components/layout/AppShell.vue';
import AppLanguageSelector from '@/components/AppLanguageSelector.vue';

const { routeWithLang } = useRouteWithLang();

// Computed routes with language prefix
// CRITICAL: routeWithLang() accesses route.params.lang directly, ensuring reactivity
// These computed will automatically re-evaluate when route.params.lang changes
const howItWorksRoute = computed(() => routeWithLang('/how-it-works'));
const faqRoute = computed(() => routeWithLang('/faq'));
const privacyRoute = computed(() => routeWithLang('/privacy'));

// Calculate current year dynamically
const currentYear = computed(() => new Date().getFullYear());
</script>
