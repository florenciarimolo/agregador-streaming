<script setup lang="ts">
// Redirect to home page with auth query param to show AuthForm
definePageMeta({
  layout: false,
  middleware: ['guest', 'login-redirect'],
});
</script>

<template>
  <div></div>
</template>
