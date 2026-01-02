<template>
  <button
    type="button"
    :class="[
      'rounded-full border shadow-md transition-all cursor-pointer hover:ring-2 hover:ring-primary/50 border-primary',
      props.customClass,
    ]"
    :aria-label="props.ariaLabel"
    @click="$emit('click', $event)"
  >
    <slot />
  </button>
</template>

<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    ariaLabel?: string;
    customClass?: string;
  }>(),
  {
    ariaLabel: undefined,
    customClass: undefined,
  }
);

defineEmits<{
  click: [event: MouseEvent];
}>();
</script>
