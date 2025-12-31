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
      v-if="toast"
      class="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 max-w-md w-full mx-4"
    >
      <div
        class="dark:bg-gray-900/40 bg-gray-100/80 backdrop-blur-xl border border-gray-300/50 dark:border-white/10 rounded-lg shadow-xl p-4 flex items-center justify-between gap-4"
      >
        <p class="text-sm dark:text-gray-300 text-gray-800 flex-1">
          {{ toast.message }}
        </p>
        <div class="flex items-center gap-2">
          <button
            v-if="toast.undoAction"
            type="button"
            class="px-4 py-2 text-sm font-medium text-primary dark:text-primary-400 hover:text-primary dark:hover:text-primary-400 transition-colors"
            @click="handleUndo"
          >
            {{ toast.undoAction.label }}
          </button>
          <button
            type="button"
            class="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            aria-label="Cerrar"
            @click="dismissToast"
          >
            <svg
              class="w-4 h-4 dark:text-gray-300 text-gray-800"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { useUndoToast } from '@/composables/useUndoToast';

const { toast, handleUndo, dismissToast } = useUndoToast();
</script>
