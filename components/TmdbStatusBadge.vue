<template>
  <div
    v-if="displayText"
    :class="badgeStyle"
    class="inline-flex items-center w-fit px-4 py-1.5 text-xs font-medium rounded-full shadow-sm shadow-black/50 z-10 border whitespace-nowrap"
  >
    {{ displayText }}
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { TmdbStatus } from '@/types/enums/TmdbStatus';
import type { TmdbStatusType } from '@/types/enums/TmdbStatus';

const props = defineProps<{
  status?: TmdbStatusType | null;
  inTheaters?: boolean; // For movies: if currently in theaters
}>();

const { t } = useI18n();

const statusText = computed(() => {
  if (!props.status) return '';

  switch (props.status) {
    case TmdbStatus.RUMORED:
      return t('media.statusRumored');
    case TmdbStatus.PLANNED:
      return t('media.statusPlanned');
    case TmdbStatus.PILOT:
      return t('media.statusPilot');
    case TmdbStatus.IN_PRODUCTION:
      return t('media.statusInProduction');
    case TmdbStatus.POST_PRODUCTION:
      return t('media.statusPostProduction');
    case TmdbStatus.RELEASED:
      return t('media.statusReleased');
    case TmdbStatus.CANCELED:
      return t('media.statusCanceled');
    case TmdbStatus.RETURNING_SERIES:
      return t('media.statusReturningSeries');
    case TmdbStatus.ENDED:
      return t('media.statusEnded');
    default:
      return props.status;
  }
});

// Display text: prioritize inTheaters, then status
const displayText = computed(() => {
  if (props.inTheaters) {
    return t('media.inTheaters');
  }
  return statusText.value;
});

const badgeStyle = computed(() => {
  // Prioritize inTheaters badge style
  if (props.inTheaters) {
    return {
      'bg-blue-600/90 dark:bg-blue-700/90 border-blue-500/30 text-blue-300': true,
    };
  }

  if (!props.status) return {};

  switch (props.status) {
    case TmdbStatus.RUMORED:
      // Gray for rumored (uncertain)
      return {
        'bg-gray-600/90 dark:bg-gray-700/90 border-gray-500/30 text-gray-300': true,
      };
    case TmdbStatus.PLANNED:
      // Blue for planned (upcoming)
      return {
        'bg-blue-600/90 dark:bg-blue-700/90 border-blue-500/30 text-blue-300': true,
      };
    case TmdbStatus.PILOT:
      // Cyan for pilot (testing phase)
      return {
        'bg-cyan-600/90 dark:bg-cyan-700/90 border-cyan-500/30 text-cyan-300': true,
      };
    case TmdbStatus.IN_PRODUCTION:
      // Green for in production (active)
      return {
        'bg-green-600/90 dark:bg-green-700/90 border-green-500/30 text-green-300': true,
      };
    case TmdbStatus.POST_PRODUCTION:
      // Purple for post production (almost ready)
      return {
        'bg-purple-600/90 dark:bg-purple-700/90 border-purple-500/30 text-purple-300': true,
      };
    case TmdbStatus.RELEASED:
      // Blue for released (available)
      return {
        'bg-blue-600/90 dark:bg-blue-700/90 border-blue-400/30 text-blue-100 dark:text-blue-200': true,
      };
    case TmdbStatus.CANCELED:
      // Red for canceled (negative)
      return {
        'bg-red-600/90 dark:bg-red-700/90 border-red-500/30 text-red-300': true,
      };
    case TmdbStatus.RETURNING_SERIES:
      // Green for returning series (active/ongoing)
      return {
        'bg-green-600/90 dark:bg-green-700/90 border-green-500/30 text-green-300': true,
      };
    case TmdbStatus.ENDED:
      // Gray for ended (completed)
      return {
        'bg-gray-600/90 dark:bg-gray-700/90 border-gray-500/30 text-gray-300': true,
      };
    default:
      return {
        'bg-gray-600/90 dark:bg-gray-700/90 border-gray-500/30 text-gray-300': true,
      };
  }
});
</script>
