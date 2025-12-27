<template>
  <div class="min-h-screen w-full relative overflow-hidden">
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
