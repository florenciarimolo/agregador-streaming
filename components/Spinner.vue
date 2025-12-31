<template>
  <div :class="containerClass">
    <div
      :class="[
        'animate-spin rounded-full border-b-2 border-primary',
        sizeClass,
      ]"
    ></div>
    <p v-if="message" :class="messageClass">
      {{ message }}
    </p>
  </div>
</template>

<script setup lang="ts">
interface Props {
  size?: 'sm' | 'md' | 'lg';
  message?: string;
  fullScreen?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  size: 'md',
  message: undefined,
  fullScreen: false,
});

const sizeClass = computed(() => {
  switch (props.size) {
    case 'sm':
      return 'h-6 w-6';
    case 'lg':
      return 'h-16 w-16';
    case 'md':
    default:
      return 'h-12 w-12';
  }
});

const containerClass = computed(() => {
  const base = 'flex flex-col items-center justify-center';
  if (props.fullScreen) {
    return `${base} fixed inset-0 z-50 bg-background-dark/80 dark:bg-background-dark/80 backdrop-blur-sm`;
  }
  return `${base} py-12`;
});

const messageClass = computed(() => {
  return 'mt-4 text-gray-800 dark:text-gray-300';
});
</script>
