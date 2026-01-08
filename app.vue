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
import { getI18nCodeFromUrlCode } from '@/composables/useLangFromUrl';

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

// CRITICAL: Synchronize i18n.locale with route.params.lang on every route change
// The URL is the single source of truth for language
const route = useRoute();
const { locale, setLocale } = useI18n();

// Watch route.params.lang and synchronize i18n.locale immediately
watch(
  () => route.params.lang,
  async (langFromUrl) => {
    // Only run on client side
    if (import.meta.server) return;

    // If no language in URL, let legacy-redirect middleware handle it
    if (!langFromUrl) return;

    try {
      // Map URL code to i18n code
      const i18nCodeFromUrl = getI18nCodeFromUrlCode(langFromUrl as string);

      if (!i18nCodeFromUrl) {
        // Invalid language code - let other middleware handle 404
        if (process.env.NODE_ENV === 'development') {
          console.warn(
            `[app.vue] Invalid language code in URL: ${langFromUrl}`
          );
        }
        return;
      }

      // CRITICAL: Check if i18n.locale matches URL language
      // If not, synchronize it immediately
      if (locale.value !== i18nCodeFromUrl) {
        if (process.env.NODE_ENV === 'development') {
          console.log(
            `[app.vue] Synchronizing i18n.locale: ${locale.value} -> ${i18nCodeFromUrl} (from URL: /${langFromUrl}/...)`
          );
        }

        // Set locale to match URL (this is the source of truth)
        await setLocale(i18nCodeFromUrl);

        // Verify synchronization (safety check)
        if (
          locale.value !== i18nCodeFromUrl &&
          process.env.NODE_ENV === 'development'
        ) {
          console.warn(
            `[app.vue] WARNING: Failed to synchronize locale. Expected: ${i18nCodeFromUrl}, Got: ${locale.value}`
          );
        }
      }
    } catch (error) {
      // Don't block navigation if locale sync fails
      if (process.env.NODE_ENV === 'development') {
        console.error('[app.vue] Error synchronizing locale:', error);
      }
    }
  },
  { immediate: true } // Run immediately on mount
);

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
