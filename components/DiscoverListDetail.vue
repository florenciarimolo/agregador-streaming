<template>
  <div class="space-y-6">
    <!-- Back Link -->
    <button
      class="inline-flex gap-2 items-center mb-4 text-sm font-medium text-gray-700 transition-colors dark:text-gray-300 hover:dark:text-white hover:text-gray-900"
      @click="handleBack"
    >
      <IconArrowLeft icon-class="w-4 h-4" />
      {{ $t('media.back') }}
    </button>

    <!-- Header -->
    <div>
      <h1 class="text-3xl font-bold text-gray-800 dark:text-gray-300 mb-2">
        {{ list.title }}
      </h1>
      <p
        v-if="list.description"
        class="text-base text-gray-600 dark:text-gray-400"
      >
        {{ list.description }}
      </p>
    </div>

    <!-- Seed Button (only for logged users) -->
    <div v-if="isLoggedIn">
      <SeedListButton :list-slug="list.slug" />
    </div>

    <!-- CTA for non-logged users -->
    <div
      v-else
      class="p-4 rounded-2xl border backdrop-blur-xl dark:bg-gray-900/40 bg-gray-100/80 border-gray-300/50 dark:border-white/10"
    >
      <p class="text-sm text-gray-700 dark:text-gray-300 mb-3">
        {{ $t('discover.registerCta') }}
      </p>
      <Button variant="primary" @click="$router.push('/auth/login')">
        {{ $t('discover.registerButton') }}
      </Button>
    </div>

    <!-- Titles Grid -->
    <div
      v-if="items && items.length > 0"
      class="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6"
    >
      <TitleCard
        v-for="item in items"
        :key="item.id"
        :title="item.title || ''"
        :poster-path="item.poster_path"
        :link-to="`/${item.type === MEDIA_TYPE.MOVIE ? 'movie' : 'tv-show'}/${item.tmdb_id}`"
        :link-aria-label="$t('media.viewDetailsOf', { title: item.title })"
        :image-alt="$t('media.posterOf', { title: item.title })"
        :no-image-aria-label="$t('media.noPosterAvailableFor', { title: item.title })"
        :type="item.type"
        :aria-label="$t('media.titleCardLabel', { title: item.title })"
      >
        <!-- Actions for logged users only -->
        <template v-if="isLoggedIn" #top-right-actions>
          <div class="overflow-visible">
            <ActionMenu width="w-48" position="right">
              <template #trigger>
                <IconButton
                  :icon="IconMoreVertical"
                  :aria-label="$t('media.actionsMenuFor', { title: item.title })"
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
                  @click.stop.prevent="handleAction(item, TITLE_STATUS.SEEN)"
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
                  @click.stop.prevent="handleAction(item, 'liked')"
                >
                  <template #icon>
                    <IconHeart icon-class="w-4 h-4" />
                  </template>
                  {{ $t('media.like') }}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="small"
                  custom-class="justify-start mb-2 w-full text-left"
                  @click.stop.prevent="handleAction(item, TITLE_STATUS.WATCHLIST)"
                >
                  <template #icon>
                    <IconClock icon-class="w-4 h-4" />
                  </template>
                  {{ $t('media.addToWatchlist') }}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="small"
                  custom-class="justify-start w-full text-left"
                  @click.stop.prevent="handleAction(item, TITLE_STATUS.NOT_INTERESTED)"
                >
                  <template #icon>
                    <IconX icon-class="w-4 h-4" />
                  </template>
                  {{ $t('media.notInterested') }}
                </Button>
              </div>
            </ActionMenu>
          </div>
        </template>
      </TitleCard>
    </div>

    <!-- Empty State -->
    <EmptyState
      v-else-if="!isLoading"
      :message="$t('discover.emptyList')"
      icon="image"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useSupabaseUser } from '#imports';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import { MEDIA_TYPE } from '@/constants/domain/mediaType';
import { TITLE_STATUS } from '@/constants/domain/titleStatus';
import type { DiscoverList, DiscoverListItem } from '@/composables/database/discoverLists';
import TitleCard from './TitleCard.vue';
import SeedListButton from './SeedListButton.vue';
import Button from './ui/Button.vue';
import IconButton from './ui/IconButton.vue';
import ActionMenu from './ui/ActionMenu.vue';
import IconMoreVertical from './icons/IconMoreVertical.vue';
import IconCheck from './icons/IconCheck.vue';
import IconHeart from './icons/IconHeart.vue';
import IconClock from './icons/IconClock.vue';
import IconX from './icons/IconX.vue';
import IconArrowLeft from './icons/IconArrowLeft.vue';
import EmptyState from './EmptyState.vue';
import { getSession } from '@/services/auth';
import { getUserLikedTitle } from '@/services/userTitleStatus';
import { useUndoToast } from '@/composables/useUndoToast';

const { t } = useI18n();
const router = useRouter();

interface Props {
  list: DiscoverList;
  items: DiscoverListItem[] | null;
  isLoading?: boolean;
}

const props = defineProps<Props>();

const user = useSupabaseUser();
const isLoggedIn = computed(() => !!user.value);
const { showToast } = useUndoToast();
const loadingTitles = ref<Set<number>>(new Set());

// Handle back navigation
const handleBack = () => {
  router.push('/discover');
};

async function handleAction(
  item: DiscoverListItem,
  action: string
) {
  if (!item.title || !item.tmdb_id) return;
  if (loadingTitles.value.has(item.tmdb_id)) return;

  loadingTitles.value.add(item.tmdb_id);

  try {
    const {
      data: { session },
    } = await getSession();

    if (!session?.access_token) {
      return;
    }

    if (action === 'liked') {
      // Check if title is already liked
      const userId = user.value?.id || (user.value as { sub?: string })?.sub;
      if (userId) {
        const { data: likedTitle } = await getUserLikedTitle(
          userId,
          item.tmdb_id
        );

        if (likedTitle) {
          // Title is already liked, remove it
          await $fetch('/api/users/title-status', {
            method: 'DELETE',
            headers: {
              Authorization: `Bearer ${session.access_token}`,
            },
            query: {
              tmdb_id: item.tmdb_id,
            },
          });

          showToast(t('home.titleRemovedFavorites', { title: item.title }));
        } else {
          // Title is not liked, add it
          await $fetch('/api/users/title-status', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${session.access_token}`,
            },
            body: {
              tmdb_id: item.tmdb_id,
              type: item.type,
              status: TITLE_STATUS.SEEN,
              liked: true,
            },
          });

          showToast(t('home.titleAddedFavorites', { title: item.title }), {
            label: t('home.viewFavorites'),
            action: async () => {
              await navigateTo('/lists');
            },
          }, 5000);
        }
      }
    } else {
      // Handle other statuses (seen, watchlist, not_interested)
      await $fetch('/api/users/title-status', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: {
          tmdb_id: item.tmdb_id,
          type: item.type,
          status: action as any,
          liked: false,
        },
      });

      if (action === TITLE_STATUS.NOT_INTERESTED) {
        showToast(
          t('home.titleMarkedNotInterested', { title: item.title }),
          {
            label: t('undo.undo'),
            variant: 'secondary',
            action: async () => {
              await $fetch('/api/users/title-status', {
                method: 'DELETE',
                headers: {
                  Authorization: `Bearer ${session.access_token}`,
                },
                query: {
                  tmdb_id: item.tmdb_id,
                },
              });
            },
          },
          5000
        );
      } else if (action === TITLE_STATUS.SEEN) {
        showToast(t('home.titleMarkedSeen', { title: item.title }));
      } else if (action === TITLE_STATUS.WATCHLIST) {
        showToast(t('home.titleAddedWatchlist', { title: item.title }));
      }
    }
  } catch (error) {
    console.error('[DiscoverListDetail] Error handling action:', error);
    showToast(t('common.error'), null, 5000);
  } finally {
    loadingTitles.value.delete(item.tmdb_id);
  }
}
</script>

