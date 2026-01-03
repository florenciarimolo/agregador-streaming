<template>
  <div ref="dropdownRef" class="relative">
    <!-- Trigger Slot -->
    <div @click="toggleDropdown">
      <slot name="trigger" :is-open="isOpen" />
    </div>

    <!-- Dropdown Content -->
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
          'absolute z-[10000] md:z-50 mt-2 dark:bg-gray-900/40 bg-gray-100/80 rounded-3xl border border-gray-300/50 dark:border-white/10 shadow-xl overflow-hidden',
          widthClass,
          positionClass,
          'max-w-[calc(100vw-2rem)]',
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

type DropdownWidth = 'auto' | 'w-48' | 'w-64' | 'w-full';
type DropdownPosition = 'left' | 'right';

const props = withDefaults(
  defineProps<{
    width?: DropdownWidth;
    position?: DropdownPosition;
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
const dropdownRef = ref<HTMLElement | null>(null);

const widthClass = computed(() => {
  const classes: Record<DropdownWidth, string> = {
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

const toggleDropdown = () => {
  isOpen.value = !isOpen.value;
  if (isOpen.value) {
    emit('open');
  } else {
    emit('close');
  }
};

const closeDropdown = () => {
  if (isOpen.value) {
    isOpen.value = false;
    emit('close');
  }
};

const handleClickOutside = (event: MouseEvent) => {
  if (!props.closeOnClickOutside) return;

  const target = event.target as HTMLElement;
  if (dropdownRef.value && !dropdownRef.value.contains(target)) {
    closeDropdown();
  }
};

onMounted(() => {
  if (props.closeOnClickOutside) {
    document.addEventListener('click', handleClickOutside);
  }
});

onUnmounted(() => {
  if (props.closeOnClickOutside) {
    document.removeEventListener('click', handleClickOutside);
  }
});

defineExpose({
  isOpen,
  open: () => {
    isOpen.value = true;
    emit('open');
  },
  close: closeDropdown,
  toggle: toggleDropdown,
});
</script>
