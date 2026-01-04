<template>
  <div ref="selectRef" class="relative">
    <!-- Trigger Slot -->
    <div ref="triggerRef" @mousedown.prevent="toggleSelect">
      <slot name="trigger" :is-open="isOpen" />
    </div>

    <!-- Dropdown rendered via Teleport to body to avoid overflow/clipping issues -->
    <Teleport to="body">
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
          ref="dropdownRef"
          :style="dropdownStyle"
          :class="[
            'fixed z-[9999]',
            'dark:bg-gray-900/95 bg-gray-100/95 rounded-3xl border border-gray-300/50 dark:border-white/10 shadow-xl overflow-hidden',
            // Never use widthClass - width is always calculated from trigger
            customClass,
          ]"
          @click.stop
          @mousedown.stop
        >
          <slot />
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue';
import { useActiveSelect } from '@/composables/useActiveSelect';

type SelectWidth = 'auto' | 'w-48' | 'w-64' | 'w-full';
type SelectPosition = 'left' | 'right';

const props = withDefaults(
  defineProps<{
    width?: SelectWidth;
    position?: SelectPosition;
    customClass?: string;
    closeOnClickOutside?: boolean;
    selectId?: string; // Unique ID for this select instance
  }>(),
  {
    width: 'w-48',
    position: 'right',
    customClass: '',
    closeOnClickOutside: true,
    selectId: undefined,
  }
);

const emit = defineEmits<{
  open: [];
  close: [];
}>();

const { activeSelectId, setActiveSelect, clearActiveSelect } =
  useActiveSelect();

const isOpen = ref(false);
const selectRef = ref<HTMLElement | null>(null);
const triggerRef = ref<HTMLElement | null>(null);
const dropdownRef = ref<HTMLElement | null>(null);
// Protection window to prevent immediate closure after opening (wheel/touchmove fire on initial click/tap)
const ignoreScrollUntil = ref(0);
const dropdownStyle = ref<{
  top: string;
  left: string;
  width: string;
  minWidth?: string;
}>({
  top: '0px',
  left: '0px',
  width: '0px',
});

/**
 * Calculate dropdown position and width using getBoundingClientRect
 * MANDATORY: Dropdown must always appear directly below the trigger, aligned to it
 * - same left
 * - same width
 * - top = triggerRect.bottom + 8px offset
 */
const updateDropdownPosition = async () => {
  if (!triggerRef.value || !isOpen.value) return;

  await nextTick();

  const triggerRect = triggerRef.value.getBoundingClientRect();
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  // MANDATORY: Inherit width from trigger (same width as trigger)
  const triggerWidth = triggerRect.width;

  // MANDATORY: Position directly below trigger
  // With position: fixed, getBoundingClientRect() returns viewport coordinates
  // DO NOT add window.scrollY - that's only for position: absolute
  let top = triggerRect.bottom + 8;

  // MANDATORY: Align left edge with trigger's left edge (same left)
  // getBoundingClientRect() already returns viewport coordinates
  let left = triggerRect.left;

  // Ensure dropdown doesn't go off-screen on the right
  // Adjust left if needed, but maintain relationship with trigger
  if (left + triggerWidth > viewportWidth) {
    left = Math.max(0, viewportWidth - triggerWidth);
  }

  // Ensure dropdown doesn't go off-screen on the left
  if (left < 0) {
    left = 0;
  }

  // If dropdown would go below viewport, position above trigger
  // But only if there's more space above than below
  const dropdownHeight = dropdownRef.value?.offsetHeight || 0;
  const spaceBelow = viewportHeight - triggerRect.bottom;
  const spaceAbove = triggerRect.top;

  if (
    spaceBelow < dropdownHeight &&
    spaceAbove > spaceBelow &&
    dropdownHeight > 0
  ) {
    // Position above trigger
    // With position: fixed, use viewport coordinates directly (no scrollY)
    top = triggerRect.top - dropdownHeight - 8;
    // Still align left with trigger
    left = triggerRect.left;
    // Adjust if needed
    if (left + triggerWidth > viewportWidth) {
      left = Math.max(0, viewportWidth - triggerWidth);
    }
    if (left < 0) {
      left = 0;
    }
  }

  // MANDATORY: Use position: fixed with calculated values
  // No classes like left-0, right-0, mt-2 should affect positioning
  // Use min-width instead of fixed width to allow content to expand
  dropdownStyle.value = {
    top: `${top}px`,
    left: `${left}px`,
    width: `${triggerWidth}px`,
    minWidth: '200px', // Ensure minimum width for content visibility
  };
};

const toggleSelect = () => {
  if (isOpen.value) {
    closeSelect();
  } else {
    openSelect();
  }
};

const openSelect = async () => {
  // If this select has an ID, set it as active (will close others)
  if (props.selectId) {
    setActiveSelect(props.selectId);
  }

  isOpen.value = true;
  // Set protection window to prevent immediate closure from wheel/touchmove events
  // These events fire even during the initial click/tap that opens the select
  ignoreScrollUntil.value = Date.now() + 250;
  // Register scroll listener when opening (mandatory to close on scroll)
  registerScrollListener();

  await updateDropdownPosition();
  // Also update on next animation frame to ensure accurate measurements
  // This is especially important for mobile where layout may change
  await nextTick();
  requestAnimationFrame(() => {
    updateDropdownPosition();
  });
  emit('open');
};

const closeSelect = () => {
  if (isOpen.value) {
    isOpen.value = false;
    // Unregister scroll listener when closing (mandatory cleanup)
    unregisterScrollListener();
    // If this select has an ID, clear it from active
    if (props.selectId && activeSelectId.value === props.selectId) {
      clearActiveSelect();
    }
    emit('close');
  }
};

const handleClickOutside = (event: MouseEvent) => {
  if (!props.closeOnClickOutside) return;

  const target = event.target as HTMLElement;
  // Check both the trigger and the dropdown (which is teleported to body)
  const isClickInside =
    (selectRef.value && selectRef.value.contains(target)) ||
    (dropdownRef.value && dropdownRef.value.contains(target));

  if (!isClickInside) {
    closeSelect();
  }
};

// Handle scroll intent - close dropdown BEFORE scroll happens (mandatory to avoid visual misalignment)
// IMPORTANT: Do NOT close if scroll occurs inside the dropdown itself
// The dropdown must NEVER reposition or follow layout scroll - it must close immediately
// Use wheel and touchmove instead of scroll because scroll events don't bubble reliably
const handleGlobalScrollIntent = (event: Event) => {
  if (!isOpen.value) return;

  // No cerrar inmediatamente tras abrir (wheel/touchmove se disparan en el click/tap inicial)
  if (Date.now() < ignoreScrollUntil.value) {
    return;
  }

  const target = event.target as HTMLElement | null;

  // Permitir scroll solo dentro del dropdown
  if (target?.closest('[data-dropdown-scroll]')) {
    return;
  }

  // Cualquier otro scroll (page, tabs, contenedores externos) → cerrar inmediatamente
  closeSelect();
};

// Handle resize - update position and width when resizing (critical for mobile)
// Also handles orientationchange for mobile devices
const handleResize = () => {
  if (isOpen.value) {
    // Use requestAnimationFrame for smooth updates during resize
    requestAnimationFrame(() => {
      updateDropdownPosition();
    });
  }
};

// Watch for activeSelectId changes to close this select if another opens
watch(activeSelectId, (id) => {
  if (props.selectId && id !== props.selectId && isOpen.value) {
    closeSelect();
  }
});

// Watch for isOpen changes to update position and width
// MANDATORY: Recalculate position when opening
watch(isOpen, async (open) => {
  if (open) {
    // Calculate position immediately
    await updateDropdownPosition();
    // Also update on next animation frame to ensure accurate measurements
    // This is especially important for mobile where layout may change
    await nextTick();
    requestAnimationFrame(() => {
      updateDropdownPosition();
    });
    // One more update after a short delay to ensure final position
    setTimeout(() => {
      if (isOpen.value) {
        updateDropdownPosition();
      }
    }, 50);
  }
});

// Register scroll intent listeners when select opens
// Use wheel (desktop) and touchmove (mobile) instead of scroll
// These events bubble reliably and fire BEFORE the scroll happens
const registerScrollListener = () => {
  document.addEventListener('wheel', handleGlobalScrollIntent, {
    passive: true,
    capture: true,
  });
  document.addEventListener('touchmove', handleGlobalScrollIntent, {
    passive: true,
    capture: true,
  });
};

// Remove scroll intent listeners when select closes
const unregisterScrollListener = () => {
  document.removeEventListener('wheel', handleGlobalScrollIntent, {
    capture: true,
  });
  document.removeEventListener('touchmove', handleGlobalScrollIntent, {
    capture: true,
  });
};

onMounted(() => {
  if (props.closeOnClickOutside) {
    document.addEventListener('click', handleClickOutside);
  }
  window.addEventListener('resize', handleResize);
  window.addEventListener('orientationchange', handleResize);
});

onUnmounted(() => {
  if (props.closeOnClickOutside) {
    document.removeEventListener('click', handleClickOutside);
  }
  window.removeEventListener('resize', handleResize);
  window.removeEventListener('orientationchange', handleResize);
  // Unregister scroll listener on unmount (mandatory cleanup)
  unregisterScrollListener();
  // Clean up: if this select was active, clear it
  if (props.selectId && activeSelectId.value === props.selectId) {
    clearActiveSelect();
  }
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
