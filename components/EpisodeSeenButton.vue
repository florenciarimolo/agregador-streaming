<template>
  <Tooltip
    :text="
      isSeen
        ? $t('episodes.unmarkAsSeen', {
            episode: episodeNumber,
            season: seasonNumber,
          })
        : $t('episodes.markAsSeen', {
            episode: episodeNumber,
            season: seasonNumber,
          })
    "
  >
    <IconButton
      :aria-label="
        isSeen
          ? $t('episodes.unmarkAsSeen', {
              episode: episodeNumber,
              season: seasonNumber,
            })
          : $t('episodes.markAsSeen', {
              episode: episodeNumber,
              season: seasonNumber,
            })
      "
      :custom-class="
        isSeen
          ? 'text-primary-600 dark:text-primary-400'
          : 'text-gray-500 dark:text-gray-400'
      "
      @click="handleClick"
    >
      <IconEye :icon-class="iconSizeClass" />
    </IconButton>
  </Tooltip>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import IconButton from '@/components/ui/IconButton.vue';
import IconEye from '@/components/icons/IconEye.vue';
import Tooltip from '@/components/ui/Tooltip.vue';

interface Props {
  isSeen: boolean;
  seasonNumber: number;
  episodeNumber: number;
  size?: 'small' | 'medium' | 'large';
}

const props = withDefaults(defineProps<Props>(), {
  size: 'medium',
});

const emit = defineEmits<{
  click: [];
}>();

const iconSizeClass = computed(() => {
  const sizes = {
    small: 'w-4 h-4',
    medium: 'w-5 h-5',
    large: 'w-6 h-6',
  };
  return sizes[props.size];
});

const handleClick = () => {
  emit('click');
};
</script>
