<template>
  <div class="min-h-screen md:w-[1400px] relative overflow-hidden py-8 md:py-0">
    <!-- Simple Background -->

    <!-- Navbar -->
    <TheNavbar />

    <!-- Contenido principal -->
    <main class="container mx-auto pb-4 pt-4 lg:pt-16 relative z-0">
      <slot />
    </main>

    <!-- Footer -->
    <footer class="w-full mt-12">
      <div
        class="border-t border-gray-300/50 dark:border-white/10 py-6 px-6 text-center"
      >
        <div class="flex flex-wrap justify-center items-center gap-4 mb-4">
          <nuxt-link
            to="/how-it-works"
            class="text-gray-800 dark:text-gray-300 hover:text-primary dark:hover:text-primary-400 transition-colors text-sm no-underline"
          >
            {{ $t('footer.howItWorks') }}
          </nuxt-link>
          <span class="text-gray-400">•</span>
          <nuxt-link
            to="/faq"
            class="text-gray-800 dark:text-gray-300 hover:text-primary dark:hover:text-primary-400 transition-colors text-sm no-underline"
          >
            {{ $t('footer.faq') }}
          </nuxt-link>
        </div>
        <p class="text-gray-800 dark:text-gray-300 text-sm mb-2">
          {{ $t('footer.copyright') }}
        </p>
        <p class="text-gray-800 dark:text-gray-300 text-sm">
          {{ $t('footer.developedBy') }}
          <a
            href="https://rimobyte.com"
            target="_blank"
            rel="noopener noreferrer"
            class="text-gray-800 dark:text-gray-300 hover:text-primary dark:hover:text-primary-400 transition-colors no-underline"
          >
            RimoByte
          </a>
        </p>
        <p class="text-gray-800 dark:text-gray-300 text-sm mt-2">
          {{ $t('footer.contact') }}
          <a
            href="mailto:hello@getupnext.io"
            class="text-gray-800 dark:text-gray-300 hover:text-primary dark:hover:text-primary-400 transition-colors no-underline"
          >
            hello@getupnext.io
          </a>
        </p>
      </div>
    </footer>

    <!-- Global Undo Toast -->
    <UndoToast />
  </div>
</template>

<script setup lang="ts">
import UndoToast from '@/components/UndoToast.vue';
// Layout por defecto - se aplica a todas las páginas
</script>
