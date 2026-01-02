<script setup lang="ts">
const { t } = useI18n();
const config = useRuntimeConfig();
const siteUrl = config.public.baseUrl || config.public.siteUrl;

// SEO: Search page - noindex, follow, canonical to home
useHead({
  title: t('search.title'),
  meta: [
    {
      name: 'robots',
      content: 'noindex, follow',
    },
  ],
  link: [
    {
      rel: 'canonical',
      href: `${siteUrl}/`,
    },
  ],
});

useSeoMeta({
  title: t('search.title'),
  description: t('search.title'),
  robots: 'noindex, follow',
});
</script>

<template>
  <h1>{{ $t('search.title') }}</h1>
  <nuxt-link to="/"
    >{{ $t('common.back') }} a {{ $t('navbar.home') }}</nuxt-link
  >
  <nuxt-link to="/library">Ir a biblioteca</nuxt-link>
</template>
