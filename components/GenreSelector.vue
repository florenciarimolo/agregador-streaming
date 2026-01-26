<template>
  <Combobox v-slot="{ open }" v-model="selectedGenreObj" by="id">
    <div class="relative">
      <div v-show="false">{{ updateOpenState(open) }}</div>
      <ComboboxButton
        ref="buttonRef"
        class="px-4 py-2 pr-4 pl-10 w-full text-left text-gray-800 rounded-lg opacity-90 dark:bg-gray-800/50 bg-white/80 dark:text-gray-300 backdrop-blur-xs hover:opacity-100 transition-all focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
      >
        <span class="flex gap-2 justify-between items-center w-full">
          <div class="flex overflow-hidden flex-1 gap-2 items-center min-w-0">
            <!-- Search Icon -->
            <div
              class="flex absolute inset-y-0 left-0 items-center pl-3 pointer-events-none"
            >
              <IconSearch icon-class="w-4 h-4 text-gray-400" />
            </div>
            <span class="text-sm truncate pl-4">{{
              selectedGenreObj?.name ||
              t('preferences.content.favoriteGenres.searchPlaceholder')
            }}</span>
          </div>
          <IconChevronDown
            :icon-class="`flex-shrink-0 w-4 h-4 text-gray-400 transition-transform ui-open:rotate-180`"
          />
        </span>
      </ComboboxButton>

      <Teleport to="body">
        <ComboboxOptions
          v-if="open"
          :style="dropdownStyle"
          class="fixed z-50 mt-1 min-w-full max-h-64 overflow-hidden rounded-lg border border-gray-300 backdrop-blur-sm dark:bg-gray-900/95 bg-white/95 dark:border-gray-600 shadow-lg focus:outline-none"
        >
          <!-- Search Input -->
          <div class="p-2 border-b border-gray-300/50 dark:border-white/10">
            <div class="relative">
              <ComboboxInput
                :display-value="() => searchQuery"
                :placeholder="
                  t('preferences.content.favoriteGenres.searchPlaceholder')
                "
                class="px-4 py-2 pr-4 pl-10 w-full text-sm text-gray-800 rounded-lg border-gray-300 opacity-90 transition-all dark:text-gray-300 dark:bg-gray-800/50 bg-white/80 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-transparent focus:border-transparent backdrop-blur-xs hover:opacity-100"
                @change="searchQuery = $event.target.value"
              />
              <!-- Search Icon -->
              <div
                class="flex absolute inset-y-0 left-0 items-center pl-3 pointer-events-none"
              >
                <IconSearch icon-class="w-4 h-4 text-gray-400" />
              </div>
            </div>
          </div>
          <!-- Options List -->
          <div class="max-h-48 overflow-y-auto custom-scrollbar">
            <div class="py-2">
              <template
                v-for="(genre, index) in filteredGenres"
                :key="`${genre.id}-${genre.type}`"
              >
                <!-- Separator: show only when type changes (first item of each type) -->
                <div
                  v-if="
                    index === 0 ||
                    filteredGenres[index - 1]?.type !== genre.type
                  "
                  class="px-4 py-2 text-xs font-semibold tracking-wider text-gray-500 uppercase dark:text-gray-400"
                  :class="
                    index > 0
                      ? 'border-t border-gray-200 dark:border-gray-700'
                      : ''
                  "
                >
                  {{
                    genre.type === MEDIA_TYPE.MOVIE
                      ? t('preferences.content.contentTypes.movie')
                      : t('preferences.content.contentTypes.tv')
                  }}
                </div>
                <ComboboxOption
                  v-slot="{ active, selected }"
                  :value="genre"
                  as="template"
                >
                  <div
                    :class="[
                      'flex gap-3 items-center px-4 py-3 transition-colors duration-150 cursor-pointer',
                      active
                        ? 'dark:bg-gray-800/50 bg-gray-100/50'
                        : 'bg-transparent',
                      selected ? 'dark:bg-gray-800/30 bg-gray-100/50' : '',
                    ]"
                  >
                    <span
                      class="text-sm text-gray-800 dark:text-gray-300 whitespace-nowrap"
                      >{{ genre.name }}</span
                    >
                  </div>
                </ComboboxOption>
              </template>
            </div>
          </div>
        </ComboboxOptions>
      </Teleport>
    </div>
  </Combobox>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, onBeforeUnmount, nextTick } from 'vue';
import {
  Combobox,
  ComboboxButton,
  ComboboxInput,
  ComboboxOptions,
  ComboboxOption,
} from '@headlessui/vue';
import { MEDIA_TYPE } from '@/constants/domain/mediaType';
import IconChevronDown from '@/components/icons/IconChevronDown.vue';
import IconSearch from '@/components/icons/IconSearch.vue';

interface Genre {
  id: number;
  name: string;
  type?: typeof MEDIA_TYPE.MOVIE | typeof MEDIA_TYPE.TV;
}

interface Props {
  modelValue: Genre | null | undefined;
  availableGenres: Genre[];
  selectedGenres?: Genre[];
}

const props = withDefaults(defineProps<Props>(), {
  selectedGenres: () => [],
});

const emit = defineEmits<{
  'update:modelValue': [value: Genre | null];
  select: [genre: Genre];
}>();

const { t } = useI18n();

const searchQuery = ref('');

// Positioning for dropdown
const buttonRef = ref<InstanceType<typeof ComboboxButton> | null>(null);
const dropdownStyle = ref<{
  position: 'fixed';
  top: string;
  left: string;
  minWidth: string;
  width: string;
}>({
  position: 'fixed',
  top: '0px',
  left: '0px',
  minWidth: '200px',
  width: 'max-content',
});

// Update dropdown position based on button position
const updateDropdownPosition = () => {
  if (!buttonRef.value) return;

  const button = buttonRef.value.$el;
  if (!button || !(button instanceof HTMLElement)) return;

  const rect = button.getBoundingClientRect();
  dropdownStyle.value = {
    position: 'fixed',
    top: `${rect.bottom + 4}px`, // mt-1 = 4px
    left: `${rect.left}px`,
    minWidth: `${rect.width}px`,
    width: 'max-content',
  };
};

// Watch for open state and update position
const openState = ref(false);

// Method to update openState from template
const updateOpenState = (value: boolean) => {
  if (openState.value !== value) {
    openState.value = value;
  }
};

// Selected genre for Combobox (must be defined before watchers)
const selectedGenreObj = computed({
  get: () => props.modelValue || null,
  set: (genre: Genre | null) => {
    emit('update:modelValue', genre);
  },
});

// Track if selection is from explicit user action
const isExplicitSelection = ref(false);
// Track if component is mounted
const isMounted = ref(false);

// Watch openState for position updates and clearing selection
const stopOpenStateWatcher = watch(openState, async (isOpen, wasOpen) => {
  if (!isMounted.value) return;
  
  if (isOpen) {
    // Opening: update position - wait for DOM to be ready
    await nextTick();
    if (!isMounted.value) return;
    // Double check that button is mounted before updating position
    if (buttonRef.value?.$el instanceof HTMLElement) {
      updateDropdownPosition();
    }
  } else if (wasOpen) {
    // Closing: clear selection if no explicit selection was made
    if (!isExplicitSelection.value && selectedGenreObj.value) {
      selectedGenreObj.value = null;
    }
    isExplicitSelection.value = false; // Reset flag
  }
});

// Watch for selection changes from Combobox
const stopSelectionWatcher = watch(selectedGenreObj, async (newValue, oldValue) => {
  if (!isMounted.value) return;
  
  // Only handle when a new value is selected (not when clearing)
  if (newValue && newValue !== oldValue) {
    // Emit select event
    emit('select', newValue);
    
    // Clear search input
    searchQuery.value = '';
    
    // Mark as explicit selection and clear after a tick
    isExplicitSelection.value = true;
    await nextTick();
    if (!isMounted.value) return;
    selectedGenreObj.value = null;
    isExplicitSelection.value = false;
  }
});

// Update position on scroll and resize when open
onMounted(() => {
  isMounted.value = true;
  // Wait for button to be mounted before adding listeners
  nextTick(() => {
    if (isMounted.value && buttonRef.value?.$el instanceof HTMLElement) {
      window.addEventListener('scroll', updateDropdownPosition, { passive: true });
      window.addEventListener('resize', updateDropdownPosition);
    }
  });
});

onBeforeUnmount(() => {
  isMounted.value = false;
  // Stop watchers before unmounting
  if (stopOpenStateWatcher) {
    stopOpenStateWatcher();
  }
  if (stopSelectionWatcher) {
    stopSelectionWatcher();
  }
  // Clear any pending state
  openState.value = false;
  selectedGenreObj.value = null;
});


onUnmounted(() => {
  window.removeEventListener('scroll', updateDropdownPosition);
  window.removeEventListener('resize', updateDropdownPosition);
});

// Note: Selection is now handled by watcher on selectedGenreObj

// Filtered genres based on search query and excluding already selected
const filteredGenres = computed(() => {
  let available = props.availableGenres.filter(
    (genre) => !props.selectedGenres.some((g) => g.id === genre.id)
  );

  if (!searchQuery.value.trim()) {
    return available.sort((a, b) => {
      // First sort by type: movie comes before tv
      if (a.type !== b.type) {
        return a.type === MEDIA_TYPE.MOVIE ? -1 : 1;
      }
      // Then sort alphabetically by name
      return (a.name || '').localeCompare(b.name || '');
    });
  }

  const query = searchQuery.value.toLowerCase().trim();
  return available
    .filter((genre) => genre.name && genre.name.toLowerCase().includes(query))
    .sort((a, b) => {
      // First sort by type: movie comes before tv
      if (a.type !== b.type) {
        return a.type === MEDIA_TYPE.MOVIE ? -1 : 1;
      }
      // Then sort alphabetically by name
      return (a.name || '').localeCompare(b.name || '');
    });
});

// Note: search is cleared in handleGenreSelect, no need for separate watch
</script>
