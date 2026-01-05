<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
  <PageNavigationLoader />
  <CookieBanner />
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import PageNavigationLoader from '@/components/PageNavigationLoader.vue';

// Initialize theme
useTheme();

// Initialize auth state from Supabase
// This runs in onMounted to ensure Pinia is available (client-only)
const { initAuth, setupAuthListener } = useAuthInit();

onMounted(() => {
  // Initialize auth state from current session
  initAuth();
  // Set up listener for future auth state changes
  setupAuthListener();
});
</script>

<style>
/* Los estilos globales van aquí */
#__nuxt {
  background-color: inherit;
}
</style>
