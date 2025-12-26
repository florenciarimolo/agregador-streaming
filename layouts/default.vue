<template>
  <div
    class="min-h-screen dark:bg-background-dark bg-background-light w-full relative overflow-hidden"
  >
    <!-- Gradient Background with Blur -->
    <div class="fixed inset-0 -z-10 pointer-events-none">
      <!-- Light theme gradient -->
      <div
        class="absolute inset-0 dark:hidden gradient-bg-light"
        style="backdrop-filter: blur(80px); -webkit-backdrop-filter: blur(80px)"
      ></div>
      <!-- Dark theme gradient -->
      <div
        class="absolute inset-0 hidden dark:block gradient-bg-dark"
        style="backdrop-filter: blur(80px); -webkit-backdrop-filter: blur(80px)"
      ></div>
      <!-- Additional blur layers for depth -->
      <div
        class="absolute inset-0 bg-gradient-to-tr from-transparent via-primary/5 to-transparent dark:via-primary/10"
        style="backdrop-filter: blur(60px); -webkit-backdrop-filter: blur(60px)"
      ></div>
      <!-- Radial gradient overlay for more depth -->
      <div
        class="absolute inset-0 gradient-radial"
        style="backdrop-filter: blur(40px); -webkit-backdrop-filter: blur(40px)"
      ></div>
    </div>

    <!-- Navbar -->
    <TheNavbar />

    <!-- Contenido principal -->
    <main class="container mx-auto pb-4 pt-4 lg:pt-8 relative z-0">
      <slot />
    </main>
  </div>
</template>

<script setup lang="ts">
// Layout por defecto - se aplica a todas las páginas
</script>
