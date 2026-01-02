<template>
  <Dropdown
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
              selectedRegion
                ? regions.find((r: Region) => r.code === selectedRegion)
                    ?.name || selectedRegion
                : t('preferences.content.region.default')
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
      class="flex overflow-hidden flex-col max-h-64 border-gray-300 backdrop-blur-sm dark:bg-gray-900/95 bg-white/95 dark:border-gray-600"
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
          <!-- Default Option -->
          <div
            class="flex gap-3 items-center px-4 py-3 transition-colors duration-150 cursor-pointer dark:hover:bg-gray-800/50 hover:bg-gray-100/50"
            :class="{
              'dark:bg-gray-800/30 bg-gray-100/50': !selectedRegion,
            }"
            @click="selectRegion(null)"
          >
            <span class="text-sm text-gray-800 dark:text-gray-300">{{
              t('preferences.content.region.default')
            }}</span>
          </div>
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
  </Dropdown>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import type { Region } from '@/constants/regions';
import Dropdown from '@/components/ui/Dropdown.vue';
import Button from '@/components/ui/Button.vue';
import IconChevronDown from '@/components/icons/IconChevronDown.vue';
import IconSearch from '@/components/icons/IconSearch.vue';

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

// Fetch regions from TMDB API with cache
// Cache is handled server-side, but we use useAsyncData for client-side caching
const { data: regionsData } = await useAsyncData(
  'tmdb-regions',
  async () => {
    try {
      const response = await $fetch<{
        success: boolean;
        regions: Region[];
        cached?: boolean;
      }>('/api/tmdb/regions');

      if (!response.success || !response.regions) {
        console.error('[RegionSelector] Failed to fetch regions');
        return [];
      }

      return response.regions;
    } catch (error) {
      console.error('[RegionSelector] Error fetching regions:', error);
      return [];
    }
  },
  {
    server: true, // Fetch on server for SSR
    default: () => [],
    // Cache for 24 hours (86400 seconds)
    lazy: false, // Fetch immediately
  }
);

// Use regions from TMDB API
const regions = computed(() => regionsData.value || []);

// Initialize filtered regions
watch(
  regions,
  (newRegions) => {
    filteredRegions.value = [...newRegions].sort((a, b) =>
      a.name.localeCompare(b.name)
    );
  },
  { immediate: true }
);

const filterRegions = () => {
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

const dropdownRef = ref<InstanceType<typeof Dropdown> | null>(null);

const handleDropdownOpen = () => {
  // Reset search and show all regions when opening
  searchQuery.value = '';
  filteredRegions.value = [...regions.value].sort((a, b) =>
    a.name.localeCompare(b.name)
  );
};

const selectRegion = (code: string | null) => {
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
