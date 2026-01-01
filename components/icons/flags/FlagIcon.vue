<template>
  <svg
    :class="iconClass"
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 640 480"
    :width="width"
    :height="height"
  >
    <component :is="flagComponent" />
  </svg>
</template>

<script setup lang="ts">
import { computed, defineAsyncComponent } from 'vue';

interface Props {
  countryCode: string; // ISO 3166-1 alpha-2 (e.g., 'ES', 'US', 'MX')
  iconClass?: string;
  width?: number | string;
  height?: number | string;
}

const props = withDefaults(defineProps<Props>(), {
  iconClass: 'w-5 h-5',
  width: 20,
  height: 15,
});

// Dynamically import flag component based on country code
const flagComponent = computed(() => {
  try {
    return defineAsyncComponent(
      () => import(`./flags/${props.countryCode.toUpperCase()}.vue`)
    );
  } catch {
    // Fallback to a default flag if not found
    return null;
  }
});
</script>
