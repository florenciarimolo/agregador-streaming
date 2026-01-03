<template>
  <span
    v-if="label"
    class="inline-block w-fit px-2 py-1 text-xs font-medium text-white rounded-full backdrop-blur-sm pointer-events-none select-none bg-black/50 relative z-0"
  >
    {{ label }}
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { MediaTypeEnum } from '@/types/enums/MediaTypeEnum';

interface Props {
  type?: typeof MediaTypeEnum.movie | typeof MediaTypeEnum.tv;
  label?: string;
}

const props = defineProps<Props>();

const label = computed(() => {
  if (props.label) return props.label;
  if (!props.type) return '';
  const { t } = useI18n();
  return props.type === MediaTypeEnum.movie
    ? t('media.movie')
    : t('media.series');
});
</script>

