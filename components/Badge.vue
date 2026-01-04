<template>
  <span
    v-if="displayLabel"
    :class="[
      'inline-block w-fit font-medium text-white rounded-full backdrop-blur-sm pointer-events-none select-none bg-black/50 relative z-0',
      sizeClasses,
    ]"
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
  size?: 'xs' | 'sm' | 'md' | 'lg';
}

const props = withDefaults(defineProps<Props>(), {
  size: 'xs',
});

const sizeClasses = computed(() => {
  switch (props.size) {
    case 'sm':
      return 'px-2 py-1 text-xs';
    case 'md':
      return 'px-3 py-1.5 text-sm';
    case 'lg':
      return 'px-4 py-2 text-base';
    case 'xs':
    default:
      return 'px-2 py-1 text-xs';
  }
});
const { t } = useI18n();

const displayLabel = computed(() => {
  if (props.label) return props.label;
  if (!props.type) return '';
  return props.type === MediaTypeEnum.movie
    ? t('media.movie')
    : t('media.series');
});
</script>
