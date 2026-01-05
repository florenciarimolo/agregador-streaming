<template>
  <AppShell>
    <PageContainer>
      <!-- Show loading while checking profile -->
      <div
        v-if="!isProfileReady"
        class="flex items-center justify-center py-12"
      >
        <div
          class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"
        ></div>
      </div>
      <div v-else class="pt-6 pb-6 w-full">
        <!-- Undo Toast -->
        <Toast />

        <!-- Tabs for Lists -->
        <Tabs
          :default-tab="activeTab"
          @tab-change="(tab) => handleTabChange(tab as ListTab)"
        >
          <template #buttons="{ activeTab: currentTab, setActiveTab }">
            <TabButton
              v-for="tab in tabs"
              :key="tab.id"
              :is-active="currentTab === tab.id"
              :badge="
                tab.count !== null && tab.count !== undefined
                  ? tab.count
                  : undefined
              "
              @click="handleTabButtonClick(tab.id as ListTab, setActiveTab)"
            >
              {{ tab.label }}
            </TabButton>
          </template>
          <template #default="{ activeTab: currentTab }">
            <!-- Liked Tab -->
            <div v-if="currentTab === LIST_TAB.LIKED">
              <Spinner v-if="isLoading" :message="$t('preferences.loading')" />

              <div
                v-else-if="likedTitles.length > 0"
                class="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6"
              >
                <TitleCard
                  v-for="title in likedTitles"
                  :key="title.id"
                  :title="title.title"
                  :poster-path="title.poster_path"
                  :link-to="getTitleLink(title.type, title.tmdb_id)"
                  :link-aria-label="
                    $t('media.viewDetailsOf', { title: title.title })
                  "
                  :image-alt="$t('media.posterOf', { title: title.title })"
                  :no-image-aria-label="
                    $t('media.noPosterAvailableFor', { title: title.title })
                  "
                  :type="title.type"
                  :aria-label="
                    $t('media.titleCardLabel', { title: title.title })
                  "
                >
                  <template #top-right-actions>
                    <Tooltip :text="$t('common.delete')">
                      <IconButton
                        :aria-label="$t('common.delete')"
                        size="small"
                        variant="default"
                        custom-class="p-2 rounded-full backdrop-blur-sm pointer-events-auto w-fit h-fit bg-black/50 hover:bg-red-600/80"
                        @click.stop.prevent="handleRemoveLikedClick(title)"
                      >
                        <IconX icon-class="w-4 h-4 text-white" />
                      </IconButton>
                    </Tooltip>
                  </template>
                </TitleCard>
              </div>

              <EmptyState
                v-else
                :message="$t('preferences.emptyState')"
                icon="heart"
                :cta-text="$t('preferences.emptyStateCta')"
                :cta-action="goToRecommendations"
              />
            </div>

            <!-- Seen Tab -->
            <div v-if="currentTab === LIST_TAB.SEEN">
              <Spinner v-if="isLoading" :message="$t('seen.loading')" />

              <div
                v-else-if="seenTitles.length > 0"
                class="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6"
              >
                <TitleCard
                  v-for="title in seenTitles"
                  :key="title.id"
                  :title="title.title"
                  :poster-path="title.poster_path"
                  :link-to="getTitleLink(title.type, title.tmdb_id)"
                  :link-aria-label="
                    $t('media.viewDetailsOf', { title: title.title })
                  "
                  :image-alt="$t('media.posterOf', { title: title.title })"
                  :no-image-aria-label="
                    $t('media.noPosterAvailableFor', { title: title.title })
                  "
                  :type="title.type"
                  :aria-label="
                    $t('media.titleCardLabel', { title: title.title })
                  "
                >
                  <template #top-left-badges>
                    <Tooltip :text="$t('media.liked')">
                      <IconButton
                        :aria-label="$t('media.liked')"
                        size="small"
                        variant="default"
                        :custom-class="`p-2 rounded-full backdrop-blur-sm pointer-events-auto w-fit h-fit ${
                          title.liked === true
                            ? 'bg-primary-800 text-white border border-gray-700/50 dark:bg-primary-600/70 dark:border-primary-800 hover:bg-primary-900 dark:hover:bg-primary-600'
                            : 'bg-black/50 hover:bg-primary-900 dark:hover:bg-primary-600'
                        }`"
                        @click.stop.prevent="handleAddToLiked(title)"
                      >
                        <IconHeartFilled
                          v-if="title.liked === true"
                          icon-class="w-4 h-4 text-white"
                        />
                        <IconHeart v-else icon-class="w-4 h-4 text-white" />
                      </IconButton>
                    </Tooltip>
                  </template>
                  <template #top-right-actions>
                    <Tooltip :text="$t('seen.removeFromList')">
                      <IconButton
                        :aria-label="$t('seen.removeFromList')"
                        size="small"
                        variant="default"
                        custom-class="p-2 rounded-full backdrop-blur-sm pointer-events-auto w-fit h-fit bg-black/50 hover:bg-red-600/80"
                        @click.stop.prevent="handleRemoveSeen(title)"
                      >
                        <IconX icon-class="w-4 h-4 text-white" />
                      </IconButton>
                    </Tooltip>
                  </template>
                </TitleCard>
              </div>

              <EmptyState
                v-else
                :message="$t('seen.empty')"
                icon="eye"
                :cta-text="$t('seen.emptyCta')"
                :cta-action="goToRecommendations"
              />
            </div>

            <!-- Not Interested Tab -->
            <div v-if="currentTab === LIST_TAB.NOT_INTERESTED">
              <Spinner
                v-if="isLoading"
                :message="$t('notInterested.loading')"
              />

              <div
                v-else-if="notInterestedTitles.length > 0"
                class="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6"
              >
                <TitleCard
                  v-for="title in notInterestedTitles"
                  :key="title.id"
                  :title="title.title"
                  :poster-path="title.poster_path"
                  :link-to="getTitleLink(title.type, title.tmdb_id)"
                  :link-aria-label="
                    $t('media.viewDetailsOf', { title: title.title })
                  "
                  :image-alt="$t('media.posterOf', { title: title.title })"
                  :no-image-aria-label="
                    $t('media.noPosterAvailableFor', { title: title.title })
                  "
                  :type="title.type"
                  :aria-label="
                    $t('media.titleCardLabel', { title: title.title })
                  "
                >
                  <template #top-right-actions>
                    <Tooltip :text="$t('common.delete')">
                      <IconButton
                        :aria-label="$t('common.delete')"
                        size="small"
                        variant="default"
                        custom-class="p-2 rounded-full backdrop-blur-sm pointer-events-auto w-fit h-fit bg-black/50 hover:bg-red-600/80"
                        @click.stop.prevent="handleRemoveNotInterested(title)"
                      >
                        <IconX icon-class="w-4 h-4 text-white" />
                      </IconButton>
                    </Tooltip>
                  </template>
                </TitleCard>
              </div>

              <EmptyState
                v-else
                :message="$t('notInterested.empty')"
                icon="x"
                :cta-text="$t('notInterested.emptyCta')"
                :cta-action="goToRecommendations"
              />
            </div>
          </template>
        </Tabs>

        <!-- Modal for removing like -->
        <Modal
          :is-open="showRemoveLikeModal"
          @close="showRemoveLikeModal = false"
        >
          <div class="flex flex-col gap-4">
            <h2 class="text-xl font-semibold text-gray-800 dark:text-gray-300">
              {{ $t('home.confirmRemoveLikeTitle') }}
            </h2>
            <p class="text-gray-700 dark:text-gray-400">
              {{
                $t('home.confirmRemoveLikeMessage', {
                  title: titleToRemoveLike?.title,
                })
              }}
            </p>
            <div class="flex gap-3 justify-end mt-4">
              <Button
                variant="outline"
                size="small"
                @click="showRemoveLikeModal = false"
              >
                {{ $t('common.cancel') }}
              </Button>
              <Button
                variant="primary"
                size="small"
                @click="confirmRemoveLikeFromSeen"
              >
                {{ $t('common.confirm') }}
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </PageContainer>
  </AppShell>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useUserStore } from '@/stores/user';
import { TITLE_STATUS } from '@/constants/domain/titleStatus';
import Button from '@/components/ui/Button.vue';
import Modal from '@/components/ui/Modal.vue';
import Tabs from '@/components/ui/Tabs.vue';
import AppShell from '@/components/layout/AppShell.vue';
import PageContainer from '@/components/layout/PageContainer.vue';
import TabButton from '@/components/ui/TabButton.vue';
import { MEDIA_TYPE } from '@/constants/domain/mediaType';
import {
  getUserLikedTitles,
  deleteUserTitleStatus,
  upsertUserTitleStatus,
  getUserLikedTitle,
  getUserSeenTitles,
  getUserNotInterestedTitles,
  getUserWatchlistTitles,
} from '@/services/userTitleStatus';
import {
  getTitleByTmdbId,
  getTitlesByTmdbIds,
  getTitleByTmdbIdWithLanguage,
} from '@/services/titles';
import { getSession } from '@/services/auth';
import TitleCard from '@/components/TitleCard.vue';
import IconButton from '@/components/ui/IconButton.vue';
import IconHeart from '@/components/icons/IconHeart.vue';
import IconHeartFilled from '@/components/icons/IconHeartFilled.vue';
import IconX from '@/components/icons/IconX.vue';
import Tooltip from '@/components/ui/Tooltip.vue';
import EmptyState from '@/components/EmptyState.vue';
import Spinner from '@/components/Spinner.vue';
import Toast from '@/components/ui/Toast.vue';
import { useUndoToast } from '@/composables/useUndoToast';
import { useRouteWithLang } from '@/composables/useRouteWithLang';
import { useTitleStatusAction } from '@/composables/useTitleStatusAction';
import { DEFAULT_LANGUAGE, toTMDBLanguageCode } from '@/constants/languages';
import { QUERY_PARAMS } from '@/constants/api/queryParams';
import { LIST_TAB, type ListTab } from '@/constants/domain/listTab';

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - Auto-imported
const currentUser = useSupabaseUser();

// Get userStore - it must exist at this point
const userStore = useUserStore();
const { t, locale } = useI18n();
const { showToast } = useUndoToast();
const { executeAction, executeLikedAction } = useTitleStatusAction();

// Get app language for TMDB API calls
const getAppLanguage = () => {
  return toTMDBLanguageCode(locale.value || DEFAULT_LANGUAGE);
};

// State
const isFetching = ref(false);
// Track if we've already loaded data to prevent re-loading on re-mount
// Use a module-level variable that persists across component instances
let hasLoadedData = false;
const isLoading = ref(true);
// Profile ready flag - controls main render, separate from isLoading
const isProfileReady = ref(false);
const activeTab = ref<ListTab>(LIST_TAB.LIKED);
const showRemoveLikeModal = ref(false);
const titleToRemoveLike = ref<{
  id: string;
  title: string;
  tmdb_id: number;
  type: typeof MEDIA_TYPE.MOVIE | typeof MEDIA_TYPE.TV;
} | null>(null);

const likedTitles = ref<
  Array<{
    id: string;
    title: string;
    type: typeof MEDIA_TYPE.MOVIE | typeof MEDIA_TYPE.TV;
    poster_path: string | null;
    tmdb_id: number;
  }>
>([]);
const seenTitles = ref<
  Array<{
    id: string;
    title: string;
    type: typeof MEDIA_TYPE.MOVIE | typeof MEDIA_TYPE.TV;
    poster_path: string | null;
    tmdb_id: number;
    liked?: boolean;
  }>
>([]);
const notInterestedTitles = ref<
  Array<{
    id: string;
    title: string;
    type: typeof MEDIA_TYPE.MOVIE | typeof MEDIA_TYPE.TV;
    poster_path: string | null;
    tmdb_id: number;
  }>
>([]);
const watchlistTitles = ref<
  Array<{
    id: string;
    title: string;
    type: typeof MEDIA_TYPE.MOVIE | typeof MEDIA_TYPE.TV;
    poster_path: string | null;
    tmdb_id: number;
  }>
>([]);

const userId = computed(() => {
  return currentUser.value?.id || (currentUser.value as { sub?: string })?.sub;
});

// Get routeWithLang for building language-prefixed links
const { routeWithLang } = useRouteWithLang();

// Helper function to generate link with language prefix
const getTitleLink = (
  type: typeof MEDIA_TYPE.MOVIE | typeof MEDIA_TYPE.TV,
  tmdbId: number
): string => {
  const mediaType = type === MEDIA_TYPE.MOVIE ? 'movie' : 'tv-show';
  return routeWithLang(`/${mediaType}/${tmdbId}`);
};

// Content preferences region (read-only, fetched from saved preferences)
const contentPreferences = ref<{
  region?: string;
}>({
  region: undefined,
});

const tabs = computed(() => [
  {
    id: LIST_TAB.LIKED,
    label: t('profile.tabs.liked'),
    count: likedTitles.value.length,
  },
  {
    id: LIST_TAB.SEEN,
    label: t('profile.tabs.seen'),
    count: seenTitles.value.length,
  },
  {
    id: LIST_TAB.NOT_INTERESTED,
    label: t('profile.tabs.notInterested'),
    count: notInterestedTitles.value.length,
  },
]);

// Helper function
const showError = (message: string) => {
  showToast(message, null, 5000);
};

// Handle tab button click - intercepts before Tabs component changes state
const handleTabButtonClick = (
  tabId: ListTab,
  setActiveTab: (tab: string) => void
) => {
  // No unsaved changes or same tab, proceed with change
  setActiveTab(tabId);
};

// Handle tab change and update URL (called after Tabs component changes state)
const handleTabChange = (tabId: ListTab) => {
  // Don't navigate if already on this tab (prevents unnecessary re-mounts)
  if (activeTab.value === tabId) {
    return;
  }

  // Update local state and URL
  activeTab.value = tabId;
  const route = useRoute();
  const currentTab = route.query[QUERY_PARAMS.TAB] as string;

  // Only navigate if the URL tab is different from the new tab
  if (currentTab !== tabId) {
    navigateTo(
      {
        path: route.path,
        query: { ...route.query, tab: tabId },
      },
      { replace: true }
    );
  }
};

// Navigate to recommendations (home page)
const goToRecommendations = () => {
  const { routeWithLang } = useRouteWithLang();
  navigateTo(routeWithLang('/'), { replace: false });
};

// Fetch content preferences region only (for API calls)
const fetchContentPreferencesRegion = async () => {
  const id = userId.value;
  if (!id) return;

  try {
    const {
      data: { session },
    } = await getSession();

    if (!session?.access_token) {
      return;
    }

    const response = await $fetch<{
      success: boolean;
      preferences: {
        region?: string;
      } | null;
    }>('/api/users/preferences', {
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    });

    if (response.success && response.preferences) {
      contentPreferences.value = {
        region: response.preferences.region || undefined,
      };
    }
  } catch (error) {
    console.error('Error fetching content preferences region:', error);
  }
};

// Fetch all lists
const fetchAllLists = async () => {
  // Prevent concurrent executions
  if (isFetching.value) {
    if (process.env.NODE_ENV === 'development') {
      console.log('[lists.vue] fetchAllLists already in progress, skipping');
    }
    return;
  }

  const id = userId.value;
  if (!id) {
    isLoading.value = false;
    if (process.env.NODE_ENV === 'development') {
      console.log(
        '[lists.vue] fetchAllLists: no userId, setting isLoading to false'
      );
    }
    return;
  }

  isFetching.value = true;
  isLoading.value = true;
  if (process.env.NODE_ENV === 'development') {
    console.log('[lists.vue] fetchAllLists: starting fetch');
  }
  try {
    const results = await Promise.allSettled([
      fetchLikedTitles(),
      fetchSeenTitles(),
      fetchNotInterestedTitles(),
      fetchWatchlistTitles(),
    ]);
    if (process.env.NODE_ENV === 'development') {
      console.log(
        '[lists.vue] fetchAllLists: all promises settled',
        results.map((r) => r.status)
      );
    }
  } catch (error) {
    console.error('[lists.vue] Error fetching lists:', error);
  } finally {
    isLoading.value = false;
    isFetching.value = false;
    if (process.env.NODE_ENV === 'development') {
      console.log(
        '[lists.vue] fetchAllLists: completed, isLoading set to false'
      );
    }
  }
};

// Fetch functions for each list
const fetchLikedTitles = async () => {
  const id = userId.value;

  if (!id) {
    return;
  }

  try {
    const { data: likedStatuses, error: statusError } =
      await getUserLikedTitles(id);
    if (statusError) {
      throw statusError;
    }

    if (!likedStatuses || likedStatuses.length === 0) {
      likedTitles.value = [];
      return;
    }

    const tmdbIds = likedStatuses.map((s) => s.tmdb_id);
    // Create a map of tmdb_id to type for titles that might not exist in database
    const titleTypesMap = new Map(
      likedStatuses.map((s) => [s.tmdb_id, s.type])
    );

    // Use app language in ISO/TMDB format (e.g., 'ca-ES', 'es-ES')
    const preferredLang = getAppLanguage();

    const { data: titlesData, error: titlesError } = await getTitlesByTmdbIds(
      tmdbIds,
      preferredLang,
      contentPreferences.value.region,
      titleTypesMap
    );

    if (titlesError) {
      throw titlesError;
    }

    const titleMap = new Map(titlesData?.map((t) => [t.tmdb_id, t]) || []);

    likedTitles.value = likedStatuses
      .map((status) => {
        const title = titleMap.get(status.tmdb_id);
        if (!title) {
          return null;
        }
        return {
          id: status.id,
          title: title.title,
          type: title.type,
          poster_path: title.poster_path,
          tmdb_id: title.tmdb_id,
        };
      })
      .filter((t): t is NonNullable<typeof t> => t !== null);
  } catch {
    // Error handled silently
  }
};

const fetchSeenTitles = async () => {
  const id = userId.value;
  if (!id) return;

  try {
    const { data: seenStatuses, error: statusError } =
      await getUserSeenTitles(id);
    if (statusError) throw statusError;

    if (!seenStatuses || seenStatuses.length === 0) {
      seenTitles.value = [];
      return;
    }

    const tmdbIds = seenStatuses.map((s) => s.tmdb_id);
    // Create a map of tmdb_id to type for titles that might not exist in database
    const titleTypesMap = new Map(seenStatuses.map((s) => [s.tmdb_id, s.type]));
    // Use app language in ISO/TMDB format (e.g., 'ca-ES', 'es-ES')
    const preferredLang = getAppLanguage();
    const { data: titlesData, error: titlesError } = await getTitlesByTmdbIds(
      tmdbIds,
      preferredLang,
      contentPreferences.value.region,
      titleTypesMap
    );
    if (titlesError) throw titlesError;

    const titleMap = new Map(titlesData?.map((t) => [t.tmdb_id, t]) || []);
    seenTitles.value = seenStatuses
      .map((status) => {
        const title = titleMap.get(status.tmdb_id);
        if (!title) return null;
        const isLiked = status.liked === true;
        return {
          id: status.id,
          title: title.title,
          type: title.type,
          poster_path: title.poster_path,
          tmdb_id: title.tmdb_id,
          liked: isLiked,
        };
      })
      .filter((t): t is NonNullable<typeof t> => t !== null);
  } catch {
    // Error handled silently
  }
};

const fetchNotInterestedTitles = async () => {
  const id = userId.value;
  if (!id) return;

  try {
    const { data: notInterestedStatuses, error: statusError } =
      await getUserNotInterestedTitles(id);
    if (statusError) throw statusError;

    if (!notInterestedStatuses || notInterestedStatuses.length === 0) {
      notInterestedTitles.value = [];
      return;
    }

    const tmdbIds = notInterestedStatuses.map((s) => s.tmdb_id);
    // Create a map of tmdb_id to type for titles that might not exist in database
    const titleTypesMap = new Map(
      notInterestedStatuses.map((s) => [s.tmdb_id, s.type])
    );
    // Use app language in ISO/TMDB format (e.g., 'ca-ES', 'es-ES')
    const preferredLang = getAppLanguage();
    const { data: titlesData, error: titlesError } = await getTitlesByTmdbIds(
      tmdbIds,
      preferredLang,
      contentPreferences.value.region,
      titleTypesMap
    );
    if (titlesError) throw titlesError;

    const titleMap = new Map(titlesData?.map((t) => [t.tmdb_id, t]) || []);
    notInterestedTitles.value = notInterestedStatuses
      .map((status) => {
        const title = titleMap.get(status.tmdb_id);
        if (!title) return null;
        return {
          id: status.id,
          title: title.title,
          type: title.type,
          poster_path: title.poster_path,
          tmdb_id: title.tmdb_id,
        };
      })
      .filter((t): t is NonNullable<typeof t> => t !== null);
  } catch {
    // Error handled silently
  }
};

const fetchWatchlistTitles = async () => {
  const id = userId.value;
  if (!id) return;

  try {
    const { data: watchlistStatuses, error: statusError } =
      await getUserWatchlistTitles(id);
    if (statusError) throw statusError;

    if (!watchlistStatuses || watchlistStatuses.length === 0) {
      watchlistTitles.value = [];
      return;
    }

    const tmdbIds = watchlistStatuses.map((s) => s.tmdb_id);
    // Create a map of tmdb_id to type for titles that might not exist in database
    const titleTypesMap = new Map(
      watchlistStatuses.map((s) => [s.tmdb_id, s.type])
    );
    // Use app language in ISO/TMDB format (e.g., 'ca-ES', 'es-ES')
    const preferredLang = getAppLanguage();
    const { data: titlesData, error: titlesError } = await getTitlesByTmdbIds(
      tmdbIds,
      preferredLang,
      contentPreferences.value.region,
      titleTypesMap
    );
    if (titlesError) throw titlesError;

    const titleMap = new Map(titlesData?.map((t) => [t.tmdb_id, t]) || []);
    watchlistTitles.value = watchlistStatuses
      .map((status) => {
        const title = titleMap.get(status.tmdb_id);
        if (!title) return null;
        return {
          id: status.id,
          title: title.title,
          type: title.type,
          poster_path: title.poster_path,
          tmdb_id: title.tmdb_id,
        };
      })
      .filter((t): t is NonNullable<typeof t> => t !== null);
  } catch {
    // Error handled silently
  }
};

// Title management
const handleRemoveLikedClick = async (title: {
  id: string;
  title: string;
  tmdb_id: number;
}) => {
  const titleToRestore = likedTitles.value.find((t) => t.id === title.id);

  try {
    const { error } = await deleteUserTitleStatus(title.id);
    if (error) throw error;

    likedTitles.value = likedTitles.value.filter((t) => t.id !== title.id);
    await userStore.fetchProfile();

    // Regenerate recommendation pool in background
    try {
      const {
        data: { session },
      } = await getSession();
      if (session?.access_token) {
        await $fetch('/api/recommendations/populate-pool', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });
      }
    } catch (poolError) {
      console.error('Error regenerating pool:', poolError);
      // Don't show error to user, pool regeneration is background task
    }

    showToast(
      t('preferences.titleRemoved'),
      {
        label: t('undo.undo'),
        action: async () => {
          // Re-add the like
          if (titleToRestore) {
            // Just check if title exists, then restore and refetch (which will use correct language)
            const titleCheck = await getTitleByTmdbId(
              titleToRestore.tmdb_id,
              titleToRestore.type
            );
            if (titleCheck?.data) {
              await upsertUserTitleStatus({
                user_id: userId.value!,
                tmdb_id: titleToRestore.tmdb_id,
                type: titleToRestore.type,
                status: TITLE_STATUS.SEEN,
                liked: true,
              });
              // Refetch will use the correct language
              await fetchLikedTitles();
              // Regenerate pool after undo
              try {
                const {
                  data: { session },
                } = await getSession();
                if (session?.access_token) {
                  await $fetch('/api/recommendations/populate-pool', {
                    method: 'POST',
                    headers: {
                      Authorization: `Bearer ${session.access_token}`,
                    },
                  });
                }
              } catch (poolError) {
                console.error('Error regenerating pool:', poolError);
              }
            }
          }
        },
      },
      7000
    );
  } catch {
    showError(t('preferences.errorRemoving'));
    await fetchLikedTitles();
  }
};

/**
 * Remove title from seen list
 * IMPORTANT: This deletes the ENTIRE user_title_status record, including `liked: true` if present.
 * This is correct behavior: `liked` is an attribute of `seen`, not an independent status.
 * Do NOT attempt to preserve `liked` when removing `seen`.
 */
const handleRemoveSeen = async (title: {
  id: string;
  title: string;
  tmdb_id: number;
  type: typeof MEDIA_TYPE.MOVIE | typeof MEDIA_TYPE.TV;
  liked?: boolean;
}) => {
  // Store original title for undo
  const titleToRestore = seenTitles.value.find((t) => t.id === title.id);

  try {
    // Use unified composable for API call and toast
    const result = await executeAction(
      {
        tmdb_id: title.tmdb_id,
        type: title.type,
        title: title.title,
        currentStatus: TITLE_STATUS.SEEN,
        isLiked: title.liked || false,
        onUndoComplete: async () => {
          // Restore title in UI immediately
          if (titleToRestore) {
            seenTitles.value.push(titleToRestore);
          }
          // Also refresh to ensure consistency
          await fetchSeenTitles();
        },
      },
      TITLE_STATUS.SEEN
    );

    if (result.success && result.action === 'removed') {
      // Update local state - remove from list
      seenTitles.value = seenTitles.value.filter((t) => t.id !== title.id);
    } else if (!result.success) {
      showError(t('seen.errorRemoving'));
      await fetchSeenTitles();
    }
  } catch (error) {
    console.error('[handleRemoveSeen] Error:', error);
    showError(t('seen.errorRemoving'));
    await fetchSeenTitles();
  }
};

const handleAddToLiked = async (title: {
  id: string;
  title: string;
  tmdb_id: number;
  type: typeof MEDIA_TYPE.MOVIE | typeof MEDIA_TYPE.TV;
  liked?: boolean;
}) => {
  try {
    const id = userId.value;
    if (!id) {
      return;
    }

    // Check if title is already liked using the database
    const { data: likedTitle } = await getUserLikedTitle(id, title.tmdb_id);

    if (likedTitle) {
      // Title is already liked, show confirmation modal
      titleToRemoveLike.value = {
        id: title.id,
        title: title.title,
        tmdb_id: title.tmdb_id,
        type: title.type,
      };
      showRemoveLikeModal.value = true;
      return;
    }

    // Use unified composable for API call and toast
    // hideViewListButton: true because we're already on the lists page
    const result = await executeLikedAction(
      {
        tmdb_id: title.tmdb_id,
        type: title.type,
        title: title.title,
        currentStatus: title.liked ? TITLE_STATUS.SEEN : null,
        isLiked: false,
        hideViewListButton: true, // Already on lists page, don't show "View favorites" button
      },
      false
    );

    if (result.success && result.action === 'added') {
      // Get title in user's preferred language
      const preferredLang = getAppLanguage();
      const { data: titleData } = await getTitleByTmdbIdWithLanguage(
        title.tmdb_id,
        title.type,
        preferredLang,
        contentPreferences.value.region
      );

      if (titleData) {
        // Add to liked titles list
        likedTitles.value.unshift({
          id: title.id, // Use the existing status id
          title: titleData.title,
          type: titleData.type,
          poster_path: titleData.poster_path,
          tmdb_id: titleData.tmdb_id,
        });

        // Update the title in seen titles to mark it as liked (don't remove it)
        // A title can be both "seen" and "liked" at the same time
        const seenTitleIndex = seenTitles.value.findIndex(
          (t) => t.id === title.id
        );
        if (seenTitleIndex !== -1) {
          seenTitles.value[seenTitleIndex] = {
            ...seenTitles.value[seenTitleIndex],
            liked: true,
          };
        }
      }

      await userStore.fetchProfile();
      // Refresh seen titles to ensure all titles have the correct liked status
      await fetchSeenTitles();

      // Regenerate recommendation pool in background
      try {
        const {
          data: { session },
        } = await getSession();
        if (session?.access_token) {
          await $fetch('/api/recommendations/populate-pool', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${session.access_token}`,
            },
          });
        }
      } catch (poolError) {
        console.error('Error regenerating pool:', poolError);
        // Don't show error to user, pool regeneration is background task
      }
    } else if (!result.success) {
      showError(t('preferences.errorAdding'));
      await fetchSeenTitles();
    }
  } catch (error) {
    console.error('Error adding to liked:', error);
    showError(t('preferences.errorAdding'));
    await fetchSeenTitles();
  }
};

// Handle removing like after confirmation (from Seen tab)
const confirmRemoveLikeFromSeen = async () => {
  if (!titleToRemoveLike.value) {
    return;
  }

  const title = titleToRemoveLike.value;
  showRemoveLikeModal.value = false;

  try {
    const id = userId.value;
    if (!id) {
      return;
    }

    // Remove like
    const { error: likeError } = await upsertUserTitleStatus({
      user_id: id,
      tmdb_id: title.tmdb_id,
      type: title.type,
      status: TITLE_STATUS.SEEN, // Keep status as seen, just remove liked
      liked: false,
    });

    if (likeError) {
      throw likeError;
    }

    // Update frontend state - remove from likedTitles and update seenTitles
    likedTitles.value = likedTitles.value.filter(
      (t) => !(t.tmdb_id === title.tmdb_id && t.type === title.type)
    );

    // Store title info for undo before updating state
    const titleToRestore = {
      id: title.id,
      title: title.title,
      tmdb_id: title.tmdb_id,
      type: title.type,
      liked: true, // It was liked before removal
    };

    // Update the title in seen titles to mark it as not liked
    const seenTitleIndex = seenTitles.value.findIndex((t) => t.id === title.id);
    if (seenTitleIndex !== -1) {
      seenTitles.value[seenTitleIndex] = {
        ...seenTitles.value[seenTitleIndex],
        liked: false,
      };
    }

    // Show success toast with undo button
    showToast(
      t('home.titleRemovedFavorites', { title: title.title }),
      {
        label: t('undo.undo'),
        action: async () => {
          // Re-add the like
          if (titleToRestore) {
            await upsertUserTitleStatus({
              user_id: userId.value!,
              tmdb_id: titleToRestore.tmdb_id,
              type: titleToRestore.type,
              status: TITLE_STATUS.SEEN,
              liked: true,
            });
            // Refresh both lists to ensure consistency
            await fetchLikedTitles();
            await fetchSeenTitles();
            // Regenerate pool after undo
            try {
              const {
                data: { session },
              } = await getSession();
              if (session?.access_token) {
                await $fetch('/api/recommendations/populate-pool', {
                  method: 'POST',
                  headers: {
                    Authorization: `Bearer ${session.access_token}`,
                  },
                });
              }
            } catch (poolError) {
              console.error('Error regenerating pool:', poolError);
            }
          }
        },
      },
      7000
    );

    // Regenerate recommendation pool in background (silently)
    try {
      const {
        data: { session },
      } = await getSession();
      if (session?.access_token) {
        await $fetch('/api/recommendations/populate-pool', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });
      }
    } catch (poolError) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Error regenerating pool:', poolError);
      }
      // Don't show error to user, pool regeneration is background task
    }

    titleToRemoveLike.value = null;
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Error in confirmRemoveLikeFromSeen:', error);
    }
    showToast(
      t('home.errorRemovingFavorites', { title: title.title }),
      null,
      3000
    );
    titleToRemoveLike.value = null;
  }
};

const handleRemoveNotInterested = async (title: {
  id: string;
  title: string;
  tmdb_id: number;
  type: typeof MEDIA_TYPE.MOVIE | typeof MEDIA_TYPE.TV;
}) => {
  // Store original title for undo
  const titleToRestore = notInterestedTitles.value.find(
    (t) => t.id === title.id
  );

  try {
    // Use unified composable for API call and toast
    const result = await executeAction(
      {
        tmdb_id: title.tmdb_id,
        type: title.type,
        title: title.title,
        currentStatus: TITLE_STATUS.NOT_INTERESTED,
        isLiked: false,
        onUndoComplete: async () => {
          // Restore title in UI immediately
          if (titleToRestore) {
            notInterestedTitles.value.push(titleToRestore);
          }
          // Also refresh to ensure consistency
          await fetchNotInterestedTitles();
        },
      },
      TITLE_STATUS.NOT_INTERESTED
    );

    if (result.success && result.action === 'removed') {
      // Update local state - remove from list
      notInterestedTitles.value = notInterestedTitles.value.filter(
        (t) => t.id !== title.id
      );
    } else if (!result.success) {
      showError(t('notInterested.errorRemoving'));
      await fetchNotInterestedTitles();
    }
  } catch (error) {
    console.error('[handleRemoveNotInterested] Error:', error);
    showError(t('notInterested.errorRemoving'));
    await fetchNotInterestedTitles();
  }
};

// Lifecycle
onMounted(async () => {
  // Ensure profile is loaded
  await userStore.ensureProfile();

  // Check onboarding status
  if (!userStore.hasCompletedOnboarding) {
    const { routeWithLang } = useRouteWithLang();
    await navigateTo(routeWithLang('/onboarding'), { replace: true });
    return;
  }

  // Profile is ready, show content
  isProfileReady.value = true;

  // Wait for user to be available
  let retries = 0;
  while (!userId.value && retries < 20) {
    await new Promise((resolve) => setTimeout(resolve, 100));
    retries++;
  }

  // If still no user after waiting, set loading to false and return
  if (!userId.value) {
    isLoading.value = false;
    return;
  }

  // Check if we should open a specific tab from query params
  const route = useRoute();

  const tabFromQuery = route.query[QUERY_PARAMS.TAB] as string;
  if (tabFromQuery) {
    const validTabs: ListTab[] = [
      LIST_TAB.LIKED,
      LIST_TAB.SEEN,
      LIST_TAB.NOT_INTERESTED,
    ];
    if (validTabs.includes(tabFromQuery as ListTab)) {
      activeTab.value = tabFromQuery as typeof activeTab.value;
    }
  }

  // Only fetch if we haven't loaded data yet (prevents re-fetching on re-mount)
  if (!hasLoadedData) {
    // Fetch region first (for API calls)
    await fetchContentPreferencesRegion();
    // Then fetch all lists (which will use the app language)
    await fetchAllLists();
    hasLoadedData = true;
  } else {
    // If we already have data, just ensure loading is false
    isLoading.value = false;
  }
});

// Watch isLoading for debugging
if (process.env.NODE_ENV === 'development') {
  watch(
    () => isLoading.value,
    (newVal, oldVal) => {
      console.log('[lists.vue] isLoading changed:', {
        from: oldVal,
        to: newVal,
      });
    }
  );
}

// Watch for app language changes and refresh all lists
watch(
  () => locale.value,
  async (newLocale, oldLocale) => {
    // Only refresh if language actually changed and user is authenticated
    if (newLocale && oldLocale && newLocale !== oldLocale && userId.value) {
      if (import.meta.dev) {
        console.log(
          '[lists.vue] Language changed, updating pool language and refreshing all lists:',
          {
            oldLocale,
            newLocale,
          }
        );
      }

      // Update title_data in recommendation pool with new language (don't regenerate pool)
      try {
        const {
          data: { session },
        } = await getSession();
        if (session?.access_token) {
          await $fetch(
            `/api/recommendations/update-pool-language?language=${encodeURIComponent(newLocale)}`,
            {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${session.access_token}`,
              },
            }
          );
          if (import.meta.dev) {
            console.log('[lists.vue] Pool language updated successfully');
          }
        }
      } catch (poolError) {
        console.error('[lists.vue] Error updating pool language:', poolError);
        // Continue anyway to refresh lists
      }

      // Refresh all lists with new language
      await fetchAllLists();
    }
  },
  { immediate: false }
);

// Page meta
definePageMeta({
  middleware: 'auth',
});

// SEO: Private page - noindex, nofollow
useHead({
  title: t('seo.listsTitle'),
  meta: [
    {
      name: 'robots',
      content: 'noindex, nofollow',
    },
  ],
});

useSeoMeta({
  robots: 'noindex, nofollow',
});
</script>
