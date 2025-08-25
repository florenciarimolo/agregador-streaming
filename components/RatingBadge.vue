<template>
    <!-- Rating badge, with different color according the value -->
    <div
      :class="{
        'bg-green-500': rating >= 7,
        'bg-yellow-500': rating >= 5 && rating < 7,
        'bg-gray-500': rating === 0 || !rating,
        'bg-red-500': rating && rating < 5,
      }"
      class="absolute p-2 text-xs font-semibold rounded shadow-xl shadow-black/20 top-2 right-2"
    >
      <span class="font-bold text-white">
        ⭐ {{ rating?.toFixed(1) === '0.0' || rating === 0 || !rating ? 'N/A' : rating?.toFixed(1) }} 
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