<template>
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    stroke-width="1.5"
    stroke="currentColor"
    :class="iconClass"
  >
    <path
      stroke-linecap="round"
      stroke-linejoin="round"
      d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z"
    />
  </svg>
</template>

<script setup lang="ts">
defineProps({
  iconClass: {
    type: String,
    default: 'w-5 h-5',
  },
});
</script>
