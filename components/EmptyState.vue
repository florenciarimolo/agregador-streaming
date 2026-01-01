<template>
  <div
    class="text-center py-12 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg"
  >
    <component
      :is="iconComponent"
      class="w-16 h-16 mx-auto mb-4 text-gray-400"
    />
    <p class="text-gray-800 dark:text-gray-300">{{ message }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed, h } from 'vue';

interface Props {
  message: string;
  icon?: 'heart' | 'eye' | 'x' | 'bookmark' | 'default';
}

const props = withDefaults(defineProps<Props>(), {
  icon: 'default',
});

const iconComponent = computed(() => {
  const icons = {
    heart: () =>
      h('svg', { fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' }, [
        h('path', {
          'stroke-linecap': 'round',
          'stroke-linejoin': 'round',
          'stroke-width': '2',
          d: 'M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z',
        }),
      ]),
    eye: () =>
      h('svg', { fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' }, [
        h('path', {
          'stroke-linecap': 'round',
          'stroke-linejoin': 'round',
          'stroke-width': '2',
          d: 'M15 12a3 3 0 11-6 0 3 3 0 016 0z',
        }),
        h('path', {
          'stroke-linecap': 'round',
          'stroke-linejoin': 'round',
          'stroke-width': '2',
          d: 'M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z',
        }),
      ]),
    x: () =>
      h('svg', { fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' }, [
        h('path', {
          'stroke-linecap': 'round',
          'stroke-linejoin': 'round',
          'stroke-width': '2',
          d: 'M6 18L18 6M6 6l12 12',
        }),
      ]),
    bookmark: () =>
      h('svg', { fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' }, [
        h('path', {
          'stroke-linecap': 'round',
          'stroke-linejoin': 'round',
          'stroke-width': '2',
          d: 'M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z',
        }),
      ]),
    default: () =>
      h('svg', { fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' }, [
        h('path', {
          'stroke-linecap': 'round',
          'stroke-linejoin': 'round',
          'stroke-width': '2',
          d: 'M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4',
        }),
      ]),
  };

  return icons[props.icon] || icons.default;
});
</script>

