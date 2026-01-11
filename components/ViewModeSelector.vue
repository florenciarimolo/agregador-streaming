<template>
  <div
    class="flex items-center gap-1 p-1 rounded-3xl bg-gray-100/50 dark:bg-gray-800/50 border border-gray-300/50 dark:border-white/10"
  >
    <button
      type="button"
      :aria-label="$t('viewMode.mosaic')"
      :class="[
        'flex items-center justify-center p-2 rounded-3xl transition-colors',
        isMosaicView
          ? 'bg-primary-800 text-white dark:bg-primary'
          : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700',
      ]"
      @click="setViewMode('mosaic')"
    >
      <IconGrid icon-class="w-4 h-4" />
    </button>
    <button
      type="button"
      :aria-label="$t('viewMode.list')"
      :class="[
        'flex items-center justify-center p-2 rounded-3xl transition-colors',
        isListView
          ? 'bg-primary-800 text-white dark:bg-primary'
          : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700',
      ]"
      @click="setViewMode('list')"
    >
      <IconList icon-class="w-4 h-4" />
    </button>
  </div>
</template>

<script setup lang="ts">
import { useViewMode } from '@/composables/useViewMode';
import IconGrid from '@/components/icons/IconGrid.vue';
import IconList from '@/components/icons/IconList.vue';

interface Props {
  pageKey: string;
}

const props = defineProps<Props>();

const { viewMode, setViewMode, isListView, isMosaicView } = useViewMode(
  props.pageKey
);
</script>
