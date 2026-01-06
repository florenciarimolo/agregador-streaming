<template>
  <span
    :class="[
      'text-label uppercase tracking-overline font-label',
      colorClass,
      customClass,
    ]"
  >
    <slot />
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue';

interface Props {
  /**
   * Color variant for the label
   * @default 'default'
   */
  variant?: 'default' | 'muted' | 'primary';
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
    case 'primary':
      return 'text-primary-800 dark:text-primary-400';
    case 'default':
    default:
      return 'text-gray-800 dark:text-gray-300';
  }
});
</script>

