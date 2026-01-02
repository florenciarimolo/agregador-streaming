<template>
  <div
    :class="[
      'rounded-3xl p-4 border',
      variantClasses,
      customClass,
    ]"
    role="alert"
  >
    <div class="flex items-start gap-3">
      <div v-if="showIcon" class="flex-shrink-0">
        <component
          :is="iconComponent"
          :class="iconClasses"
        />
      </div>
      <div class="flex-1 min-w-0">
        <p
          v-if="title"
          :class="[
            'text-sm font-medium',
            titleClasses,
          ]"
        >
          {{ title }}
        </p>
        <p
          :class="[
            'text-sm',
            messageClasses,
          ]"
        >
          <slot />
        </p>
      </div>
      <slot name="actions" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, h } from 'vue';

type AlertVariant = 'success' | 'error' | 'warning' | 'info';

const props = withDefaults(
  defineProps<{
    variant?: AlertVariant;
    title?: string;
    showIcon?: boolean;
    customClass?: string;
  }>(),
  {
    variant: 'info',
    showIcon: true,
  }
);

const variantClasses = computed(() => {
  const classes: Record<AlertVariant, string> = {
    success:
      'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-800 dark:text-green-200',
    error:
      'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200',
    warning:
      'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800 text-yellow-800 dark:text-yellow-200',
    info: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200',
  };
  return classes[props.variant];
});

const titleClasses = computed(() => {
  const classes: Record<AlertVariant, string> = {
    success: 'text-green-800 dark:text-green-200',
    error: 'text-red-800 dark:text-red-200',
    warning: 'text-yellow-800 dark:text-yellow-200',
    info: 'text-blue-800 dark:text-blue-200',
  };
  return classes[props.variant];
});

const messageClasses = computed(() => {
  const classes: Record<AlertVariant, string> = {
    success: 'text-green-700 dark:text-green-300',
    error: 'text-red-700 dark:text-red-300',
    warning: 'text-yellow-700 dark:text-yellow-300',
    info: 'text-blue-700 dark:text-blue-300',
  };
  return classes[props.variant];
});

const iconClasses = computed(() => {
  const classes: Record<AlertVariant, string> = {
    success: 'w-5 h-5 text-green-600 dark:text-green-400',
    error: 'w-5 h-5 text-red-600 dark:text-red-400',
    warning: 'w-5 h-5 text-yellow-600 dark:text-yellow-400',
    info: 'w-5 h-5 text-blue-600 dark:text-blue-400',
  };
  return classes[props.variant];
});

const iconComponent = computed(() => {
  const icons: Record<AlertVariant, any> = {
    success: () =>
      h('svg', {
        class: iconClasses.value,
        fill: 'none',
        stroke: 'currentColor',
        viewBox: '0 0 24 24',
      }, [
        h('path', {
          'stroke-linecap': 'round',
          'stroke-linejoin': 'round',
          'stroke-width': '2',
          d: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
        }),
      ]),
    error: () =>
      h('svg', {
        class: iconClasses.value,
        fill: 'none',
        stroke: 'currentColor',
        viewBox: '0 0 24 24',
      }, [
        h('path', {
          'stroke-linecap': 'round',
          'stroke-linejoin': 'round',
          'stroke-width': '2',
          d: 'M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z',
        }),
      ]),
    warning: () =>
      h('svg', {
        class: iconClasses.value,
        fill: 'none',
        stroke: 'currentColor',
        viewBox: '0 0 24 24',
      }, [
        h('path', {
          'stroke-linecap': 'round',
          'stroke-linejoin': 'round',
          'stroke-width': '2',
          d: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z',
        }),
      ]),
    info: () =>
      h('svg', {
        class: iconClasses.value,
        fill: 'none',
        stroke: 'currentColor',
        viewBox: '0 0 24 24',
      }, [
        h('path', {
          'stroke-linecap': 'round',
          'stroke-linejoin': 'round',
          'stroke-width': '2',
          d: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
        }),
      ]),
  };
  return icons[props.variant];
});
</script>

