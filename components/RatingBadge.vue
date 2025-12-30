<template>
  <!-- Rating badge, with different color according the value -->
  <div
    :class="{
      'bg-green-500 border-green-600': rating >= 7,
      'bg-yellow-500 border-yellow-600': rating >= 5 && rating < 7,
      'bg-gray-500 border-gray-600': rating === 0 || !rating,
      'bg-red-500 border-red-600': rating && rating < 5,
    }"
    class="absolute p-2 text-sm font-semibold rounded shadow-xl shadow-black/20 top-2 right-2 border"
  >
    <span class="font-bold text-white whitespace-nowrap">
      ⭐
      {{
        rating?.toFixed(1) === '0.0' || rating === 0 || !rating
          ? 'N/A'
          : rating?.toFixed(1)
      }}
    </span>
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
