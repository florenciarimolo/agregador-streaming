<template>
  <button
    type="button"
    :class="buttonClasses"
    :aria-label="ariaLabel || $t('common.close')"
    @click="$emit('click', $event)"
  >
    <svg
      :class="iconClasses"
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
import { computed } from 'vue';

const props = withDefaults(
  defineProps<{
    ariaLabel?: string;
    customClass?: string;
    size?: 'small' | 'large';
    variant?: 'default' | 'red' | 'toast';
  }>(),
  {
    ariaLabel: undefined,
    customClass: undefined,
    size: 'small',
    variant: 'default',
  }
);

defineEmits<{
  click: [event: MouseEvent];
}>();

const buttonClasses = computed(() => {
  const baseClasses = props.variant === 'toast'
    ? 'p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors'
    : [
        'flex items-center justify-center rounded-full backdrop-blur-sm transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-black/50',
        props.size === 'small' ? 'p-1' : props.size === 'large' ? 'p-2 w-7 h-7' : 'p-1',
        props.variant === 'red'
          ? 'bg-red-500 hover:bg-red-600 text-white shadow-lg hover:scale-110 focus:ring-offset-transparent'
          : 'bg-black/50 hover:bg-red-600/80',
      ].join(' ');

  return props.customClass ? `${baseClasses} ${props.customClass}` : baseClasses;
});

const iconClasses = computed(() => {
  if (props.variant === 'toast') {
    return 'w-4 h-4 dark:text-gray-300 text-gray-800';
  }
  return `${props.size === 'large' ? 'w-4 h-4' : 'w-3 h-3'} text-white`;
});
</script>
