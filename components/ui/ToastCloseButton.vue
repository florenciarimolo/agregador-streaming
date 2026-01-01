<template>
  <button
    type="button"
    :class="[
      'p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors',
      customClass,
    ]"
    :aria-label="ariaLabel || $t('common.close')"
    @click="$emit('click', $event)"
  >
    <svg
      class="w-4 h-4 dark:text-gray-300 text-gray-800"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="2"
        d="M6 18L18 6M6 6l12 12"
      />
    </svg>
  </button>
</template>

<script setup lang="ts">
defineProps<{
  ariaLabel?: string;
  customClass?: string;
}>();

defineEmits<{
  click: [event: MouseEvent];
}>();
</script>

