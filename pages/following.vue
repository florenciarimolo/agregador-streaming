<template>
  <AppShell>
    <PageContainer>
      <div class="w-full pt-6 pb-6">
        <div class="mb-8 flex items-start justify-between gap-4">
          <div>
            <h2
              class="mb-2 text-h2 font-bold text-gray-800 dark:text-gray-300 font-heading"
            >
              {{ $t('following.title') }}
            </h2>
            <p class="text-gray-800 dark:text-gray-300">
              {{ $t('following.description') }}
            </p>
          </div>
          <div
            v-if="followingTitles.length > 0"
            class="flex items-center gap-2"
          >
            <SortSelector
              :current-sort="currentSort"
              page-key="following"
              @update:sort="setSort"
            />
            <ViewModeSelector page-key="following" />
          </div>
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
          <div v-if="isLoading" class="space-y-4">
            <!-- Mosaic view skeletons -->
            <div
              v-if="viewMode === VIEW_MODE.MOSAIC"
              class="following-grid grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6"
            >
              <SkeletonMediaCard
                v-for="i in 8"
                :key="`skeleton-following-${i}`"
                :show-rating="i % 3 !== 0"
              />
            </div>
            <!-- List view skeletons -->
            <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <SkeletonListItem
                v-for="i in 8"
                :key="`skeleton-following-list-${i}`"
                :show-rating="i % 3 !== 0"
              />
            </div>
          </div>

          <!-- Content -->
          <div v-else>
            <EmptyState
              v-if="followingTitles.length === 0"
              :message="$t('following.empty')"
              icon="star"
              :cta-text="$t('following.emptyCta')"
              :cta-action="goToRecommendations"
            />

            <!-- Mosaic view -->
            <div
              v-if="viewMode === VIEW_MODE.MOSAIC"
              class="following-grid grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6"
            >
              <TitleCardMosaic
                v-for="title in sortedTitles"
                :key="`following-${title.tmdb_id}`"
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
                <!-- Top-right: Unfollow Button -->
                <template #actions>
                  <Tooltip :text="$t('following.removeTooltip')">
                    <IconButton
                      :aria-label="
                        $t('following.removeTitle', { title: title.title })
                      "
                      size="small"
                      variant="default"
                      custom-class="p-2 rounded-full backdrop-blur-sm pointer-events-auto w-fit h-fit bg-black/50 hover:bg-red-600/80 relative z-50"
                      @click.stop.prevent="handleUnfollowTitle(title)"
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
                v-for="title in sortedTitles"
                :key="`following-list-${title.tmdb_id}`"
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
                  <Tooltip :text="$t('following.removeTooltip')">
                    <IconButton
                      :aria-label="
                        $t('following.removeTitle', { title: title.title })
                      "
                      size="small"
                      variant="default"
                      custom-class="p-2 rounded-full backdrop-blur-sm pointer-events-auto w-fit h-fit bg-black/50 hover:bg-red-600/80 relative z-50"
                      @click.stop.prevent="handleUnfollowTitle(title)"
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
import { ref, onMounted, watch, computed } from 'vue';
import { MEDIA_TYPE } from '@/constants/domain/mediaType';
import { getSession } from '@/services/auth';
import { useRouteWithLang } from '@/composables/useRouteWithLang';
import { useUndoToast } from '@/composables/useUndoToast';
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
import { useLogger } from '@/composables/useLogger';
import SkeletonListItem from '@/components/SkeletonListItem.vue';
import { useViewMode } from '@/composables/useViewMode';
import { VIEW_MODE } from '@/constants/domain/viewMode';
import SortSelector from '@/components/SortSelector.vue';
import { useSort } from '@/composables/useSort';

const { t, locale } = useI18n();

// SEO: Private page - noindex, nofollow
useHead({
  title: t('following.title'),
  meta: [
    {
      name: 'robots',
      content: 'noindex, nofollow',
    },
  ],
});

useSeoMeta({
  title: t('following.title'),
  description: t('following.description'),
  robots: 'noindex, nofollow',
});

type FollowingTitle = {
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

type FollowingResponseItem = {
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
const followingTitles = ref<FollowingTitle[]>([]);
const isUnfollowing = ref(false);

// Computed sorted titles
const sortedTitles = computed(() => {
  return sortItems(followingTitles.value);
});
const { showToast } = useUndoToast();
const { routeWithLang } = useRouteWithLang();
const { viewMode } = useViewMode('following');
const { currentSort, setSort, sortItems } = useSort('following', 'name-asc');
const isProfileReady = ref(false);

const fetchFollowing = async () => {
  try {
    isLoading.value = true;

    const {
      data: { session },
    } = await getSession();

    if (!session?.access_token) {
      isLoading.value = false;
      return;
    }

    const response = await $fetch<{ following: FollowingResponseItem[] }>(
      '/api/users/following',
      {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      }
    );

    const mappedTitles = (response.following || []).map((item) => ({
      tmdb_id: item.tmdb_id,
      title: item.title || t('following.noTitle'),
      type: item.type,
      poster_path: item.poster_path,
      overview: item.overview || null,
      tagline: item.tagline || null,
      vote_average: item.vote_average || null,
      providers: item.providers || [],
      created_at: item.created_at,
    }));
    // Apply sorting
    followingTitles.value = sortItems(mappedTitles);
  } catch (error) {
    const { logError } = useLogger();
    logError('[Following] Error fetching following', error as Error);
    showToast(t('following.errorLoading'), null, 5000);
  } finally {
    isLoading.value = false;
  }
};

const getTitleLink = (
  type: typeof MEDIA_TYPE.MOVIE | typeof MEDIA_TYPE.TV,
  tmdbId: number
): string => {
  const mediaType = type === MEDIA_TYPE.MOVIE ? 'movie' : 'tv-show';
  return routeWithLang(`/${mediaType}/${tmdbId}`);
};

const goToRecommendations = () => {
  navigateTo(routeWithLang('/'), { replace: false });
};

const handleUnfollowTitle = async (title: FollowingTitle) => {
  // Prevent multiple simultaneous unfollows
  if (isUnfollowing.value) {
    return;
  }

  isUnfollowing.value = true;

  const titleToRestore = { ...title };

  try {
    const {
      data: { session },
    } = await getSession();

    if (!session?.access_token) {
      showToast(t('media.authRequired'), null, 3000);
      isUnfollowing.value = false;
      return;
    }

    const response = await $fetch('/api/users/following', {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
      query: {
        tmdb_id: title.tmdb_id,
      },
    });

    // Optimistic UI update
    followingTitles.value = followingTitles.value.filter(
      (t) => t.tmdb_id !== title.tmdb_id
    );

    showToast(
      t('following.titleRemoved', { title: title.title }),
      {
        label: t('undo.undo'),
        variant: 'secondary',
        action: async () => {
          // Undo: Re-follow
          try {
            await $fetch('/api/users/following', {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${session.access_token}`,
              },
              body: {
                tmdb_id: title.tmdb_id,
                type: title.type,
              },
            });

            followingTitles.value.push(titleToRestore);
            showToast(t('following.titleAdded', { title: title.title }), null, 3000);
          } catch (undoError) {
            const { logError } = useLogger();
            logError('[Following] Error undoing unfollow', undoError as Error);
            await fetchFollowing();
          }
        },
      },
      5000
    );
  } catch (error) {
    const { logError } = useLogger();
    logError('[Following] Error unfollowing title', error as Error, {
      tmdbId: title.tmdb_id,
    });
    await fetchFollowing();
  } finally {
    isUnfollowing.value = false;
  }
};

watch(
  () => locale.value,
  async (newLocale, oldLocale) => {
    if (newLocale && oldLocale && newLocale !== oldLocale) {
      await fetchFollowing();
    }
  },
  { immediate: false }
);

onMounted(async () => {
  isProfileReady.value = true;
  await fetchFollowing();
});
</script>

<style scoped>
/* Styles for following page */
</style>

<style>
/* Global styles for tooltip z-index priority in following page */
.following-grid article:has(.tooltip-container:hover) {
  z-index: 10002 !important;
  position: relative;
}

.following-grid .tooltip-container:hover {
  z-index: 10001 !important;
  position: relative;
}
</style>
