<template>
    <!-- Rating badge, with different color according the status -->
    <div
      :class="badgeStyle"
      class="absolute p-2 text-xs font-semibold rounded shadow-xl shadow-black/50 top-4 right-4"
    >
      <span class="font-bold text-white text-lg uppercase">
        {{ inProduction ? 'En producción' : 'Finalizada' }}
      </span>
    </div>
  </template>
  
  <script setup lang="ts">
  import { computed } from 'vue';

  const props = defineProps({
    inProduction: {
      type: Boolean,
      required: true,
    },
  });

  const badgeStyle = computed(() => ({
    'bg-green-500': props.inProduction,
    'bg-yellow-500': !props.inProduction,
  }));
  </script>
  
  <style scoped></style>