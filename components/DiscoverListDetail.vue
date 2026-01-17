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
    <div v-if="list.title">
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
    <Modal
      :is-open="showAuthForm"
      custom-class="max-w-md p-0"
      @close="showAuthForm = false"
    >
      <AuthForm in-modal @success="showAuthForm = false" @signup="() => {}" />
    </Modal>

    <!-- View Mode Selector -->
    <div
      v-if="(items && items.length > 0) || isLoading"
      class="flex justify-end"
    >
      <ViewModeSelector :page-key="`discover-${list.slug}`" />
    </div>

    <!-- Loading skeletons -->
    <div v-if="isLoading" class="space-y-4">
      <!-- Mosaic view skeletons -->
      <div
        v-if="viewMode === VIEW_MODE.MOSAIC"
        class="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6"
      >
        <SkeletonMediaCard
          v-for="i in 8"
          :key="`skeleton-discover-${i}`"
          :show-rating="i % 3 !== 0"
        />
      </div>
      <!-- List view skeletons -->
      <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <SkeletonListItem
          v-for="i in 8"
          :key="`skeleton-discover-list-${i}`"
          :show-rating="i % 3 !== 0"
        />
      </div>
    </div>

    <!-- Titles Grid/List -->
    <template v-else-if="items && items.length > 0">
      <!-- Mosaic view -->
      <div
        v-if="viewMode === VIEW_MODE.MOSAIC"
        class="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6"
      >
        <TitleCardMosaic
          v-for="item in items"
          :key="item.id"
          :title="item.title || ''"
          :poster-path="item.poster_path"
          :link-to="
            routeWithLang(
              `/${item.type === MEDIA_TYPE.MOVIE ? 'movie' : 'tv-show'}/${item.tmdb_id}`
            )
          "
          :link-aria-label="$t('media.viewDetailsOf', { title: item.title })"
          :image-alt="$t('media.posterOf', { title: item.title })"
          :no-image-aria-label="
            $t('media.noPosterAvailableFor', { title: item.title })
          "
          :type="item.type"
          :tmdb-id="item.tmdb_id"
          :vote-average="item.vote_average || null"
          :overview="item.overview || null"
          :tagline="item.tagline || null"
          :providers="item.providers"
          :tag="item.tag || null"
          :is-discover-list="true"
          :aria-label="$t('media.titleCardLabel', { title: item.title })"
        >
          <!-- Actions for logged users only -->
          <template v-if="isLoggedIn" #actions>
            <DiscoverListItemActions
              :item="item"
              :title-status="getItemStatus(item.tmdb_id)"
              @action="handleAction"
            />
          </template>
        </TitleCardMosaic>
      </div>
      <!-- List view -->
      <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <TitleListItem
          v-for="item in items"
          :key="item.id"
          :title="item.title || ''"
          :poster-path="item.poster_path"
          :tagline="item.tagline || null"
          :tag="item.tag || null"
          :overview="item.overview || null"
          :vote-average="item.vote_average || null"
          :type="item.type"
          :tmdb-id="item.tmdb_id"
          :providers="item.providers"
          :hide-type-badge="true"
        >
          <!-- Actions for logged users only -->
          <template v-if="isLoggedIn" #actions>
            <DiscoverListItemActions
              :item="item"
              :title-status="getItemStatus(item.tmdb_id)"
              @action="handleAction"
            />
          </template>
        </TitleListItem>
      </div>
    </template>

    <!-- Empty State -->
    <EmptyState
      v-else-if="!isLoading"
      :message="$t('discover.emptyList')"
      icon="default"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { MEDIA_TYPE } from '@/constants/domain/mediaType';
import { TITLE_STATUS } from '@/constants/domain/titleStatus';
import type {
  DiscoverList,
  DiscoverListItem,
} from '@/composables/database/discoverLists';
import TitleCardMosaic from './TitleCardMosaic.vue';
import TitleListItem from './TitleListItem.vue';
import SeedListButton from './SeedListButton.vue';
import DiscoverListItemActions from './DiscoverListItemActions.vue';
import ViewModeSelector from './ViewModeSelector.vue';
import SkeletonMediaCard from './SkeletonMediaCard.vue';
import SkeletonListItem from './SkeletonListItem.vue';
import Button from './ui/Button.vue';
import Modal from './ui/Modal.vue';
import AuthForm from './AuthForm.vue';
import IconArrowLeft from './icons/IconArrowLeft.vue';
import EmptyState from './EmptyState.vue';
import { getSession } from '@/services/auth';
import { getUserLikedTitle, getTitleStatus } from '@/services/userTitleStatus';
import { useTitleStatusAction } from '@/composables/useTitleStatusAction';
import { useRouteWithLang } from '@/composables/useRouteWithLang';
import { useViewMode } from '@/composables/useViewMode';
import { VIEW_MODE } from '@/constants/domain/viewMode';
import { useSupabaseUser } from '#imports';
import { useLogger } from '@/composables/useLogger';

const router = useRouter();
const { routeWithLang } = useRouteWithLang();

interface Props {
  list: DiscoverList;
  items: DiscoverListItem[] | null;
  isLoading?: boolean;
}

const props = defineProps<Props>();

// View mode for discover list
const { viewMode } = useViewMode(`discover-${props.list.slug}`);

const user = useSupabaseUser();
const isLoggedIn = computed(() => !!user.value);
const { executeAction, executeLikedAction } = useTitleStatusAction();
const loadingTitles = ref<Set<number>>(new Set());
const titleStatuses = ref<
  Map<number, { liked: boolean; status: string | null }>
>(new Map());
const showAuthForm = ref(false);

// Handle back navigation
const handleBack = () => {
  router.push(routeWithLang('/discover'));
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
        const { data: titleStatus } = await getTitleStatus(
          userId,
          item.tmdb_id
        );
        const { data: likedTitle } = await getUserLikedTitle(
          userId,
          item.tmdb_id
        );

        return {
          tmdbId: item.tmdb_id,
          status: titleStatus?.status || null,
          liked: !!likedTitle,
        };
      } catch (error) {
        const { logError } = useLogger();
        logError('[DiscoverListDetail] Error loading status', error as Error, {
          tmdbId: item.tmdb_id,
        });
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
    const { logError } = useLogger();
    logError(
      '[DiscoverListDetail] Error loading title statuses',
      error as Error
    );
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

async function handleAction(item: DiscoverListItem, action: string) {
  if (!item.title || !item.tmdb_id) return;
  if (loadingTitles.value.has(item.tmdb_id)) return;

  loadingTitles.value.add(item.tmdb_id);

  try {
    const itemStatus = getItemStatus(item.tmdb_id);
    const currentStatus = itemStatus.isSeen
      ? TITLE_STATUS.SEEN
      : itemStatus.isNotInterested
        ? TITLE_STATUS.NOT_INTERESTED
        : itemStatus.isInWatchlist
          ? TITLE_STATUS.WATCHLIST
          : null;

    // Handle remove actions (these are explicit remove actions from menu)
    if (action === 'remove-liked') {
      // Remove liked but keep seen status (as per APP_LOGIC.md: Scenario 4)
      // Title remains as 'seen' (not eligible for recommendations)
      const result = await executeLikedAction(
        {
          tmdb_id: item.tmdb_id,
          type: item.type,
          title: item.title,
          currentStatus,
          isLiked: itemStatus.isLiked,
          onUndoComplete: async () => {
            // Refresh statuses after undo
            await loadTitleStatuses();
          },
        },
        itemStatus.isLiked
      );

      if (result.success) {
        await loadTitleStatuses();
      }
    } else if (action === 'remove-watchlist') {
      // Remove watchlist - use executeAction with current status
      const result = await executeAction(
        {
          tmdb_id: item.tmdb_id,
          type: item.type,
          title: item.title,
          currentStatus: TITLE_STATUS.WATCHLIST,
          isLiked: itemStatus.isLiked,
          onUndoComplete: async () => {
            // Refresh statuses after undo
            await loadTitleStatuses();
          },
        },
        TITLE_STATUS.WATCHLIST
      );

      if (result.success) {
        await loadTitleStatuses();
      }
    } else if (action === 'liked') {
      // Check if title is already liked
      const userId = user.value?.id || (user.value as { sub?: string })?.sub;
      if (userId) {
        const { data: likedTitle } = await getUserLikedTitle(
          userId,
          item.tmdb_id
        );

        // Execute liked action using unified composable
        const result = await executeLikedAction(
          {
            tmdb_id: item.tmdb_id,
            type: item.type,
            title: item.title,
            currentStatus,
            isLiked: !!likedTitle,
            onUndoComplete: async () => {
              // Refresh statuses after undo
              await loadTitleStatuses();
            },
          },
          !!likedTitle
        );

        if (result.success) {
          await loadTitleStatuses();
        }
      }
    } else if (
      action === TITLE_STATUS.SEEN ||
      action === TITLE_STATUS.NOT_INTERESTED ||
      action === TITLE_STATUS.WATCHLIST
    ) {
      // Execute status action using unified composable
      const result = await executeAction(
        {
          tmdb_id: item.tmdb_id,
          type: item.type,
          title: item.title,
          currentStatus,
          isLiked: itemStatus.isLiked,
          onUndoComplete: async () => {
            // Refresh statuses after undo
            await loadTitleStatuses();
          },
        },
        action
      );

      if (result.success) {
        await loadTitleStatuses();
      }
    }
  } catch (error) {
    const { logError } = useLogger();
    logError('[DiscoverListDetail] Error handling action', error as Error, {
      tmdbId: item.tmdb_id,
      action: actionType,
    });
  } finally {
    loadingTitles.value.delete(item.tmdb_id);
    // Reload statuses after action
    await loadTitleStatuses();
  }
}
</script>
