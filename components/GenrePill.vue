<template>
  <div
    class="flex gap-2 items-center px-4 py-1.5 rounded-full border backdrop-blur-xl dark:bg-gray-900/40 bg-gray-100/80 border-gray-300/50 dark:border-white/10"
  >
    <span class="text-xs font-semibold text-gray-800 dark:text-gray-300">{{
      genre.name
    }}</span>
    <CloseButton
      custom-class="ml-1"
      :aria-label="ariaLabel"
      @click="$emit('remove')"
    />
  </div>
</template>

<script setup lang="ts">
import CloseButton from '@/components/ui/CloseButton.vue';

interface Genre {
  id: number;
  name: string;
  type?: string;
}

interface Props {
  genre: Genre;
  ariaLabel?: string;
}

withDefaults(defineProps<Props>(), {
  ariaLabel: '',
});

defineEmits<{
  remove: [];
}>();
</script>
