<template>
  <p
    :class="[
      'text-body font-body',
      colorClass,
      customClass,
    ]"
  >
    <slot />
  </p>
</template>

<script setup lang="ts">
import { computed } from 'vue';

interface Props {
  /**
   * Color variant for the text
   * @default 'default'
   */
  variant?: 'default' | 'muted' | 'secondary';
  /**
   * Custom classes to add
   */
  customClass?: string;
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'default',
  customClass: '',
});

const colorClass = computed(() => {
  switch (props.variant) {
    case 'muted':
      return 'text-gray-600 dark:text-gray-400';
    case 'secondary':
      return 'text-gray-700 dark:text-gray-300';
    case 'default':
    default:
      return 'text-gray-800 dark:text-gray-300';
  }
});
</script>

