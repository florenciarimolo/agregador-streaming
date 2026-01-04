<template>
  <Combobox v-slot="{ open }" v-model="selectedGenreObj" by="id">
    <div class="relative">
      <div v-show="false">{{ updateOpenState(open) }}</div>
      <ComboboxButton
        ref="buttonRef"
        class="px-4 py-2 w-full text-left text-gray-800 rounded-lg border border-gray-300 opacity-90 dark:bg-gray-800/50 bg-white/80 dark:border-gray-600 dark:text-gray-300 backdrop-blur-xs hover:opacity-100 transition-all focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
      >
        <span class="flex gap-2 justify-between items-center w-full">
          <div class="flex overflow-hidden flex-1 gap-2 items-center min-w-0">
            <span class="text-sm truncate">{{
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
                  @change="searchQuery = $event.target.value"
                  :placeholder="
                    t('preferences.content.favoriteGenres.searchPlaceholder')
                  "
                  class="px-4 py-2 pr-4 pl-10 w-full text-sm text-gray-800 rounded-lg border-gray-300 opacity-90 transition-all dark:text-gray-300 dark:bg-gray-800/50 bg-white/80 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-transparent focus:border-transparent backdrop-blur-xs hover:opacity-100"
                />
                <!-- Search Icon -->
                <div class="flex absolute inset-y-0 left-0 items-center pl-3 pointer-events-none">
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
                      genre.type === MediaTypeEnum.movie
                        ? t('preferences.content.contentTypes.movie')
                        : t('preferences.content.contentTypes.tv')
                    }}
                  </div>
                  <ComboboxOption
                    :value="genre"
                    v-slot="{ active, selected }"
                    as="template"
                  >
                    <div
                      :class="[
                        'flex gap-3 items-center px-4 py-3 transition-colors duration-150 cursor-pointer',
                        active
                          ? 'dark:bg-gray-800/50 bg-gray-100/50'
                          : 'bg-transparent',
                        selected
                          ? 'dark:bg-gray-800/30 bg-gray-100/50'
                          : '',
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
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue';
import {
  Combobox,
  ComboboxButton,
  ComboboxInput,
  ComboboxOptions,
  ComboboxOption,
} from '@headlessui/vue';
import { MediaTypeEnum } from '@/types/enums/MediaTypeEnum';
import IconChevronDown from '@/components/icons/IconChevronDown.vue';
import IconSearch from '@/components/icons/IconSearch.vue';

interface Genre {
  id: number;
  name: string;
  type?: typeof MediaTypeEnum.movie | typeof MediaTypeEnum.tv;
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

  const button = buttonRef.value.$el as HTMLElement;
  if (!button) return;

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

// Watch openState for position updates
watch(openState, async (isOpen) => {
  if (!isOpen) return;
  await nextTick();
  updateDropdownPosition();
});

// Update position on scroll and resize when open
onMounted(() => {
  window.addEventListener('scroll', updateDropdownPosition, { passive: true });
  window.addEventListener('resize', updateDropdownPosition);
});

onUnmounted(() => {
  window.removeEventListener('scroll', updateDropdownPosition);
  window.removeEventListener('resize', updateDropdownPosition);
});

// Selected genre for Combobox
const selectedGenreObj = computed({
  get: () => props.modelValue || null,
  set: (genre: Genre | null) => {
    if (genre) {
      emit('update:modelValue', genre);
      emit('select', genre);
    } else {
      emit('update:modelValue', null);
    }
  },
});

// Filtered genres based on search query and excluding already selected
const filteredGenres = computed(() => {
  let available = props.availableGenres.filter(
    (genre) => !props.selectedGenres.some((g) => g.id === genre.id)
  );

  if (!searchQuery.value.trim()) {
    return available.sort((a, b) => {
      // First sort by type: movie comes before tv
      if (a.type !== b.type) {
        return a.type === MediaTypeEnum.movie ? -1 : 1;
      }
      // Then sort alphabetically by name
      return (a.name || '').localeCompare(b.name || '');
    });
  }

  const query = searchQuery.value.toLowerCase().trim();
  return available
    .filter(
      (genre) =>
        genre.name && genre.name.toLowerCase().includes(query)
    )
    .sort((a, b) => {
      // First sort by type: movie comes before tv
      if (a.type !== b.type) {
        return a.type === MediaTypeEnum.movie ? -1 : 1;
      }
      // Then sort alphabetically by name
      return (a.name || '').localeCompare(b.name || '');
    });
});

// Reset search when genre is selected
watch(
  () => selectedGenreObj.value,
  () => {
    if (selectedGenreObj.value) {
      searchQuery.value = '';
    }
  }
);
</script>

