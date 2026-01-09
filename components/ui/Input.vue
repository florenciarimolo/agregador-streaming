<template>
  <div>
    <label
      v-if="label"
      :for="id || inputId"
      :class="[
        'block text-sm font-medium mb-2',
        labelClasses,
      ]"
    >
      {{ label }}
      <span v-if="required" class="text-red-500">*</span>
    </label>
    <div class="relative">
      <input
        :id="id || inputId"
        :type="type"
        :value="modelValue"
        :placeholder="placeholder"
        :disabled="disabled"
        :required="required"
        :autocomplete="autocomplete"
        :maxlength="maxlength"
        :class="[
          'w-full px-4 py-3 bg-transparent dark:bg-transparent dark:text-gray-300 text-gray-800 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all',
          disabled ? 'opacity-50 cursor-not-allowed' : '',
          error
            ? 'border-red-500 dark:border-red-500 focus:border-red-500'
            : 'dark:border-gray-700/50 border-gray-300 focus:border-primary/50',
          hasIconSlot ? 'pr-10' : '',
          customClass,
        ]"
        :style="inputStyle"
        @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
        @blur="$emit('blur', $event)"
        @focus="$emit('focus', $event)"
      />
      <div
        v-if="hasIconSlot"
        class="absolute inset-y-0 right-0 flex items-center pr-3"
      >
        <slot name="icon"></slot>
      </div>
    </div>
    <p
      v-if="error"
      class="mt-1 text-sm text-red-500"
    >
      {{ error }}
    </p>
    <p
      v-if="helpText && !error"
      class="mt-1 text-xs text-gray-500 dark:text-gray-400"
    >
      {{ helpText }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed, useSlots } from 'vue';

withDefaults(
  defineProps<{
    id?: string;
    modelValue: string | number | null;
    type?: string;
    label?: string;
    placeholder?: string;
    disabled?: boolean;
    required?: boolean;
    error?: string;
    helpText?: string;
    autocomplete?: string;
    maxlength?: number;
    customClass?: string;
    labelClasses?: string;
    inputStyle?: string;
  }>(),
  {
    id: undefined,
    type: 'text',
    label: undefined,
    placeholder: '',
    disabled: false,
    required: false,
    error: '',
    helpText: '',
    autocomplete: 'off',
    maxlength: undefined,
    customClass: '',
    inputStyle: '',
    labelClasses: 'dark:text-gray-300 text-gray-800',
  }
);

defineEmits<{
  'update:modelValue': [value: string | number];
  blur: [event: FocusEvent];
  focus: [event: FocusEvent];
}>();

const slots = useSlots();
const hasIconSlot = computed(() => !!slots.icon);

const inputId = computed(() => `input-${Math.random().toString(36).substr(2, 9)}`);
</script>

