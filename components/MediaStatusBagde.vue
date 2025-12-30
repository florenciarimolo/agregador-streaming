<template>
  <!-- Status badge -->
  <div
    :class="badgeStyle"
    class="inline-flex items-center w-fit px-6 py-3 text-xs font-semibold rounded-full shadow-sm shadow-black/50 z-10 border"
  >
    <span
      class="font-medium text-white text-xs md:text-sm uppercase whitespace-nowrap"
    >
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
  'bg-green-500 border-green-600': props.inProduction,
  'bg-yellow-500 border-yellow-600': !props.inProduction,
}));
</script>

<style scoped></style>
