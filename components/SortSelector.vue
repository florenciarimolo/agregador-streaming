<template>
  <div class="relative">
    <ActionMenu
      ref="dropdownRef"
      width="w-48"
      position="right"
      @open="isOpen = true"
      @close="isOpen = false"
    >
      <template #trigger>
        <button
          type="button"
          :aria-label="$t('sort.selectSort')"
          :class="[
            'flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-colors',
            isOpen
              ? 'bg-primary-800 text-white dark:bg-primary'
              : 'bg-gray-100/50 dark:bg-gray-800/50 text-gray-800 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 border border-gray-300/50 dark:border-white/10',
          ]"
        >
          <IconSort icon-class="w-4 h-4" />
          <span class="hidden sm:inline">{{ currentSortLabel }}</span>
          <IconChevronDown
            :class="[
              'w-4 h-4 transition-transform',
              isOpen ? 'rotate-180' : '',
            ]"
          />
        </button>
      </template>
      <div class="p-2">
        <button
          v-for="option in sortOptions"
          :key="option.value"
          type="button"
          :class="[
            'flex items-center justify-between w-full px-3 py-2 text-sm rounded-lg transition-colors',
            currentSort === option.value
              ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-800 dark:text-primary-300'
              : 'text-gray-800 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700',
          ]"
          @click="handleSortChange(option.value)"
        >
          <span>{{ option.label }}</span>
          <IconCheck
            v-if="currentSort === option.value"
            icon-class="w-4 h-4"
          />
        </button>
      </div>
    </ActionMenu>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import type { SortOption } from '@/composables/useSort';
import ActionMenu from '@/components/ui/ActionMenu.vue';
import IconSort from '@/components/icons/IconSort.vue';
import IconChevronDown from '@/components/icons/IconChevronDown.vue';
import IconCheck from '@/components/icons/IconCheck.vue';

interface Props {
  currentSort: SortOption;
  pageKey: string;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  'update:sort': [sort: SortOption];
}>();

const { t } = useI18n();
const dropdownRef = ref<InstanceType<typeof ActionMenu> | null>(null);
const isOpen = ref(false);

const sortOptions = computed(() => [
  {
    value: 'name-asc' as SortOption,
    label: t('sort.nameAsc'),
  },
  {
    value: 'name-desc' as SortOption,
    label: t('sort.nameDesc'),
  },
  {
    value: 'date-asc' as SortOption,
    label: t('sort.dateAddedAsc'),
  },
  {
    value: 'date-desc' as SortOption,
    label: t('sort.dateAddedDesc'),
  },
]);

const currentSortLabel = computed(() => {
  const option = sortOptions.value.find((opt) => opt.value === props.currentSort);
  return option?.label || t('sort.selectSort');
});

const handleSortChange = (sort: SortOption) => {
  emit('update:sort', sort);
  dropdownRef.value?.close();
};
</script>
