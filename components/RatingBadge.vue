<template>
  <!-- Rating badge, with different color according the value -->
  <div
    :class="{
      'bg-green-600/90 dark:bg-green-700/90 border-green-500/30 text-green-300':
        rating >= 7,
      'bg-yellow-600/90 dark:bg-yellow-500/90 border-yellow-500/30 text-yellow-300':
        rating >= 5 && rating < 7,
      'bg-gray-600/90 dark:bg-gray-500/90 border-gray-500/30 text-gray-300':
        rating === 0 || !rating,
      'bg-red-600/90 dark:bg-red-500/90 border-red-500/30 text-red-300':
        rating && rating < 5,
    }"
    class="px-2 py-1.5 text-xs font-medium rounded-full shadow-sm shadow-black/50 border whitespace-nowrap flex items-center gap-1"
  >
    <IconStar icon-class="w-3 h-3" />
    {{
      rating?.toFixed(1) === '0.0' || rating === 0 || !rating
        ? 'N/A'
        : rating?.toFixed(1)
    }}
  </div>
</template>

<script setup lang="ts">
import IconStar from './icons/IconStar.vue';

defineProps({
  rating: {
    type: Number,
    required: true,
  },
});
</script>

<style scoped></style>
