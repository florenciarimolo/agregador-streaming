<script setup lang="ts">
// Redirect to home page with auth query param to show AuthForm
definePageMeta({
  layout: false,
  middleware: ['guest', 'login-redirect'],
});

useHead({
  title: 'Iniciar sesión - UpNext',
});

useSeoMeta({
  title: 'Iniciar sesión - UpNext',
  description:
    'Inicia sesión en UpNext para acceder a recomendaciones personalizadas',
});
</script>

<template>
  <div></div>
</template>
