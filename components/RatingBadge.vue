<template>
  <!-- Rating badge with TMDB logo -->
  <div
    class="text-xs font-medium whitespace-nowrap flex items-center gap-1 flex-shrink-0 min-w-fit"
  >
    <img src="/tmdb-logo.svg" alt="TMDB" class="w-10 h-10 flex-shrink-0" />
    {{
      rating?.toFixed(1) === '0.0' || rating === 0 || !rating
        ? 'N/A'
        : rating?.toFixed(1)
    }}
  </div>
</template>

<script setup lang="ts">
defineProps({
  rating: {
    type: Number,
    required: true,
  },
});
</script>

<style scoped></style>
