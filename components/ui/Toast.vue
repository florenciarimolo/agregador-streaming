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
      v-if="shouldShow"
      class="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 max-w-md w-full mx-4"
    >
      <div
        :class="[
          'dark:bg-gray-900/40 bg-gray-100/80 backdrop-blur-xl border border-gray-300/50 dark:border-white/10 rounded-3xl shadow-xl p-4 flex items-center justify-between gap-4',
          customClass,
        ]"
      >
        <p class="text-sm dark:text-gray-300 text-gray-800 flex-1">
          <slot>{{ toast?.message }}</slot>
        </p>
        <div class="flex items-center gap-2">
          <slot name="actions">
            <Button
              v-if="toast?.undoAction"
              variant="ghost"
              size="small"
              @click="handleUndo"
            >
              {{ toast.undoAction.label }}
            </Button>
          </slot>
          <ToastCloseButton
            :aria-label="closeAriaLabel || $t('common.close')"
            @click="handleClose"
          />
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import ToastCloseButton from '@/components/ui/ToastCloseButton.vue';
import Button from '@/components/ui/Button.vue';
import { useUndoToast } from '@/composables/useUndoToast';

const props = withDefaults(
  defineProps<{
    isVisible?: boolean;
    customClass?: string;
    closeAriaLabel?: string;
    useComposable?: boolean;
  }>(),
  {
    isVisible: undefined,
    customClass: '',
    closeAriaLabel: '',
    useComposable: true,
  }
);

const emit = defineEmits<{
  close: [];
}>();

// Use composable toast if useComposable is true (default)
const {
  toast,
  handleUndo: composableHandleUndo,
  dismissToast,
} = useUndoToast();

// Determine if toast should be visible
const shouldShow = computed(() => {
  if (props.isVisible !== undefined) {
    // Manual control via props
    return props.isVisible;
  }
  // Automatic control via composable
  return props.useComposable && !!toast.value;
});

const handleUndo = async () => {
  await composableHandleUndo();
};

const handleClose = () => {
  if (props.useComposable && toast.value) {
    dismissToast();
  } else {
    emit('close');
  }
};
</script>
