<template>
  <div
    class="flex gap-2 items-center px-4 py-1.5 rounded-full border backdrop-blur-xl dark:bg-gray-900/40 bg-gray-100/80 border-gray-300/50 dark:border-white/10"
  >
    <!-- Icon slot or image -->
    <img
      v-if="icon && typeof icon === 'string'"
      :src="icon"
      :alt="label"
      class="object-contain w-auto h-5"
    />
    <slot v-else-if="$slots.icon" name="icon" />
    
    <!-- Label -->
    <span class="text-xs font-semibold text-gray-800 dark:text-gray-300">{{
      label
    }}</span>
    
    <!-- Close button -->
    <CloseButton
      custom-class="ml-1"
      :aria-label="ariaLabel"
      @click="$emit('remove')"
    />
  </div>
</template>

<script setup lang="ts">
import CloseButton from '@/components/ui/CloseButton.vue';

interface Props {
  label: string;
  icon?: string; // Image URL
  ariaLabel?: string;
}

withDefaults(defineProps<Props>(), {
  icon: undefined,
  ariaLabel: '',
});

defineEmits<{
  remove: [];
}>();
</script>

