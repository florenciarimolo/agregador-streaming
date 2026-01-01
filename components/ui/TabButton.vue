<template>
  <button
    type="button"
    :class="[
      'py-1.5 md:py-2.5 px-4 rounded-full font-semibold transition-all text-xs md:text-sm whitespace-nowrap flex items-center gap-1',
      isActive
        ? 'bg-primary-800 text-white border border-gray-700/50 dark:bg-primary-600/70 dark:border-primary-800'
        : 'dark:bg-gray-800/50 bg-gray-100/50 dark:text-gray-300 text-gray-700 border border-gray-700/30 dark:border-gray-600/30',
      customClass,
    ]"
    @click="$emit('click', $event)"
  >
    <slot />
    <span
      v-if="badge !== undefined && badge !== null"
      class="px-2 py-0.5 text-xs rounded-full bg-gray-200 dark:bg-gray-400 text-primary"
    >
      {{ badge }}
    </span>
  </button>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    isActive: boolean;
    badge?: number | string | null;
    customClass?: string;
  }>(),
  {
    isActive: false,
    badge: undefined,
  }
);

defineEmits<{
  click: [event: MouseEvent];
}>();
</script>

