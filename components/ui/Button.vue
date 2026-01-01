<template>
  <button
    type="button"
    :class="[
      // Base classes
      'rounded-lg font-semibold transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 flex items-center justify-center',
      // Size classes
      sizeClasses,
      // Variant classes
      variantClasses,
      // Icon spacing
      hasIcon && hasText ? iconSpacing : '',
      // Disabled state
      disabled ? 'opacity-50 cursor-not-allowed' : '',
      // Custom classes
      customClass,
    ]"
    :disabled="disabled"
    :aria-label="ariaLabel"
    @click="$emit('click', $event)"
  >
    <span v-if="hasIcon && iconPosition === 'left'" class="flex items-center">
      <component :is="icon" :class="iconSizeClass" />
    </span>
    <span v-if="hasText">
      <slot />
    </span>
    <span v-if="hasIcon && iconPosition === 'right'" class="flex items-center">
      <component :is="icon" :class="iconSizeClass" />
    </span>
  </button>
</template>

<script setup lang="ts">
import { computed, useSlots } from 'vue';

type ButtonSize = 'small' | 'medium' | 'large';
type ButtonVariant = 'primary' | 'outline' | 'danger';
type IconPosition = 'left' | 'right';

const props = withDefaults(
  defineProps<{
    size?: ButtonSize;
    variant?: ButtonVariant;
    icon?: any;
    iconPosition?: IconPosition;
    disabled?: boolean;
    ariaLabel?: string;
    customClass?: string;
  }>(),
  {
    size: 'small',
    variant: 'primary',
    iconPosition: 'left',
    disabled: false,
  }
);

defineEmits<{
  click: [event: MouseEvent];
}>();

const slots = useSlots();

const hasText = computed(() => !!slots.default);
const hasIcon = computed(() => !!props.icon);

const sizeClasses = computed(() => {
  const classes: Record<ButtonSize, string> = {
    small: 'h-8 px-4 py-1.5 text-xs',
    medium: 'h-10 px-4 py-2 text-sm',
    large: 'h-[52px] px-6 py-[28px] text-base',
  };
  return classes[props.size];
});

const variantClasses = computed(() => {
  const classes: Record<ButtonVariant, string> = {
    primary:
      'bg-primary-800 dark:bg-primary hover:bg-primary-900 dark:hover:bg-primary-600 text-white focus:ring-primary',
    outline:
      'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-300 dark:border-gray-600 focus:ring-gray-500',
    danger: 'text-white bg-red-500 hover:bg-red-600 focus:ring-red-500',
  };
  return classes[props.variant];
});

const iconSpacing = computed(() => {
  const spacing: Record<ButtonSize, string> = {
    small: 'gap-1',
    medium: 'gap-2',
    large: 'gap-2',
  };
  return spacing[props.size];
});

const iconSizeClass = computed(() => {
  return 'w-5 h-5';
});
</script>

