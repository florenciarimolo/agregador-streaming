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
    :vote-average="props.title.vote_average"
    :overview="props.title.overview"
    :providers="props.title.providers"
    :aria-label="$t('media.recommendationLabel', { title: props.title.title })"
  >
    <!-- Top-right: Actions Menu -->
    <template #actions>
      <div class="overflow-visible">
        <ActionMenu ref="dropdownRef" width="w-48" position="right">
          <template #trigger>
            <IconButton
              :icon="IconMoreVertical"
              :aria-label="
                $t('media.actionsMenuFor', { title: props.title.title })
              "
              size="small"
              variant="default"
              custom-class="menu-button p-2 rounded-full bg-black/50 hover:bg-gray-700/80 backdrop-blur-sm transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-black/50 [&>svg]:text-white"
            />
          </template>
          <div class="p-4">
            <!-- If title has a state, only show option to remove that state -->
            <!-- All remove actions use IconX -->
            <Button
              v-if="props.title.liked"
              type="button"
              variant="ghost"
              size="small"
              custom-class="justify-start w-full text-left"
              @click.stop.prevent="handleAction('remove-liked')"
            >
              <template #icon>
                <IconX icon-class="w-4 h-4" />
              </template>
              {{ $t('media.removeFromLiked') }}
            </Button>
            <Button
              v-else-if="props.title.in_watchlist"
              type="button"
              variant="ghost"
              size="small"
              custom-class="justify-start w-full text-left"
              @click.stop.prevent="handleAction(TITLE_STATUS.WATCHLIST)"
            >
              <template #icon>
                <IconX icon-class="w-4 h-4" />
              </template>
              {{ $t('media.removeFromWatchlist') }}
            </Button>
            <!-- If title has no state, show all options to add states -->
            <template v-else>
              <Button
                type="button"
                variant="ghost"
                size="small"
                custom-class="justify-start mb-2 w-full text-left"
                @click.stop.prevent="handleAction(TITLE_STATUS.SEEN)"
              >
                <template #icon>
                  <IconCheck icon-class="w-4 h-4" />
                </template>
                {{ $t('media.seen') }}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="small"
                custom-class="justify-start mb-2 w-full text-left"
                @click.stop.prevent="handleAction('liked')"
              >
                <template #icon>
                  <IconHeart icon-class="w-4 h-4" />
                </template>
                {{ $t('media.liked') }}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="small"
                custom-class="justify-start mb-2 w-full text-left"
                @click.stop.prevent="handleAction(TITLE_STATUS.NOT_INTERESTED)"
              >
                <template #icon>
                  <IconX icon-class="w-4 h-4" />
                </template>
                {{ $t('media.notInterested') }}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="small"
                custom-class="justify-start w-full text-left"
                @click.stop.prevent="handleAction(TITLE_STATUS.WATCHLIST)"
              >
                <template #icon>
                  <IconClock icon-class="w-4 h-4" />
                </template>
                {{ $t('media.watchLater') }}
              </Button>
            </template>
          </div>
        </ActionMenu>
      </div>
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
import { computed, ref } from 'vue';
import IconMoreVertical from './icons/IconMoreVertical.vue';
import IconClock from './icons/IconClock.vue';
import IconCheck from './icons/IconCheck.vue';
import IconHeart from './icons/IconHeart.vue';
import IconX from './icons/IconX.vue';
import {
  TITLE_STATUS,
  type TitleStatusType,
} from '@/constants/domain/titleStatus';
import { MEDIA_TYPE } from '@/constants/domain/mediaType';
import type { Recommendation } from '@/types/Recommendation';
import IconButton from '@/components/ui/IconButton.vue';
import Button from '@/components/ui/Button.vue';
import ActionMenu from '@/components/ui/ActionMenu.vue';
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

const dropdownRef = ref<InstanceType<typeof ActionMenu> | null>(null);
const { routeWithLang } = useRouteWithLang();

const handleAction = (action: TitleStatusType | 'liked' | 'remove-liked') => {
  // Close dropdown when action is triggered
  dropdownRef.value?.close();

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
