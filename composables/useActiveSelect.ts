import { ref, watch } from 'vue';

/**
 * Global state for managing which select is currently open
 * Only one select can be open at a time across the entire application
 */
export const activeSelectId = ref<string | null>(null);

/**
 * Composable to manage active select state
 */
export const useActiveSelect = () => {
  /**
   * Set the active select ID
   * This will automatically close any other open select
   */
  const setActiveSelect = (id: string | null) => {
    activeSelectId.value = id;
  };

  /**
   * Clear the active select (close all)
   */
  const clearActiveSelect = () => {
    activeSelectId.value = null;
  };

  /**
   * Check if a specific select is active
   */
  const isActive = (id: string): boolean => {
    return activeSelectId.value === id;
  };

  return {
    activeSelectId,
    setActiveSelect,
    clearActiveSelect,
    isActive,
  };
};

