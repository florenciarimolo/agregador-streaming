<template>
  <h1
    :class="[
      'text-h1 font-heading font-semibold',
      colorClass,
      customClass,
    ]"
  >
    <slot />
  </h1>
</template>

<script setup lang="ts">
import { computed } from 'vue';

interface Props {
  /**
   * Color variant for the title
   * @default 'default'
   */
  variant?: 'default' | 'gradient';
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
  if (props.variant === 'gradient') {
    return 'text-transparent bg-clip-text bg-gradient-to-b from-primary-800 via-primary-800 to-primary-900 dark:from-white dark:via-white dark:to-gray-400';
  }
  return 'text-gray-800 dark:text-gray-300';
});
</script>

