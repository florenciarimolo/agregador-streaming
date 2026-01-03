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
        ref="dropdownContentRef"
        :class="[
          useFixedPosition ? 'fixed z-[10000]' : 'absolute z-[10000] md:z-50',
          'mt-2 dark:bg-gray-900/40 bg-gray-100/80 rounded-3xl border border-gray-300/50 dark:border-white/10 shadow-xl overflow-hidden',
          !useFixedPosition ? widthClass : '',
          !useFixedPosition ? positionClass : '',
          'max-w-[calc(100vw-2rem)]',
          customClass,
        ]"
        :style="useFixedPosition ? dropdownStyle : {}"
        @click.stop
        @mousedown.stop
      >
        <slot />
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue';

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
const dropdownContentRef = ref<HTMLElement | null>(null);
const dropdownStyle = ref<Record<string, string>>({});
const useFixedPosition = ref(false);

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

// Calculate dropdown position for mobile viewport
const calculateDropdownPosition = () => {
  if (
    !dropdownRef.value ||
    !dropdownContentRef.value ||
    typeof window === 'undefined'
  ) {
    return;
  }

  nextTick(() => {
    const triggerRect = dropdownRef.value?.getBoundingClientRect();
    if (!triggerRect) return;

    // Get dropdown width from computed width class
    const widthMap: Record<DropdownWidth, number> = {
      auto: 200, // default estimate
      'w-48': 192, // 12rem = 192px
      'w-64': 256, // 16rem = 256px
      'w-full': triggerRect.width, // Use trigger width
    };
    const dropdownWidth = widthMap[props.width] || 192;

    const viewportWidth = window.innerWidth;
    const spacing = 8; // mt-2 = 8px
    const padding = 16; // 1rem padding from viewport edges

    // Check if dropdown would overflow on the right
    const overflowRight =
      triggerRect.right + dropdownWidth > viewportWidth - padding;
    // Check if dropdown would overflow on the left
    const overflowLeft = triggerRect.left - dropdownWidth < padding;

    // On mobile (viewport < 768px), use fixed positioning if there's overflow
    const isMobile = viewportWidth < 768;

    if (isMobile && (overflowRight || overflowLeft)) {
      useFixedPosition.value = true;

      // Calculate position
      const top = triggerRect.bottom + spacing;
      const style: Record<string, string> = {
        top: `${top}px`,
      };

      // Adjust position to stay within viewport
      if (overflowRight && !overflowLeft) {
        // Anchor to right edge
        style.right = `${viewportWidth - triggerRect.right}px`;
      } else if (overflowLeft && !overflowRight) {
        // Anchor to left edge
        style.left = `${padding}px`;
      } else if (overflowRight && overflowLeft) {
        // Center if both sides overflow (shouldn't happen with w-48, but just in case)
        style.left = `${Math.max(padding, (viewportWidth - dropdownWidth) / 2)}px`;
      } else {
        // No overflow, use original position
        style.left = `${triggerRect.left}px`;
      }

      // Add width if needed
      if (props.width === 'w-full') {
        style.width = `${Math.min(dropdownWidth, viewportWidth - padding * 2)}px`;
      }

      dropdownStyle.value = style;
    } else {
      useFixedPosition.value = false;
      dropdownStyle.value = {};
    }
  });
};

const toggleDropdown = () => {
  isOpen.value = !isOpen.value;
  if (isOpen.value) {
    emit('open');
    // Calculate position after opening
    nextTick(() => {
      calculateDropdownPosition();
    });
  } else {
    emit('close');
    // Reset position when closing
    useFixedPosition.value = false;
    dropdownStyle.value = {};
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

// Watch for window resize to recalculate position
const handleResize = () => {
  if (isOpen.value) {
    calculateDropdownPosition();
  }
};

onMounted(() => {
  if (props.closeOnClickOutside) {
    document.addEventListener('click', handleClickOutside);
  }
  window.addEventListener('resize', handleResize);
});

watch(isOpen, (newValue) => {
  if (newValue) {
    nextTick(() => {
      calculateDropdownPosition();
    });
  } else {
    useFixedPosition.value = false;
    dropdownStyle.value = {};
  }
});

onUnmounted(() => {
  if (props.closeOnClickOutside) {
    document.removeEventListener('click', handleClickOutside);
  }
  window.removeEventListener('resize', handleResize);
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
