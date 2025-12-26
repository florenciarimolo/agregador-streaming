<template>
  <Transition
    enter-active-class="transition duration-200 ease-out"
    enter-from-class="transform scale-95 opacity-0"
    enter-to-class="transform scale-100 opacity-100"
    leave-active-class="transition duration-150 ease-in"
    leave-from-class="transform scale-100 opacity-100"
    leave-to-class="transform scale-95 opacity-0"
  >
    <div
      v-if="message"
      :class="[
        'mb-4 p-3 rounded-lg text-sm',
        type === 'error'
          ? 'bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400'
          : 'bg-green-500/10 border border-green-500/20 text-green-600 dark:text-green-400',
      ]"
    >
      {{ message }}
    </div>
  </Transition>
</template>

<script setup lang="ts">
interface Props {
  message?: string | null;
  type?: 'error' | 'success';
}

withDefaults(defineProps<Props>(), {
  message: null,
  type: 'error',
});
</script>
