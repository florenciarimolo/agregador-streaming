<template>
  <button
    :type="type"
    :class="[
      // Base classes
      'rounded-lg transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 flex items-center',
      // Cursor classes - only pointer when not disabled
      disabled ? 'cursor-not-allowed' : 'cursor-pointer',
      // Size classes
      sizeClasses,
      // Variant classes
      variantClasses,
      // Icon spacing
      (hasIcon || hasIconSlot) && hasText ? iconSpacing : '',
      // Disabled state
      disabled ? 'opacity-50' : '',
      // Custom classes
      customClass,
    ]"
    :disabled="disabled"
    :aria-label="ariaLabel"
    @click="$emit('click', $event)"
  >
    <template v-if="hasIconSlot">
      <span v-if="iconPosition === 'left'" class="flex items-center">
        <slot name="icon" />
      </span>
      <span v-if="hasText">
        <slot />
      </span>
      <span v-if="iconPosition === 'right'" class="flex items-center">
        <slot name="icon" />
      </span>
    </template>
    <template v-else>
      <span v-if="hasIcon && iconPosition === 'left'" class="flex items-center">
        <component :is="icon" :class="iconSizeClass" />
      </span>
      <span v-if="hasText">
        <slot />
      </span>
      <span
        v-if="hasIcon && iconPosition === 'right'"
        class="flex items-center"
      >
        <component :is="icon" :class="iconSizeClass" />
      </span>
    </template>
  </button>
</template>

<script setup lang="ts">
import { computed, useSlots } from 'vue';

type ButtonSize = 'small' | 'medium' | 'large';
type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';
type IconPosition = 'left' | 'right';

const props = withDefaults(
  defineProps<{
    size?: ButtonSize;
    variant?: ButtonVariant;
    icon?: unknown;
    iconPosition?: IconPosition;
    disabled?: boolean;
    ariaLabel?: string;
    customClass?: string;
    type?: 'button' | 'submit' | 'reset';
  }>(),
  {
    size: 'small',
    variant: 'primary',
    icon: undefined,
    iconPosition: 'left',
    disabled: false,
    ariaLabel: undefined,
    customClass: undefined,
    type: 'button',
  }
);

defineEmits<{
  click: [event: MouseEvent];
}>();

const slots = useSlots();

const hasText = computed(() => !!slots.default);
const hasIcon = computed(() => !!props.icon);
const hasIconSlot = computed(() => !!slots.icon);

const sizeClasses = computed(() => {
  const classes: Record<ButtonSize, string> = {
    small: 'h-8 px-4 py-1.5 text-xs',
    medium: 'px-6 py-3 text-base font-medium',
    large: 'h-[52px] px-6 py-[28px] text-base',
  };
  return classes[props.size];
});

const variantClasses = computed(() => {
  const classes: Record<ButtonVariant, string> = {
    primary:
      'bg-primary-800 dark:bg-primary hover:bg-primary-900 dark:hover:bg-primary-600 text-white shadow-lg backdrop-blur-sm border border-primary-600/50 focus:ring-primary',
    secondary:
      'border border-primary-800 dark:border-primary-600/50 text-gray-800 dark:text-gray-300 hover:bg-primary-800 dark:hover:bg-primary hover:text-white backdrop-blur-sm focus:ring-primary',
    outline:
      'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-300 dark:border-gray-600 focus:ring-gray-500',
    danger: 'text-white bg-red-500 hover:bg-red-600 focus:ring-red-500',
    ghost:
      'text-gray-800 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-primary/10 dark:hover:bg-primary-400/20 focus:ring-primary',
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
