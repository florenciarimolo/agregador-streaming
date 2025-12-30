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
        <p class="text-gray-800 dark:text-gray-300 text-sm mb-2">
          © 2025 UpNext. Todos los derechos reservados.
        </p>
        <p class="text-gray-800 dark:text-gray-300 text-sm">
          Desarrollado por
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
          Contacto:
          <a
            href="mailto:hello@getupnext.io"
            class="text-gray-800 dark:text-gray-300 hover:text-primary dark:hover:text-primary-400 transition-colors no-underline"
          >
            hello@getupnext.io
          </a>
        </p>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
// Layout por defecto - se aplica a todas las páginas
</script>
