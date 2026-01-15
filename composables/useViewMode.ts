import { ref, computed, onMounted, onUnmounted } from 'vue';
import { VIEW_MODE, type ViewMode } from '@/constants/domain/viewMode';

/**
 * Composable to manage view mode (mosaic/list) with localStorage persistence
 * Each page has its own independent preference
 */
export function useViewMode(
  pageKey: string,
  defaultMode: ViewMode = VIEW_MODE.LIST
) {
  const STORAGE_KEY = `viewMode_${pageKey}`;
  const DEFAULT_VIEW_MODE: ViewMode = defaultMode;

  // Initialize from localStorage
  const getStoredViewMode = (): ViewMode => {
    if (import.meta.client && typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (
          stored === VIEW_MODE.MOSAIC ||
          stored === VIEW_MODE.LIST
        ) {
          return stored as ViewMode;
        }
      } catch (error) {
        // localStorage might not be available (e.g., private browsing)
        if (import.meta.dev) {
          console.warn('[useViewMode] Error reading from localStorage:', error);
        }
      }
    }
    return DEFAULT_VIEW_MODE;
  };

  const viewMode = ref<ViewMode>(DEFAULT_VIEW_MODE);

  // Read from localStorage on client mount (after SSR hydration)
  if (import.meta.client) {
    onMounted(() => {
      const stored = getStoredViewMode();
      if (stored !== viewMode.value) {
        viewMode.value = stored;
      }
    });
  }

  /**
   * Set view mode and persist to localStorage
   */
  const setViewMode = (mode: ViewMode) => {
    viewMode.value = mode;
    if (import.meta.client) {
      localStorage.setItem(STORAGE_KEY, mode);
      // Dispatch custom event to notify other instances
      window.dispatchEvent(
        new CustomEvent('viewModeChanged', {
          detail: { pageKey, mode },
        })
      );
    }
  };

  // Listen for changes from other instances (e.g., ViewModeSelector)
  let intervalId: ReturnType<typeof setInterval> | null = null;
  const handleStorageChange = (e: StorageEvent | CustomEvent) => {
    if (e instanceof StorageEvent) {
      if (e.key === STORAGE_KEY && e.newValue) {
        if (
          e.newValue === VIEW_MODE.MOSAIC ||
          e.newValue === VIEW_MODE.LIST
        ) {
          viewMode.value = e.newValue as ViewMode;
        }
      }
    } else if (e instanceof CustomEvent && e.detail) {
      // Handle custom event from setViewMode
      if (e.detail.pageKey === pageKey) {
        viewMode.value = e.detail.mode;
      }
    }
  };

  if (import.meta.client) {
    onMounted(() => {
      // Listen to storage events (from other tabs/windows)
      window.addEventListener('storage', handleStorageChange as (e: StorageEvent) => void);
      // Listen to custom events (from same window)
      window.addEventListener('viewModeChanged', handleStorageChange as EventListener);

      // Also poll localStorage periodically as a fallback
      intervalId = setInterval(() => {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (
          stored === VIEW_MODE.MOSAIC ||
          stored === VIEW_MODE.LIST
        ) {
          if (viewMode.value !== stored) {
            viewMode.value = stored as ViewMode;
          }
        }
      }, 100);
    });

    onUnmounted(() => {
      window.removeEventListener('storage', handleStorageChange as (e: StorageEvent) => void);
      window.removeEventListener('viewModeChanged', handleStorageChange as EventListener);
      if (intervalId) {
        clearInterval(intervalId);
      }
    });
  }

  /**
   * Computed properties for convenience
   */
  const isListView = computed(() => viewMode.value === VIEW_MODE.LIST);
  const isMosaicView = computed(() => viewMode.value === VIEW_MODE.MOSAIC);

  return {
    viewMode,
    setViewMode,
    isListView,
    isMosaicView,
  };
}
