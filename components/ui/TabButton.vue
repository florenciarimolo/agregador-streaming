<template>
  <button
    type="button"
    :class="[
      'h-8 px-4 py-1.5 text-xs font-semibold rounded-full transition-all whitespace-nowrap flex items-center justify-center gap-1',
      isActive
        ? 'bg-primary-900 text-white border border-primary-950 dark:bg-primary-700 dark:border-primary-500'
        : 'dark:bg-gray-800/50 bg-gray-100/50 dark:text-gray-300 text-gray-700 border border-gray-300 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-700',
      fullWidth ? 'flex-1' : '',
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
    fullWidth?: boolean;
  }>(),
  {
    isActive: false,
    badge: undefined,
    customClass: '',
    fullWidth: false,
  }
);

defineEmits<{
  click: [event: MouseEvent];
}>();
</script>
