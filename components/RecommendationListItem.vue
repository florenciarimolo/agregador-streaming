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
    :has-menu-open="isMenuOpen"
    :is-following="props.title.following || false"
    :is-liked="props.title.liked || false"
    :is-in-watchlist="props.title.in_watchlist || false"
  >
    <template #actions>
      <TitleActionMenu
        :status-info="titleStatusInfo"
        :aria-label="$t('media.actionsMenuFor', { title: props.title.title })"
        @mark-seen="handleAction(TITLE_STATUS.SEEN)"
        @mark-liked="handleAction(TITLE_ACTION.LIKED)"
        @remove-liked="handleAction(TITLE_ACTION.REMOVE_LIKED)"
        @mark-not-interested="handleAction(TITLE_STATUS.NOT_INTERESTED)"
        @mark-watchlist="handleAction(TITLE_STATUS.WATCHLIST)"
        @follow="handleAction(TITLE_ACTION.FOLLOW)"
        @unfollow="handleAction(TITLE_ACTION.UNFOLLOW)"
        @menu-open="isMenuOpen = true"
        @menu-close="isMenuOpen = false"
      />
    </template>
  </ListItemBase>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import type { Recommendation } from '@/types/Recommendation';
import {
  TITLE_STATUS,
  type TitleStatusType,
} from '@/constants/domain/titleStatus';
import { TITLE_ACTION, type TitleActionType } from '@/constants/domain/titleActions';
import { MEDIA_TYPE } from '@/constants/domain/mediaType';
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
  'follow': [title: Recommendation];
  'unfollow': [title: Recommendation];
}>();

const isMenuOpen = ref(false);

const titleStatusInfo = computed(() => {
  const isFollowing = props.title.following || false;
  // When following, remove conflicting states (watchlist, not_interested, seen)
  // This matches the backend behavior where following removes those states
  return {
    isLiked: props.title.liked || false,
    isSeen: false,
    isNotInterested: false,
    isInWatchlist: isFollowing ? false : (props.title.in_watchlist || false), // Remove watchlist if following
    isFollowing,
    isFullySeen: false, // TODO: Add this from API if needed
    type: props.title.type === MEDIA_TYPE.MOVIE ? MEDIA_TYPE.MOVIE : MEDIA_TYPE.TV,
  };
});

const handleAction = (action: TitleStatusType | TitleActionType) => {
  if (action === TITLE_STATUS.SEEN) {
    emit('mark-seen', props.title);
  } else if (action === TITLE_ACTION.LIKED) {
    emit('mark-liked', props.title);
  } else if (action === TITLE_ACTION.REMOVE_LIKED) {
    emit('remove-liked', props.title);
  } else if (action === TITLE_STATUS.NOT_INTERESTED) {
    emit('mark-not-interested', props.title);
  } else if (action === TITLE_STATUS.WATCHLIST) {
    emit('mark-watchlist', props.title);
  } else if (action === TITLE_ACTION.FOLLOW) {
    emit('follow', props.title);
  } else if (action === TITLE_ACTION.UNFOLLOW) {
    emit('unfollow', props.title);
  }
};
</script>
