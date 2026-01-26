<template>
  <Listbox v-slot="{ open }" v-model="selectedSort" by="value">
    <div class="relative">
      <div v-show="false">{{ updateOpenState(open) }}</div>
      <ListboxButton
        ref="buttonRef"
        :aria-label="$t('sort.selectSort')"
        :class="[
          'flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-colors',
          open
            ? 'bg-primary-800 text-white dark:bg-primary'
            : 'bg-gray-100/50 dark:bg-gray-800/50 text-gray-800 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 border border-gray-300/50 dark:border-white/10',
        ]"
      >
        <IconSort icon-class="w-4 h-4" />
        <span class="hidden sm:inline">{{ currentSortLabel }}</span>
        <IconChevronDown
          :class="[
            'w-4 h-4 transition-transform',
            open ? 'rotate-180' : '',
          ]"
        />
      </ListboxButton>

      <Teleport to="body">
        <ListboxOptions
          v-if="open"
          :style="dropdownStyle"
          class="fixed z-50 mt-1 min-w-[192px] max-h-64 overflow-hidden rounded-lg border border-gray-300 backdrop-blur-sm dark:bg-gray-900/95 bg-white/95 dark:border-gray-600 shadow-lg focus:outline-none"
        >
          <div class="max-h-64 overflow-y-auto custom-scrollbar">
            <div class="py-2">
              <ListboxOption
                v-for="option in sortOptions"
                :key="option.value"
                v-slot="{ active, selected }"
                :value="option"
                as="template"
              >
                <div
                  :class="[
                    'flex items-center justify-between px-3 py-2 text-sm rounded-lg transition-colors cursor-pointer',
                    active
                      ? 'bg-gray-100 dark:bg-gray-800/50'
                      : 'bg-transparent',
                    selected
                      ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-800 dark:text-primary-300'
                      : 'text-gray-800 dark:text-gray-300',
                  ]"
                >
                  <span>{{ option.label }}</span>
                  <IconCheck
                    v-if="selected"
                    icon-class="w-4 h-4"
                  />
                </div>
              </ListboxOption>
            </div>
          </div>
        </ListboxOptions>
      </Teleport>
    </div>
  </Listbox>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue';
import {
  Listbox,
  ListboxButton,
  ListboxOptions,
  ListboxOption,
} from '@headlessui/vue';
import type { SortOption } from '@/composables/useSort';
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

// Selected sort for Listbox
const selectedSort = computed({
  get: () => {
    return sortOptions.value.find((opt) => opt.value === props.currentSort) || sortOptions.value[0];
  },
  set: (option: { value: SortOption; label: string }) => {
    emit('update:sort', option.value);
  },
});

// Positioning for dropdown
const buttonRef = ref<InstanceType<typeof ListboxButton> | null>(null);
const dropdownStyle = ref<{
  position: 'fixed';
  top: string;
  right: string;
  minWidth: string;
  width: string;
}>({
  position: 'fixed',
  top: '0px',
  right: '0px',
  minWidth: '192px',
  width: 'max-content',
});

// Update dropdown position based on button position
const updateDropdownPosition = () => {
  if (!buttonRef.value) return;

  const button = buttonRef.value.$el as HTMLElement;
  if (!button) return;

  const rect = button.getBoundingClientRect();
  const rightPosition = window.innerWidth - rect.right;
  const maxRight = window.innerWidth - 16; // 16px padding from screen edge

  dropdownStyle.value = {
    position: 'fixed',
    top: `${rect.bottom + 4}px`, // mt-1 = 4px
    right: `${Math.min(rightPosition, maxRight)}px`,
    minWidth: '192px',
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
</script>
