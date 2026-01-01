<template>
  <Transition
    enter-active-class="transition duration-300 ease-out"
    enter-from-class="transform translate-y-full opacity-0"
    enter-to-class="transform translate-y-0 opacity-100"
    leave-active-class="transition duration-200 ease-in"
    leave-from-class="transform translate-y-0 opacity-100"
    leave-to-class="transform translate-y-full opacity-0"
  >
    <div
      v-if="isVisible"
      class="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 max-w-md w-full mx-4"
    >
      <div
        :class="[
          'dark:bg-gray-900/40 bg-gray-100/80 backdrop-blur-xl border border-gray-300/50 dark:border-white/10 rounded-lg shadow-xl p-4 flex items-center justify-between gap-4',
          customClass,
        ]"
      >
        <p class="text-sm dark:text-gray-300 text-gray-800 flex-1">
          <slot />
        </p>
        <div class="flex items-center gap-2">
          <slot name="actions" />
          <ToastCloseButton
            :aria-label="closeAriaLabel || $t('common.close')"
            @click="$emit('close')"
          />
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import ToastCloseButton from '@/components/ui/ToastCloseButton.vue';

withDefaults(
  defineProps<{
    isVisible: boolean;
    customClass?: string;
    closeAriaLabel?: string;
  }>(),
  {
    isVisible: true,
  }
);

defineEmits<{
  close: [];
}>();
</script>

