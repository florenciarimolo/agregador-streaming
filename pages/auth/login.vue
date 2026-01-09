<script setup lang="ts">
  // Redirect to home page with language prefix - login is handled by AuthForm.vue on the root page
  definePageMeta({
    layout: false,
    ssr: false, // Client-side only redirect
  });
  
  const { routeWithLang } = useRouteWithLang();
  
  // Immediate redirect to home page with language prefix
  // Use navigateTo directly in setup (runs on client side only due to ssr: false)
  navigateTo(routeWithLang('/'), { replace: true });
  </script>
  
  <template>
    <div></div>
  </template>