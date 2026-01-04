<template>
  <div class="min-h-screen relative overflow-x-hidden w-full max-w-full">
    <!-- Simple Background -->

    <!-- Navbar -->
    <TheNavbar />

    <!-- Contenido principal -->
    <main class="pb-[54px] pt-[104px] md:pt-[64px] relative z-0">
      <slot />
    </main>

    <!-- Footer -->
    <TheFooter />

    <!-- Global Undo Toast -->
    <Toast />
  </div>
</template>

<script setup lang="ts">
import Toast from '@/components/ui/Toast.vue';
// Layout por defecto - se aplica a todas las páginas
</script>
