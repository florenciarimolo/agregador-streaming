<template>
  <button
    type="button"
    data-icon-only="true"
    :aria-label="props.ariaLabel || undefined"
    :class="[
      'flex items-center justify-center transition-colors focus:outline-none',
      // Only apply variant classes if no customClass is provided (to allow full control)
      !props.customClass ? variantClasses : '',
      props.customClass,
    ]"
    @click="$emit('click', $event)"
    @keydown.enter.prevent="$emit('click', $event)"
    @keydown.space.prevent="$emit('click', $event)"
  >
    <slot>
      <component :is="icon" v-if="icon" :class="iconSizeClass" />
    </slot>
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue';

type IconButtonSize = 'small' | 'medium' | 'large';
type IconButtonVariant = 'default' | 'ghost' | 'subtle';

const props = withDefaults(
  defineProps<{
    icon?: unknown;
    ariaLabel?: string;
    size?: IconButtonSize;
    variant?: IconButtonVariant;
    customClass?: string;
  }>(),
  {
    icon: undefined,
    ariaLabel: '',
    size: 'medium',
    variant: 'default',
    customClass: undefined,
  }
);

defineEmits<{
  click: [event: MouseEvent | KeyboardEvent];
}>();

const variantClasses = computed(() => {
  const classes: Record<IconButtonVariant, string> = {
    default:
      'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300',
    ghost:
      'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded',
    subtle:
      'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400',
  };
  return classes[props.variant];
});

const iconSizeClass = computed(() => {
  const sizes: Record<IconButtonSize, string> = {
    small: 'w-4 h-4',
    medium: 'w-5 h-5',
    large: 'w-6 h-6',
  };
  return sizes[props.size];
});
</script>
