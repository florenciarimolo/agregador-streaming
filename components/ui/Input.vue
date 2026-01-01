<template>
  <div class="relative">
    <label
      v-if="label"
      :for="inputId"
      :class="[
        'block text-sm font-medium mb-2',
        labelClasses,
      ]"
    >
      {{ label }}
      <span v-if="required" class="text-red-500">*</span>
    </label>
    <input
      :id="inputId"
      :type="type"
      :value="modelValue"
      :placeholder="placeholder"
      :disabled="disabled"
      :required="required"
      :class="[
        'w-full px-4 py-3 bg-transparent dark:bg-transparent dark:text-gray-300 text-gray-800 border dark:border-gray-700/50 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all',
        disabled ? 'opacity-50 cursor-not-allowed' : '',
        error ? 'border-red-500 dark:border-red-500' : '',
        customClass,
      ]"
      @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
      @blur="$emit('blur', $event)"
      @focus="$emit('focus', $event)"
    />
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
    type?: string;
    label?: string;
    placeholder?: string;
    disabled?: boolean;
    required?: boolean;
    error?: string;
    hint?: string;
    customClass?: string;
    labelClasses?: string;
  }>(),
  {
    type: 'text',
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

const inputId = computed(() => `input-${Math.random().toString(36).substr(2, 9)}`);
</script>

