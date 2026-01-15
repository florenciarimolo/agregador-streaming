<template>
  <AppShell>
    <PageContainer>
      <div class="w-full pt-6 pb-6">
        <div class="mb-8 flex items-start justify-between gap-4">
          <div>
            <h2
              class="mb-2 text-h2 font-bold text-gray-800 dark:text-gray-300 font-heading"
            >
              {{ $t('watchlist.title') }}
            </h2>
            <p class="text-gray-800 dark:text-gray-300">
              {{ $t('watchlist.description') }}
            </p>
          </div>
          <ViewModeSelector
            v-if="watchlistTitles.length > 0"
            page-key="watchlist"
          />
        </div>

        <!-- Show loading while checking profile -->
        <div
          v-if="!isProfileReady"
          class="flex items-center justify-center py-12"
        >
          <div
            class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"
          ></div>
        </div>

        <div v-else>
          <!-- Toast component for notifications -->
          <Toast />

          <!-- Loading State -->
          <!-- Loading skeletons -->
          <div v-if="isLoading" class="space-y-4">
            <!-- Mosaic view skeletons -->
            <div
              v-if="viewMode === VIEW_MODE.MOSAIC"
              class="watchlist-grid grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6"
            >
              <SkeletonMediaCard
                v-for="i in 8"
                :key="`skeleton-watchlist-${i}`"
                :show-rating="i % 3 !== 0"
              />
            </div>
            <!-- List view skeletons -->
            <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <SkeletonListItem
                v-for="i in 8"
                :key="`skeleton-watchlist-list-${i}`"
                :show-rating="i % 3 !== 0"
              />
            </div>
          </div>

          <!-- Content -->
          <div v-else>
            <EmptyState
              v-if="watchlistTitles.length === 0"
              :message="$t('watchlist.empty')"
              icon="bookmark"
              :cta-text="$t('watchlist.emptyCta')"
              :cta-action="goToRecommendations"
            />

            <!-- Mosaic view -->
            <div
              v-if="viewMode === VIEW_MODE.MOSAIC"
              class="watchlist-grid grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6"
            >
              <TitleCardMosaic
                v-for="title in watchlistTitles"
                :key="`watchlist-${title.tmdb_id}`"
                :title="title.title"
                :poster-path="title.poster_path"
                :link-to="getTitleLink(title.type, title.tmdb_id)"
                :link-aria-label="
                  $t('media.viewDetailsOf', { title: title.title })
                "
                :image-alt="title.title"
                :no-image-aria-label="
                  $t('media.noPosterAvailableFor', { title: title.title })
                "
                :type="title.type"
                :tmdb-id="title.tmdb_id"
                :vote-average="title.vote_average"
                :overview="title.overview"
                :tagline="title.tagline"
                :providers="title.providers"
                :aria-label="$t('media.titleCardLabel', { title: title.title })"
              >
                <!-- Top-right: Remove Button -->
                <template #actions>
                  <Tooltip :text="$t('watchlist.removeTooltip')">
                    <IconButton
                      :aria-label="
                        $t('watchlist.removeTitle', { title: title.title })
                      "
                      size="small"
                      variant="default"
                      custom-class="p-2 rounded-full backdrop-blur-sm pointer-events-auto w-fit h-fit bg-black/50 hover:bg-red-600/80"
                      @click.stop.prevent="handleRemoveTitle(title)"
                    >
                      <IconX icon-class="w-4 h-4 text-white" />
                    </IconButton>
                  </Tooltip>
                </template>
              </TitleCardMosaic>
            </div>
            <!-- List view -->
            <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <TitleListItem
                v-for="title in watchlistTitles"
                :key="`watchlist-list-${title.tmdb_id}`"
                :title="title.title"
                :poster-path="title.poster_path"
                :tagline="title.tagline"
                :overview="title.overview"
                :vote-average="title.vote_average"
                :type="title.type"
                :tmdb-id="title.tmdb_id"
                :providers="title.providers"
              >
                <template #actions>
                  <Tooltip :text="$t('watchlist.removeTooltip')">
                    <IconButton
                      :aria-label="
                        $t('watchlist.removeTitle', { title: title.title })
                      "
                      size="small"
                      variant="default"
                      custom-class="p-2 rounded-full backdrop-blur-sm pointer-events-auto w-fit h-fit bg-black/50 hover:bg-red-600/80"
                      @click.stop.prevent="handleRemoveTitle(title)"
                    >
                      <IconX icon-class="w-4 h-4 text-white" />
                    </IconButton>
                  </Tooltip>
                </template>
              </TitleListItem>
            </div>
          </div>
        </div>
      </div>
    </PageContainer>
  </AppShell>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { MEDIA_TYPE } from '@/constants/domain/mediaType';
import { getSession } from '@/services/auth';
import { useRouteWithLang } from '@/composables/useRouteWithLang';
import { useTitleStatusAction } from '@/composables/useTitleStatusAction';
import { useUndoToast } from '@/composables/useUndoToast';
import { TITLE_STATUS } from '@/constants/domain/titleStatus';
import Toast from '@/components/ui/Toast.vue';
import IconButton from '@/components/ui/IconButton.vue';
import AppShell from '@/components/layout/AppShell.vue';
import PageContainer from '@/components/layout/PageContainer.vue';
import TitleCardMosaic from '@/components/TitleCardMosaic.vue';
import IconX from '@/components/icons/IconX.vue';
import Tooltip from '@/components/ui/Tooltip.vue';
import EmptyState from '@/components/EmptyState.vue';
import ViewModeSelector from '@/components/ViewModeSelector.vue';
import TitleListItem from '@/components/TitleListItem.vue';
import SkeletonMediaCard from '@/components/SkeletonMediaCard.vue';
import SkeletonListItem from '@/components/SkeletonListItem.vue';
import { useViewMode } from '@/composables/useViewMode';
import { VIEW_MODE } from '@/constants/domain/viewMode';

const { t, locale } = useI18n();

// SEO: Private page - noindex, nofollow
useHead({
  title: t('watchlist.title'),
  meta: [
    {
      name: 'robots',
      content: 'noindex, nofollow',
    },
  ],
});

useSeoMeta({
  title: t('watchlist.title'),
  description: t('watchlist.description'),
  robots: 'noindex, nofollow',
});

type WatchlistTitle = {
  tmdb_id: number;
  title: string;
  type: typeof MEDIA_TYPE.MOVIE | typeof MEDIA_TYPE.TV;
  poster_path: string | null;
  overview?: string | null;
  tagline?: string | null;
  vote_average?: number | null;
  providers?: Array<{
    provider_id: number;
    provider_name: string;
    logo_path: string | null;
  }>;
  created_at: string;
};

type WatchlistResponseItem = {
  tmdb_id: number;
  title: string;
  type: typeof MEDIA_TYPE.MOVIE | typeof MEDIA_TYPE.TV;
  poster_path: string | null;
  overview?: string | null;
  tagline?: string | null;
  vote_average?: number | null;
  providers?: Array<{
    provider_id: number;
    provider_name: string;
    logo_path: string | null;
  }>;
  created_at: string;
};

const isLoading = ref(true);
const watchlistTitles = ref<WatchlistTitle[]>([]);
const isRemoving = ref(false);
const { executeAction } = useTitleStatusAction();
const { showToast } = useUndoToast();
const { routeWithLang } = useRouteWithLang();
// View mode for watchlist
const { viewMode } = useViewMode('watchlist');
// Profile ready flag - controls main render, separate from isLoading
const isProfileReady = ref(false);

const fetchWatchlist = async () => {
  try {
    isLoading.value = true;

    const {
      data: { session },
    } = await getSession();

    if (!session?.access_token) {
      isLoading.value = false;
      return;
    }

    const response = await $fetch<{ watchlist: WatchlistResponseItem[] }>(
      '/api/users/watchlist',
      {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      }
    );

    watchlistTitles.value = (response.watchlist || []).map((item) => {
      // Log providers for debugging
      if (import.meta.dev && item.providers && item.providers.length > 0) {
        console.log(
          `[watchlist.vue] Providers for ${item.title} (${item.tmdb_id}):`,
          item.providers
        );
      }
      return {
        tmdb_id: item.tmdb_id,
        title: item.title || t('watchlist.noTitle'),
        type: item.type,
        poster_path: item.poster_path,
        overview: item.overview || null,
        tagline: item.tagline || null,
        vote_average: item.vote_average || null,
        providers: item.providers || [],
        created_at: item.created_at,
      };
    });
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Error fetching watchlist:', error);
    }
    showToast(t('watchlist.errorLoading'), null, 5000);
  } finally {
    isLoading.value = false;
  }
};

// Helper function to generate link with language prefix
const getTitleLink = (
  type: typeof MEDIA_TYPE.MOVIE | typeof MEDIA_TYPE.TV,
  tmdbId: number
): string => {
  const mediaType = type === MEDIA_TYPE.MOVIE ? 'movie' : 'tv-show';
  return routeWithLang(`/${mediaType}/${tmdbId}`);
};

// Navigate to recommendations (home page)
const goToRecommendations = () => {
  navigateTo(routeWithLang('/'), { replace: false });
};

const handleRemoveTitle = async (title: WatchlistTitle) => {
  if (isRemoving.value) return;

  isRemoving.value = true;

  // Store original title for undo
  const titleToRestore = { ...title };

  try {
    // Use unified composable for API call and toast
    const result = await executeAction(
      {
        tmdb_id: title.tmdb_id,
        type: title.type,
        title: title.title,
        currentStatus: TITLE_STATUS.WATCHLIST,
        isLiked: false,
        onUndoComplete: async () => {
          // Restore title in UI after undo
          watchlistTitles.value.push(titleToRestore);
        },
      },
      TITLE_STATUS.WATCHLIST
    );

    if (result.success && result.action === 'removed') {
      // Optimistic UI update - remove from list
      watchlistTitles.value = watchlistTitles.value.filter(
        (t) => t.tmdb_id !== title.tmdb_id
      );
    } else if (!result.success) {
      // Error already handled by composable, just refresh
      await fetchWatchlist();
    }
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Error removing title:', error);
    }
    await fetchWatchlist();
  } finally {
    isRemoving.value = false;
  }
};

// Watch for locale changes and refresh watchlist
watch(
  () => locale.value,
  async (newLocale, oldLocale) => {
    if (newLocale && oldLocale && newLocale !== oldLocale) {
      if (import.meta.dev) {
        console.log('[watchlist.vue] Language changed, refreshing watchlist:', {
          oldLocale,
          newLocale,
        });
      }
      // Refresh watchlist with new language
      await fetchWatchlist();
    }
  },
  { immediate: false }
);

onMounted(async () => {
  // NOTE: Onboarding check is handled by auth middleware, not here
  // This prevents duplicate redirects and race conditions during F5/refresh
  // The middleware ensures profile is loaded and onboarding is checked before
  // the page component mounts
  
  // Profile is ready, show content
  isProfileReady.value = true;

  // Fetch watchlist
  await fetchWatchlist();
});
</script>

<style scoped>
/* Styles for watchlist page */
</style>

<style>
/* Global styles for tooltip z-index priority in watchlist page */
/* Ensure the card container has higher z-index when tooltip is hovered */
/* This matches the same pattern used in preferences page for tooltip priority */
.watchlist-grid article:has(.tooltip-container:hover) {
  z-index: 10002 !important;
  position: relative;
}

.watchlist-grid .tooltip-container:hover {
  z-index: 10001 !important;
  position: relative;
}
</style>
