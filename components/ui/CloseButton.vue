<template>
  <button
    type="button"
    :class="[
      'flex items-center justify-center rounded-full backdrop-blur-sm transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-black/50',
      size === 'small' ? 'p-1.5' : size === 'large' ? 'p-2 w-7 h-7' : 'p-1.5',
      variant === 'red'
        ? 'bg-red-500 hover:bg-red-600 text-white shadow-lg hover:scale-110 focus:ring-offset-transparent'
        : 'bg-black/50 hover:bg-red-600/80',
      customClass,
    ]"
    :aria-label="ariaLabel || $t('common.close')"
    @click="$emit('click', $event)"
  >
    <svg
      :class="size === 'large' ? 'w-4 h-4' : 'w-4 h-4'"
      class="text-white"
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
withDefaults(
  defineProps<{
    ariaLabel?: string;
    customClass?: string;
    size?: 'small' | 'large';
    variant?: 'default' | 'red';
  }>(),
  {
    size: 'small',
    variant: 'default',
  }
);

defineEmits<{
  click: [event: MouseEvent];
}>();
</script>
