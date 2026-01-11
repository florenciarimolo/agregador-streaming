<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
  <PageNavigationLoader />
  <CookieBanner />
</template>

<script setup lang="ts">
import { onMounted, watch } from 'vue';
import { useRoute } from 'vue-router';
import PageNavigationLoader from '@/components/PageNavigationLoader.vue';
import { useHtmlLang } from '@/composables/useHtmlLang';

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

// NOTE: Language synchronization is handled by middleware/sync-lang.ts
// The URL is the single source of truth for language, and the middleware
// ensures i18n.locale is always synchronized with route.params.lang
const route = useRoute();

// Set HTML lang attribute dynamically based on URL language
// This ensures <html lang="xx"> matches the language in the URL
const { htmlLang } = useHtmlLang();

// Get Twitter card image based on current language
const { twitterCardImage } = useTwitterCardImage();

// Watch for route changes and update html lang and Twitter card image
watch(
  () => [route.params.lang, htmlLang.value, twitterCardImage.value],
  () => {
    useHead({
      htmlAttrs: {
        lang: htmlLang.value,
      },
    });

    // Update Twitter card image dynamically based on language
    useSeoMeta({
      twitterImage: twitterCardImage.value,
    });
  },
  { immediate: true }
);
</script>

<style>
/* Los estilos globales van aquí */
#__nuxt {
  background-color: inherit;
}
</style>
