<template>
  <div ref="searchContainerRef" class="relative">
    <!-- Search Input -->
    <div class="relative">
      <input
        v-model="searchQuery"
        type="text"
        :placeholder="$t('search.placeholder')"
        class="px-4 py-2 pr-4 pl-10 w-full text-sm text-gray-800 rounded-lg border-gray-300 transition-all dark:text-gray-300 dark:bg-gray-800/50 bg-white/80 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-transparent focus:border-transparent backdrop-blur-xs"
        @input="handleSearch"
        @focus="showResults = true"
        @blur="handleBlur"
      />
      <!-- Search Icon -->
      <div class="flex absolute inset-y-0 left-0 items-center pl-3">
        <svg
          class="w-4 h-4 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
      </div>
      <!-- Loading Spinner -->
      <div
        v-if="isLoading"
        class="flex absolute inset-y-0 right-0 items-center pr-3"
      >
        <svg
          class="w-4 h-4 animate-spin text-primary"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            class="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            stroke-width="4"
          />
          <path
            class="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      </div>
    </div>

    <!-- Search Results Dropdown -->
    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0 transform scale-95"
      enter-to-class="opacity-100 transform scale-100"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100 transform scale-100"
      leave-to-class="opacity-0 transform scale-95"
    >
      <div
        v-if="
          showResults &&
          (searchResults.length > 0 || (searchQuery.length >= 4 && !isLoading))
        "
        class="absolute z-[60] w-full mt-2 dark:bg-gray-900/95 bg-white/95 backdrop-blur-sm dark:border-gray-600 border-gray-300 rounded-lg shadow-xl max-h-96 overflow-y-auto"
        @mousedown.prevent
      >
        <!-- Results -->
        <div v-if="searchResults.length > 0" class="py-2">
          <div
            v-for="result in searchResults"
            :key="`${result.media_type}-${result.id}`"
            class="flex items-center px-4 py-3 transition-colors duration-150 cursor-pointer dark:hover:bg-gray-800/50 hover:bg-gray-100/50"
            @mousedown.prevent="navigateToDetail(result)"
            @click="navigateToDetail(result)"
          >
            <!-- Thumbnail -->
            <div
              class="overflow-hidden flex-shrink-0 mr-3 w-12 h-16 bg-gray-200 rounded dark:bg-gray-700"
            >
              <img
                v-if="result.poster_path"
                :src="`https://image.tmdb.org/t/p/w92${result.poster_path}`"
                :alt="getTitle(result)"
                class="object-cover w-full h-full"
                loading="lazy"
              />
              <div
                v-else
                class="flex justify-center items-center w-full h-full text-xs text-gray-500"
              >
                <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fill-rule="evenodd"
                    d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z"
                    clip-rule="evenodd"
                  />
                </svg>
              </div>
            </div>

            <!-- Content -->
            <div class="flex-1 min-w-0">
              <div class="flex justify-between items-start">
                <div class="flex-1 min-w-0">
                  <h3
                    class="text-sm font-medium text-gray-800 truncate dark:text-gray-300"
                  >
                    {{ getTitle(result) }}
                  </h3>
                  <p class="mt-1 text-xs text-gray-600 dark:text-gray-400">
                    {{
                      result.media_type === MediaTypeEnum.movie
                        ? $t('media.movie')
                        : $t('media.series')
                    }}
                    <span v-if="getYear(result)" class="ml-1">
                      ({{ getYear(result) }})
                    </span>
                  </p>
                </div>
                <!-- Rating Badge -->
                <div class="flex-shrink-0 ml-2">
                  <div
                    :class="{
                      'bg-green-500': result.vote_average >= 7,
                      'bg-yellow-500':
                        result.vote_average >= 5 && result.vote_average < 7,
                      'bg-gray-500':
                        result.vote_average === 0 || !result.vote_average,
                      'bg-red-500':
                        result.vote_average && result.vote_average < 5,
                    }"
                    class="px-2 py-1 text-xs font-semibold text-white rounded shadow-sm"
                  >
                    ⭐
                    {{
                      result.vote_average?.toFixed(1) === '0.0' ||
                      result.vote_average === 0 ||
                      !result.vote_average
                        ? t('media.notAvailableShort')
                        : result.vote_average?.toFixed(1)
                    }}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- No Results -->
        <div
          v-else-if="searchQuery.length >= 4 && !isLoading"
          class="px-4 py-6 text-center text-gray-600 dark:text-gray-400"
        >
          <svg
            class="mx-auto mb-2 w-12 h-12 text-gray-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <p class="text-sm">{{ $t('search.noResults') }}</p>
          <p class="mt-1 text-xs">{{ $t('search.tryDifferent') }}</p>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { MediaTypeEnum } from '@/types/enums/MediaTypeEnum';
import type { TMDBSearchResult } from '@/types/tmdb/Search';

const router = useRouter();
const searchContainerRef = ref<HTMLElement | null>(null);

// Props
interface Props {
  placeholder?: string;
  emitOnSelect?: boolean; // If true, emit event instead of navigating
  language?: string; // Optional language code for search (e.g., 'es-ES', 'en-US'). If not provided, server will use user preference or default.
}

const { t } = useI18n();

const props = withDefaults(defineProps<Props>(), {
  placeholder: '', // Se usa $t('search.placeholder') directamente en el template
  emitOnSelect: false,
  language: undefined,
});

// Emit
const emit = defineEmits<{
  'title-selected': [result: TMDBSearchResult];
  closed: [];
}>();

// Reactive state
const searchQuery = ref('');
const searchResults = ref<TMDBSearchResult[]>([]);
const isLoading = ref(false);
const showResults = ref(false);
let searchTimeout: ReturnType<typeof setTimeout> | null = null;

// Get title helper
const getTitle = (result: TMDBSearchResult): string => {
  return result.title || result.name || t('media.noTitle');
};

// Get year helper
const getYear = (result: TMDBSearchResult): string => {
  const date = result.release_date || result.first_air_date;
  return date ? new Date(date).getFullYear().toString() : '';
};

// Close search and clear query
const closeSearch = () => {
  showResults.value = false;
  searchQuery.value = '';
  searchResults.value = [];
  if (searchTimeout) {
    clearTimeout(searchTimeout);
    searchTimeout = null;
  }
};

// Navigate to detail page or emit event
const navigateToDetail = (result: TMDBSearchResult) => {
  // Close dropdown and clear query
  closeSearch();
  // Emit closed event to notify parent (useful for mobile search)
  emit('closed');

  if (props.emitOnSelect) {
    emit('title-selected', result);
  } else {
    if (result.media_type === MediaTypeEnum.movie) {
      router.push(`/movie/${result.id}`);
    } else if (result.media_type === MediaTypeEnum.tv) {
      router.push(`/tv-show/${result.id}`);
    }
  }
};

// Handle search with debouncing
const handleSearch = () => {
  // Clear previous timeout
  if (searchTimeout) {
    clearTimeout(searchTimeout);
  }

  // If query is less than 4 characters, clear results
  if (searchQuery.value.length < 4) {
    searchResults.value = [];
    showResults.value = false;
    return;
  }

  // Set loading state
  isLoading.value = true;
  showResults.value = true;

  // Debounce search
  searchTimeout = setTimeout(async () => {
    try {
      const queryParams: { query: string; language?: string } = {
        query: searchQuery.value,
      };

      // If language prop is provided, pass it to the API
      // Otherwise, the server will use user preference or default
      if (props.language) {
        queryParams.language = props.language;
      }

      const response = await $fetch<{ data: { results: TMDBSearchResult[] } }>(
        `/api/tmdb/search/multi`,
        {
          query: queryParams,
        }
      );

      // Filter out person results and limit to 8 results
      searchResults.value = response.data.results
        .filter(
          (result: TMDBSearchResult) =>
            result.media_type === MediaTypeEnum.movie ||
            result.media_type === MediaTypeEnum.tv
        )
        .slice(0, 8);
    } catch (error) {
      console.error('Search error:', error);
      searchResults.value = [];
    } finally {
      isLoading.value = false;
    }
  }, 300); // 300ms debounce
};

// Handle blur with delay to allow clicks on results
const handleBlur = () => {
  // Don't close immediately, let handleClickOutside handle it
  // This prevents closing when clicking on results
};

// Handle clicks outside the search container
const handleClickOutside = (event: MouseEvent) => {
  // Only close if results are visible and click is outside
  if (
    showResults.value &&
    searchContainerRef.value &&
    !searchContainerRef.value.contains(event.target as Node)
  ) {
    closeSearch();
  }
};

// Expose methods for parent components
defineExpose({
  clearSearch: closeSearch,
});

onMounted(() => {
  // Add click outside listener
  document.addEventListener('click', handleClickOutside);
});

// Clear search when component unmounts
onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
  if (searchTimeout) {
    clearTimeout(searchTimeout);
  }
});
</script>

<style scoped>
/* Custom scrollbar for results */
.overflow-y-auto::-webkit-scrollbar {
  width: 6px;
}

.overflow-y-auto::-webkit-scrollbar-track {
  background: rgba(55, 65, 81, 0.5);
  border-radius: 3px;
}

.overflow-y-auto::-webkit-scrollbar-thumb {
  background: rgba(107, 114, 128, 0.8);
  border-radius: 3px;
}

.overflow-y-auto::-webkit-scrollbar-thumb:hover {
  background: rgba(107, 114, 128, 1);
}
</style>
