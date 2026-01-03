<template>
  <div ref="menuRef" class="relative">
    <!-- Trigger Slot -->
    <div @click="toggleMenu">
      <slot name="trigger" :is-open="isOpen" />
    </div>

    <!-- Desktop Dropdown (absolute, anclado al trigger) -->
    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0 transform scale-95"
      enter-to-class="opacity-100 transform scale-100"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100 transform scale-100"
      leave-to-class="opacity-0 transform scale-95"
    >
      <div
        v-if="isOpen && !isMobile"
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

    <!-- Mobile Action Sheet (Teleport to body, fixed, panel de acciones) -->
    <Teleport to="body">
      <!-- Backdrop -->
      <Transition
        enter-active-class="transition duration-200 ease-out"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition duration-150 ease-in"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div
          v-if="isOpen && isMobile"
          class="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-sm"
          @click="closeMenu"
        ></div>
      </Transition>

      <!-- Action Sheet Panel -->
      <Transition
        enter-active-class="transition duration-300 ease-out"
        enter-from-class="transform translate-y-full opacity-0"
        enter-to-class="transform translate-y-0 opacity-100"
        leave-active-class="transition duration-200 ease-in"
        leave-from-class="transform translate-y-0 opacity-100"
        leave-to-class="transform translate-y-full opacity-0"
      >
        <div
          v-if="isOpen && isMobile"
          class="fixed bottom-0 left-0 right-0 z-[10000] max-h-[80vh] overflow-y-auto"
          @click.stop
          @mousedown.stop
        >
          <div
            :class="[
              'dark:bg-gray-900/95 bg-gray-100/95 rounded-t-3xl border-t border-gray-300/50 dark:border-white/10 shadow-2xl',
              'mx-2 mb-2',
              customClass,
            ]"
          >
            <!-- Handle bar (indicador visual de que es un panel) -->
            <div class="flex justify-center pt-3 pb-2">
              <div
                class="h-1 w-12 rounded-full bg-gray-400 dark:bg-gray-600"
              ></div>
            </div>
            <slot />
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';

type MenuWidth = 'auto' | 'w-48' | 'w-64' | 'w-full';
type MenuPosition = 'left' | 'right';

const props = withDefaults(
  defineProps<{
    width?: MenuWidth;
    position?: MenuPosition;
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
const menuRef = ref<HTMLElement | null>(null);
const isMobile = ref(false);

const widthClass = computed(() => {
  const classes: Record<MenuWidth, string> = {
    auto: 'w-auto',
    'w-48': 'w-48',
    'w-64': 'w-64',
    'w-full': 'w-full',
  };
  return classes[props.width];
});

const positionClass = computed(() => {
  // Desktop: alinearse al trigger según position prop
  return props.position === 'left' ? 'left-0' : 'right-0';
});

// Check if mobile viewport
const checkMobile = () => {
  if (typeof window === 'undefined') return;
  isMobile.value = window.innerWidth < 768; // md breakpoint
};

const toggleMenu = () => {
  isOpen.value = !isOpen.value;
  if (isOpen.value) {
    emit('open');
  } else {
    emit('close');
  }
};

const closeMenu = () => {
  if (isOpen.value) {
    isOpen.value = false;
    emit('close');
  }
};

const handleClickOutside = (event: MouseEvent) => {
  if (!props.closeOnClickOutside) return;

  const target = event.target as HTMLElement;
  if (menuRef.value && !menuRef.value.contains(target)) {
    closeMenu();
  }
};

// Handle scroll - close menu when scrolling
const handleScroll = () => {
  closeMenu();
};

// Handle resize - close menu when resizing and update mobile state
const handleResize = () => {
  checkMobile();
  closeMenu();
};

onMounted(() => {
  checkMobile();
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
  close: closeMenu,
  toggle: toggleMenu,
});
</script>

