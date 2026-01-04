<template>
  <span
    v-if="displayLabel"
    class="inline-block w-fit px-2 py-1 text-xs font-medium text-white rounded-full backdrop-blur-sm pointer-events-none select-none bg-black/50 relative z-0"
  >
    {{ displayLabel }}
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { MediaTypeEnum } from '@/types/enums/MediaTypeEnum';

interface Props {
  type?: typeof MediaTypeEnum.movie | typeof MediaTypeEnum.tv;
  label?: string;
}

const props = defineProps<Props>();
const { t } = useI18n();

const displayLabel = computed(() => {
  if (props.label) return props.label;
  if (!props.type) return '';
  return props.type === MediaTypeEnum.movie
    ? t('media.movie')
    : t('media.series');
});
</script>
