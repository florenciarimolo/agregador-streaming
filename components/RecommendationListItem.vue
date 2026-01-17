<template>
  <ListItemBase
    :title="props.title.title"
    :poster-path="props.title.poster_path"
    :tagline="props.title.tagline"
    :overview="props.title.overview"
    :vote-average="props.title.vote_average"
    :type="props.title.type"
    :tmdb-id="props.title.tmdb_id"
    :providers="props.title.providers"
    :aria-label="$t('media.recommendationLabel', { title: props.title.title })"
    :link-aria-label="$t('media.viewDetailsOf', { title: props.title.title })"
    :image-alt="$t('media.posterOf', { title: props.title.title })"
    :show-overview="false"
    :no-image-aria-label="
      $t('media.noPosterAvailableFor', { title: props.title.title })
    "
  >
    <template #actions>
      <TitleActionMenu
        :status-info="titleStatusInfo"
        :aria-label="$t('media.actionsMenuFor', { title: props.title.title })"
        @mark-seen="handleAction(TITLE_STATUS.SEEN)"
        @mark-liked="handleAction('liked')"
        @remove-liked="handleAction('remove-liked')"
        @mark-not-interested="handleAction(TITLE_STATUS.NOT_INTERESTED)"
        @mark-watchlist="handleAction(TITLE_STATUS.WATCHLIST)"
      />
    </template>
  </ListItemBase>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { Recommendation } from '@/types/Recommendation';
import {
  TITLE_STATUS,
  type TitleStatusType,
} from '@/constants/domain/titleStatus';
import ListItemBase from '@/components/ListItemBase.vue';
import TitleActionMenu from '@/components/ui/TitleActionMenu.vue';

interface Props {
  title: Recommendation;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  'mark-seen': [title: Recommendation];
  'mark-not-interested': [title: Recommendation];
  'mark-liked': [title: Recommendation];
  'remove-liked': [title: Recommendation];
  'mark-watchlist': [title: Recommendation];
}>();

const titleStatusInfo = computed(() => ({
  isLiked: props.title.liked || false,
  isSeen: false,
  isNotInterested: false,
  isInWatchlist: props.title.in_watchlist || false,
}));

const handleAction = (action: TitleStatusType | 'liked' | 'remove-liked') => {
  if (action === TITLE_STATUS.SEEN) {
    emit('mark-seen', props.title);
  } else if (action === 'liked') {
    emit('mark-liked', props.title);
  } else if (action === 'remove-liked') {
    emit('remove-liked', props.title);
  } else if (action === TITLE_STATUS.NOT_INTERESTED) {
    emit('mark-not-interested', props.title);
  } else if (action === TITLE_STATUS.WATCHLIST) {
    emit('mark-watchlist', props.title);
  }
};
</script>
