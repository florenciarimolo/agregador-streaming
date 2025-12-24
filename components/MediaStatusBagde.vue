<template>
  <!-- Status badge, positioned on the left side of the poster -->
  <div
    :class="badgeStyle"
    class="absolute p-1 md:p-2 text-xs font-semibold rounded shadow-xl shadow-black/50 top-2 left-2 md:top-4 md:left-4 z-10"
  >
    <span class="font-bold text-white text-xs md:text-lg uppercase">
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
