<template>
  <div class="container mx-auto max-w-7xl px-4 py-12">
    <!-- Profile Header -->
    <div class="mb-8">
      <div class="flex flex-col md:flex-row items-start md:items-center gap-6">
        <!-- Avatar -->
        <div class="flex-shrink-0">
          <AvatarUpload
            :avatar-url="profile?.avatar_url"
            :display-name="profile?.display_name"
            :email="currentUser?.email"
            :user-id="userId"
            size="xl"
            @uploaded="handleAvatarUploaded"
            @error="handleAvatarError"
          />
        </div>

        <!-- Profile Info -->
        <div class="flex-1 min-w-0">
          <div v-if="!isEditing" class="space-y-2">
            <h1
              class="text-3xl md:text-4xl font-bold dark:text-gray-300 text-gray-800 font-heading"
            >
              {{ displayName || currentUser?.email || $t('profile.user') }}
            </h1>
            <p
              v-if="currentUser?.email"
              class="text-gray-600 dark:text-gray-400"
            >
              {{ currentUser.email }}
            </p>
          </div>

          <!-- Edit Mode -->
          <div v-else class="space-y-4 max-w-md">
            <div>
              <label
                for="display-name"
                class="block text-sm font-medium dark:text-gray-300 text-gray-800 mb-2"
              >
                {{ $t('profile.displayName') }}
              </label>
              <input
                id="display-name"
                v-model="editDisplayName"
                type="text"
                class="w-full px-4 py-2 dark:bg-gray-800 bg-gray-100 border border-gray-300 dark:border-gray-700 rounded-lg dark:text-gray-300 text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary"
                :placeholder="$t('profile.displayNamePlaceholder')"
                maxlength="50"
              />
            </div>
            <div class="flex gap-3">
              <button
                type="button"
                class="px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary/90 rounded-lg transition-colors"
                @click="saveProfile"
              >
                {{ $t('common.save') }}
              </button>
              <button
                type="button"
                class="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                @click="cancelEdit"
              >
                {{ $t('common.cancel') }}
              </button>
            </div>
          </div>

          <!-- View Mode Actions -->
          <div v-if="!isEditing" class="mt-4">
            <button
              type="button"
              class="px-4 py-2 text-sm font-medium dark:text-gray-300 text-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              @click="startEdit"
            >
              {{ $t('profile.editProfile') }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Alert Messages -->
    <AlertMessage v-if="errorMessage" :message="errorMessage" type="error" />
    <AlertMessage
      v-if="successMessage"
      :message="successMessage"
      type="success"
    />

    <!-- Undo Toast -->
    <UndoToast />

    <!-- Tabs for Lists -->
    <div class="mb-8">
      <div class="border-b border-gray-300 dark:border-gray-700">
        <nav class="-mb-px flex space-x-8 overflow-x-auto">
          <button
            v-for="tab in tabs"
            :key="tab.id"
            :class="[
              'whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors',
              activeTab === tab.id
                ? 'border-primary text-primary dark:text-primary-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300',
            ]"
            @click="activeTab = tab.id"
          >
            {{ tab.label }}
            <span
              v-if="tab.count !== null"
              class="ml-2 px-2 py-0.5 text-xs rounded-full bg-gray-200 dark:bg-gray-700"
            >
              {{ tab.count }}
            </span>
          </button>
        </nav>
      </div>
    </div>

    <!-- Tab Content -->
    <div>
      <!-- Liked Tab -->
      <div v-if="activeTab === 'liked'">
        <div class="mb-4">
          <SearchBar
            :emit-on-select="true"
            @title-selected="handleTitleSelected"
          />
          <p
            v-if="likedTitles.length >= 10"
            class="mt-2 text-sm text-amber-600 dark:text-amber-400"
          >
            {{ $t('preferences.limitReached') }}
          </p>
        </div>

        <div v-if="isLoading" class="text-center py-12">
          <div
            class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"
          ></div>
          <p class="text-gray-800 dark:text-gray-300">
            {{ $t('preferences.loading') }}
          </p>
        </div>

        <TitleGrid
          v-else-if="likedTitles.length > 0"
          :titles="likedTitles"
          :on-remove="handleRemoveLiked"
          :remove-label="$t('preferences.removeFromList')"
        />

        <EmptyState
          v-else
          :message="$t('preferences.emptyState')"
          icon="heart"
        />
      </div>

      <!-- Seen Tab -->
      <div v-if="activeTab === 'seen'">
        <div v-if="isLoading" class="text-center py-12">
          <div
            class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"
          ></div>
          <p class="text-gray-800 dark:text-gray-300">
            {{ $t('seen.loading') }}
          </p>
        </div>

        <TitleGrid
          v-else-if="seenTitles.length > 0"
          :titles="seenTitles"
          :on-remove="handleRemoveSeen"
          :remove-label="$t('seen.removeFromList')"
        />

        <EmptyState v-else :message="$t('seen.empty')" icon="eye" />
      </div>

      <!-- Not Interested Tab -->
      <div v-if="activeTab === 'not-interested'">
        <div v-if="isLoading" class="text-center py-12">
          <div
            class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"
          ></div>
          <p class="text-gray-800 dark:text-gray-300">
            {{ $t('notInterested.loading') }}
          </p>
        </div>

        <TitleGrid
          v-else-if="notInterestedTitles.length > 0"
          :titles="notInterestedTitles"
          :on-remove="handleRemoveNotInterested"
          :remove-label="$t('undo.undo')"
        />

        <EmptyState v-else :message="$t('notInterested.empty')" icon="x" />
      </div>

      <!-- Watchlist Tab -->
      <div v-if="activeTab === 'watchlist'">
        <div v-if="isLoading" class="text-center py-12">
          <div
            class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"
          ></div>
          <p class="text-gray-800 dark:text-gray-300">
            {{ $t('watchlist.loading') }}
          </p>
        </div>

        <TitleGrid
          v-else-if="watchlistTitles.length > 0"
          :titles="watchlistTitles"
          :on-remove="handleRemoveWatchlist"
          :remove-label="$t('watchlist.removeTooltip')"
        />

        <EmptyState v-else :message="$t('watchlist.empty')" icon="bookmark" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useUserStore } from '@/stores/user';
import { TitleStatus } from '@/types/TitleStatus';
import { MediaTypeEnum } from '@/types/enums/MediaTypeEnum';
import {
  getUserLikedTitles,
  deleteUserTitleStatus,
  upsertUserTitleStatus,
  getUserLikedTitle,
  getUserSeenTitles,
  getUserNotInterestedTitles,
  getUserWatchlistTitles,
  removeNotInterested,
} from '@/composables/database/userTitleStatus';
import {
  getTitleByTmdbId,
  insertTitle,
  getTitlesByTmdbIds,
} from '@/composables/database/titles';
import {
  isNotFoundError,
  isUniqueViolationError,
} from '@/composables/database/errorCodes';
import { getProfile } from '@/composables/database/profiles';
import { getSession } from '@/composables/database/auth';
import SearchBar from '@/components/SearchBar.vue';
import AlertMessage from '@/components/AlertMessage.vue';
import AvatarUpload from '@/components/AvatarUpload.vue';
import TitleGrid from '@/components/TitleGrid.vue';
import EmptyState from '@/components/EmptyState.vue';
import UndoToast from '@/components/UndoToast.vue';
import { useUndoToast } from '@/composables/useUndoToast';
import type { TMDBSearchResult } from '@/types/TMDBSearch';

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - Auto-imported
const currentUser = useSupabaseUser();
const userStore = useUserStore();
const { t } = useI18n();
const { showToast } = useUndoToast();

// State
const profile = ref<{
  display_name?: string | null;
  avatar_url?: string | null;
} | null>(null);
const isLoading = ref(true);
const isEditing = ref(false);
const editDisplayName = ref('');
const errorMessage = ref<string | null>(null);
const successMessage = ref<string | null>(null);
const activeTab = ref<'liked' | 'seen' | 'not-interested' | 'watchlist'>(
  'liked'
);

const likedTitles = ref<
  Array<{
    id: string;
    title: string;
    type: typeof MediaTypeEnum.movie | typeof MediaTypeEnum.tv;
    poster_path: string | null;
    tmdb_id: number;
  }>
>([]);
const seenTitles = ref<
  Array<{
    id: string;
    title: string;
    type: typeof MediaTypeEnum.movie | typeof MediaTypeEnum.tv;
    poster_path: string | null;
    tmdb_id: number;
  }>
>([]);
const notInterestedTitles = ref<
  Array<{
    id: string;
    title: string;
    type: typeof MediaTypeEnum.movie | typeof MediaTypeEnum.tv;
    poster_path: string | null;
    tmdb_id: number;
  }>
>([]);
const watchlistTitles = ref<
  Array<{
    id: string;
    title: string;
    type: typeof MediaTypeEnum.movie | typeof MediaTypeEnum.tv;
    poster_path: string | null;
    tmdb_id: number;
  }>
>([]);

const userId = computed(() => {
  return currentUser.value?.id || (currentUser.value as { sub?: string })?.sub;
});

const displayName = computed(() => {
  return profile.value?.display_name || currentUser.value?.email || null;
});

const tabs = computed(() => [
  {
    id: 'liked' as const,
    label: t('profile.tabs.liked'),
    count: likedTitles.value.length,
  },
  {
    id: 'seen' as const,
    label: t('profile.tabs.seen'),
    count: seenTitles.value.length,
  },
  {
    id: 'not-interested' as const,
    label: t('profile.tabs.notInterested'),
    count: notInterestedTitles.value.length,
  },
  {
    id: 'watchlist' as const,
    label: t('profile.tabs.watchlist'),
    count: watchlistTitles.value.length,
  },
]);

// Helper functions
const showError = (message: string) => {
  errorMessage.value = message;
  successMessage.value = null;
  setTimeout(() => {
    errorMessage.value = null;
  }, 5000);
};

const showSuccess = (message: string) => {
  successMessage.value = message;
  errorMessage.value = null;
  setTimeout(() => {
    successMessage.value = null;
  }, 5000);
};

// Fetch profile
const fetchProfile = async () => {
  const id = userId.value;
  if (!id) return;

  try {
    const { data, error } = await getProfile(id);
    if (error) throw error;
    profile.value = data;
  } catch (error) {
    console.error('Error fetching profile:', error);
  }
};

// Fetch all lists
const fetchAllLists = async () => {
  const id = userId.value;
  if (!id) return;

  isLoading.value = true;
  try {
    await Promise.all([
      fetchLikedTitles(),
      fetchSeenTitles(),
      fetchNotInterestedTitles(),
      fetchWatchlistTitles(),
    ]);
  } catch (error) {
    console.error('Error fetching lists:', error);
  } finally {
    isLoading.value = false;
  }
};

// Fetch functions for each list
const fetchLikedTitles = async () => {
  const id = userId.value;
  if (!id) return;

  try {
    const { data: likedStatuses, error: statusError } =
      await getUserLikedTitles(id);
    if (statusError) throw statusError;

    if (!likedStatuses || likedStatuses.length === 0) {
      likedTitles.value = [];
      return;
    }

    const tmdbIds = likedStatuses.map((s) => s.tmdb_id);
    const { data: titlesData, error: titlesError } =
      await getTitlesByTmdbIds(tmdbIds);
    if (titlesError) throw titlesError;

    const titleMap = new Map(titlesData?.map((t) => [t.tmdb_id, t]) || []);
    likedTitles.value = likedStatuses
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
  } catch (error) {
    console.error('Error fetching liked titles:', error);
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
    const { data: titlesData, error: titlesError } =
      await getTitlesByTmdbIds(tmdbIds);
    if (titlesError) throw titlesError;

    const titleMap = new Map(titlesData?.map((t) => [t.tmdb_id, t]) || []);
    seenTitles.value = seenStatuses
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
  } catch (error) {
    console.error('Error fetching seen titles:', error);
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
    const { data: titlesData, error: titlesError } =
      await getTitlesByTmdbIds(tmdbIds);
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
  } catch (error) {
    console.error('Error fetching not interested titles:', error);
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
    const { data: titlesData, error: titlesError } =
      await getTitlesByTmdbIds(tmdbIds);
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
  } catch (error) {
    console.error('Error fetching watchlist titles:', error);
  }
};

// Profile editing
const startEdit = () => {
  editDisplayName.value = profile.value?.display_name || '';
  isEditing.value = true;
};

const cancelEdit = () => {
  isEditing.value = false;
  editDisplayName.value = '';
};

const saveProfile = async () => {
  const id = userId.value;
  if (!id) return;

  try {
    const {
      data: { session },
    } = await getSession();

    if (!session?.access_token) {
      throw new Error(t('profile.notAuthenticated'));
    }

    const response = await $fetch('/api/users/profile', {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
      body: {
        display_name: editDisplayName.value.trim() || null,
      },
    });

    if (response.success) {
      profile.value = response.profile;
      await userStore.fetchProfile();
      isEditing.value = false;
      showSuccess(t('profile.profileUpdated'));
    }
  } catch (error) {
    console.error('Error updating profile:', error);
    showError(t('profile.errorUpdating'));
  }
};

// Avatar
const handleAvatarUploaded = async (url: string) => {
  profile.value = { ...profile.value, avatar_url: url };
  await userStore.fetchProfile();
  showSuccess(t('profile.avatarUpdated'));
};

const handleAvatarError = (message: string) => {
  showError(message);
};

// Title management
const handleTitleSelected = async (result: TMDBSearchResult) => {
  const id = userId.value;
  if (!id) return;

  if (likedTitles.value.length >= 10) {
    showError(t('preferences.limitReached'));
    return;
  }

  const alreadyLiked = likedTitles.value.some(
    (t) => t.tmdb_id === result.id && t.type === result.media_type
  );
  if (alreadyLiked) {
    showError(t('preferences.alreadyInPreferences'));
    return;
  }

  try {
    if (!result.media_type) {
      showError(t('preferences.invalidMediaType'));
      return;
    }

    const { data: existingTitle, error: titleCheckError } =
      await getTitleByTmdbId(result.id, result.media_type);

    if (titleCheckError && !isNotFoundError(titleCheckError)) {
      throw titleCheckError;
    }

    const { data: existingLike } = await getUserLikedTitle(id, result.id);

    if (existingLike) {
      showError(t('preferences.alreadyInPreferences'));
      await fetchLikedTitles();
      return;
    }

    if (!existingTitle && result.media_type) {
      const { error: insertError } = await insertTitle({
        tmdb_id: result.id,
        title: result.title || result.name || 'Unknown',
        type: result.media_type,
        poster_path: result.poster_path,
        backdrop_path: result.backdrop_path || null,
        overview: result.overview || null,
        release_date: result.release_date || null,
        first_air_date: result.first_air_date || null,
        genres: null,
        vote_average: result.vote_average || null,
      });

      if (insertError) throw insertError;
    }

    const { data: newLike, error: likeError } = await upsertUserTitleStatus({
      user_id: id,
      tmdb_id: result.id,
      type: result.media_type,
      status: TitleStatus.SEEN,
      liked: true,
    });

    if (likeError) {
      if (isUniqueViolationError(likeError)) {
        showError(t('preferences.alreadyInPreferences'));
        await fetchLikedTitles();
        return;
      }
      throw likeError;
    }

    const { data: titleData } = await getTitleByTmdbId(
      result.id,
      result.media_type!
    );

    if (titleData) {
      likedTitles.value.unshift({
        id: newLike.id,
        title: titleData.title,
        type: titleData.type,
        poster_path: titleData.poster_path,
        tmdb_id: titleData.tmdb_id,
      });
    }

    await userStore.fetchProfile();
    showSuccess(t('preferences.titleAdded'));
  } catch (error) {
    console.error('Error adding title:', error);
    showError(t('preferences.errorAdding'));
  }
};

const handleRemoveLiked = async (title: {
  id: string;
  title: string;
  tmdb_id: number;
}) => {
  try {
    const { error } = await deleteUserTitleStatus(title.id);
    if (error) throw error;

    likedTitles.value = likedTitles.value.filter((t) => t.id !== title.id);
    await userStore.fetchProfile();

    showToast(
      t('preferences.titleRemoved'),
      {
        label: t('undo.undo'),
        action: async () => {
          // Re-add the like
          const titleData = await getTitleByTmdbId(
            title.tmdb_id,
            likedTitles.value.find((t) => t.tmdb_id === title.tmdb_id)?.type ||
              'movie'
          );
          if (titleData?.data) {
            await upsertUserTitleStatus({
              user_id: userId.value!,
              tmdb_id: title.tmdb_id,
              type: titleData.data.type,
              status: TitleStatus.SEEN,
              liked: true,
            });
            await fetchLikedTitles();
          }
        },
      },
      7000
    );
  } catch (error) {
    console.error('Error removing title:', error);
    showError(t('preferences.errorRemoving'));
    await fetchLikedTitles();
  }
};

const handleRemoveSeen = async (title: {
  id: string;
  title: string;
  tmdb_id: number;
}) => {
  try {
    const { error } = await deleteUserTitleStatus(title.id);
    if (error) throw error;

    seenTitles.value = seenTitles.value.filter((t) => t.id !== title.id);
    showSuccess(t('seen.titleRemoved'));
  } catch (error) {
    console.error('Error removing title:', error);
    showError(t('seen.errorRemoving'));
    await fetchSeenTitles();
  }
};

const handleRemoveNotInterested = async (title: {
  id: string;
  title: string;
  tmdb_id: number;
}) => {
  try {
    const id = userId.value;
    if (!id) return;

    const { error } = await removeNotInterested(id, title.tmdb_id);
    if (error) throw error;

    notInterestedTitles.value = notInterestedTitles.value.filter(
      (t) => t.id !== title.id
    );

    showToast(
      t('notInterested.titleRemoved', { title: title.title }),
      {
        label: t('undo.undo'),
        action: async () => {
          // Re-add to not interested
          await upsertUserTitleStatus({
            user_id: id,
            tmdb_id: title.tmdb_id,
            type:
              notInterestedTitles.value.find((t) => t.tmdb_id === title.tmdb_id)
                ?.type || 'movie',
            status: TitleStatus.NOT_INTERESTED,
          });
          await fetchNotInterestedTitles();
        },
      },
      7000
    );
  } catch (error) {
    console.error('Error removing title:', error);
    showError(t('notInterested.errorUndo'));
    await fetchNotInterestedTitles();
  }
};

const handleRemoveWatchlist = async (title: {
  id: string;
  title: string;
  tmdb_id: number;
}) => {
  try {
    const { error } = await deleteUserTitleStatus(title.id);
    if (error) throw error;

    watchlistTitles.value = watchlistTitles.value.filter(
      (t) => t.id !== title.id
    );
    showSuccess(t('watchlist.titleRemoved'));
  } catch (error) {
    console.error('Error removing title:', error);
    showError(t('watchlist.errorRemoving'));
    await fetchWatchlistTitles();
  }
};

// Lifecycle
onMounted(async () => {
  await Promise.all([fetchProfile(), fetchAllLists()]);
});

// Page meta
definePageMeta({
  middleware: 'auth',
});

useHead({
  title: t('profile.title') + ' - UpNext',
});
</script>
