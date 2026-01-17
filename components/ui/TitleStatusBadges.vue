<template>
  <div
    v-if="
      hasSession &&
      (isFollowing ||
        (isLiked && !isFollowing) ||
        ((isSeen && !isLiked) && !isFollowing) ||
        (isNotInterested && !isFollowing) ||
        (isInWatchlist && !isFollowing))
    "
    class="flex absolute top-2 right-12 gap-2 z-20"
  >
    <!-- Following badge - highest priority, hide all others when following -->
    <Tooltip
      v-if="isFollowing"
      :text="$t('following.following')"
    >
      <div
        class="flex justify-center items-center w-8 h-8 rounded-full backdrop-blur-sm bg-primary-600/90"
      >
        <IconStar icon-class="w-5 h-5 text-white" />
      </div>
    </Tooltip>
    <!-- Other badges - only show if not following -->
    <template v-else>
      <Tooltip v-if="isLiked" :text="$t('media.liked')">
        <div
          class="flex justify-center items-center w-8 h-8 rounded-full backdrop-blur-sm bg-primary-600/90"
        >
          <IconHeartFilled icon-class="w-5 h-5 text-white" />
        </div>
      </Tooltip>
      <Tooltip v-else-if="isSeen && !isLiked" :text="$t('media.seen')">
        <div
          class="flex justify-center items-center w-8 h-8 rounded-full backdrop-blur-sm bg-primary-600/90"
        >
          <IconCheck icon-class="w-5 h-5 text-white" />
        </div>
      </Tooltip>
      <Tooltip v-if="isNotInterested" :text="$t('media.notInterested')">
        <div
          class="flex justify-center items-center w-8 h-8 rounded-full backdrop-blur-sm bg-primary-600/90"
        >
          <IconX icon-class="w-5 h-5 text-white" />
        </div>
      </Tooltip>
      <Tooltip
        v-if="isInWatchlist && !isLiked && !isSeen && !isNotInterested"
        :text="$t('media.watchLater')"
      >
        <div
          class="flex justify-center items-center w-8 h-8 rounded-full backdrop-blur-sm bg-primary-600/90"
        >
          <IconClock icon-class="w-5 h-5 text-white" />
        </div>
      </Tooltip>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useSupabaseUser } from '#imports';
import IconHeartFilled from '@/components/icons/IconHeartFilled.vue';
import IconCheck from '@/components/icons/IconCheck.vue';
import IconX from '@/components/icons/IconX.vue';
import IconClock from '@/components/icons/IconClock.vue';
import IconStar from '@/components/icons/IconStar.vue';
import Tooltip from '@/components/ui/Tooltip.vue';

interface Props {
  isLiked?: boolean;
  isSeen?: boolean;
  isNotInterested?: boolean;
  isInWatchlist?: boolean;
  isFollowing?: boolean;
}

withDefaults(defineProps<Props>(), {
  isLiked: false,
  isSeen: false,
  isNotInterested: false,
  isInWatchlist: false,
  isFollowing: false,
});

const user = useSupabaseUser();
const hasSession = computed(() => !!user.value);
</script>
