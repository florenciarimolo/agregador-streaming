<template>
  <div
    :class="[
      'dark:bg-gray-900/40 bg-gray-100/80 backdrop-blur-xl rounded-3xl border border-gray-300/50 dark:border-white/10',
      paddingClass,
      customClass,
    ]"
  >
    <slot />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

type CardPadding = 'none' | 'sm' | 'md' | 'lg' | 'xl';

const props = withDefaults(
  defineProps<{
    padding?: CardPadding;
    customClass?: string;
  }>(),
  {
    padding: 'lg',
  }
);

const paddingClass = computed(() => {
  const classes: Record<CardPadding, string> = {
    none: '',
    sm: 'p-2',
    md: 'p-4',
    lg: 'p-6',
    xl: 'p-8',
  };
  return classes[props.padding];
});
</script>

