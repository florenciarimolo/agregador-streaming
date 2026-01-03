<template>
  <div class="min-h-screen relative overflow-hidden">
    <!-- Simple Background -->

    <!-- Navbar -->
    <TheNavbar />

    <!-- Contenido principal -->
    <main class="pb-[54px] pt-[104px] md:pt-[64px] relative z-0">
      <slot />
    </main>

    <!-- Footer -->
    <footer class="w-full">
      <AppShell>
        <div
          class="py-6 text-center border-t border-gray-300/50 dark:border-white/10"
        >
          <div class="flex flex-wrap gap-4 justify-center items-center mb-4">
            <nuxt-link
              to="/how-it-works"
              class="text-sm text-gray-800 no-underline transition-colors dark:text-gray-300 hover:text-primary dark:hover:text-primary-400"
            >
              {{ $t('footer.howItWorks') }}
            </nuxt-link>
            <span class="text-gray-400">•</span>
            <nuxt-link
              to="/faq"
              class="text-sm text-gray-800 no-underline transition-colors dark:text-gray-300 hover:text-primary dark:hover:text-primary-400"
            >
              {{ $t('footer.faq') }}
            </nuxt-link>
            <span class="text-gray-400">•</span>
            <nuxt-link
              to="/privacy"
              class="text-sm text-gray-800 no-underline transition-colors dark:text-gray-300 hover:text-primary dark:hover:text-primary-400"
            >
              {{ $t('footer.privacy') }}
            </nuxt-link>
          </div>
          <p class="mb-2 text-sm text-gray-800 dark:text-gray-300">
            {{ $t('footer.copyright') }}
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
      </AppShell>
    </footer>

    <!-- Global Undo Toast -->
    <Toast />
  </div>
</template>

<script setup lang="ts">
import Toast from '@/components/ui/Toast.vue';
import AppShell from '@/components/layout/AppShell.vue';
// Layout por defecto - se aplica a todas las páginas
</script>
