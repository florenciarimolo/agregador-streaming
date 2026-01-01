<template>
  <div class="relative">
    <!-- Selected Value Display -->
    <button
      type="button"
      class="w-full px-4 py-2 dark:bg-gray-800/50 bg-gray-100/80 border border-gray-300 dark:border-gray-700 rounded-lg dark:text-gray-300 text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary backdrop-blur-xs transition-all opacity-90 hover:opacity-100 text-left flex items-center justify-between gap-2"
      @click="toggleDropdown"
    >
      <div class="flex items-center gap-2 flex-1 min-w-0">
        <img
          v-if="selectedRegion"
          :src="`/icons/flags/${selectedRegion.toLowerCase()}.svg`"
          :alt="selectedRegion"
          class="w-5 h-4 object-contain flex-shrink-0"
          loading="lazy"
          @error="
            (e) => ((e.target as HTMLImageElement).style.display = 'none')
          "
        />
        <span class="truncate text-sm">{{
          selectedRegion
            ? regions.find((r: Region) => r.code === selectedRegion)?.name ||
              selectedRegion
            : t('preferences.content.region.default')
        }}</span>
      </div>
      <svg
        class="w-4 h-4 text-gray-400 flex-shrink-0 transition-transform"
        :class="{ 'rotate-180': isOpen }"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M19 9l-7 7-7-7"
        />
      </svg>
    </button>

    <!-- Dropdown -->
    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="transform scale-95 opacity-0"
      enter-to-class="transform scale-100 opacity-100"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="transform scale-100 opacity-100"
      leave-to-class="transform scale-95 opacity-0"
    >
      <div
        v-if="isOpen"
        class="absolute z-[100] w-full mt-2 dark:bg-gray-900/95 bg-white/95 backdrop-blur-sm dark:border-gray-600 border-gray-300 rounded-lg shadow-xl max-h-64 overflow-hidden flex flex-col"
        @mousedown.stop
      >
        <!-- Search Input -->
        <div class="p-2 border-b border-gray-300/50 dark:border-white/10">
          <div class="relative">
            <input
              v-model="searchQuery"
              type="text"
              :placeholder="t('preferences.content.region.searchPlaceholder')"
              class="w-full px-4 py-2 pl-10 pr-4 text-sm dark:text-gray-300 text-gray-800 dark:bg-gray-800/50 bg-white/80 dark:border-gray-600 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-transparent focus:border-transparent backdrop-blur-xs transition-all opacity-90 hover:opacity-100"
              @input="filterRegions"
            />
            <!-- Search Icon -->
            <div class="absolute inset-y-0 left-0 flex items-center pl-3">
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
          </div>
        </div>
        <!-- Options List -->
        <div class="overflow-y-auto custom-scrollbar flex-1">
          <div class="py-2">
            <!-- Default Option -->
            <div
              class="flex items-center gap-3 px-4 py-3 cursor-pointer dark:hover:bg-gray-800/50 hover:bg-gray-100/50 transition-colors duration-150"
              :class="{
                'dark:bg-gray-800/30 bg-gray-100/50': !selectedRegion,
              }"
              @click="selectRegion(null)"
            >
              <span class="text-sm dark:text-gray-300 text-gray-800">{{
                t('preferences.content.region.default')
              }}</span>
            </div>
            <!-- Region Options -->
            <div
              v-for="region in filteredRegions"
              :key="region.code"
              class="flex items-center gap-3 px-4 py-3 cursor-pointer dark:hover:bg-gray-800/50 hover:bg-gray-100/50 transition-colors duration-150"
              :class="{
                'dark:bg-gray-800/30 bg-gray-100/50':
                  selectedRegion === region.code,
              }"
              @click="selectRegion(region.code)"
            >
              <img
                :src="`/icons/flags/${region.code.toLowerCase()}.svg`"
                :alt="region.code"
                class="w-5 h-4 object-contain flex-shrink-0"
                loading="lazy"
                @error="
                  (e) => ((e.target as HTMLImageElement).style.display = 'none')
                "
              />
              <span class="text-sm dark:text-gray-300 text-gray-800">{{
                region.name
              }}</span>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue';
import { AVAILABLE_REGIONS } from '@/constants/regions';
import type { Region } from '@/constants/regions';

interface Props {
  modelValue: string | null | undefined;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  'update:modelValue': [value: string | null];
}>();

const { t } = useI18n();

const isOpen = ref(false);
const selectedRegion = ref<string | null>(props.modelValue || null);
const searchQuery = ref('');
const filteredRegions = ref<Region[]>([]);

// Use regions from constants
const regions = AVAILABLE_REGIONS;

const toggleDropdown = () => {
  isOpen.value = !isOpen.value;
  if (isOpen.value) {
    // Show all regions when opening
    filteredRegions.value = regions;
    searchQuery.value = '';
  }
};

const filterRegions = () => {
  if (!searchQuery.value.trim()) {
    filteredRegions.value = [...regions].sort((a, b) =>
      a.name.localeCompare(b.name)
    );
    return;
  }

  const query = searchQuery.value.toLowerCase().trim();
  filteredRegions.value = regions
    .filter(
      (region: Region) =>
        region.name.toLowerCase().includes(query) ||
        region.code.toLowerCase().includes(query)
    )
    .sort((a: Region, b: Region) => a.name.localeCompare(b.name));
};

const selectRegion = (code: string | null) => {
  selectedRegion.value = code;
  emit('update:modelValue', code);
  isOpen.value = false;
};

// Close dropdown when clicking outside
const handleClickOutside = (event: MouseEvent) => {
  const target = event.target as HTMLElement;
  const component = target.closest('.relative');
  if (!component) {
    isOpen.value = false;
  }
};

// Watch for external changes
watch(
  () => props.modelValue,
  (newValue) => {
    selectedRegion.value = newValue || null;
  }
);

onMounted(() => {
  document.addEventListener('click', handleClickOutside);
});

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
});
</script>
