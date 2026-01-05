<script setup lang="ts">
import { DEFAULT_LANGUAGE_URL_CODE } from '@/constants/urlLanguageCodes';

// Redirect to home page with language prefix - login is handled by AuthForm.vue on the root page
definePageMeta({
  layout: false,
  ssr: false, // Client-side only redirect
});

// Get language from URL parameter or use default
const route = useRoute();
const langFromUrl = route.params?.lang as string | undefined;
const lang = langFromUrl || DEFAULT_LANGUAGE_URL_CODE;

// Immediate redirect to home page with language prefix
// Use navigateTo directly in setup (runs on client side only due to ssr: false)
navigateTo(`/${lang}/`, { replace: true });
</script>

<template>
  <div></div>
</template>
