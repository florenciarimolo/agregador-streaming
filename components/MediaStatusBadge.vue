<template>
  <!-- Status badge -->
  <div
    :class="badgeStyle"
    class="inline-flex items-center w-fit px-4 py-1.5 text-xs font-medium rounded-full shadow-sm shadow-black/50 z-10 border whitespace-nowrap"
  >
    {{ badgeText }}
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps({
  inProduction: {
    type: Boolean,
    required: false,
    default: false,
  },
  inTheaters: {
    type: Boolean,
    required: false,
    default: false,
  },
});

const badgeText = computed(() => {
  if (props.inTheaters) {
    return 'En Cines';
  }
  return props.inProduction ? 'En Producción' : 'Finalizada';
});

const badgeStyle = computed(() => {
  if (props.inTheaters) {
    return {
      'bg-blue-600/90 dark:bg-blue-700/90 border-blue-500/30 text-blue-300': true,
    };
  }
  return {
    'bg-green-600/90 dark:bg-green-700/90 border-green-500/30 text-green-300':
      props.inProduction,
    'bg-yellow-600/90 dark:bg-yellow-500/90 border-yellow-500/30 text-yellow-300':
      !props.inProduction,
  };
});
</script>

<style scoped></style>

