<template>
  <div class="relative">
    <label
      v-if="label"
      :for="selectId"
      :class="[
        'block text-sm font-medium mb-2',
        labelClasses,
      ]"
    >
      {{ label }}
      <span v-if="required" class="text-red-500">*</span>
    </label>
    <select
      :id="selectId"
      :value="modelValue"
      :disabled="disabled"
      :required="required"
      :class="[
        'w-full px-4 py-3 bg-transparent dark:bg-transparent dark:text-gray-300 text-gray-800 border dark:border-gray-700/50 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all appearance-none',
        disabled ? 'opacity-50 cursor-not-allowed' : '',
        error ? 'border-red-500 dark:border-red-500' : '',
        customClass,
      ]"
      @change="$emit('update:modelValue', ($event.target as HTMLSelectElement).value)"
      @blur="$emit('blur', $event)"
      @focus="$emit('focus', $event)"
    >
      <slot />
    </select>
    <!-- Dropdown Arrow Icon -->
    <div
      class="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
      :class="label ? 'mt-3' : ''"
    >
      <svg
        class="w-4 h-4 text-gray-400"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M19 9l-7 7-7-7"
        />
      </svg>
    </div>
    <p
      v-if="error"
      class="mt-1 text-xs text-red-600 dark:text-red-400"
    >
      {{ error }}
    </p>
    <p
      v-if="hint && !error"
      class="mt-1 text-xs text-gray-500 dark:text-gray-400"
    >
      {{ hint }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(
  defineProps<{
    modelValue: string | number;
    label?: string;
    disabled?: boolean;
    required?: boolean;
    error?: string;
    hint?: string;
    customClass?: string;
    labelClasses?: string;
  }>(),
  {
    disabled: false,
    required: false,
    labelClasses: 'dark:text-gray-300 text-gray-800',
  }
);

defineEmits<{
  'update:modelValue': [value: string | number];
  blur: [event: FocusEvent];
  focus: [event: FocusEvent];
}>();

const selectId = computed(() => `select-${Math.random().toString(36).substr(2, 9)}`);
</script>

