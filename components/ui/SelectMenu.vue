<template>
  <div ref="selectRef" class="relative">
    <!-- Trigger Slot -->
    <div @click="toggleSelect">
      <slot name="trigger" :is-open="isOpen" />
    </div>

    <!-- Dropdown (always dropdown, no action sheet) -->
    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0 transform scale-95"
      enter-to-class="opacity-100 transform scale-100"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100 transform scale-100"
      leave-to-class="opacity-0 transform scale-95"
    >
      <div
        v-if="isOpen"
        :class="[
          'absolute z-[10000] mt-2',
          'dark:bg-gray-900/95 bg-gray-100/95 rounded-3xl border border-gray-300/50 dark:border-white/10 shadow-xl overflow-hidden',
          widthClass,
          positionClass,
          customClass,
        ]"
        @click.stop
        @mousedown.stop
      >
        <slot />
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';

type SelectWidth = 'auto' | 'w-48' | 'w-64' | 'w-full';
type SelectPosition = 'left' | 'right';

const props = withDefaults(
  defineProps<{
    width?: SelectWidth;
    position?: SelectPosition;
    customClass?: string;
    closeOnClickOutside?: boolean;
  }>(),
  {
    width: 'w-48',
    position: 'right',
    customClass: '',
    closeOnClickOutside: true,
  }
);

const emit = defineEmits<{
  open: [];
  close: [];
}>();

const isOpen = ref(false);
const selectRef = ref<HTMLElement | null>(null);

const widthClass = computed(() => {
  const classes: Record<SelectWidth, string> = {
    auto: 'w-auto',
    'w-48': 'w-48',
    'w-64': 'w-64',
    'w-full': 'w-full',
  };
  return classes[props.width];
});

const positionClass = computed(() => {
  return props.position === 'left' ? 'left-0' : 'right-0';
});

const toggleSelect = () => {
  isOpen.value = !isOpen.value;
  if (isOpen.value) {
    emit('open');
  } else {
    emit('close');
  }
};

const closeSelect = () => {
  if (isOpen.value) {
    isOpen.value = false;
    emit('close');
  }
};

const handleClickOutside = (event: MouseEvent) => {
  if (!props.closeOnClickOutside) return;

  const target = event.target as HTMLElement;
  if (selectRef.value && !selectRef.value.contains(target)) {
    closeSelect();
  }
};

// Handle scroll - close select when scrolling
const handleScroll = () => {
  closeSelect();
};

// Handle resize - close select when resizing
const handleResize = () => {
  closeSelect();
};

onMounted(() => {
  if (props.closeOnClickOutside) {
    document.addEventListener('click', handleClickOutside);
  }
  window.addEventListener('scroll', handleScroll, { passive: true });
  window.addEventListener('resize', handleResize);
});

onUnmounted(() => {
  if (props.closeOnClickOutside) {
    document.removeEventListener('click', handleClickOutside);
  }
  window.removeEventListener('scroll', handleScroll);
  window.removeEventListener('resize', handleResize);
});

defineExpose({
  isOpen,
  open: () => {
    isOpen.value = true;
    emit('open');
  },
  close: closeSelect,
  toggle: toggleSelect,
});
</script>

