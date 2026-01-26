<template>
  <Combobox v-slot="{ open }" v-model="selectedProviderObj" by="provider_id">
    <div class="relative">
      <div v-show="false">{{ updateOpenState(open) }}</div>
      <ComboboxButton
        ref="buttonRef"
        class="px-4 py-2 pr-4 pl-10 w-full text-sm text-gray-800 rounded-lg opacity-90 transition-all dark:text-gray-300 dark:bg-gray-800/50 bg-white/80 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-transparent focus:border-transparent backdrop-blur-xs hover:opacity-100"
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
              selectedProviderObj?.provider_name ||
              placeholder
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
                :placeholder="placeholder"
                class="px-4 py-2 pr-4 pl-10 w-full text-sm text-gray-800 rounded-lg border-gray-300 opacity-90 transition-all dark:text-gray-300 dark:bg-gray-800/50 bg-white/80 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-transparent focus:border-transparent backdrop-blur-xs hover:opacity-100"
                @change="searchQuery = $event.target.value"
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
              <ComboboxOption
                v-for="provider in filteredProviders"
                :key="provider.provider_id"
                v-slot="{ active, selected }"
                :value="provider"
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
                  <img
                    v-if="provider.logo_path"
                    :src="`https://image.tmdb.org/t/p/w45${provider.logo_path}`"
                    :alt="provider.provider_name"
                    class="object-contain flex-shrink-0 w-auto h-5 md:h-8"
                  />
                  <div
                    v-else
                    class="flex flex-shrink-0 justify-center items-center w-5 h-5 md:w-8 md:h-8 bg-gray-200 rounded dark:bg-gray-700"
                  >
                    <span class="text-xs text-gray-600 dark:text-gray-300">{{
                      String(provider.provider_name || '').charAt(0)
                    }}</span>
                  </div>
                  <span
                    class="text-sm text-gray-800 dark:text-gray-300 whitespace-nowrap"
                    >{{ provider.provider_name }}</span
                  >
                </div>
              </ComboboxOption>
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
import IconChevronDown from '@/components/icons/IconChevronDown.vue';
import IconSearch from '@/components/icons/IconSearch.vue';

interface Provider {
  provider_id: number;
  provider_name: string;
  logo_path: string | null;
}

interface Props {
  modelValue: Provider | null | undefined;
  availableProviders: Provider[];
  selectedProviders?: Provider[];
  placeholder: string;
  maxResults?: number;
}

const props = withDefaults(defineProps<Props>(), {
  selectedProviders: () => [],
  maxResults: 0, // 0 means no limit - show all providers
});

const emit = defineEmits<{
  'update:modelValue': [value: Provider | null];
  select: [provider: Provider];
}>();

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

// Selected provider for Combobox (must be defined before watchers)
const selectedProviderObj = computed({
  get: () => props.modelValue || null,
  set: (provider: Provider | null) => {
    emit('update:modelValue', provider);
  },
});

// Track if component is mounted
const isMounted = ref(false);
// Track if selection is from explicit user action
const isExplicitSelection = ref(false);

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
    if (!isExplicitSelection.value && selectedProviderObj.value) {
      selectedProviderObj.value = null;
    }
    isExplicitSelection.value = false; // Reset flag
  }
});

// Watch for selection changes from Combobox
const stopSelectionWatcher = watch(selectedProviderObj, async (newValue, oldValue) => {
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
    selectedProviderObj.value = null;
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
  selectedProviderObj.value = null;
});


onUnmounted(() => {
  window.removeEventListener('scroll', updateDropdownPosition);
  window.removeEventListener('resize', updateDropdownPosition);
});

// Note: Selection is now handled by watcher on selectedProviderObj

// Filtered providers based on search query and excluding already selected
const filteredProviders = computed(() => {
  let available = props.availableProviders.filter(
    (provider) =>
      !props.selectedProviders.some(
        (p) => p.provider_id === provider.provider_id
      )
  );

  if (!searchQuery.value.trim()) {
    const sorted = available.sort((a, b) =>
      a.provider_name.localeCompare(b.provider_name)
    );
    return props.maxResults > 0
      ? sorted.slice(0, props.maxResults)
      : sorted;
  }

  const query = searchQuery.value.toLowerCase().trim();
  const filtered = available.filter(
    (provider) =>
      provider.provider_name &&
      provider.provider_name.toLowerCase().includes(query)
  );
  const sorted = filtered.sort((a, b) =>
    a.provider_name.localeCompare(b.provider_name)
  );
  return props.maxResults > 0 ? sorted.slice(0, props.maxResults) : sorted;
});

// Note: search is cleared in handleProviderSelect, no need for separate watch
</script>

