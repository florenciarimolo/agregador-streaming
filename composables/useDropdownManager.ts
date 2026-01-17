import { ref, computed } from 'vue';

// Global state to track which dropdown is open
const openDropdownId = ref<string | null>(null);

export function useDropdownManager(dropdownId: string) {
  const isOpen = computed(() => openDropdownId.value === dropdownId);

  const open = () => {
    // Close any other open dropdown
    if (openDropdownId.value && openDropdownId.value !== dropdownId) {
      openDropdownId.value = null;
    }
    openDropdownId.value = dropdownId;
  };

  const close = () => {
    if (openDropdownId.value === dropdownId) {
      openDropdownId.value = null;
    }
  };

  const toggle = () => {
    if (isOpen.value) {
      close();
    } else {
      open();
    }
  };

  // Close when clicking outside
  const handleClickOutside = (event: MouseEvent) => {
    const target = event.target as HTMLElement;
    // Check if click is outside the dropdown
    if (!target.closest(`[data-dropdown-id="${dropdownId}"]`)) {
      close();
    }
  };

  return {
    isOpen,
    open,
    close,
    toggle,
    handleClickOutside,
  };
}

