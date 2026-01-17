import { ref, computed, onMounted } from 'vue';
import { useLogger } from '@/composables/useLogger';

export type SortOption = 'name-asc' | 'name-desc' | 'date-asc' | 'date-desc';

/**
 * Composable to manage sort option with localStorage persistence
 * Each page has its own independent preference
 */
export function useSort(
  pageKey: string,
  defaultSort: SortOption = 'name-asc'
) {
  const STORAGE_KEY = `sort_${pageKey}`;
  const DEFAULT_SORT: SortOption = defaultSort;

  // Initialize from localStorage
  const getStoredSort = (): SortOption => {
    if (import.meta.client && typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (
          stored === 'name-asc' ||
          stored === 'name-desc' ||
          stored === 'date-asc' ||
          stored === 'date-desc'
        ) {
          return stored as SortOption;
        }
      } catch (error) {
        // localStorage might not be available (e.g., private browsing)
        const { logWarn } = useLogger();
        logWarn('[Sort] Error reading from localStorage', {
          pageKey,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
    return DEFAULT_SORT;
  };

  const currentSort = ref<SortOption>(DEFAULT_SORT);

  // Read from localStorage on client mount (after SSR hydration)
  if (import.meta.client) {
    onMounted(() => {
      const stored = getStoredSort();
      if (stored !== currentSort.value) {
        currentSort.value = stored;
      }
    });
  }

  /**
   * Set sort option and persist to localStorage
   */
  const setSort = (sort: SortOption) => {
    currentSort.value = sort;
    if (import.meta.client) {
      localStorage.setItem(STORAGE_KEY, sort);
      // Dispatch custom event to notify other instances
      window.dispatchEvent(
        new CustomEvent('sortChanged', {
          detail: { pageKey, sort },
        })
      );
    }
  };

  /**
   * Sort an array of items based on current sort option
   */
  const sortItems = <T extends { title: string; created_at: string }>(
    items: T[]
  ): T[] => {
    const sorted = [...items];
    const sort = currentSort.value;

    if (sort === 'name-asc') {
      sorted.sort((a, b) => {
        const titleA = (a.title || '').toLowerCase();
        const titleB = (b.title || '').toLowerCase();
        return titleA.localeCompare(titleB);
      });
    } else if (sort === 'name-desc') {
      sorted.sort((a, b) => {
        const titleA = (a.title || '').toLowerCase();
        const titleB = (b.title || '').toLowerCase();
        return titleB.localeCompare(titleA);
      });
    } else if (sort === 'date-asc') {
      sorted.sort((a, b) => {
        const dateA = new Date(a.created_at || 0).getTime();
        const dateB = new Date(b.created_at || 0).getTime();
        return dateA - dateB;
      });
    } else if (sort === 'date-desc') {
      sorted.sort((a, b) => {
        const dateA = new Date(a.created_at || 0).getTime();
        const dateB = new Date(b.created_at || 0).getTime();
        return dateB - dateA;
      });
    }

    return sorted;
  };

  return {
    currentSort: computed(() => currentSort.value),
    setSort,
    sortItems,
  };
}
