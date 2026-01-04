<template>
  <SelectMenu
    ref="dropdownRef"
    position="left"
    width="w-full"
    :close-on-click-outside="true"
    @open="handleDropdownOpen"
  >
    <template #trigger="{ isOpen }">
      <!-- Selected Value Display -->
      <Button
        type="button"
        variant="outline"
        size="medium"
        custom-class="px-4 py-2 w-full text-left text-gray-800 rounded-lg border border-gray-300 opacity-90 dark:bg-gray-800/50 bg-white/80 dark:border-gray-600 dark:text-gray-300 backdrop-blur-xs hover:opacity-100"
      >
        <span class="flex gap-2 justify-between items-center w-full">
          <div class="flex overflow-hidden flex-1 gap-2 items-center min-w-0">
            <img
              v-if="selectedRegion"
              :src="`/icons/flags/${selectedRegion.toLowerCase()}.svg`"
              :alt="selectedRegion"
              class="object-contain flex-shrink-0 w-5 h-4"
              loading="lazy"
              @error="
                (e) => ((e.target as HTMLImageElement).style.display = 'none')
              "
            />
            <span class="text-sm truncate">{{
              selectedRegionName
            }}</span>
          </div>
          <IconChevronDown
            :icon-class="`flex-shrink-0 w-4 h-4 text-gray-400 transition-transform ${
              isOpen ? 'rotate-180' : ''
            }`"
          />
        </span>
      </Button>
    </template>
    <div
      class="flex overflow-hidden flex-col max-h-64 border border-gray-300 backdrop-blur-sm dark:bg-gray-900/95 bg-white/95 dark:border-gray-600 rounded-lg"
    >
      <!-- Search Input -->
      <div class="p-2 border-b border-gray-300/50 dark:border-white/10">
        <div class="relative">
          <input
            v-model="searchQuery"
            type="text"
            :placeholder="t('preferences.content.region.searchPlaceholder')"
            class="px-4 py-2 pr-4 pl-10 w-full text-sm text-gray-800 rounded-lg border-gray-300 opacity-90 transition-all dark:text-gray-300 dark:bg-gray-800/50 bg-white/80 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-transparent focus:border-transparent backdrop-blur-xs hover:opacity-100"
            @input="filterRegions"
          />
          <!-- Search Icon -->
          <div class="flex absolute inset-y-0 left-0 items-center pl-3">
            <IconSearch icon-class="w-4 h-4 text-gray-400" />
          </div>
        </div>
      </div>
      <!-- Options List -->
      <div class="overflow-y-auto flex-1 custom-scrollbar">
        <div class="py-2">
          <!-- Region Options -->
          <div
            v-for="region in filteredRegions"
            :key="region.code"
            class="flex gap-3 items-center px-4 py-3 transition-colors duration-150 cursor-pointer dark:hover:bg-gray-800/50 hover:bg-gray-100/50"
            :class="{
              'dark:bg-gray-800/30 bg-gray-100/50':
                selectedRegion === region.code,
            }"
            @click="selectRegion(region.code)"
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
            <span class="text-sm text-gray-800 dark:text-gray-300">{{
              region.name
            }}</span>
          </div>
        </div>
      </div>
    </div>
  </SelectMenu>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue';
import type { Region } from '@/constants/regions';
import SelectMenu from '@/components/ui/SelectMenu.vue';
import Button from '@/components/ui/Button.vue';
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

const selectedRegion = ref<string | null>(props.modelValue || null);
const searchQuery = ref('');
const filteredRegions = ref<Region[]>([]);

// Use the regions composable for global caching
const {
  loadRegions,
  getRegionName,
  getAppLanguage,
  appLanguageChange,
} = useRegions();

// Get i18n locale for watching changes
const { locale } = useI18n();

// Reactive state for current regions
const regions = ref<Region[]>([]);
const currentLanguage = ref<string>('');

// Determine which language to use (always app language/i18n locale)
const getTargetLanguage = (): string => {
  return getAppLanguage();
};

// Initialize filtered regions from cached regions
// Must be declared before loadRegionsForLanguage to avoid "before initialization" error
const initializeFilteredRegions = () => {
  if (regions.value && regions.value.length > 0) {
    filteredRegions.value = [...regions.value].sort((a, b) =>
      a.name.localeCompare(b.name)
    );
  } else {
    filteredRegions.value = [];
  }
};

// Load regions for the target language
const loadRegionsForLanguage = async (language?: string) => {
  const targetLanguage = language || getTargetLanguage();
  
  // Only reload if language actually changed
  if (currentLanguage.value && currentLanguage.value === targetLanguage && regions.value.length > 0) {
    return; // Already loaded for this language
  }
  
  currentLanguage.value = targetLanguage;
  const loadedRegions = await loadRegions(targetLanguage);
  regions.value = loadedRegions;
  initializeFilteredRegions();
};

// Computed to get the selected region name (async)
const selectedRegionName = ref<string>(t('preferences.content.region.default'));

// Update selected region name when region or language changes
const updateSelectedRegionName = async () => {
  if (!selectedRegion.value) {
    selectedRegionName.value = t('preferences.content.region.default');
    return;
  }

  // Use current language (from prop if provided, otherwise app language)
  const targetLanguage = getTargetLanguage();
  const name = await getRegionName(selectedRegion.value, targetLanguage);
  selectedRegionName.value = name || t('preferences.content.region.default');
};

// Load regions immediately for app language (i18n locale)
// In onboarding, regions will load when app language is set
await loadRegionsForLanguage();

// Watch for app language (i18n locale) changes
watch(
  () => locale.value,
  async (newLocale) => {
    if (newLocale) {
      // App language changed, reload regions for new app language
      // Keep the selected region code (ISO doesn't change, only name)
      const currentRegionCode = selectedRegion.value;
      await loadRegionsForLanguage();
      // Restore selected region (name will update automatically)
      if (currentRegionCode) {
        selectedRegion.value = currentRegionCode;
      }
      await updateSelectedRegionName();
    }
  }
);

// Watch for language changes via global state (backup)
watch(
  appLanguageChange,
  async (changedLanguage) => {
    if (changedLanguage) {
      // App language changed, reload regions for current app language
      // The cache for the old language has already been invalidated
      // Keep the selected region code (ISO doesn't change, only name)
      const currentRegionCode = selectedRegion.value;
      await loadRegionsForLanguage();
      // Restore selected region (name will update automatically)
      if (currentRegionCode) {
        selectedRegion.value = currentRegionCode;
      }
      await updateSelectedRegionName();
    }
  }
);

// Update region name when selected region changes
watch(
  () => selectedRegion.value,
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

const filterRegions = () => {
  if (!regions.value || regions.value.length === 0) {
    filteredRegions.value = [];
    return;
  }

  if (!searchQuery.value.trim()) {
    filteredRegions.value = [...regions.value].sort((a, b) =>
      a.name.localeCompare(b.name)
    );
    return;
  }

  const query = searchQuery.value.toLowerCase().trim();
  filteredRegions.value = regions.value
    .filter(
      (region: Region) =>
        region.name.toLowerCase().includes(query) ||
        region.code.toLowerCase().includes(query)
    )
    .sort((a: Region, b: Region) => a.name.localeCompare(b.name));
};

const dropdownRef = ref<InstanceType<typeof SelectMenu> | null>(null);

const handleDropdownOpen = async () => {
  // Reset search and show all regions when opening
  searchQuery.value = '';
  
  // Ensure regions are loaded (will use cache if available)
  if (regions.value.length === 0) {
    await loadRegionsForLanguage();
  }
  
  // Update filtered regions
  initializeFilteredRegions();
};

const selectRegion = (code: string) => {
  if (!code) return; // Prevent selecting null/empty
  selectedRegion.value = code;
  emit('update:modelValue', code);
  dropdownRef.value?.close();
};

// Watch for external changes
watch(
  () => props.modelValue,
  (newValue) => {
    selectedRegion.value = newValue || null;
  }
);
</script>
