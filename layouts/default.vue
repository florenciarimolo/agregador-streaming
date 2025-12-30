<template>
      <AnimatedBackground />

  <div class="min-h-screen md:w-[1400px] relative overflow-hidden py-8 md:py-0">
    <!-- Simple Background -->

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
