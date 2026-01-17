<template>
  <TitleCardMosaic
    :title="props.title.title"
    :poster-path="props.title.poster_path"
    :link-to="linkTo"
    :link-aria-label="$t('media.viewDetailsOf', { title: props.title.title })"
    :image-alt="$t('media.posterOf', { title: props.title.title })"
    :no-image-aria-label="
      $t('media.noPosterAvailableFor', { title: props.title.title })
    "
    :type="props.title.type"
    :tmdb-id="props.title.tmdb_id"
    :vote-average="props.title.vote_average"
    :overview="props.title.overview"
    :tagline="props.title.tagline"
    :providers="props.title.providers"
    :aria-label="$t('media.recommendationLabel', { title: props.title.title })"
  >
    <!-- Top-right: Actions Menu -->
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

    <!-- EXPLANATION (si existe) - Mostrar antes del contenido estándar -->
    <template v-if="explanationText" #explanation>
      <p class="mb-2 text-xs text-gray-500 dark:text-gray-400">
        {{ explanationText }}
      </p>
    </template>
  </TitleCardMosaic>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import {
  TITLE_STATUS,
  type TitleStatusType,
} from '@/constants/domain/titleStatus';
import { MEDIA_TYPE } from '@/constants/domain/mediaType';
import type { Recommendation } from '@/types/Recommendation';
import TitleActionMenu from '@/components/ui/TitleActionMenu.vue';
import TitleCardMosaic from './TitleCardMosaic.vue';

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

const { routeWithLang } = useRouteWithLang();

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

const mediaType = computed(() =>
  props.title.type === MEDIA_TYPE.MOVIE ? 'movie' : 'tv-show'
);

// Computed link with language prefix
const linkTo = computed(() => {
  return routeWithLang(`/${mediaType.value}/${props.title.tmdb_id}`);
});

// Map explanation_code to user-friendly text using translations
const { t } = useI18n();
const explanationText = computed(() => {
  if (!props.title.explanation_code) return null;

  const translationKey = `recommendations.explanation.${props.title.explanation_code}`;
  const translated = t(translationKey);

  // If translation doesn't exist, return null (fallback handled by server)
  return translated !== translationKey ? translated : null;
});
</script>
