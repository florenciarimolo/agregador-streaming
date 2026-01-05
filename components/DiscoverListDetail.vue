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
        {{ $t('discover.loginCta') }}
      </p>
      <Button variant="primary" @click="showAuthForm = true">
        {{ $t('auth.login') }}
      </Button>
    </div>

    <!-- Auth Form Modal -->
    <Modal :is-open="showAuthForm" custom-class="max-w-md p-0" @close="showAuthForm = false">
      <AuthForm
        in-modal
        @success="showAuthForm = false"
        @signup="showAuthForm = false"
      />
    </Modal>

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
        :is-liked="titleStatuses.get(item.tmdb_id)?.liked || false"
        :is-seen="titleStatuses.get(item.tmdb_id)?.status === TITLE_STATUS.SEEN || false"
        :is-not-interested="titleStatuses.get(item.tmdb_id)?.status === TITLE_STATUS.NOT_INTERESTED || false"
        :is-in-watchlist="titleStatuses.get(item.tmdb_id)?.status === TITLE_STATUS.WATCHLIST || false"
      >
        <!-- Actions for logged users only -->
        <template v-if="isLoggedIn" #top-right-actions>
          <DiscoverListItemActions
            :item="item"
            :title-status="getItemStatus(item.tmdb_id)"
            @action="handleAction"
          />
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
import { computed, ref, watch } from 'vue';
import { useSupabaseUser } from '#imports';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import { MEDIA_TYPE } from '@/constants/domain/mediaType';
import { TITLE_STATUS } from '@/constants/domain/titleStatus';
import type { DiscoverList, DiscoverListItem } from '@/composables/database/discoverLists';
import TitleCard from './TitleCard.vue';
import SeedListButton from './SeedListButton.vue';
import DiscoverListItemActions from './DiscoverListItemActions.vue';
import Button from './ui/Button.vue';
import Modal from './ui/Modal.vue';
import AuthForm from './AuthForm.vue';
import IconArrowLeft from './icons/IconArrowLeft.vue';
import EmptyState from './EmptyState.vue';
import { getSession } from '@/services/auth';
import { getUserLikedTitle, getTitleStatus } from '@/services/userTitleStatus';
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
const titleStatuses = ref<Map<number, { liked: boolean; status: string | null }>>(new Map());
const showAuthForm = ref(false);

// Handle back navigation
const handleBack = () => {
  router.push('/discover');
};

// Load title statuses for all items
const loadTitleStatuses = async () => {
  if (!isLoggedIn.value || !props.items || props.items.length === 0) {
    return;
  }

  try {
    const {
      data: { session },
    } = await getSession();

    if (!session?.access_token) {
      return;
    }

    const userId = user.value?.id || (user.value as { sub?: string })?.sub;
    if (!userId) {
      return;
    }

    // Load statuses for all items in parallel
    const statusPromises = props.items.map(async (item) => {
      if (!item.tmdb_id) return null;

      try {
        const { data: titleStatus } = await getTitleStatus(userId, item.tmdb_id);
        const { data: likedTitle } = await getUserLikedTitle(userId, item.tmdb_id);

        return {
          tmdbId: item.tmdb_id,
          status: titleStatus?.status || null,
          liked: !!likedTitle,
        };
      } catch (error) {
        console.error(`[DiscoverListDetail] Error loading status for ${item.tmdb_id}:`, error);
        return null;
      }
    });

    const results = await Promise.all(statusPromises);
    results.forEach((result) => {
      if (result) {
        titleStatuses.value.set(result.tmdbId, {
          status: result.status,
          liked: result.liked,
        });
      }
    });
  } catch (error) {
    console.error('[DiscoverListDetail] Error loading title statuses:', error);
  }
};

// Watch for items changes and load statuses
watch(
  () => props.items,
  async () => {
    if (props.items && props.items.length > 0) {
      await loadTitleStatuses();
    }
  },
  { immediate: true }
);

// Watch for user login status
watch(isLoggedIn, async (newValue) => {
  if (newValue && props.items && props.items.length > 0) {
    await loadTitleStatuses();
  } else {
    titleStatuses.value.clear();
  }
});

// Get item status for menu actions
function getItemStatus(tmdbId: number) {
  const status = titleStatuses.value.get(tmdbId);
  if (!status) {
    return {
      isLiked: false,
      isSeen: false,
      isNotInterested: false,
      isInWatchlist: false,
    };
  }

  return {
    isLiked: status.liked || false,
    isSeen: status.status === TITLE_STATUS.SEEN || false,
    isNotInterested: status.status === TITLE_STATUS.NOT_INTERESTED || false,
    isInWatchlist: status.status === TITLE_STATUS.WATCHLIST || false,
  };
}

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

    const itemStatus = getItemStatus(item.tmdb_id);

    // Handle remove actions
    if (action === 'remove-liked') {
      // Remove liked (delete the title status)
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
    } else if (action === 'remove-watchlist') {
      // Remove watchlist
      await $fetch('/api/users/title-status', {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        query: {
          tmdb_id: item.tmdb_id,
        },
      });

      showToast(t('home.titleRemovedFromWatchlist', { title: item.title }));
    } else if (action === 'liked') {
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
    } else if (action === TITLE_STATUS.SEEN) {
      // Check if already seen - if so, remove it (toggle behavior)
      if (itemStatus.isSeen) {
        // Remove seen status (DELETE)
        await $fetch('/api/users/title-status', {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
          query: {
            tmdb_id: item.tmdb_id,
          },
        });

        showToast(t('home.titleRemovedFromSeen', { title: item.title }));
      } else {
        // Mark as seen
        await $fetch('/api/users/title-status', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
          body: {
            tmdb_id: item.tmdb_id,
            type: item.type,
            status: TITLE_STATUS.SEEN,
            liked: false,
          },
        });

        showToast(t('home.titleMarkedSeen', { title: item.title }));
      }
    } else if (action === TITLE_STATUS.NOT_INTERESTED) {
      // Check if already not interested - if so, remove it (toggle behavior)
      if (itemStatus.isNotInterested) {
        // Remove not interested status (DELETE)
        await $fetch('/api/users/title-status', {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
          query: {
            tmdb_id: item.tmdb_id,
          },
        });

        showToast(t('home.titleRemovedFromNotInterested', { title: item.title }));
      } else {
        // Mark as not interested
        await $fetch('/api/users/title-status', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
          body: {
            tmdb_id: item.tmdb_id,
            type: item.type,
            status: TITLE_STATUS.NOT_INTERESTED,
            liked: false,
          },
        });

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
      }
    } else if (action === TITLE_STATUS.WATCHLIST) {
      // Check if already in watchlist - if so, remove it (toggle behavior)
      if (itemStatus.isInWatchlist) {
        // Remove watchlist status (DELETE)
        await $fetch('/api/users/title-status', {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
          query: {
            tmdb_id: item.tmdb_id,
          },
        });

        showToast(t('home.titleRemovedWatchlist', { title: item.title }));
      } else {
        // Add to watchlist
        await $fetch('/api/users/title-status', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
          body: {
            tmdb_id: item.tmdb_id,
            type: item.type,
            status: TITLE_STATUS.WATCHLIST,
            liked: false,
          },
        });

        showToast(t('home.titleAddedWatchlist', { title: item.title }));
      }
    }
  } catch (error) {
    console.error('[DiscoverListDetail] Error handling action:', error);
    showToast(t('common.error'), null, 5000);
  } finally {
    loadingTitles.value.delete(item.tmdb_id);
    // Reload statuses after action
    await loadTitleStatuses();
  }
}
</script>

