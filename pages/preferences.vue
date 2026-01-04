<template>
  <AppShell>
    <PageContainer>
      <div class="pt-6 pb-6 w-full">
        <!-- Profile Header -->
        <div class="mb-6">
          <div class="flex flex-row gap-4 items-center md:gap-6">
            <!-- Avatar -->
            <div class="flex flex-shrink-0 items-center">
              <div
                class="rounded-full border shadow-md hover:ring-2 hover:ring-primary/50 border-primary"
              >
                <Avatar
                  :avatar-url="profile?.avatar_url"
                  :display-name="profile?.display_name"
                  :email="currentUser?.email"
                  :user-id="userId"
                  :size="avatarSize"
                />
              </div>
            </div>

            <!-- Profile Info -->
            <div class="overflow-hidden flex-1 min-w-0">
              <div class="space-y-2">
                <h1
                  class="text-sm font-medium text-gray-800 whitespace-nowrap dark:text-gray-300 font-heading"
                >
                  {{ displayName || currentUser?.email || $t('profile.user') }}
                </h1>
                <p
                  v-if="currentUser?.email"
                  class="text-xs text-gray-500 whitespace-nowrap dark:text-gray-400"
                >
                  {{ currentUser.email }}
                </p>
              </div>
            </div>
          </div>
        </div>

        <!-- Undo Toast -->
        <Toast />

        <!-- Confirmation Dialog for Delete -->
        <Modal :is-open="!!titleToDelete" @close="titleToDelete = null">
          <h3
            class="mb-2 text-lg font-semibold text-gray-800 dark:text-gray-300"
          >
            {{ $t('preferences.confirmDelete') }}
          </h3>
          <p class="mb-4 text-gray-800 dark:text-gray-300">
            {{
              $t('preferences.confirmDeleteMessage', {
                title: titleToDelete?.title,
              })
            }}
          </p>
          <div class="flex gap-3 justify-end">
            <Button
              size="small"
              variant="outline"
              @click="titleToDelete = null"
            >
              {{ $t('common.cancel') }}
            </Button>
            <Button size="small" variant="danger" @click="confirmRemoveLiked">
              {{ $t('common.delete') }}
            </Button>
          </div>
        </Modal>

        <!-- Tabs for Lists -->
        <Tabs
          :default-tab="activeTab"
          @tab-change="
            (tab) =>
              handleTabChange(
                tab as
                  | 'liked'
                  | 'seen'
                  | 'not-interested'
                  | 'content-preferences'
              )
          "
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
              @click="
                handleTabButtonClick(
                  tab.id as
                    | 'liked'
                    | 'seen'
                    | 'not-interested'
                    | 'content-preferences',
                  setActiveTab
                )
              "
            >
              {{ tab.label }}
            </TabButton>
          </template>
          <template #default="{ activeTab: currentTab }">
            <!-- Liked Tab -->
            <div v-if="currentTab === 'liked'">
              <div class="mb-4">
                <SearchBar
                  :emit-on-select="true"
                  @title-selected="handleTitleSelected"
                />
                <p
                  v-if="likedTitles.length >= 10"
                  class="mt-2 text-xs text-amber-600 dark:text-amber-400"
                >
                  {{ $t('preferences.limitReached') }}
                </p>
              </div>

              <Spinner v-if="isLoading" :message="$t('preferences.loading')" />

              <TitleGrid
                v-else-if="likedTitles.length > 0"
                :titles="likedTitles"
                :on-remove="handleRemoveLikedClick"
                :remove-label="$t('preferences.removeFromList')"
              />

              <EmptyState
                v-else
                :message="$t('preferences.emptyState')"
                icon="heart"
              />
            </div>

            <!-- Seen Tab -->
            <div v-if="currentTab === 'seen'">
              <Spinner v-if="isLoading" :message="$t('seen.loading')" />

              <TitleGrid
                v-else-if="seenTitles.length > 0"
                :titles="seenTitles"
                :on-remove="handleRemoveSeen"
                :remove-label="$t('seen.removeFromList')"
                :on-like="handleAddToLiked"
                :like-label="$t('media.liked')"
              />

              <EmptyState v-else :message="$t('seen.empty')" icon="eye" />
            </div>

            <!-- Not Interested Tab -->
            <div v-if="currentTab === 'not-interested'">
              <Spinner
                v-if="isLoading"
                :message="$t('notInterested.loading')"
              />

              <TitleGrid
                v-else-if="notInterestedTitles.length > 0"
                :titles="notInterestedTitles"
                :on-remove="handleRemoveNotInterested"
                :remove-label="$t('common.delete')"
              />

              <EmptyState
                v-else
                :message="$t('notInterested.empty')"
                icon="x"
              />
            </div>

            <!-- Content Preferences Tab -->
            <div v-if="currentTab === 'content-preferences'">
              <div class="space-y-6">
                <!-- Region -->
                <Card padding="lg">
                  <h2
                    class="mb-2 text-xl font-semibold text-gray-800 dark:text-gray-300"
                  >
                    {{ $t('preferences.content.region.title') }}
                  </h2>
                  <p class="mb-4 text-sm text-gray-600 dark:text-gray-400">
                    {{ $t('preferences.content.region.description') }}
                  </p>
                  <RegionSelector
                    v-model="contentPreferences.region"
                    @update:model-value="handleRegionChange"
                  />
                </Card>

                <!-- Preferred Languages -->
                <Card padding="lg">
                  <h2
                    class="mb-2 text-xl font-semibold text-gray-800 dark:text-gray-300"
                  >
                    {{ $t('preferences.content.preferredLanguage.title') }}
                  </h2>
                  <p class="mb-4 text-sm text-gray-600 dark:text-gray-400">
                    {{
                      $t('preferences.content.preferredLanguage.description')
                    }}
                  </p>

                  <!-- Language Selector -->
                  <LanguageSelector
                    v-model="currentLanguageCode"
                    @update:model-value="handleLanguageChangeFromSelector"
                  />
                </Card>

                <!-- Included Providers -->
                <Card padding="lg">
                  <h2
                    class="mb-2 text-xl font-semibold text-gray-800 dark:text-gray-300"
                  >
                    {{ $t('preferences.content.includedProviders.title') }}
                  </h2>
                  <p class="mb-4 text-sm text-gray-600 dark:text-gray-400">
                    {{
                      $t('preferences.content.includedProviders.description')
                    }}
                  </p>

                  <!-- Provider Search -->
                  <SearchableSelect
                    ref="providerSelectRef"
                    select-id="provider-selector"
                    :close-on-click-outside="true"
                    :options="availableProviders"
                    :selected-items="selectedProviders"
                    :placeholder="
                      $t(
                        'preferences.content.includedProviders.searchPlaceholder'
                      )
                    "
                    :get-item-key="(provider: any) => provider.provider_id"
                    :get-item-label="
                      (provider: any) => provider.provider_name || ''
                    "
                    :is-item-selected="
                      (provider: any, selected: any[]) =>
                        selected.some(
                          (p: any) => p.provider_id === provider.provider_id
                        )
                    "
                    :filter-item="
                      (provider: any, query: string) =>
                        provider.provider_name &&
                        String(provider.provider_name)
                          .toLowerCase()
                          .includes(query.toLowerCase())
                    "
                    :max-results="10"
                    @select="(item: any) => addProvider(item)"
                  >
                    <template
                      #items="{ filteredOptions: providers, selectItem }"
                    >
                      <div
                        v-for="provider in providers"
                        :key="(provider as any).provider_id"
                        class="flex gap-3 items-center px-4 py-3 transition-colors duration-150 cursor-pointer dark:hover:bg-gray-800/50 hover:bg-gray-100/50"
                        @mousedown.prevent="selectItem(provider)"
                        @click="selectItem(provider)"
                      >
                        <img
                          v-if="(provider as any).logo_path"
                          :src="`https://image.tmdb.org/t/p/w45${(provider as any).logo_path}`"
                          :alt="(provider as any).provider_name"
                          class="object-contain flex-shrink-0 w-auto h-8"
                        />
                        <div
                          v-else
                          class="flex flex-shrink-0 justify-center items-center w-8 h-8 bg-gray-200 rounded dark:bg-gray-700"
                        >
                          <span
                            class="text-xs text-gray-600 dark:text-gray-300"
                            >{{
                              String(
                                (provider as any).provider_name || ''
                              ).charAt(0)
                            }}</span
                          >
                        </div>
                        <span
                          class="text-sm text-gray-800 dark:text-gray-300"
                          >{{ (provider as any).provider_name }}</span
                        >
                      </div>
                    </template>
                  </SearchableSelect>

                  <!-- Selected Providers List -->
                  <div v-if="selectedProviders.length > 0" class="mb-4">
                    <p
                      class="mb-2 text-sm font-medium text-gray-800 dark:text-gray-300"
                    >
                      {{ $t('preferences.content.includedProviders.selected') }}
                      ({{ selectedProviders.length }})
                    </p>
                    <div class="flex flex-wrap gap-2">
                      <div
                        v-for="provider in selectedProviders"
                        :key="provider.provider_id"
                        class="flex gap-2 items-center px-4 py-1.5 rounded-full border backdrop-blur-xl dark:bg-gray-900/40 bg-gray-100/80 border-gray-300/50 dark:border-white/10"
                      >
                        <img
                          v-if="provider.logo_path"
                          :src="`https://image.tmdb.org/t/p/w45${provider.logo_path}`"
                          :alt="provider.provider_name"
                          class="object-contain w-auto h-5"
                        />
                        <span
                          class="text-xs font-semibold text-gray-800 dark:text-gray-300"
                          >{{ provider.provider_name }}</span
                        >
                        <CloseButton
                          custom-class="ml-1"
                          :aria-label="
                            $t('preferences.content.includedProviders.remove', {
                              name: provider.provider_name,
                            })
                          "
                          @click="removeProvider(provider.provider_id)"
                        />
                      </div>
                    </div>
                  </div>

                  <!-- Info Message -->
                  <p
                    v-if="selectedProviders.length === 0"
                    class="text-sm italic text-gray-600 dark:text-gray-400"
                  >
                    {{
                      $t('preferences.content.includedProviders.allIncluded')
                    }}
                  </p>
                </Card>

                <!-- Favorite Genres -->
                <Card padding="lg">
                  <h2
                    class="mb-2 text-xl font-semibold text-gray-800 dark:text-gray-300"
                  >
                    {{ $t('preferences.content.favoriteGenres.title') }}
                  </h2>
                  <p class="mb-4 text-sm text-gray-600 dark:text-gray-400">
                    {{ $t('preferences.content.favoriteGenres.description') }}
                  </p>

                  <!-- Genre Search -->
                  <SearchableSelect
                    ref="genreSelectRef"
                    select-id="genre-selector"
                    :close-on-click-outside="true"
                    :options="availableGenres"
                    :selected-items="selectedGenres"
                    :placeholder="
                      $t('preferences.content.favoriteGenres.searchPlaceholder')
                    "
                    :get-item-key="(genre: any) => `${genre.id}-${genre.type}`"
                    :get-item-label="(genre: any) => genre.name || ''"
                    :is-item-selected="
                      (genre: any, selected: any[]) =>
                        selected.some((g: any) => g.id === genre.id)
                    "
                    :filter-item="
                      (genre: any, query: string) =>
                        genre.name &&
                        String(genre.name)
                          .toLowerCase()
                          .includes(query.toLowerCase())
                    "
                    @select="(item: any) => addGenre(item)"
                  >
                    <template #items="{ filteredOptions: genres, selectItem }">
                      <template
                        v-for="(genre, index) in genres"
                        :key="`${(genre as any).id}-${(genre as any).type}`"
                      >
                        <!-- Separator: show only when type changes (first item of each type) -->
                        <div
                          v-if="
                            Number(index) === 0 ||
                            (genres[Number(index) - 1] as any)?.type !==
                              (genre as any).type
                          "
                          class="px-4 py-2 text-xs font-semibold tracking-wider text-gray-500 uppercase dark:text-gray-400"
                          :class="
                            Number(index) > 0
                              ? 'border-t border-gray-200 dark:border-gray-700'
                              : ''
                          "
                        >
                          {{
                            (genre as any).type === MediaTypeEnum.movie
                              ? t('preferences.content.contentTypes.movie')
                              : t('preferences.content.contentTypes.tv')
                          }}
                        </div>
                        <!-- Genre option -->
                        <div
                          class="flex gap-3 items-center px-4 py-3 transition-colors duration-150 cursor-pointer dark:hover:bg-gray-800/50 hover:bg-gray-100/50"
                          @mousedown.prevent="selectItem(genre)"
                          @click="selectItem(genre)"
                        >
                          <span
                            class="text-sm text-gray-800 dark:text-gray-300"
                            >{{ (genre as any).name }}</span
                          >
                        </div>
                      </template>
                    </template>
                  </SearchableSelect>

                  <!-- Selected Genres List -->
                  <div v-if="selectedGenres.length > 0" class="mb-4">
                    <p
                      class="mb-2 text-sm font-medium text-gray-800 dark:text-gray-300"
                    >
                      {{ $t('preferences.content.favoriteGenres.selected') }}
                      ({{ selectedGenres.length }})
                    </p>
                    <div class="flex flex-wrap gap-2">
                      <div
                        v-for="genre in selectedGenres"
                        :key="genre.id"
                        class="flex gap-2 items-center px-4 py-1.5 rounded-full border backdrop-blur-xl md:py-2.5 dark:bg-gray-900/40 bg-gray-100/80 border-gray-300/50 dark:border-white/10"
                      >
                        <span
                          class="text-xs font-medium text-gray-800 md:text-sm dark:text-gray-300"
                          >{{ genre.name }}</span
                        >
                        <CloseButton
                          custom-class="ml-1"
                          :aria-label="
                            $t('preferences.content.favoriteGenres.remove', {
                              name: genre.name,
                            })
                          "
                          @click="removeGenre(genre.id)"
                        />
                      </div>
                    </div>
                  </div>

                  <!-- Info Message -->
                  <p
                    v-if="selectedGenres.length === 0"
                    class="text-sm italic text-gray-600 dark:text-gray-400"
                  >
                    {{ $t('preferences.content.favoriteGenres.noneSelected') }}
                  </p>
                </Card>

                <!-- Save Button -->
                <div class="flex justify-end mt-6">
                  <Button
                    variant="primary"
                    size="small"
                    :disabled="!hasUnsavedContentChanges"
                    @click="saveContentPreferences"
                  >
                    {{ $t('common.save') }}
                  </Button>
                </div>
              </div>
            </div>
          </template>
        </Tabs>

        <!-- Generating Recommendations Modal -->
        <Modal :is-open="showGeneratingModal" :closeable="false">
          <div class="flex flex-col gap-4 items-center text-center">
            <div
              class="w-12 h-12 rounded-full border-b-2 animate-spin border-primary-600"
            ></div>
            <h2 class="text-xl font-semibold text-gray-800 dark:text-gray-300">
              {{ $t('home.generatingRecommendations') }}
            </h2>
            <p class="text-gray-700 dark:text-gray-300">
              {{ $t('home.generatingRecommendationsDescription') }}
            </p>
          </div>
        </Modal>

        <!-- Save Confirmation Modal -->
        <Modal
          :is-open="showSaveConfirmationModal"
          @close="showSaveConfirmationModal = false"
        >
          <div class="flex flex-col gap-4">
            <h2 class="text-xl font-semibold text-gray-800 dark:text-gray-300">
              {{ $t('preferences.content.saveConfirmationTitle') }}
            </h2>
            <p class="text-gray-700 dark:text-gray-400">
              {{ $t('preferences.content.saveConfirmationMessage') }}
            </p>
            <div class="flex gap-3 justify-end mt-4">
              <Button
                variant="outline"
                size="small"
                @click="
                  showSaveConfirmationModal = false;
                  revertContentPreferencesChanges();
                "
              >
                {{ $t('common.cancel') }}
              </Button>
              <Button
                variant="primary"
                size="small"
                @click="confirmSaveContentPreferences"
              >
                {{ $t('common.confirm') }}
              </Button>
            </div>
          </div>
        </Modal>

        <!-- Unsaved Changes Modal -->
        <Modal
          :is-open="showUnsavedChangesModal"
          @close="showUnsavedChangesModal = false"
        >
          <div class="flex flex-col gap-4">
            <h2 class="text-xl font-semibold text-gray-800 dark:text-gray-300">
              {{ $t('preferences.content.unsavedChangesTitle') }}
            </h2>
            <p class="text-gray-700 dark:text-gray-400">
              {{ $t('preferences.content.unsavedChangesMessage') }}
            </p>
            <div class="flex gap-3 justify-end mt-4">
              <Button
                variant="outline"
                size="small"
                @click="
                  showUnsavedChangesModal = false;
                  pendingNavigation = null;
                  pendingTabChange = null;
                  // Revert changes to saved state from DB
                  revertContentPreferencesChanges();
                "
              >
                {{ $t('common.cancel') }}
              </Button>
              <Button
                variant="primary"
                size="small"
                @click="
                  showUnsavedChangesModal = false;
                  hasUnsavedContentChanges = false;
                  // Handle pending navigation
                  if (pendingNavigation) {
                    pendingNavigation();
                    pendingNavigation = null;
                  }
                  // Handle pending tab change
                  if (pendingTabChange) {
                    const tabToChange = pendingTabChange;
                    pendingTabChange = null;
                    // Use nextTick to ensure modal is closed before changing tab
                    nextTick(() => {
                      activeTab = tabToChange;
                      const route = useRoute();
                      navigateTo(
                        {
                          path: route.path,
                          query: { ...route.query, tab: tabToChange },
                        },
                        { replace: true }
                      );
                    });
                  }
                "
              >
                {{ $t('common.leave') }}
              </Button>
            </div>
          </div>
        </Modal>

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
import { ref, computed, onMounted, watch, nextTick, onUnmounted } from 'vue';
import { onBeforeRouteLeave } from 'vue-router';
import { useUserStore } from '@/stores/user';
import { TitleStatus } from '@/types/TitleStatus';
import CloseButton from '@/components/ui/CloseButton.vue';
import Button from '@/components/ui/Button.vue';
import Modal from '@/components/ui/Modal.vue';
import Tabs from '@/components/ui/Tabs.vue';
import AppShell from '@/components/layout/AppShell.vue';
import PageContainer from '@/components/layout/PageContainer.vue';
import TabButton from '@/components/ui/TabButton.vue';
import Card from '@/components/ui/Card.vue';
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
  getTitleByTmdbIdWithLanguage,
} from '@/composables/database/titles';
import {
  isNotFoundError,
  isUniqueViolationError,
} from '@/composables/database/errorCodes';
import { getProfile } from '@/composables/database/profiles';
import { getSession } from '@/composables/database/auth';
import SearchBar from '@/components/SearchBar.vue';
import Avatar from '@/components/Avatar.vue';
import TitleGrid from '@/components/TitleGrid.vue';
import EmptyState from '@/components/EmptyState.vue';
import Spinner from '@/components/Spinner.vue';
import Toast from '@/components/ui/Toast.vue';
import LanguageSelector from '@/components/LanguageSelector.vue';
import RegionSelector from '@/components/RegionSelector.vue';
import SearchableSelect from '@/components/ui/SearchableSelect.vue';
import { useUndoToast } from '@/composables/useUndoToast';
import type { TMDBSearchResult } from '@/types/tmdb/Search';
import {
  AVAILABLE_LANGUAGES,
  LanguageCode,
  DEFAULT_LANGUAGE,
} from '@/constants/languages';
import type { Language } from '@/constants/languages';

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
const activeTab = ref<
  'liked' | 'seen' | 'not-interested' | 'content-preferences'
>('liked');
const titleToDelete = ref<{ id: string; title: string } | null>(null);
const showRemoveLikeModal = ref(false);
const titleToRemoveLike = ref<{
  id: string;
  title: string;
  tmdb_id: number;
  type: typeof MediaTypeEnum.movie | typeof MediaTypeEnum.tv;
} | null>(null);
const hasUnsavedContentChanges = ref(false);
const showUnsavedChangesModal = ref(false);
const showSaveConfirmationModal = ref(false);
const showGeneratingModal = ref(false);
const pendingNavigation = ref<(() => void) | null>(null);
const pendingTabChange = ref<
  'liked' | 'seen' | 'not-interested' | 'content-preferences' | null
>(null);
const savedContentPreferences = ref<{
  preferred_language?: string;
  favorite_genres?: number[];
  included_providers?: number[];
  region?: string;
} | null>(null);
const savedSelectedGenres = ref<Array<{ id: number; name: string }>>([]);
const savedSelectedProviders = ref<
  Array<{
    provider_id: number;
    provider_name: string;
    logo_path: string | null;
  }>
>([]);
const savedSelectedLanguage = ref<{
  code: string;
  name: string;
} | null>(null);

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
    liked?: boolean;
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

// Avatar size: smaller on mobile
const isMobile = ref(false);
const avatarSize = computed(() => {
  return isMobile.value ? 'lg' : 'xl';
});

const checkMobile = () => {
  isMobile.value = window.innerWidth < 768; // md breakpoint
};

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
    id: 'content-preferences' as const,
    label: t('preferences.tabs.content'),
    count: null,
  },
]);

// Helper functions
const showError = (message: string) => {
  showToast(message, null, 5000);
};

const showSuccess = (message: string) => {
  showToast(message, null, 5000);
};

// Handle tab button click - intercepts before Tabs component changes state
const handleTabButtonClick = (
  tabId: 'liked' | 'seen' | 'not-interested' | 'content-preferences',
  setActiveTab: (tab: string) => void
) => {
  // If trying to change from content-preferences tab and there are unsaved changes, show modal
  if (
    activeTab.value === 'content-preferences' &&
    tabId !== 'content-preferences' &&
    hasUnsavedContentChanges.value
  ) {
    pendingTabChange.value = tabId;
    showUnsavedChangesModal.value = true;
    // Don't call setActiveTab - prevent the tab change
    return;
  }

  // No unsaved changes or same tab, proceed with change
  setActiveTab(tabId);
};

// Handle tab change and update URL (called after Tabs component changes state)
const handleTabChange = (
  tabId: 'liked' | 'seen' | 'not-interested' | 'content-preferences'
) => {
  // Update local state and URL
  activeTab.value = tabId;
  const route = useRoute();
  navigateTo(
    {
      path: route.path,
      query: { ...route.query, tab: tabId },
    },
    { replace: true }
  );
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

    // Use preferred language in ISO/TMDB format (e.g., 'ca-ES', 'es-ES')
    // This ensures consistency with the format stored in JSONB fields
    const preferredLang =
      contentPreferences.value.preferred_language || LanguageCode.SPANISH;

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
    // Use preferred language in ISO/TMDB format (e.g., 'ca-ES', 'es-ES')
    // This ensures consistency with the format stored in JSONB fields
    const preferredLang =
      contentPreferences.value.preferred_language || LanguageCode.SPANISH;
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
    // Use preferred language in ISO/TMDB format (e.g., 'ca-ES', 'es-ES')
    // This ensures consistency with the format stored in JSONB fields
    const preferredLang =
      contentPreferences.value.preferred_language || LanguageCode.SPANISH;
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
    // Use preferred language in ISO/TMDB format (e.g., 'ca-ES', 'es-ES')
    // This ensures consistency with the format stored in JSONB fields
    const preferredLang =
      contentPreferences.value.preferred_language || LanguageCode.SPANISH;
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
        title: { es: result.title || result.name || 'Unknown' }, // Multi-language JSONB
        type: result.media_type,
        poster_path: result.poster_path ? { es: result.poster_path } : null, // Multi-language JSONB
        backdrop_path: result.backdrop_path || null,
        overview: result.overview ? { es: result.overview } : null, // Multi-language JSONB
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

    // Get title in user's preferred language (using ISO/TMDB format)
    const preferredLang =
      contentPreferences.value.preferred_language || LanguageCode.SPANISH;
    const { data: titleData } = await getTitleByTmdbIdWithLanguage(
      result.id,
      result.media_type!,
      preferredLang,
      contentPreferences.value.region
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
  } catch {
    showError(t('preferences.errorAdding'));
  }
};

const handleRemoveLikedClick = (title: {
  id: string;
  title: string;
  tmdb_id: number;
}) => {
  titleToDelete.value = { id: title.id, title: title.title };
};

const confirmRemoveLiked = async () => {
  if (!titleToDelete.value) return;

  const title = titleToDelete.value;
  const titleToRestore = likedTitles.value.find((t) => t.id === title.id);
  titleToDelete.value = null;

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
                status: TitleStatus.SEEN,
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
}) => {
  try {
    const { error } = await deleteUserTitleStatus(title.id);
    if (error) throw error;

    seenTitles.value = seenTitles.value.filter((t) => t.id !== title.id);
    showSuccess(t('seen.titleRemoved'));
  } catch {
    showError(t('seen.errorRemoving'));
    await fetchSeenTitles();
  }
};

const handleAddToLiked = async (title: {
  id: string;
  title: string;
  tmdb_id: number;
  type: typeof MediaTypeEnum.movie | typeof MediaTypeEnum.tv;
  liked?: boolean;
}) => {
  console.log('[UNLIKE DEBUG] handleAddToLiked called', {
    title: title.title,
    tmdb_id: title.tmdb_id,
    type: title.type,
    currentLiked: title.liked,
  });

  try {
    const id = userId.value;
    if (!id) {
      console.warn('[UNLIKE DEBUG] No userId available');
      return;
    }

    // Check if title is already liked using the database
    const { data: likedTitle, error: likedError } = await getUserLikedTitle(
      id,
      title.tmdb_id
    );

    console.log('[UNLIKE DEBUG] getUserLikedTitle result', {
      likedTitle,
      error: likedError,
      hasLikedTitle: !!likedTitle,
    });

    if (likedTitle) {
      console.log('[UNLIKE DEBUG] Title is already liked, showing modal');
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

    console.log('[UNLIKE DEBUG] Title is not liked, adding it');

    // Check if limit reached
    if (likedTitles.value.length >= 10) {
      showError(t('preferences.limitReached'));
      return;
    }

    // Update the title status to liked=true
    const { error: likeError } = await upsertUserTitleStatus({
      user_id: id,
      tmdb_id: title.tmdb_id,
      type: title.type,
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

    // Get title in user's preferred language
    const preferredLang =
      contentPreferences.value.preferred_language || LanguageCode.SPANISH;
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
    showSuccess(t('preferences.titleAdded'));

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
  } catch (error) {
    console.error('Error adding to liked:', error);
    showError(t('preferences.errorAdding'));
    await fetchSeenTitles();
  }
};

// Handle removing like after confirmation (from Seen tab)
const confirmRemoveLikeFromSeen = async () => {
  console.log('[UNLIKE DEBUG] confirmRemoveLikeFromSeen called', {
    title: titleToRemoveLike.value,
  });

  if (!titleToRemoveLike.value) {
    console.warn('[UNLIKE DEBUG] No title to remove like');
    return;
  }

  const title = titleToRemoveLike.value;
  showRemoveLikeModal.value = false;

  try {
    const id = userId.value;
    if (!id) {
      console.warn(
        '[UNLIKE DEBUG] No userId available in confirmRemoveLikeFromSeen'
      );
      return;
    }

    console.log('[UNLIKE DEBUG] Removing like', {
      userId: id,
      tmdb_id: title.tmdb_id,
      type: title.type,
    });

    // Remove like
    const { error: likeError } = await upsertUserTitleStatus({
      user_id: id,
      tmdb_id: title.tmdb_id,
      type: title.type,
      status: TitleStatus.SEEN, // Keep status as seen, just remove liked
      liked: false,
    });

    console.log('[UNLIKE DEBUG] Remove like result', { error: likeError });

    if (likeError) {
      throw likeError;
    }

    // Update frontend state - remove from likedTitles and update seenTitles
    likedTitles.value = likedTitles.value.filter(
      (t) => !(t.tmdb_id === title.tmdb_id && t.type === title.type)
    );

    // Update the title in seen titles to mark it as not liked
    const seenTitleIndex = seenTitles.value.findIndex((t) => t.id === title.id);
    if (seenTitleIndex !== -1) {
      seenTitles.value[seenTitleIndex] = {
        ...seenTitles.value[seenTitleIndex],
        liked: false,
      };
    }

    // Show toast about regenerating recommendations
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
      console.error('[UNLIKE DEBUG] Error regenerating pool:', poolError);
      // Don't show error to user, pool regeneration is background task
    }

    titleToRemoveLike.value = null;
  } catch (error) {
    console.error('[UNLIKE DEBUG] Error in confirmRemoveLikeFromSeen:', error);
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
                ?.type || MediaTypeEnum.movie,
            status: TitleStatus.NOT_INTERESTED,
          });
          await fetchNotInterestedTitles();
        },
      },
      7000
    );
  } catch {
    showError(t('notInterested.errorUndo'));
    await fetchNotInterestedTitles();
  }
};

// Content Preferences State
const contentPreferences = ref<{
  preferred_language?: string;
  favorite_genres?: number[];
  included_providers?: number[];
  region?: string;
}>({
  preferred_language: LanguageCode.SPANISH, // Default to Spanish (TMDB format)
  favorite_genres: [],
  included_providers: [],
  region: undefined,
});

const availableLanguages = AVAILABLE_LANGUAGES;

// Language selector state
const selectedLanguage = ref<{
  code: string;
  name: string;
} | null>(null);

// Computed for current language code (for select value)
const currentLanguageCode = computed(() => {
  return (
    selectedLanguage.value?.code ||
    contentPreferences.value.preferred_language ||
    LanguageCode.SPANISH
  );
});

// Preload genres using useAsyncData (runs during setup, before mount)
const { data: genresData } = useAsyncData(
  'genres',
  async () => {
    // Fetch both movie and TV genres
    const [movieResponse, tvResponse] = await Promise.all([
      $fetch<{ genres: Array<{ id: number; name: string }> }>(
        `/api/tmdb/genres?type=${MediaTypeEnum.movie}`
      ),
      $fetch<{ genres: Array<{ id: number; name: string }> }>(
        `/api/tmdb/genres?type=${MediaTypeEnum.tv}`
      ),
    ]);
    return { movie: movieResponse, tv: tvResponse };
  },
  {
    server: false, // Only fetch on client
    default: () => ({ movie: { genres: [] }, tv: { genres: [] } }),
  }
);

const availableGenres = computed(() => {
  if (!genresData.value) return [];

  // Combine all genres with their type (movie or tv)
  const allGenres: Array<{
    id: number;
    name: string;
    type: typeof MediaTypeEnum.movie | typeof MediaTypeEnum.tv;
  }> = [];

  // Add movie genres
  genresData.value.movie.genres.forEach((g: { id: number; name: string }) => {
    if (g.name) {
      allGenres.push({ id: g.id, name: g.name, type: MediaTypeEnum.movie });
    }
  });

  // Add TV genres
  genresData.value.tv.genres.forEach((g: { id: number; name: string }) => {
    if (g.name) {
      allGenres.push({ id: g.id, name: g.name, type: MediaTypeEnum.tv });
    }
  });

  // Sort: first by type (movie first, then tv), then alphabetically by name
  return allGenres
    .filter((genre) => genre.name) // Filter out any genres without a name
    .sort((a, b) => {
      // First sort by type: movie comes before tv
      if (a.type !== b.type) {
        return a.type === MediaTypeEnum.movie ? -1 : 1;
      }
      // Then sort alphabetically by name
      return (a.name || '').localeCompare(b.name || '');
    });
});

// Genre selector state
const selectedGenres = ref<
  Array<{
    id: number;
    name: string;
  }>
>([]);

// Preload providers using useAsyncData (runs during setup, before mount)
// Include credentials to ensure user session is sent for region detection
const { data: providersData } = useAsyncData(
  'watch-providers',
  async () => {
    const response = await $fetch<{
      results: Array<{
        provider_id: number;
        provider_name: string;
        logo_path: string | null;
      }>;
    }>('/api/tmdb/watch-providers', {
      credentials: 'include', // Include cookies for authentication
    });

    return response;
  },
  {
    server: false, // Only fetch on client
    default: () => ({ results: [] }),
  }
);

const availableProviders = computed(() => {
  if (!providersData.value) {
    return [];
  }

  if (!providersData.value.results) {
    return [];
  }

  if (!Array.isArray(providersData.value.results)) {
    return [];
  }

  const providers = providersData.value.results
    .map((p) => ({
      provider_id: p.provider_id,
      provider_name: p.provider_name,
      logo_path: p.logo_path,
    }))
    .filter((p) => p.provider_id && p.provider_name) // Filter out invalid entries
    .sort((a, b) => a.provider_name.localeCompare(b.provider_name));

  return providers;
});

// Provider selector state
const selectedProviders = ref<
  Array<{
    provider_id: number;
    provider_name: string;
    logo_path: string | null;
  }>
>([]);

// Refs for SearchableSelect components (kept for potential future use)
const providerSelectRef = ref<InstanceType<typeof SearchableSelect> | null>(
  null
);
const genreSelectRef = ref<InstanceType<typeof SearchableSelect> | null>(null);

// Fetch content preferences
const fetchContentPreferences = async () => {
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
        preferred_language?: string;
        favorite_genres?: number[];
        included_providers?: number[];
        region?: string;
      } | null;
    }>('/api/users/preferences', {
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    });

    if (response.success && response.preferences) {
      // Use the value from DB directly, only default to DEFAULT_LANGUAGE if it's truly null/undefined
      const dbLanguage = response.preferences.preferred_language || DEFAULT_LANGUAGE;

      contentPreferences.value = {
        preferred_language: dbLanguage ?? LanguageCode.SPANISH, // Only default if null/undefined
        favorite_genres: response.preferences.favorite_genres || [],
        included_providers: response.preferences.included_providers || [],
        region: response.preferences.region || undefined,
      };

      // Load selected language - use the actual DB value
      const languageCode = dbLanguage ?? LanguageCode.SPANISH;

      const languageToSelect = availableLanguages.find(
        (l: Language) => l.code === languageCode
      );

      if (languageToSelect) {
        selectedLanguage.value = languageToSelect;
      } else {
        // Default to Spanish if not found
        selectedLanguage.value =
          availableLanguages.find(
            (l: Language) => l.code === LanguageCode.SPANISH
          ) || null;
      }

      // Map genres - wait for genres to be available if needed
      if (
        contentPreferences.value.favorite_genres &&
        contentPreferences.value.favorite_genres.length > 0
      ) {
        if (availableGenres.value.length > 0) {
          const mappedGenres = availableGenres.value.filter((g) =>
            contentPreferences.value.favorite_genres?.includes(g.id)
          );
          selectedGenres.value = mappedGenres;
        } else {
          // Genres not loaded yet, watcher will handle it
        }
      } else {
        selectedGenres.value = [];
      }

      // Map providers - wait for providers to be available if needed
      if (
        contentPreferences.value.included_providers &&
        contentPreferences.value.included_providers.length > 0
      ) {
        if (availableProviders.value.length > 0) {
          const mappedProviders = availableProviders.value.filter((p) =>
            contentPreferences.value.included_providers?.includes(p.provider_id)
          );
          selectedProviders.value = mappedProviders;
        } else {
          // Providers not loaded yet, watcher will handle it
        }
      } else {
        selectedProviders.value = [];
      }

      // Save initial state for comparison and rollback
      // Use the actual DB values, not the mapped selected items (which may be empty if not loaded yet)
      savedContentPreferences.value = {
        preferred_language:
          selectedLanguage.value?.code ||
          contentPreferences.value.preferred_language,
        favorite_genres: contentPreferences.value.favorite_genres
          ? [...contentPreferences.value.favorite_genres]
          : [],
        included_providers: contentPreferences.value.included_providers
          ? [...contentPreferences.value.included_providers]
          : [],
        region: contentPreferences.value.region || undefined,
      };
      savedSelectedGenres.value = [...selectedGenres.value];
      savedSelectedProviders.value = [...selectedProviders.value];
      savedSelectedLanguage.value = selectedLanguage.value
        ? { ...selectedLanguage.value }
        : null;
      hasUnsavedContentChanges.value = false;
    } else {
      // No preferences found, reset to empty
      selectedLanguage.value = null;
      selectedGenres.value = [];
      selectedProviders.value = [];
      contentPreferences.value = {
        preferred_language: LanguageCode.SPANISH,
        favorite_genres: [],
        included_providers: [],
        region: undefined,
      };
    }
  } catch (error) {
    console.error('Error fetching content preferences:', error);
  }
};

// Genres and providers are now preloaded using useLazyFetch above

// Add provider to selected list
const addProvider = (provider: {
  provider_id: number;
  provider_name: string;
  logo_path: string | null;
}) => {
  // Check if already selected
  if (
    selectedProviders.value.some((p) => p.provider_id === provider.provider_id)
  ) {
    return;
  }

  selectedProviders.value.push(provider);
  contentPreferences.value.included_providers = selectedProviders.value.map(
    (p) => p.provider_id
  );
  markContentPreferencesChanged();
};

// Remove provider from selected list
const removeProvider = (providerId: number) => {
  selectedProviders.value = selectedProviders.value.filter(
    (p) => p.provider_id !== providerId
  );
  contentPreferences.value.included_providers = selectedProviders.value.map(
    (p) => p.provider_id
  );
  markContentPreferencesChanged();
};

// Handle language change from selector component
const handleLanguageChangeFromSelector = (code: string) => {
  // Find the language object
  const lang = availableLanguages.find((l) => l.code === code);

  if (lang) {
    changeLanguage(lang);
  }
};

// Change selected language (single selection)
const changeLanguage = (lang: { code: string; name: string }) => {
  // If already selected, do nothing
  if (selectedLanguage.value?.code === lang.code) {
    return;
  }

  // Update language and mark as changed
  selectedLanguage.value = lang;
  contentPreferences.value.preferred_language = lang.code;
  markContentPreferencesChanged();
};

// Add genre to selected list
const addGenre = (genre: {
  id: number;
  name: string;
  type?: typeof MediaTypeEnum.movie | typeof MediaTypeEnum.tv;
}) => {
  // Check if already selected
  if (selectedGenres.value.some((g) => g.id === genre.id)) {
    return;
  }

  // Add genre (only store id and name, not type)
  selectedGenres.value.push({ id: genre.id, name: genre.name });
  contentPreferences.value.favorite_genres = selectedGenres.value.map(
    (g) => g.id
  );
  markContentPreferencesChanged();
};

// Remove genre from selected list
const removeGenre = (genreId: number) => {
  selectedGenres.value = selectedGenres.value.filter((g) => g.id !== genreId);
  contentPreferences.value.favorite_genres = selectedGenres.value.map(
    (g) => g.id
  );
  markContentPreferencesChanged();
};

// Handle region change
const handleRegionChange = () => {
  markContentPreferencesChanged();
};

// Mark content preferences as changed - compares current state with saved state
const markContentPreferencesChanged = () => {
  if (!savedContentPreferences.value) {
    // If no saved state, mark as changed if there are any preferences set
    hasUnsavedContentChanges.value =
      !!selectedLanguage.value ||
      selectedGenres.value.length > 0 ||
      selectedProviders.value.length > 0 ||
      !!contentPreferences.value.region;
    return;
  }

  // Build current preferences object for comparison
  const currentPreferences = {
    preferred_language: selectedLanguage.value?.code,
    favorite_genres: [...selectedGenres.value.map((g) => g.id)].sort(),
    included_providers: [
      ...selectedProviders.value.map((p) => p.provider_id),
    ].sort(),
    region: contentPreferences.value.region || null,
  };

  // Build saved preferences object for comparison
  const savedPrefs = {
    preferred_language:
      savedContentPreferences.value.preferred_language || null,
    favorite_genres: [
      ...(savedContentPreferences.value.favorite_genres || []),
    ].sort(),
    included_providers: [
      ...(savedContentPreferences.value.included_providers || []),
    ].sort(),
    region: savedContentPreferences.value.region || null,
  };

  // Deep comparison using JSON.stringify
  hasUnsavedContentChanges.value =
    JSON.stringify(currentPreferences) !== JSON.stringify(savedPrefs);
};

// Revert content preferences to saved state
const revertContentPreferencesChanges = () => {
  if (!savedContentPreferences.value) {
    return;
  }

  // Revert contentPreferences
  contentPreferences.value = {
    preferred_language:
      savedContentPreferences.value.preferred_language || LanguageCode.SPANISH,
    favorite_genres: [...(savedContentPreferences.value.favorite_genres || [])],
    included_providers: [
      ...(savedContentPreferences.value.included_providers || []),
    ],
    region: savedContentPreferences.value.region || undefined,
  };

  // Revert selected items
  selectedGenres.value = savedSelectedGenres.value.map((g) => ({ ...g }));
  selectedProviders.value = savedSelectedProviders.value.map((p) => ({
    ...p,
  }));
  selectedLanguage.value = savedSelectedLanguage.value
    ? { ...savedSelectedLanguage.value }
    : null;

  hasUnsavedContentChanges.value = false;
};

// Save content preferences - shows confirmation modal first
const saveContentPreferences = async () => {
  if (!hasUnsavedContentChanges.value) {
    return;
  }

  // Show confirmation modal first
  showSaveConfirmationModal.value = true;
};

// Confirm save and actually save preferences
const confirmSaveContentPreferences = async () => {
  showSaveConfirmationModal.value = false;

  if (!hasUnsavedContentChanges.value) {
    return;
  }

  const id = userId.value;
  if (!id) return;

  try {
    const {
      data: { session },
    } = await getSession();

    if (!session?.access_token) {
      throw new Error(t('profile.notAuthenticated'));
    }

    // Logic: Ensure at least one language (default to Spanish if empty)
    // If selection exists, include only selected items
    const preferencesToSave = {
      preferred_language: selectedLanguage.value
        ? selectedLanguage.value.code
        : LanguageCode.SPANISH, // Default to Spanish if no languages selected
      favorite_genres:
        selectedGenres.value.length > 0
          ? selectedGenres.value.map((g) => g.id)
          : [], // Empty = all genres
      included_providers:
        selectedProviders.value.length > 0
          ? selectedProviders.value.map((p) => p.provider_id)
          : [], // Empty = all providers
      region: contentPreferences.value.region || null,
    };

    const response = await $fetch<{
      success: boolean;
      preferences: unknown;
    }>('/api/users/preferences', {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
      body: preferencesToSave,
    });

    if (response.success) {
      // Get the saved language code from the response (may be converted to TMDB format)
      const savedLanguageCode =
        (response.preferences as { preferred_language?: string })
          ?.preferred_language ||
        selectedLanguage.value?.code ||
        LanguageCode.SPANISH;

      // Note: Regions are now loaded based on app language (i18n locale), not user's preferred language
      // So we don't need to invalidate regions cache when preferred_language changes

      // Update contentPreferences with the saved value to keep everything in sync
      contentPreferences.value.preferred_language = savedLanguageCode;

      // Explicitly update selectedLanguage to match the saved value (don't rely on watcher)
      const languageToSelect = availableLanguages.find(
        (l: Language) => l.code === savedLanguageCode
      );
      if (languageToSelect) {
        selectedLanguage.value = languageToSelect;
      }

      // Regenerate recommendation pool with loading modal (clear existing pool first)
      // Show modal and disable closing
      showGeneratingModal.value = true;
      try {
        await $fetch('/api/recommendations/populate-pool?clearPool=true', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });
      } catch (poolError) {
        console.error('Error regenerating pool:', poolError);
        showToast(t('preferences.content.errorSaving'), null, 5000);
      } finally {
        showGeneratingModal.value = false;
      }

      hasUnsavedContentChanges.value = false;
      // Update saved state with the actual saved value from the response
      savedContentPreferences.value = {
        preferred_language: savedLanguageCode,
        favorite_genres: [...selectedGenres.value.map((g) => g.id)],
        included_providers: [
          ...selectedProviders.value.map((p) => p.provider_id),
        ],
        region: contentPreferences.value.region || undefined,
      };
      // Update saved selected items for potential rollback
      savedSelectedGenres.value = [...selectedGenres.value];
      savedSelectedProviders.value = [...selectedProviders.value];
      savedSelectedLanguage.value = selectedLanguage.value
        ? { ...selectedLanguage.value }
        : null;
    } else {
      throw new Error('Failed to save preferences');
    }
  } catch (error: unknown) {
    // Always log the full error to console
    console.error('Error saving content preferences:', error);

    // In development, show the actual error message (but filter out technical Nitro errors)
    // In production, show a generic error message
    let errorMessage = t('preferences.content.errorSaving');

    if (import.meta.dev) {
      // Helper function to check if a message is a technical Nitro/Vite error
      const isTechnicalError = (msg: string): boolean => {
        return (
          msg.includes('node_modules') ||
          msg.includes('nitropack') ||
          msg.includes('nitro-dev.mjs') ||
          msg.includes('Expected') ||
          msg.includes('Note that you need plugins')
        );
      };

      // Try to extract error message from fetch error
      // Prefer statusMessage (user-friendly) over message (may be technical)
      if (
        error &&
        typeof error === 'object' &&
        'statusMessage' in error &&
        typeof error.statusMessage === 'string' &&
        !isTechnicalError(error.statusMessage)
      ) {
        errorMessage = error.statusMessage;
      } else if (
        error &&
        typeof error === 'object' &&
        'data' in error &&
        error.data &&
        typeof error.data === 'object' &&
        'statusMessage' in error.data &&
        typeof error.data.statusMessage === 'string' &&
        !isTechnicalError(error.data.statusMessage)
      ) {
        errorMessage = error.data.statusMessage;
      } else if (
        error &&
        typeof error === 'object' &&
        'data' in error &&
        error.data &&
        typeof error.data === 'object' &&
        'message' in error.data &&
        typeof error.data.message === 'string' &&
        !isTechnicalError(error.data.message)
      ) {
        errorMessage = error.data.message;
      } else if (
        error instanceof Error &&
        error.message &&
        !isTechnicalError(error.message)
      ) {
        errorMessage = error.message;
      }
    }

    showError(errorMessage);
  }
};

// Watch for when genres and providers are loaded to map selected items
// This handles the case where genres/providers load before preferences
watch(
  [availableGenres, availableProviders],
  ([genres, providers]) => {
    // Map selected genres when genres are loaded and preferences exist
    if (
      genres.length > 0 &&
      contentPreferences.value.favorite_genres &&
      contentPreferences.value.favorite_genres.length > 0
    ) {
      // Only update if not already set or if preferences changed
      const currentGenreIds = selectedGenres.value.map((g) => g.id).sort();
      const prefGenreIds = [...contentPreferences.value.favorite_genres].sort();
      const idsMatch =
        currentGenreIds.length === prefGenreIds.length &&
        currentGenreIds.every((id, i) => id === prefGenreIds[i]);

      if (!idsMatch) {
        const mappedGenres = genres.filter((g) =>
          contentPreferences.value.favorite_genres?.includes(g.id)
        );
        selectedGenres.value = mappedGenres;
      }
    }

    // Map selected providers when providers are loaded and preferences exist
    if (
      providers.length > 0 &&
      contentPreferences.value.included_providers &&
      contentPreferences.value.included_providers.length > 0
    ) {
      // Only update if not already set or if preferences changed
      const currentProviderIds = selectedProviders.value
        .map((p) => p.provider_id)
        .sort();
      const prefProviderIds = [
        ...contentPreferences.value.included_providers,
      ].sort();
      const idsMatch =
        currentProviderIds.length === prefProviderIds.length &&
        currentProviderIds.every((id, i) => id === prefProviderIds[i]);

      if (!idsMatch) {
        const mappedProviders = providers.filter((p) =>
          contentPreferences.value.included_providers?.includes(p.provider_id)
        );
        selectedProviders.value = mappedProviders;
      }
    }
  },
  { immediate: true }
);

// Watch for when preferences are loaded to map genres and providers
// This handles the case where preferences load after genres/providers
watch(
  () => contentPreferences.value.favorite_genres,
  (genreIds) => {
    if (genreIds && genreIds.length > 0 && availableGenres.value.length > 0) {
      const currentGenreIds = selectedGenres.value.map((g) => g.id).sort();
      const prefGenreIds = [...genreIds].sort();
      const idsMatch =
        currentGenreIds.length === prefGenreIds.length &&
        currentGenreIds.every((id, i) => id === prefGenreIds[i]);

      if (!idsMatch) {
        const mappedGenres = availableGenres.value.filter((g) =>
          genreIds.includes(g.id)
        );
        selectedGenres.value = mappedGenres;
      }
    } else if (!genreIds || genreIds.length === 0) {
      // Only clear if we're sure there are no genres (not just because they're not loaded yet)
      // Check if preferences have been loaded (savedContentPreferences exists)
      if (availableGenres.value.length > 0 && savedContentPreferences.value) {
        selectedGenres.value = [];
      }
    }
  },
  { immediate: true }
);

watch(
  () => contentPreferences.value.included_providers,
  (providerIds) => {
    if (
      providerIds &&
      providerIds.length > 0 &&
      availableProviders.value.length > 0
    ) {
      const currentProviderIds = selectedProviders.value
        .map((p) => p.provider_id)
        .sort();
      const prefProviderIds = [...providerIds].sort();
      const idsMatch =
        currentProviderIds.length === prefProviderIds.length &&
        currentProviderIds.every((id, i) => id === prefProviderIds[i]);

      if (!idsMatch) {
        const mappedProviders = availableProviders.value.filter((p) =>
          providerIds.includes(p.provider_id)
        );
        selectedProviders.value = mappedProviders;
      }
    } else if (!providerIds || providerIds.length === 0) {
      // Only clear if we're sure there are no providers (not just because they're not loaded yet)
      // Check if preferences have been loaded (savedContentPreferences exists)
      if (
        availableProviders.value.length > 0 &&
        savedContentPreferences.value
      ) {
        selectedProviders.value = [];
      }
    }
  },
  { immediate: true }
);

// Watch for when preferred_language changes to map selected language
watch(
  () => contentPreferences.value.preferred_language,
  (languageCode) => {
    if (languageCode && availableLanguages.length > 0) {
      const languageToSelect = availableLanguages.find(
        (l: Language) => l.code === languageCode
      );

      if (languageToSelect) {
        // Only update if it's different to avoid unnecessary updates
        if (selectedLanguage.value?.code !== languageCode) {
          selectedLanguage.value = languageToSelect;
        }
        // Only default to Spanish if the code is truly invalid
        // Don't default if languageCode is a valid code that just isn't in availableLanguages
        const validCodes = Object.values(LanguageCode);
        if (!validCodes.includes(languageCode as LanguageCode)) {
          selectedLanguage.value =
            availableLanguages.find(
              (l: Language) => l.code === LanguageCode.SPANISH
            ) || null;
        }
      }
    } else if (!languageCode) {
      // No language - default to Spanish only if truly null/undefined
      selectedLanguage.value =
        availableLanguages.find(
          (l: Language) => l.code === LanguageCode.SPANISH
        ) || null;
    }
  },
  { immediate: false } // Don't run immediately, let fetchContentPreferences set it first
);

// Lifecycle
onMounted(async () => {
  checkMobile();
  window.addEventListener('resize', checkMobile);

  // Check if we should open a specific tab from query params
  const route = useRoute();
  const tabFromQuery = route.query.tab as string;
  if (tabFromQuery) {
    const validTabs: Array<
      'liked' | 'seen' | 'not-interested' | 'content-preferences'
    > = ['liked', 'seen', 'not-interested', 'content-preferences'];
    if (
      validTabs.includes(
        tabFromQuery as
          | 'liked'
          | 'seen'
          | 'not-interested'
          | 'content-preferences'
      )
    ) {
      activeTab.value = tabFromQuery as typeof activeTab.value;
    }
  }

  // Fetch preferences first to ensure preferred_language is available
  await Promise.all([fetchProfile(), fetchContentPreferences()]);
  // Then fetch all lists (which will use the preferred language)
  await fetchAllLists();

  // Add scroll and resize listeners
});

// Handle navigation away with unsaved changes
onBeforeRouteLeave((_to, _from, next) => {
  if (hasUnsavedContentChanges.value) {
    showUnsavedChangesModal.value = true;
    pendingNavigation.value = () => next();
  } else {
    next();
  }
});

onUnmounted(() => {
  window.removeEventListener('resize', checkMobile);
});

// Page meta
definePageMeta({
  middleware: 'auth',
});

// SEO: Private page - noindex, nofollow
useHead({
  title: t('preferences.title'),
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
