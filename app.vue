<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
  <PageNavigationLoader />
  <CookieBanner />
</template>

<script setup lang="ts">
import PageNavigationLoader from '@/components/PageNavigationLoader.vue';

// Initialize theme
useTheme();
</script>

<style>
/* Los estilos globales van aquí */
#__nuxt {
  background-color: inherit;
}
</style>
