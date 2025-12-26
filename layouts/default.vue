<template>
  <div class="min-h-screen w-full relative overflow-hidden">
    <!-- Gradient Background with Blur -->
    <div class="fixed inset-0 -z-10 pointer-events-none">
      <!-- Base background (behind everything) -->
      <div
        class="absolute inset-0 dark:bg-background-dark bg-background-light"
      ></div>
      <!-- Light theme gradient (above base background) -->
      <div
        class="absolute inset-0 dark:hidden gradient-bg-light"
        style="
          backdrop-filter: blur(120px);
          -webkit-backdrop-filter: blur(120px);
        "
      ></div>
      <!-- Dark theme gradient (above base background) -->
      <div
        class="absolute inset-0 hidden dark:block gradient-bg-dark"
        style="
          backdrop-filter: blur(120px);
          -webkit-backdrop-filter: blur(120px);
        "
      ></div>
      <!-- Additional blur layers for depth -->
      <div
        class="absolute inset-0 bg-gradient-to-tr from-transparent via-primary/8 to-transparent dark:via-primary/15"
        style="backdrop-filter: blur(80px); -webkit-backdrop-filter: blur(80px)"
      ></div>
      <!-- Radial gradient overlay for more depth -->
      <div
        class="absolute inset-0 gradient-radial"
        style="backdrop-filter: blur(60px); -webkit-backdrop-filter: blur(60px)"
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
