<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
  <LoadingSpinner />
</template>

<script setup lang="ts">
import LoadingSpinner from '@/components/LoadingSpinner.vue';

// Initialize theme
useTheme();
</script>

<style>
/* Los estilos globales van aquí */
#__nuxt {
  background-color: inherit;
}
</style>
