<template>
  <div class="overflow-visible relative">
    <ActionMenu 
      ref="dropdownRef" 
      width="w-48" 
      position="right" 
      @open="handleMenuOpen" 
      @close="handleMenuClose"
    >
      <template #trigger>
        <IconButton
          :icon="IconMoreVertical"
          :aria-label="ariaLabel"
          size="small"
          variant="default"
          custom-class="menu-button p-2 rounded-full bg-black/50 hover:bg-gray-700/80 backdrop-blur-sm transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-black/50 [&>svg]:text-white [&>svg]:w-3 [&>svg]:h-3"
        />
      </template>
      <div class="p-4">
        <!-- If title has a state, only show option to remove that state -->
        <!-- All remove actions use IconX -->
        <Button
          v-if="statusInfo.isLiked"
          type="button"
          variant="ghost"
          size="small"
          custom-class="justify-start w-full text-left"
          @click.stop.prevent="handleAction(TITLE_ACTION_CONST.REMOVE_LIKED)"
        >
          <template #icon>
            <IconX icon-class="w-4 h-4" />
          </template>
          {{ $t('media.removeFromLiked') }}
        </Button>
        <Button
          v-else-if="statusInfo.isSeen && !statusInfo.isLiked"
          type="button"
          variant="ghost"
          size="small"
          custom-class="justify-start w-full text-left"
          @click.stop.prevent="handleAction(TITLE_STATUS.SEEN)"
        >
          <template #icon>
            <IconX icon-class="w-4 h-4" />
          </template>
          {{ $t('media.removeFromSeen') }}
        </Button>
        <Button
          v-else-if="statusInfo.isNotInterested"
          type="button"
          variant="ghost"
          size="small"
          custom-class="justify-start w-full text-left"
          @click.stop.prevent="handleAction(TITLE_STATUS.NOT_INTERESTED)"
        >
          <template #icon>
            <IconX icon-class="w-4 h-4" />
          </template>
          {{ $t('media.removeFromNotInterested') }}
        </Button>
        <Button
          v-else-if="statusInfo.isFollowing"
          type="button"
          variant="ghost"
          size="small"
          custom-class="justify-start w-full text-left"
          @click.stop.prevent="handleAction(TITLE_ACTION_CONST.UNFOLLOW)"
        >
          <template #icon>
            <IconX icon-class="w-4 h-4" />
          </template>
          {{ $t('following.unfollow') }}
        </Button>
        <Button
          v-else-if="statusInfo.isInWatchlist"
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
            @click.stop.prevent="handleAction(TITLE_ACTION_CONST.LIKED)"
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
            custom-class="justify-start mb-2 w-full text-left"
            @click.stop.prevent="handleAction(TITLE_STATUS.WATCHLIST)"
          >
            <template #icon>
              <IconClock icon-class="w-4 h-4" />
            </template>
            {{ $t('media.watchLater') }}
          </Button>
          <!-- Follow option for TV series (hide if fully seen) -->
          <Button
            v-if="statusInfo.type === MEDIA_TYPE_CONST.TV && !statusInfo.isFullySeen"
            type="button"
            variant="ghost"
            size="small"
            custom-class="justify-start w-full text-left"
            @click.stop.prevent="handleAction(TITLE_ACTION_CONST.FOLLOW)"
          >
            <template #icon>
              <IconStar icon-class="w-4 h-4" />
            </template>
            {{ $t('following.follow') }}
          </Button>
        </template>
      </div>
    </ActionMenu>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import {
  TITLE_STATUS,
  type TitleStatusType,
} from '@/constants/domain/titleStatus';
import { TITLE_ACTION, type TitleActionType } from '@/constants/domain/titleActions';
import { MEDIA_TYPE } from '@/constants/domain/mediaType';
import type { TitleStatusInfo } from '@/composables/useTitleMenuActions';
import IconMoreVertical from '@/components/icons/IconMoreVertical.vue';
import IconClock from '@/components/icons/IconClock.vue';
import IconCheck from '@/components/icons/IconCheck.vue';
import IconHeart from '@/components/icons/IconHeart.vue';
import IconX from '@/components/icons/IconX.vue';
import IconStar from '@/components/icons/IconStar.vue';
import IconButton from '@/components/ui/IconButton.vue';
import Button from '@/components/ui/Button.vue';
import ActionMenu from '@/components/ui/ActionMenu.vue';

interface Props {
  statusInfo: TitleStatusInfo;
  ariaLabel: string;
}

defineProps<Props>();

const emit = defineEmits<{
  'mark-seen': [];
  'mark-not-interested': [];
  'mark-liked': [];
  'remove-liked': [];
  'mark-watchlist': [];
  'follow': [];
  'unfollow': [];
  'menu-open': [];
  'menu-close': [];
}>();

// Re-export action constants for template use
const TITLE_ACTION_CONST = TITLE_ACTION;
const MEDIA_TYPE_CONST = MEDIA_TYPE;

const dropdownRef = ref<InstanceType<typeof ActionMenu> | null>(null);
const isMenuOpen = ref(false);

const handleMenuOpen = () => {
  isMenuOpen.value = true;
  emit('menu-open');
};

const handleMenuClose = () => {
  isMenuOpen.value = false;
  emit('menu-close');
};

const handleAction = (
  action: TitleStatusType | TitleActionType
) => {
  // Close dropdown when action is triggered
  dropdownRef.value?.close();

  if (action === TITLE_STATUS.SEEN) {
    emit('mark-seen');
  } else if (action === TITLE_ACTION.LIKED) {
    emit('mark-liked');
  } else if (action === TITLE_ACTION.REMOVE_LIKED) {
    emit('remove-liked');
  } else if (action === TITLE_STATUS.NOT_INTERESTED) {
    emit('mark-not-interested');
  } else if (action === TITLE_STATUS.WATCHLIST) {
    emit('mark-watchlist');
  } else if (action === TITLE_ACTION.FOLLOW) {
    emit('follow');
  } else if (action === TITLE_ACTION.UNFOLLOW) {
    emit('unfollow');
  }
};
</script>
