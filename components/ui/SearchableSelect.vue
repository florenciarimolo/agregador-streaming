<template>
  <div class="relative mb-4">
    <SelectMenu
      ref="selectMenuRef"
      width="w-full"
      position="left"
      :close-on-click-outside="closeOnClickOutside"
      :select-id="selectId"
    >
      <template #trigger>
        <div class="relative" @mousedown.stop>
          <input
            ref="inputRef"
            v-model="searchQuery"
            type="text"
            :placeholder="placeholder"
            class="px-4 py-2 pr-4 pl-10 w-full text-sm text-gray-800 rounded-lg border-gray-300 opacity-90 transition-all dark:text-gray-300 dark:bg-gray-800/50 bg-white/80 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-transparent focus:border-transparent backdrop-blur-xs hover:opacity-100"
            @input="handleInput"
            @focus="handleFocus"
            @mousedown.stop.prevent="handleFocus"
            @blur="handleBlur"
          />
          <!-- Search Icon -->
          <div
            class="flex absolute inset-y-0 left-0 items-center pl-3 pointer-events-none"
          >
            <IconSearch icon-class="w-4 h-4 text-gray-400" />
          </div>
        </div>
      </template>
      <div
        v-if="filteredOptions.length > 0"
        class="overflow-y-auto max-h-64 border-gray-300 backdrop-blur-sm custom-scrollbar dark:bg-gray-900/95 bg-white/95 dark:border-gray-600"
        @mousedown="clickInsideMenu = true"
        @click="clickInsideMenu = true"
      >
        <div class="py-2">
          <slot
            name="items"
            :filtered-options="filteredOptions"
            :select-item="selectItem"
          >
            <!-- Default item rendering -->
            <div
              v-for="(item, index) in filteredOptions"
              :key="getItemKey(item, index)"
              class="flex gap-3 items-center px-4 py-3 transition-colors duration-150 cursor-pointer dark:hover:bg-gray-800/50 hover:bg-gray-100/50"
              @mousedown.prevent="selectItem(item)"
              @click="selectItem(item)"
            >
              <span
                class="text-sm text-gray-800 dark:text-gray-300 whitespace-nowrap"
                >{{ getItemLabel(item) }}</span
              >
            </div>
          </slot>
        </div>
      </div>
    </SelectMenu>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import SelectMenu from '@/components/ui/SelectMenu.vue';
import IconSearch from '@/components/icons/IconSearch.vue';

interface Props {
  // Available options to search from
  options: Array<Record<string, unknown>>;
  // Already selected items (to exclude from results)
  selectedItems?: Array<Record<string, unknown>>;
  // Placeholder text for the input
  placeholder: string;
  // Function to get the unique key for an item
  getItemKey?: (
    item: Record<string, unknown>,
    index: number
  ) => string | number;
  // Function to get the label/name for an item
  getItemLabel: (item: Record<string, unknown>) => string;
  // Function to check if an item is already selected
  isItemSelected?: (
    item: Record<string, unknown>,
    selectedItems: Array<Record<string, unknown>>
  ) => boolean;
  // Function to filter/search items
  filterItem?: (item: Record<string, unknown>, query: string) => boolean;
  // Maximum number of results to show (0 = unlimited)
  maxResults?: number;
  // Unique ID for this select instance (for global active select management)
  selectId?: string;
  // Whether to close the dropdown when clicking outside
  closeOnClickOutside?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  selectedItems: () => [],
  getItemKey: (item: Record<string, unknown>, index: number) => {
    const id =
      (item.id as number | undefined) ||
      (item.provider_id as number | undefined);
    return id || index;
  },
  isItemSelected: (
    item: Record<string, unknown>,
    selectedItems: Array<Record<string, unknown>>
  ) => {
    const itemId =
      (item.id as number | undefined) ||
      (item.provider_id as number | undefined);
    return selectedItems.some((selected) => {
      const selectedId =
        (selected.id as number | undefined) ||
        (selected.provider_id as number | undefined);
      return selectedId === itemId;
    });
  },
  filterItem: undefined,
  maxResults: 0,
  selectId: undefined,
  closeOnClickOutside: false,
});

const emit = defineEmits<{
  select: [item: Record<string, unknown>];
}>();

const searchQuery = ref('');
const selectMenuRef = ref<InstanceType<typeof SelectMenu> | null>(null);
const inputRef = ref<HTMLInputElement | null>(null);
const filteredOptions = ref<Array<Record<string, unknown>>>([]);
const clickInsideMenu = ref(false);

// Default filterItem function (needs to be defined after props)
const defaultFilterItem = (item: Record<string, unknown>, query: string) => {
  const label = props.getItemLabel(item);
  return String(label).toLowerCase().includes(query.toLowerCase());
};

// Filter options based on search query and selected items
const filterOptions = () => {
  const query = searchQuery.value.toLowerCase().trim();

  let filtered = props.options.filter(
    (item) => !props.isItemSelected(item, props.selectedItems)
  );

  if (query) {
    const filterFn = props.filterItem || defaultFilterItem;
    filtered = filtered.filter((item) => filterFn(item, query));
  }

  if (props.maxResults > 0) {
    filtered = filtered.slice(0, props.maxResults);
  }

  filteredOptions.value = filtered;
};

// Handle input change
const handleInput = () => {
  filterOptions();
  // Open dropdown if there are results and input has focus
  if (
    filteredOptions.value.length > 0 &&
    document.activeElement === inputRef.value
  ) {
    selectMenuRef.value?.open();
  } else if (filteredOptions.value.length === 0) {
    selectMenuRef.value?.close();
  }
};

// Handle focus - load and show all available options
const handleFocus = () => {
  // Initialize filtered options with all available options when opening
  if (!searchQuery.value.trim()) {
    filterOptions();
  } else {
    filterOptions();
  }
  // Open dropdown if there are results
  if (filteredOptions.value.length > 0) {
    selectMenuRef.value?.open();
  }
};

// Handle blur - close dropdown after a delay, but only if click was outside
const handleBlur = (event: FocusEvent) => {
  // Check if the related target (where focus is going) is inside the select menu
  const relatedTarget = event.relatedTarget as HTMLElement | null;
  const selectMenuElement = selectMenuRef.value?.$el as HTMLElement | null;

  // If focus is moving to an element inside the menu, don't close
  if (
    relatedTarget &&
    selectMenuElement &&
    selectMenuElement.contains(relatedTarget)
  ) {
    clickInsideMenu.value = false;
    return;
  }

  // Delay closing to allow click events to process first
  setTimeout(() => {
    // If click was inside menu, don't close
    if (clickInsideMenu.value) {
      clickInsideMenu.value = false;
      // Restore focus to input
      inputRef.value?.focus();
      return;
    }

    // Double-check that focus is still not on the input or menu
    const activeElement = document.activeElement;
    if (
      activeElement !== inputRef.value &&
      (!selectMenuElement || !selectMenuElement.contains(activeElement))
    ) {
      selectMenuRef.value?.close();
    }
  }, 200);
};

// Select an item
const selectItem = (item: Record<string, unknown>) => {
  clickInsideMenu.value = false;
  emit('select', item);
  searchQuery.value = '';
  selectMenuRef.value?.close();
};

// Watch for changes in options or selectedItems
watch(
  () => [props.options, props.selectedItems],
  () => {
    filterOptions();
  },
  { deep: true }
);

// Load results on mount
onMounted(() => {
  filterOptions();
});

// Expose methods to parent component
defineExpose({
  close: () => {
    selectMenuRef.value?.close();
    searchQuery.value = '';
  },
});
</script>
