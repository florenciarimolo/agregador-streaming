<script setup lang="ts">
// Redirect to home page with auth query param to show AuthForm
definePageMeta({
  layout: false,
  middleware: 'guest',
});

// Redirect to homepage with query param to trigger AuthForm display
await navigateTo('/?auth=login');
</script>
