<script setup lang="ts">
const { t } = useI18n();

useHead({
  title: `${t('search.title')} - UpNext`,
});

useSeoMeta({
  title: `${t('search.title')} - UpNext`,
  description: t('search.title'),
});
</script>

<template>
  <h1>{{ $t('search.title') }}</h1>
  <nuxt-link to="/"
    >{{ $t('common.back') }} a {{ $t('navbar.home') }}</nuxt-link
  >
  <nuxt-link to="/library">Ir a biblioteca</nuxt-link>
</template>
