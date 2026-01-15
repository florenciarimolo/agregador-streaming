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
      <ActionMenu ref="dropdownRef" width="w-48" position="right">
        <template #trigger>
          <IconButton
            :icon="IconMoreVertical"
            :aria-label="
              $t('media.actionsMenuFor', { title: props.title.title })
            "
            size="small"
            variant="default"
            custom-class="menu-button p-2 rounded-full bg-black/50 hover:bg-gray-700/80 backdrop-blur-sm transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-black/50 [&>svg]:text-white [&>svg]:w-3 [&>svg]:h-3"
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
    </template>
  </ListItemBase>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import type { Recommendation } from '@/types/Recommendation';
import {
  TITLE_STATUS,
  type TitleStatusType,
} from '@/constants/domain/titleStatus';
import ListItemBase from '@/components/ListItemBase.vue';
import IconMoreVertical from '@/components/icons/IconMoreVertical.vue';
import IconClock from '@/components/icons/IconClock.vue';
import IconCheck from '@/components/icons/IconCheck.vue';
import IconHeart from '@/components/icons/IconHeart.vue';
import IconX from '@/components/icons/IconX.vue';
import IconButton from '@/components/ui/IconButton.vue';
import Button from '@/components/ui/Button.vue';
import ActionMenu from '@/components/ui/ActionMenu.vue';

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
</script>
