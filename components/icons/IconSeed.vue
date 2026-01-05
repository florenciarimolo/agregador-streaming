<template>
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    stroke-width="2"
    stroke="currentColor"
    :class="iconClass"
  >
    <path
      stroke-linecap="round"
      stroke-linejoin="round"
      d="M12 4v16m8-8H4"
    />
  </svg>
</template>

<script setup lang="ts">
defineProps({
  iconClass: {
    type: String,
    default: 'w-4 h-4',
  },
});
</script>

