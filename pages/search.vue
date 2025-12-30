<script setup lang="ts">
useHead({
  title: 'Búsqueda - UpNext',
});

useSeoMeta({
  title: 'Búsqueda - UpNext',
  description: 'Busca películas y series en UpNext',
});
</script>

<template>
  <h1>Búsqueda</h1>
  <router-link to="/">Volver a inicio</router-link>
  <router-link to="/library">Ir a biblioteca</router-link>
</template>
