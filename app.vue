<template>
  <NuxtLayout>
    <Transition name="page" mode="out-in" @after-enter="onPageAfterEnter">
      <div :key="route.fullPath" class="contents">
        <NuxtPage />
      </div>
    </Transition>
  </NuxtLayout>
  <PageNavigationLoader />
  <CookieBanner />
</template>

<script setup lang="ts">
import { onMounted, watch } from 'vue';
import { useRoute } from 'vue-router';
import PageNavigationLoader from '@/components/PageNavigationLoader.vue';
import { useHtmlLang } from '@/composables/useHtmlLang';

// Shared state with PageNavigationLoader: stop overlay when new page has finished rendering
const pageNavigationLoading = useState<boolean>(
  'page-navigation-loading',
  () => false
);

const onPageAfterEnter = () => {
  pageNavigationLoading.value = false;
};

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
  () => [route.params.lang, htmlLang, twitterCardImage],
  () => {
    useHead({
      htmlAttrs: {
        lang: htmlLang,
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
/* Global styles */
#__nuxt {
  background-color: inherit;
}

/* Page transition: instant so we only use afterEnter for loader timing (content rendered) */
.page-enter-active,
.page-leave-active {
  transition: none;
}
</style>
