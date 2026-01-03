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
        <Tooltip v-if="onLike" :text="likeLabel || $t('media.liked')">
          <IconButton
            :aria-label="likeLabel || $t('media.liked')"
            size="small"
            variant="default"
            :custom-class="`p-2 rounded-full backdrop-blur-sm pointer-events-auto w-fit h-fit ${
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
          </IconButton>
        </Tooltip>
      </template>

      <!-- Top-right: Remove Button -->
      <template #top-right-actions>
        <Tooltip v-if="onRemove" :text="removeLabel || $t('common.delete')">
          <IconButton
            :aria-label="removeLabel || $t('common.delete')"
            size="small"
            variant="default"
            custom-class="p-2 rounded-full backdrop-blur-sm pointer-events-auto w-fit h-fit bg-black/50 hover:bg-red-600/80"
            @click.stop.prevent="onRemove(title)"
          >
            <IconX icon-class="w-4 h-4 text-white" />
          </IconButton>
        </Tooltip>
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
import Tooltip from './ui/Tooltip.vue';

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
/* Ensure tooltips can escape overflow containers */
div[class*='group relative'] {
  overflow: visible;
}
</style>
