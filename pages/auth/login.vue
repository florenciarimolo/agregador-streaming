<script setup lang="ts">
// Redirect to home page with language prefix - login is handled by AuthForm.vue on the root page
definePageMeta({
  layout: false,
  ssr: false, // Client-side only redirect
});

const { routeWithLang } = useRouteWithLang();
const router = useRouter();

// Immediate redirect to home page with language prefix
// Use onMounted to ensure client-side execution
onMounted(() => {
  router.replace(routeWithLang('/'));
});
</script>

<template>
  <div></div>
</template>