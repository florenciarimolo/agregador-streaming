import { ref, computed, onMounted, onUnmounted } from 'vue';

export type ViewMode = 'mosaic' | 'list';

/**
 * Composable to manage view mode (mosaic/list) with localStorage persistence
 * Each page has its own independent preference
 */
export function useViewMode(pageKey: string, defaultMode: ViewMode = 'list') {
  const STORAGE_KEY = `viewMode_${pageKey}`;
  const DEFAULT_VIEW_MODE: ViewMode = defaultMode;

  // Initialize from localStorage
  const getStoredViewMode = (): ViewMode => {
    if (import.meta.client && typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored === 'mosaic' || stored === 'list') {
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
        if (e.newValue === 'mosaic' || e.newValue === 'list') {
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
      window.addEventListener('storage', handleStorageChange);
      // Listen to custom events (from same window)
      window.addEventListener('viewModeChanged', handleStorageChange);

      // Also poll localStorage periodically as a fallback
      intervalId = setInterval(() => {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored === 'mosaic' || stored === 'list') {
          if (viewMode.value !== stored) {
            viewMode.value = stored as ViewMode;
          }
        }
      }, 100);
    });

    onUnmounted(() => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('viewModeChanged', handleStorageChange);
      if (intervalId) {
        clearInterval(intervalId);
      }
    });
  }

  /**
   * Computed properties for convenience
   */
  const isListView = computed(() => viewMode.value === 'list');
  const isMosaicView = computed(() => viewMode.value === 'mosaic');

  return {
    viewMode,
    setViewMode,
    isListView,
    isMosaicView,
  };
}
