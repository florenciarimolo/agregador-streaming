<template>
  <TitleCard
    :title="props.title.title"
    :poster-path="props.title.poster_path"
    :link-to="`/${mediaType}/${props.title.tmdb_id}`"
    :link-aria-label="$t('media.viewDetailsOf', { title: props.title.title })"
    :image-alt="$t('media.posterOf', { title: props.title.title })"
    :no-image-aria-label="
      $t('media.noPosterAvailableFor', { title: props.title.title })
    "
    :type="props.title.type"
    :show-content="true"
    :aria-label="$t('media.recommendationLabel', { title: props.title.title })"
  >
    <!-- Top-left: Rating Badge and Watchlist Badge -->
    <template #top-left-badges>
      <RatingBadge
        v-if="props.title.vote_average"
        :rating="props.title.vote_average"
      />
      <div
        v-if="props.title.in_watchlist"
        class="p-2 rounded-full backdrop-blur-sm bg-primary/80"
        :class="props.title.vote_average ? 'mt-2' : ''"
        :title="$t('media.savedWatchlist')"
      >
        <IconClock icon-class="w-4 h-4 text-white" />
      </div>
    </template>

    <!-- Top-right: Actions Menu -->
    <template #top-right-actions>
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
            <Button
              type="button"
              variant="ghost"
              size="small"
              custom-class="justify-start mb-2 w-full text-left"
              @click.stop.prevent="handleAction(TitleStatus.SEEN)"
            >
              <template #icon>
                <IconCheck icon-class="w-4 h-4" />
              </template>
              {{ $t('media.seen') }}
            </Button>
            <Button
              v-if="!props.title.liked"
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
              v-else
              type="button"
              variant="ghost"
              size="small"
              custom-class="justify-start mb-2 w-full text-left"
              @click.stop.prevent="handleAction('remove-liked')"
            >
              <template #icon>
                <IconHeart icon-class="w-4 h-4" />
              </template>
              {{ $t('media.removeFromLiked') }}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="small"
              custom-class="justify-start mb-2 w-full text-left"
              @click.stop.prevent="handleAction(TitleStatus.NOT_INTERESTED)"
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
              @click.stop.prevent="handleAction(TitleStatus.WATCHLIST)"
            >
              <template #icon>
                <IconClock icon-class="w-4 h-4" />
              </template>
              {{ $t('media.watchLater') }}
            </Button>
          </div>
        </ActionMenu>
      </div>
    </template>

    <!-- Content: Custom content with overview and providers -->
    <template #content>
      <!-- Overview -->
      <p
        v-if="props.title.overview"
        class="mb-3 text-xs text-gray-800 dark:text-gray-300 line-clamp-3"
      >
        {{ props.title.overview }}
      </p>
      <p v-else class="mb-3 text-xs italic text-gray-700 dark:text-gray-300">
        {{ $t('media.noDescriptionAvailable') }}
      </p>

      <!-- Providers (logos only, no names) -->
      <div
        v-if="props.title.providers && props.title.providers.length > 0"
        class="flex flex-wrap gap-2"
      >
        <img
          v-for="provider in providersWithLogos"
          :key="provider.provider_id"
          :src="`https://image.tmdb.org/t/p/w45${provider.logo_path}`"
          :alt="provider.provider_name"
          class="object-contain w-4 h-4 md:w-8 md:h-8 rounded"
          :title="provider.provider_name"
        />
      </div>
      <div v-else class="text-xs italic text-gray-700 dark:text-gray-300">
        {{ $t('media.noPlatforms') }}
      </div>
    </template>
  </TitleCard>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import RatingBadge from './RatingBadge.vue';
import IconMoreVertical from './icons/IconMoreVertical.vue';
import IconClock from './icons/IconClock.vue';
import IconCheck from './icons/IconCheck.vue';
import IconHeart from './icons/IconHeart.vue';
import IconX from './icons/IconX.vue';
import { TitleStatus } from '@/types/TitleStatus';
import { MediaTypeEnum } from '@/types/enums/MediaTypeEnum';
import type { Recommendation } from '@/types/Recommendation';
import IconButton from '@/components/ui/IconButton.vue';
import Button from '@/components/ui/Button.vue';
import ActionMenu from '@/components/ui/ActionMenu.vue';
import TitleCard from './TitleCard.vue';

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

const handleAction = (action: TitleStatus | 'liked' | 'remove-liked') => {
  // Close dropdown when action is triggered
  dropdownRef.value?.close();

  if (action === TitleStatus.SEEN) {
    emit('mark-seen', props.title);
  } else if (action === 'liked') {
    emit('mark-liked', props.title);
  } else if (action === 'remove-liked') {
    emit('remove-liked', props.title);
  } else if (action === TitleStatus.NOT_INTERESTED) {
    emit('mark-not-interested', props.title);
  } else if (action === TitleStatus.WATCHLIST) {
    emit('mark-watchlist', props.title);
  }
};

const mediaType = computed(() =>
  props.title.type === MediaTypeEnum.movie ? 'movie' : 'tv-show'
);

// Filter providers that have logos
const providersWithLogos = computed(() => {
  if (!props.title.providers) return [];
  return props.title.providers
    .filter((provider) => provider.logo_path)
    .slice(0, 6);
});
</script>
