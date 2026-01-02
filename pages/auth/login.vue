<script setup lang="ts">
// Redirect to home page - login is handled by AuthForm.vue on the root page
definePageMeta({
  layout: false,
  ssr: false, // Client-side only redirect
});

// Immediate redirect to home page
onMounted(() => {
  navigateTo('/', { replace: true });
});
</script>

<template>
  <div></div>
</template>
