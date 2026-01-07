import { ref, readonly } from 'vue';

export interface UndoAction {
  label: string;
  action: () => void | Promise<void>;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';
}

const toast = ref<{
  message: string;
  undoAction: UndoAction | null;
  id: number;
} | null>(null);

let toastId = 0;
let timeoutId: ReturnType<typeof setTimeout> | null = null;

export const useUndoToast = () => {
  const showToast = (
    message: string,
    undoAction: UndoAction | null = null,
    duration: number = 7000
  ) => {
    if (import.meta.dev) {
      console.log('[useUndoToast] showToast called:', { message, duration });
    }

    // Clear existing toast
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    toastId++;
    toast.value = {
      message,
      undoAction,
      id: toastId,
    };

    if (import.meta.dev) {
      console.log('[useUndoToast] Toast state updated:', toast.value);
    }

    // Auto-dismiss after duration
    if (duration > 0) {
      timeoutId = setTimeout(() => {
        dismissToast();
      }, duration);
    }
  };

  const dismissToast = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
    toast.value = null;
  };

  const handleUndo = async () => {
    if (toast.value?.undoAction) {
      await toast.value.undoAction.action();
      dismissToast();
    }
  };

  return {
    toast: readonly(toast),
    showToast,
    dismissToast,
    handleUndo,
  };
};
