<template>
  <Combobox v-slot="{ open }" v-model="selectedRegionObj" by="code">
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
            <div class="flex gap-2 items-center pl-4">
              <img
                v-if="selectedRegionObj"
                :src="`/icons/flags/${selectedRegionObj.code.toLowerCase()}.svg`"
                :alt="selectedRegionObj.code"
                class="object-contain flex-shrink-0 w-5 h-4"
                loading="lazy"
                @error="
                  (e) => ((e.target as HTMLImageElement).style.display = 'none')
                "
              />
              <span class="text-sm truncate">{{ selectedRegionName }}</span>
            </div>
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
                  :placeholder="t('preferences.content.region.searchPlaceholder')"
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
                <ComboboxOption
                  v-for="region in filteredRegions"
                  :key="region.code"
                  :value="region"
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
                    <img
                      :src="`/icons/flags/${region.code.toLowerCase()}.svg`"
                      :alt="region.code"
                      class="object-contain flex-shrink-0 w-5 h-4"
                      loading="lazy"
                      @error="
                        (e) => ((e.target as HTMLImageElement).style.display = 'none')
                      "
                    />
                    <span class="text-sm text-gray-800 dark:text-gray-300 whitespace-nowrap">{{
                      region.name
                    }}</span>
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
import { ref, watch, computed, onMounted, onUnmounted, nextTick } from 'vue';
import {
  Combobox,
  ComboboxButton,
  ComboboxInput,
  ComboboxOptions,
  ComboboxOption,
} from '@headlessui/vue';
import type { Region } from '@/constants/regions';
import IconChevronDown from '@/components/icons/IconChevronDown.vue';
import IconSearch from '@/components/icons/IconSearch.vue';
import { useRegions } from '@/composables/useRegions';

interface Props {
  modelValue: string | null | undefined;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  'update:modelValue': [value: string | null];
}>();

const { t } = useI18n();

// Use the regions composable for global caching
const { loadRegions, getRegionName, getAppLanguage, appLanguageChange } =
  useRegions();

// Get i18n locale for watching changes
const { locale } = useI18n();

// Reactive state for current regions
const regions = ref<Region[]>([]);
const currentLanguage = ref<string>('');
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
// Since open from slot prop is not directly accessible in script setup,
// we use a ref that gets updated from template
const openState = ref(false);

// Method to update openState from template - called on every render when open changes
const updateOpenState = (value: boolean) => {
  if (openState.value !== value) {
    openState.value = value;
  }
};

// Watch openState for position updates - this is equivalent to watch(() => open, ...)
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

// Determine which language to use (always app language/i18n locale)
const getTargetLanguage = (): string => {
  return getAppLanguage();
};

// Get initial region object
const getInitialRegion = (): Region | null => {
  if (!props.modelValue) return null;
  return regions.value.find((r) => r.code === props.modelValue) || null;
};

// Selected region for Combobox (must be the Region object, not just the code)
const selectedRegionObj = computed({
  get: () => {
    if (!props.modelValue) return null;
    return regions.value.find((r) => r.code === props.modelValue) || null;
  },
  set: (region: Region | null) => {
    if (region) {
      emit('update:modelValue', region.code);
    } else {
      emit('update:modelValue', null);
    }
  },
});

// Filtered regions based on search query
const filteredRegions = computed(() => {
  if (!regions.value || regions.value.length === 0) {
    return [];
  }

  if (!searchQuery.value.trim()) {
    return [...regions.value].sort((a, b) => a.name.localeCompare(b.name));
  }

  const query = searchQuery.value.toLowerCase().trim();
  return regions.value
    .filter(
      (region: Region) =>
        region.name.toLowerCase().includes(query) ||
        region.code.toLowerCase().includes(query)
    )
    .sort((a: Region, b: Region) => a.name.localeCompare(b.name));
});

// Computed to get the selected region name (async)
const selectedRegionName = ref<string>(t('preferences.content.region.default'));

// Update selected region name when region or language changes
const updateSelectedRegionName = async () => {
  if (!props.modelValue) {
    selectedRegionName.value = t('preferences.content.region.default');
    return;
  }

  const targetLanguage = getTargetLanguage();
  const name = await getRegionName(props.modelValue, targetLanguage);
  selectedRegionName.value = name || t('preferences.content.region.default');
};

// Initialize filtered regions from cached regions
const initializeFilteredRegions = () => {
  // Filtered regions are computed, no need to initialize
};

// Load regions for the target language
const loadRegionsForLanguage = async (language?: string) => {
  const targetLanguage = language || getTargetLanguage();

  // Only reload if language actually changed
  if (
    currentLanguage.value &&
    currentLanguage.value === targetLanguage &&
    regions.value.length > 0
  ) {
    return; // Already loaded for this language
  }

  currentLanguage.value = targetLanguage;
  const loadedRegions = await loadRegions(targetLanguage);
  regions.value = loadedRegions;
};

// Load regions immediately for app language (i18n locale)
await loadRegionsForLanguage();

// Watch for app language (i18n locale) changes
watch(
  () => locale.value,
  async (newLocale) => {
    if (newLocale) {
      const currentRegionCode = props.modelValue;
      await loadRegionsForLanguage();
      await updateSelectedRegionName();
    }
  }
);

// Watch for language changes via global state (backup)
watch(appLanguageChange, async (changedLanguage) => {
  if (changedLanguage) {
    await loadRegionsForLanguage();
    await updateSelectedRegionName();
  }
});

// Update region name when selected region changes
watch(
  () => props.modelValue,
  async () => {
    await updateSelectedRegionName();
  }
);

// Initialize region name
await updateSelectedRegionName();

// Also ensure regions are loaded on mount (client-side fallback)
onMounted(async () => {
  if (regions.value.length === 0) {
    await loadRegionsForLanguage();
  }
  await updateSelectedRegionName();
});

// Reset search when combobox opens
watch(
  () => selectedRegionObj.value,
  () => {
    if (selectedRegionObj.value) {
      searchQuery.value = '';
    }
  }
);
</script>
