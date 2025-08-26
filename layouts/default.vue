<template>
  <div class="min-h-screen bg-background">
    <!-- Navbar -->
    <TheNavbar />

    <!-- Contenido principal -->
    <main class="container mx-auto pb-8 pt-10 lg:pt-32">
      <slot />
    </main>
  </div>
</template>

<script setup lang="ts">
// Layout por defecto - se aplica a todas las páginas
</script>
