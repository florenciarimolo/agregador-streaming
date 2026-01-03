<template>
  <div
    class="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6"
  >
    <TitleCard
      v-for="title in titles"
      :key="title.id"
      :title="title.title"
      :poster-path="title.poster_path"
      :link-to="`/${title.type === MediaTypeEnum.movie ? 'movie' : 'tv-show'}/${title.tmdb_id}`"
      :link-aria-label="$t('media.viewDetailsOf', { title: title.title })"
      :image-alt="$t('media.posterOf', { title: title.title })"
      :no-image-aria-label="$t('media.noPosterAvailableFor', { title: title.title })"
      :type="title.type"
      :aria-label="$t('media.titleCardLabel', { title: title.title })"
    >
      <!-- Top-left: Like Button -->
      <template #top-left-badges>
        <IconButton
          v-if="onLike"
          :aria-label="likeLabel || $t('media.liked')"
          size="small"
          variant="default"
          :custom-class="`tooltip-container p-2 rounded-full backdrop-blur-sm pointer-events-auto ${
            title.liked === true
              ? 'bg-primary-800 text-white border border-gray-700/50 dark:bg-primary-600/70 dark:border-primary-800 hover:bg-primary-900 dark:hover:bg-primary-600'
              : 'bg-black/50 hover:bg-primary-900 dark:hover:bg-primary-600'
          }`"
          @click.stop.prevent="onLike(title)"
        >
          <IconHeartFilled
            v-if="title.liked === true"
            icon-class="w-4 h-4 text-white"
          />
          <IconHeart v-else icon-class="w-4 h-4 text-white" />
          <span class="tooltip">{{ likeLabel || $t('media.liked') }}</span>
        </IconButton>
      </template>

      <!-- Top-right: Remove Button -->
      <template #top-right-actions>
        <IconButton
          v-if="onRemove"
          :aria-label="removeLabel || $t('common.delete')"
          size="small"
          variant="default"
          custom-class="tooltip-container p-2 rounded-full backdrop-blur-sm pointer-events-auto bg-black/50 hover:bg-red-600/80"
          @click.stop.prevent="onRemove(title)"
        >
          <IconX icon-class="w-4 h-4 text-white" />
          <span class="tooltip">{{ removeLabel || $t('common.delete') }}</span>
        </IconButton>
      </template>
    </TitleCard>
  </div>
</template>

<script setup lang="ts">
import { MediaTypeEnum } from '@/types/enums/MediaTypeEnum';
import { watch } from 'vue';
import IconButton from '@/components/ui/IconButton.vue';
import IconHeart from './icons/IconHeart.vue';
import IconHeartFilled from './icons/IconHeartFilled.vue';
import IconX from './icons/IconX.vue';
import TitleCard from './TitleCard.vue';

interface Title {
  id: string;
  title: string;
  type: typeof MediaTypeEnum.movie | typeof MediaTypeEnum.tv;
  poster_path: string | null;
  tmdb_id: number;
  liked?: boolean;
}

interface Props {
  titles: Title[];
  onRemove?: (title: Title) => void;
  removeLabel?: string;
  onLike?: (title: Title) => void;
  likeLabel?: string;
}

const props = defineProps<Props>();

// Debug: log titles with liked status
if (import.meta.dev && props.onLike) {
  watch(
    () => props.titles,
    (titles) => {
      titles.forEach((title) => {
        if (title.liked !== undefined) {
          console.log(
            '[TitleGrid] Title:',
            title.title,
            'liked:',
            title.liked,
            'type:',
            typeof title.liked
          );
        }
      });
    },
    { immediate: true, deep: true }
  );
}
</script>

<style scoped>
.tooltip-container:hover,
.tooltip-container:focus {
  z-index: 10000;
}

.tooltip {
  position: absolute;
  top: calc(100% + 8px);
  left: 50%;
  transform: translateX(-50%) translateY(4px);
  background-color: rgba(0, 0, 0, 0.95);
  color: white;
  padding: 6px 10px;
  border-radius: 6px;
  font-size: 12px;
  white-space: nowrap;
  pointer-events: none;
  opacity: 0;
  transition:
    opacity 0.2s ease-in-out,
    transform 0.2s ease-in-out;
  z-index: 9999;
  margin-top: 0;
}

.tooltip::after {
  content: '';
  position: absolute;
  bottom: 100%;
  left: 50%;
  transform: translateX(-50%);
  border: 4px solid transparent;
  border-bottom-color: rgba(0, 0, 0, 0.95);
}

.tooltip-container:hover .tooltip,
.tooltip-container:focus .tooltip {
  opacity: 1;
  transform: translateX(-50%) translateY(0);
}

.tooltip-container:focus-visible .tooltip {
  opacity: 1;
  transform: translateX(-50%) translateY(0);
}

div[class*='group relative'] {
  overflow: visible;
}
</style>
