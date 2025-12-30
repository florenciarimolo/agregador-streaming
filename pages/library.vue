<script setup lang="ts">
useHead({
  title: 'Biblioteca - UpNext',
});

useSeoMeta({
  title: 'Biblioteca - UpNext',
  description: 'Tu biblioteca personal de películas y series en UpNext',
});
</script>

<template>
  <h1>Biblioteca</h1>
  <router-link to="/search">Ir a búsqueda</router-link>
</template>
