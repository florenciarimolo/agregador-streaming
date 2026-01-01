<template>
  <div class="container mx-auto max-w-7xl px-4 pb-6 pt-6">
    <!-- Profile Header -->
    <div class="mb-6">
      <div class="flex flex-row items-center gap-4 md:gap-6">
        <!-- Avatar -->
        <div class="flex-shrink-0 flex items-center">
          <div
            class="w-12 h-12 md:w-24 md:h-24 [&_.avatar-upload]:!w-full [&_.avatar-upload]:!h-full [&_.avatar-upload>div]:!w-full [&_.avatar-upload>div]:!h-full [&_.avatar-upload>div>div]:!w-full [&_.avatar-upload>div>div]:!h-full [&_.avatar-upload>div>div>img]:!w-full [&_.avatar-upload>div>div>img]:!h-full [&_.avatar-upload>div>div>img]:!object-cover [&_.avatar-upload>div>div>span]:!w-full [&_.avatar-upload>div>div>span]:!h-full"
          >
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
        </div>

        <!-- Profile Info -->
        <div class="flex-1 min-w-0 overflow-hidden">
          <div v-if="!isEditing" class="space-y-2">
            <div class="flex items-center gap-2">
              <h1
                class="text-sm font-medium dark:text-gray-300 text-gray-800 font-heading whitespace-nowrap"
              >
                {{ displayName || currentUser?.email || $t('profile.user') }}
              </h1>
              <button
                type="button"
                :aria-label="$t('profile.editProfile')"
                class="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors flex-shrink-0"
                @click="startEdit"
              >
                <IconEdit
                  icon-class="w-5 h-5 text-gray-600 dark:text-gray-400"
                />
              </button>
            </div>
            <p
              v-if="currentUser?.email"
              class="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap"
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
                @keydown.enter="saveProfile"
                @keydown.esc="cancelEdit"
              />
            </div>
            <div class="flex gap-3">
              <Button size="small" variant="primary" @click="saveProfile">
                {{ $t('common.save') }}
              </Button>
              <Button size="small" variant="outline" @click="cancelEdit">
                {{ $t('common.cancel') }}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Undo Toast -->
    <Toast />

    <!-- Confirmation Dialog for Delete -->
    <Modal :is-open="!!titleToDelete" @close="titleToDelete = null">
      <h3 class="text-lg font-semibold dark:text-gray-300 text-gray-800 mb-2">
        {{ $t('preferences.confirmDelete') }}
      </h3>
      <p class="text-gray-800 dark:text-gray-300 mb-4">
        {{
          $t('preferences.confirmDeleteMessage', {
            title: titleToDelete?.title,
          })
        }}
      </p>
      <div class="flex gap-3 justify-end">
        <Button size="small" variant="outline" @click="titleToDelete = null">
          {{ $t('common.cancel') }}
        </Button>
        <Button size="small" variant="danger" @click="confirmRemoveLiked">
          {{ $t('common.delete') }}
        </Button>
      </div>
    </Modal>

    <!-- Language Change Confirmation Modal -->
    <Modal
      :is-open="showLanguageChangeModal && !!pendingLanguageChange"
      :close-on-overlay-click="!isConfirmingLanguageChange"
      custom-class="relative"
      @close="
        if (!isConfirmingLanguageChange) {
          showLanguageChangeModal = false;
          pendingLanguageChange = null;
        }
      "
    >
      <!-- Loading overlay -->
      <div
        v-if="isConfirmingLanguageChange"
        class="absolute inset-0 bg-black/20 dark:bg-black/40 backdrop-blur-sm rounded-3xl flex items-center justify-center z-10 -m-6"
      >
        <div class="flex flex-col items-center gap-3">
          <div
            class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 dark:border-primary-400"
          ></div>
          <p class="text-sm text-gray-700 dark:text-gray-300">
            {{ $t('preferences.content.preferredLanguage.saving') }}
          </p>
        </div>
      </div>
      <h3 class="text-lg font-semibold dark:text-gray-300 text-gray-800 mb-2">
        {{ $t('preferences.content.preferredLanguage.confirmChangeTitle') }}
      </h3>
      <p class="text-gray-800 dark:text-gray-300 mb-4">
        {{ $t('preferences.content.preferredLanguage.confirmChangeMessage') }}
      </p>
      <div class="flex gap-3 justify-end">
        <Button
          size="small"
          variant="outline"
          :disabled="isConfirmingLanguageChange"
          @click="
            if (!isConfirmingLanguageChange) {
              showLanguageChangeModal = false;
              pendingLanguageChange = null;
            }
          "
        >
          {{ $t('common.cancel') }}
        </Button>
        <Button
          size="small"
          variant="primary"
          :disabled="isConfirmingLanguageChange"
          @click="confirmLanguageChange"
        >
          <template v-if="isConfirmingLanguageChange">
            <span
              class="animate-spin rounded-full h-4 w-4 border-b-2 border-white"
            ></span>
          </template>
          <template v-else>
            {{ $t('common.confirm') }}
          </template>
        </Button>
      </div>
    </Modal>

    <!-- Tabs for Lists -->
    <Tabs
      :default-tab="activeTab"
      @tab-change="
        (tab) =>
          handleTabChange(
            tab as 'liked' | 'seen' | 'not-interested' | 'content-preferences'
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
          @click="setActiveTab(tab.id)"
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
              class="mt-2 text-sm text-amber-600 dark:text-amber-400"
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
          <Spinner v-if="isLoading" :message="$t('notInterested.loading')" />

          <TitleGrid
            v-else-if="notInterestedTitles.length > 0"
            :titles="notInterestedTitles"
            :on-remove="handleRemoveNotInterested"
            :remove-label="$t('undo.undo')"
          />

          <EmptyState v-else :message="$t('notInterested.empty')" icon="x" />
        </div>

        <!-- Content Preferences Tab -->
        <div v-if="currentTab === 'content-preferences'">
          <div class="space-y-6">
            <!-- Preferred Languages -->
            <Card padding="lg" custom-class="relative">
              <h2
                class="text-xl font-semibold dark:text-gray-300 text-gray-800 mb-2"
              >
                {{ $t('preferences.content.preferredLanguage.title') }}
              </h2>
              <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">
                {{ $t('preferences.content.preferredLanguage.description') }}
              </p>

              <!-- Language Radio Buttons -->
              <div class="space-y-2">
                <label
                  v-for="lang in availableLanguages"
                  :key="lang.code"
                  class="flex items-center gap-3 p-3 rounded-lg dark:hover:bg-gray-800/50 hover:bg-gray-100/50 transition-colors duration-150 cursor-pointer custom-radio-label"
                  :class="{
                    'dark:bg-gray-800/30 bg-gray-100/50':
                      selectedLanguage?.code === lang.code,
                  }"
                >
                  <input
                    :id="`lang-${lang.code}`"
                    type="radio"
                    name="preferred-language"
                    :value="lang.code"
                    :checked="selectedLanguage?.code === lang.code"
                    class="custom-radio"
                    @change="changeLanguage(lang)"
                  />
                  <span class="text-sm dark:text-gray-300 text-gray-800 flex-1">
                    {{ `${lang.name} (${lang.code})` }}
                  </span>
                </label>
              </div>
            </Card>

            <!-- Content Types -->
            <Card padding="lg">
              <h2
                class="text-xl font-semibold dark:text-gray-300 text-gray-800 mb-2"
              >
                {{ $t('preferences.content.contentTypes.title') }}
              </h2>
              <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">
                {{ $t('preferences.content.contentTypes.description') }}
              </p>
              <div class="flex flex-wrap gap-4">
                <label
                  class="flex items-center gap-2 cursor-pointer custom-checkbox-label"
                >
                  <input
                    v-model="contentPreferences.content_types"
                    type="checkbox"
                    value="movie"
                    class="custom-checkbox"
                    @change="saveContentPreferences"
                  />
                  <span class="text-sm dark:text-gray-300 text-gray-800">{{
                    $t('preferences.content.contentTypes.movie')
                  }}</span>
                </label>
                <label
                  class="flex items-center gap-2 cursor-pointer custom-checkbox-label"
                >
                  <input
                    v-model="contentPreferences.content_types"
                    type="checkbox"
                    value="tv"
                    class="custom-checkbox"
                    @change="saveContentPreferences"
                  />
                  <span class="text-sm dark:text-gray-300 text-gray-800">{{
                    $t('preferences.content.contentTypes.tv')
                  }}</span>
                </label>
              </div>
            </Card>

            <!-- Favorite Genres -->
            <Card padding="lg" custom-class="relative">
              <h2
                class="text-xl font-semibold dark:text-gray-300 text-gray-800 mb-2"
              >
                {{ $t('preferences.content.favoriteGenres.title') }}
              </h2>
              <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">
                {{ $t('preferences.content.favoriteGenres.description') }}
              </p>

              <!-- Genre Search -->
              <div class="relative mb-4">
                <div class="relative">
                  <input
                    ref="genreInputRef"
                    v-model="genreSearchQuery"
                    type="text"
                    :placeholder="
                      $t('preferences.content.favoriteGenres.searchPlaceholder')
                    "
                    class="w-full px-4 py-2 pl-10 pr-4 text-sm dark:text-gray-300 text-gray-800 dark:bg-gray-800/50 bg-white/80 dark:border-gray-600 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-transparent focus:border-transparent backdrop-blur-xs transition-all opacity-90 hover:opacity-100"
                    @input="filterGenres"
                    @focus="handleGenreFocus"
                    @blur="handleGenreBlur"
                  />
                  <!-- Search Icon -->
                  <div
                    class="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none"
                  >
                    <svg
                      class="w-4 h-4 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                      />
                    </svg>
                  </div>
                </div>
              </div>

              <!-- Genre Search Results Dropdown (Teleported) -->
              <Teleport to="body">
                <Transition
                  enter-active-class="transition duration-200 ease-out"
                  enter-from-class="transform scale-95 opacity-0"
                  enter-to-class="transform scale-100 opacity-100"
                  leave-active-class="transition duration-150 ease-in"
                  leave-from-class="transform scale-100 opacity-100"
                  leave-to-class="transform scale-95 opacity-0"
                >
                  <div
                    v-if="
                      showGenreResults &&
                      filteredGenres.length > 0 &&
                      genreDropdownPosition
                    "
                    class="fixed z-[9999] dark:bg-gray-900/95 bg-white/95 backdrop-blur-sm dark:border-gray-600 border-gray-300 rounded-3xl shadow-xl max-h-64 overflow-y-auto custom-scrollbar"
                    :style="{
                      top: `${genreDropdownPosition.top}px`,
                      left: `${genreDropdownPosition.left}px`,
                      width: `${genreDropdownPosition.width}px`,
                    }"
                    @mousedown.prevent
                  >
                    <div class="py-2">
                      <div
                        v-for="genre in filteredGenres"
                        :key="genre.id"
                        class="flex items-center gap-3 px-4 py-3 cursor-pointer dark:hover:bg-gray-800/50 hover:bg-gray-100/50 transition-colors duration-150"
                        @mousedown.prevent="addGenre(genre)"
                        @click="addGenre(genre)"
                      >
                        <span
                          class="text-sm dark:text-gray-300 text-gray-800"
                          >{{ genre.name }}</span
                        >
                      </div>
                    </div>
                  </div>
                </Transition>
              </Teleport>

              <!-- Selected Genres List -->
              <div v-if="selectedGenres.length > 0" class="mb-4">
                <p
                  class="text-sm font-medium dark:text-gray-300 text-gray-800 mb-2"
                >
                  {{ $t('preferences.content.favoriteGenres.selected') }}
                  ({{ selectedGenres.length }})
                </p>
                <div class="flex flex-wrap gap-2">
                  <div
                    v-for="genre in selectedGenres"
                    :key="genre.id"
                    class="flex items-center gap-2 py-1.5 md:py-2.5 px-4 dark:bg-gray-900/40 bg-gray-100/80 backdrop-blur-xl rounded-full border border-gray-300/50 dark:border-white/10"
                  >
                    <span
                      class="text-xs md:text-sm font-medium dark:text-gray-300 text-gray-800"
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
                class="text-sm text-gray-600 dark:text-gray-400 italic"
              >
                {{ $t('preferences.content.favoriteGenres.noneSelected') }}
              </p>
            </Card>

            <!-- Included Providers -->
            <Card padding="lg" custom-class="relative">
              <h2
                class="text-xl font-semibold dark:text-gray-300 text-gray-800 mb-2"
              >
                {{ $t('preferences.content.includedProviders.title') }}
              </h2>
              <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">
                {{ $t('preferences.content.includedProviders.description') }}
              </p>

              <!-- Provider Search -->
              <div class="relative mb-4">
                <div class="relative">
                  <input
                    ref="providerInputRef"
                    v-model="providerSearchQuery"
                    type="text"
                    :placeholder="
                      $t(
                        'preferences.content.includedProviders.searchPlaceholder'
                      )
                    "
                    class="w-full px-4 py-2 pl-10 pr-4 text-sm dark:text-gray-300 text-gray-800 dark:bg-gray-800/50 bg-white/80 dark:border-gray-600 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-transparent focus:border-transparent backdrop-blur-xs transition-all opacity-90 hover:opacity-100"
                    @input="filterProviders"
                    @focus="handleProviderFocus"
                    @blur="handleProviderBlur"
                  />
                  <!-- Search Icon -->
                  <div
                    class="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none"
                  >
                    <svg
                      class="w-4 h-4 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                      />
                    </svg>
                  </div>
                </div>
              </div>

              <!-- Provider Search Results Dropdown (Teleported) -->
              <Teleport to="body">
                <Transition
                  enter-active-class="transition duration-200 ease-out"
                  enter-from-class="transform scale-95 opacity-0"
                  enter-to-class="transform scale-100 opacity-100"
                  leave-active-class="transition duration-150 ease-in"
                  leave-from-class="transform scale-100 opacity-100"
                  leave-to-class="transform scale-95 opacity-0"
                >
                  <div
                    v-if="
                      showProviderResults &&
                      providerSearchQuery.trim() &&
                      filteredProviders.length > 0 &&
                      providerDropdownPosition
                    "
                    class="fixed z-[9999] dark:bg-gray-900/95 bg-white/95 backdrop-blur-sm dark:border-gray-600 border-gray-300 rounded-lg shadow-xl max-h-64 overflow-y-auto custom-scrollbar"
                    :style="{
                      top: `${providerDropdownPosition.top}px`,
                      left: `${providerDropdownPosition.left}px`,
                      width: `${providerDropdownPosition.width}px`,
                    }"
                    @mousedown.prevent
                  >
                    <div class="py-2">
                      <div v-if="filteredProviders.length > 0">
                        <div
                          v-for="provider in filteredProviders"
                          :key="provider.provider_id"
                          class="flex items-center gap-3 px-4 py-3 cursor-pointer dark:hover:bg-gray-800/50 hover:bg-gray-100/50 transition-colors duration-150"
                          @mousedown.prevent="addProvider(provider)"
                          @click="addProvider(provider)"
                        >
                          <img
                            v-if="provider.logo_path"
                            :src="`https://image.tmdb.org/t/p/w45${provider.logo_path}`"
                            :alt="provider.provider_name"
                            class="h-8 w-auto object-contain flex-shrink-0"
                          />
                          <div
                            v-else
                            class="h-8 w-8 flex items-center justify-center bg-gray-200 dark:bg-gray-700 rounded flex-shrink-0"
                          >
                            <span
                              class="text-xs text-gray-600 dark:text-gray-300"
                              >{{ provider.provider_name.charAt(0) }}</span
                            >
                          </div>
                          <span
                            class="text-sm dark:text-gray-300 text-gray-800"
                            >{{ provider.provider_name }}</span
                          >
                        </div>
                      </div>
                      <div
                        v-else
                        class="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 text-center"
                      >
                        {{
                          $t('preferences.content.includedProviders.noResults')
                        }}
                      </div>
                    </div>
                  </div>
                </Transition>
              </Teleport>

              <!-- Selected Providers List -->
              <div v-if="selectedProviders.length > 0" class="mb-4">
                <p
                  class="text-sm font-medium dark:text-gray-300 text-gray-800 mb-2"
                >
                  {{ $t('preferences.content.includedProviders.selected') }}
                  ({{ selectedProviders.length }})
                </p>
                <div class="flex flex-wrap gap-2">
                  <div
                    v-for="provider in selectedProviders"
                    :key="provider.provider_id"
                    class="flex items-center gap-2 py-1.5 md:py-2.5 px-4 dark:bg-gray-900/40 bg-gray-100/80 backdrop-blur-xl rounded-full border border-gray-300/50 dark:border-white/10"
                  >
                    <img
                      v-if="provider.logo_path"
                      :src="`https://image.tmdb.org/t/p/w45${provider.logo_path}`"
                      :alt="provider.provider_name"
                      class="h-5 w-auto object-contain"
                    />
                    <span
                      class="text-xs md:text-sm font-medium dark:text-gray-300 text-gray-800"
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
                class="text-sm text-gray-600 dark:text-gray-400 italic"
              >
                {{ $t('preferences.content.includedProviders.allIncluded') }}
              </p>
            </Card>

            <!-- Region -->
            <Card padding="lg">
              <h2
                class="text-xl font-semibold dark:text-gray-300 text-gray-800 mb-2"
              >
                {{ $t('preferences.content.region.title') }}
              </h2>
              <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">
                {{ $t('preferences.content.region.description') }}
              </p>
              <RegionSelector
                v-model="contentPreferences.region"
                @update:model-value="handleRegionChange"
              />
            </Card>
          </div>
        </div>
      </template>
    </Tabs>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch, nextTick, onUnmounted } from 'vue';
import { useUserStore } from '@/stores/user';
import { TitleStatus } from '@/types/TitleStatus';
import CloseButton from '@/components/ui/CloseButton.vue';
import Button from '@/components/ui/Button.vue';
import Modal from '@/components/ui/Modal.vue';
import Tabs from '@/components/ui/Tabs.vue';
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
import AvatarUpload from '@/components/AvatarUpload.vue';
import TitleGrid from '@/components/TitleGrid.vue';
import EmptyState from '@/components/EmptyState.vue';
import Spinner from '@/components/Spinner.vue';
import Toast from '@/components/ui/Toast.vue';
import IconEdit from '@/components/icons/IconEdit.vue';
import { useUndoToast } from '@/composables/useUndoToast';
import type { TMDBSearchResult } from '@/types/TMDBSearch';
import { AVAILABLE_LANGUAGES, LanguageCode } from '@/constants/languages';
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
const isEditing = ref(false);
const editDisplayName = ref('');
const activeTab = ref<
  'liked' | 'seen' | 'not-interested' | 'content-preferences'
>('liked');
const titleToDelete = ref<{ id: string; title: string } | null>(null);
const showLanguageChangeModal = ref(false);
const isConfirmingLanguageChange = ref(false);
const pendingLanguageChange = ref<{
  action: 'add' | 'remove' | 'change';
  language: { code: string; name: string } | null;
  newLanguages: Array<{ code: string; name: string }>;
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

// Handle tab change and update URL
const handleTabChange = (
  tabId: 'liked' | 'seen' | 'not-interested' | 'content-preferences'
) => {
  activeTab.value = tabId;
  // Update URL query param without page reload
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

    const response = await $fetch<{
      success: boolean;
      profile: {
        display_name?: string | null;
        avatar_url?: string | null;
      };
    }>('/api/users/profile', {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
      body: {
        display_name: editDisplayName.value.trim() || null,
      },
    });

    if (response.success && response.profile) {
      profile.value = {
        ...profile.value,
        display_name: response.profile.display_name,
        avatar_url: response.profile.avatar_url || profile.value?.avatar_url,
      };
      await userStore.fetchProfile();
      isEditing.value = false;
      showSuccess(t('profile.profileUpdated'));
    } else {
      throw new Error('Failed to update profile');
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
  try {
    const id = userId.value;
    if (!id) return;

    // Check if already liked in likedTitles list
    const alreadyLiked = likedTitles.value.some(
      (t) => t.tmdb_id === title.tmdb_id && t.type === title.type
    );

    // Also check if the title in seenTitles already has liked=true
    const alreadyLikedInSeen = title.liked === true;

    if (alreadyLiked || alreadyLikedInSeen) {
      // If already liked, refresh both lists to ensure UI is in sync
      // This ensures that seenTitles shows the correct liked status
      await fetchSeenTitles();
      if (alreadyLiked) {
        await fetchLikedTitles();
      }
      showError(t('preferences.alreadyInPreferences'));
      return;
    }

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
  } catch (error) {
    console.error('Error adding to liked:', error);
    showError(t('preferences.errorAdding'));
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
  } catch {
    showError(t('notInterested.errorUndo'));
    await fetchNotInterestedTitles();
  }
};

// Content Preferences State
const contentPreferences = ref<{
  preferred_language?: string;
  content_types?: ('movie' | 'tv')[];
  favorite_genres?: number[];
  included_providers?: number[];
  region?: string;
}>({
  preferred_language: LanguageCode.SPANISH, // Default to Spanish (TMDB format)
  content_types: [],
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

// Preload genres using useAsyncData (runs during setup, before mount)
const { data: genresData } = useAsyncData(
  'genres',
  async () => {
    // Fetch both movie and TV genres
    const [movieResponse, tvResponse] = await Promise.all([
      $fetch<{ genres: Array<{ id: number; name: string }> }>(
        '/api/tmdb/genres?type=movie'
      ),
      $fetch<{ genres: Array<{ id: number; name: string }> }>(
        '/api/tmdb/genres?type=tv'
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

  // Merge and deduplicate by ID
  const genreMap = new Map<number, string>();
  genresData.value.movie.genres.forEach((g: { id: number; name: string }) => {
    if (g.name) {
      genreMap.set(g.id, g.name);
    }
  });
  genresData.value.tv.genres.forEach((g: { id: number; name: string }) => {
    if (g.name) {
      genreMap.set(g.id, g.name);
    }
  });

  return Array.from(genreMap.entries())
    .map(([id, name]) => ({ id, name }))
    .filter((genre) => genre.name) // Filter out any genres without a name
    .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
});

// Genre selector state
const genreSearchQuery = ref('');
const showGenreResults = ref(false);
const filteredGenres = ref<
  Array<{
    id: number;
    name: string;
  }>
>([]);
const selectedGenres = ref<
  Array<{
    id: number;
    name: string;
  }>
>([]);
const genreInputRef = ref<HTMLInputElement | null>(null);
const genreDropdownPosition = ref<{
  top: number;
  left: number;
  width: number;
} | null>(null);

// Preload providers using useLazyFetch (runs during setup, before mount)
// Include credentials to ensure user session is sent for region detection
const { data: providersData } = useLazyFetch<{
  results: Array<{
    provider_id: number;
    provider_name: string;
    logo_path: string | null;
  }>;
}>('/api/tmdb/watch-providers', {
  server: false, // Only fetch on client
  credentials: 'include', // Include cookies for authentication
  default: () => ({ results: [] }),
});

const availableProviders = computed(() => {
  if (!providersData.value) {
    if (import.meta.dev) {
      console.log('[AvailableProviders] providersData.value is null/undefined');
    }
    return [];
  }

  if (!providersData.value.results) {
    if (import.meta.dev) {
      console.log(
        '[AvailableProviders] No results in providersData:',
        providersData.value
      );
    }
    return [];
  }

  if (!Array.isArray(providersData.value.results)) {
    if (import.meta.dev) {
      console.log(
        '[AvailableProviders] results is not an array:',
        typeof providersData.value.results,
        providersData.value.results
      );
    }
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

  if (import.meta.dev) {
    console.log('[AvailableProviders] Loaded providers:', providers.length);
    console.log(
      '[AvailableProviders] Sample providers:',
      providers.slice(0, 5).map((p) => p.provider_name)
    );
  }

  return providers;
});

// Provider selector state
const providerSearchQuery = ref('');
const showProviderResults = ref(false);
const filteredProviders = ref<
  Array<{
    provider_id: number;
    provider_name: string;
    logo_path: string | null;
  }>
>([]);
const selectedProviders = ref<
  Array<{
    provider_id: number;
    provider_name: string;
    logo_path: string | null;
  }>
>([]);
const providerInputRef = ref<HTMLInputElement | null>(null);
const providerDropdownPosition = ref<{
  top: number;
  left: number;
  width: number;
} | null>(null);

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
        content_types?: ('movie' | 'tv')[];
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
      // Debug: log the raw response
      if (import.meta.dev) {
        console.log(
          '[Profile] Raw preferences from API:',
          response.preferences
        );
        console.log(
          '[Profile] preferred_language value:',
          response.preferences.preferred_language
        );
      }

      // Use the value from DB directly, only default to 'es' if it's truly null/undefined
      const dbLanguage = response.preferences.preferred_language;

      contentPreferences.value = {
        preferred_language: dbLanguage ?? LanguageCode.SPANISH, // Only default if null/undefined
        content_types: response.preferences.content_types || [],
        favorite_genres: response.preferences.favorite_genres || [],
        included_providers: response.preferences.included_providers || [],
        region: response.preferences.region || undefined,
      };

      // Load selected language - use the actual DB value
      const languageCode = dbLanguage ?? LanguageCode.SPANISH;

      if (import.meta.dev) {
        console.log('[Profile] Language code to select:', languageCode);
        console.log(
          '[Profile] Available languages:',
          availableLanguages.map((l: Language) => l.code)
        );
      }

      const languageToSelect = availableLanguages.find(
        (l: Language) => l.code === languageCode
      );

      if (languageToSelect) {
        selectedLanguage.value = languageToSelect;
        if (import.meta.dev) {
          console.log('[Profile] Selected language:', languageToSelect);
        }
      } else {
        // Default to Spanish if not found
        if (import.meta.dev) {
          console.warn(
            '[Profile] Language not found in available languages, defaulting to Spanish. Code was:',
            languageCode
          );
        }
        selectedLanguage.value =
          availableLanguages.find(
            (l: Language) => l.code === LanguageCode.SPANISH
          ) || null;
      }

      // Map genres if they're already loaded
      if (
        availableGenres.value.length > 0 &&
        contentPreferences.value.favorite_genres &&
        contentPreferences.value.favorite_genres.length > 0
      ) {
        selectedGenres.value = availableGenres.value.filter((g) =>
          contentPreferences.value.favorite_genres?.includes(g.id)
        );
      } else {
        selectedGenres.value = [];
      }

      // Map providers if they're already loaded
      if (
        availableProviders.value.length > 0 &&
        contentPreferences.value.included_providers &&
        contentPreferences.value.included_providers.length > 0
      ) {
        selectedProviders.value = availableProviders.value.filter((p) =>
          contentPreferences.value.included_providers?.includes(p.provider_id)
        );
      } else {
        selectedProviders.value = [];
      }
    } else {
      // No preferences found, reset to empty
      selectedLanguage.value = null;
      selectedGenres.value = [];
      selectedProviders.value = [];
      contentPreferences.value = {
        preferred_language: LanguageCode.SPANISH,
        content_types: [],
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

// Filter providers based on search query
const filterProviders = () => {
  if (!providerSearchQuery.value.trim()) {
    filteredProviders.value = [];
    showProviderResults.value = false;
    providerDropdownPosition.value = null;
    return;
  }

  // Always show dropdown when user types
  showProviderResults.value = true;

  const query = providerSearchQuery.value.toLowerCase().trim();

  // Debug: log available providers count
  if (import.meta.dev) {
    console.log(
      '[FilterProviders] Available providers:',
      availableProviders.value.length
    );
    console.log('[FilterProviders] Search query:', query);
  }

  filteredProviders.value = availableProviders.value
    .filter(
      (provider) =>
        provider.provider_name.toLowerCase().includes(query) &&
        !selectedProviders.value.some(
          (p) => p.provider_id === provider.provider_id
        )
    )
    .sort((a, b) => a.provider_name.localeCompare(b.provider_name))
    .slice(0, 10); // Limit to 10 results

  // Debug: log filtered results
  if (import.meta.dev) {
    console.log(
      '[FilterProviders] Filtered providers:',
      filteredProviders.value.length
    );
    console.log(
      '[FilterProviders] Results:',
      filteredProviders.value.map((p) => p.provider_name)
    );
  }

  // Ensure dropdown position is calculated after filtering
  // Use multiple attempts to ensure position is set
  const attemptUpdatePosition = (attempt = 0) => {
    if (attempt > 5) {
      if (import.meta.dev) {
        console.error(
          '[FilterProviders] Failed to set dropdown position after 5 attempts'
        );
      }
      return;
    }

    updateProviderDropdownPosition();

    if (!providerDropdownPosition.value && providerInputRef.value) {
      // Try again after a short delay
      setTimeout(() => {
        attemptUpdatePosition(attempt + 1);
      }, 50);
    } else if (providerDropdownPosition.value && import.meta.dev) {
      console.log(
        '[FilterProviders] Dropdown position successfully set on attempt',
        attempt + 1
      );
    }
  };

  nextTick(() => {
    attemptUpdatePosition();
  });
};

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
  providerSearchQuery.value = '';
  showProviderResults.value = false;
  saveContentPreferences();
};

// Remove provider from selected list
const removeProvider = (providerId: number) => {
  selectedProviders.value = selectedProviders.value.filter(
    (p) => p.provider_id !== providerId
  );
  contentPreferences.value.included_providers = selectedProviders.value.map(
    (p) => p.provider_id
  );
  saveContentPreferences();
};

// Calculate dropdown position for providers
const updateProviderDropdownPosition = () => {
  if (providerInputRef.value) {
    const rect = providerInputRef.value.getBoundingClientRect();
    providerDropdownPosition.value = {
      top: rect.bottom + window.scrollY + 8, // 8px for mt-2
      left: rect.left + window.scrollX,
      width: rect.width,
    };
    if (import.meta.dev) {
      console.log(
        '[FilterProviders] Dropdown position set:',
        providerDropdownPosition.value
      );
    }
  } else {
    if (import.meta.dev) {
      console.warn('[FilterProviders] providerInputRef is not available');
    }
  }
};

// Handle provider search focus
const handleProviderFocus = () => {
  // Clear any pending blur timeout
  if (blurTimeout) {
    clearTimeout(blurTimeout);
    blurTimeout = null;
  }
  showProviderResults.value = true;
  // If there's already a search query, filter immediately
  if (providerSearchQuery.value.trim()) {
    filterProviders();
  } else {
    // Even without query, ensure position is set
    nextTick(() => {
      updateProviderDropdownPosition();
    });
  }
};

// Handle provider search blur
let blurTimeout: ReturnType<typeof setTimeout> | null = null;
const handleProviderBlur = () => {
  // Clear any existing timeout
  if (blurTimeout) {
    clearTimeout(blurTimeout);
  }
  // Delay closing to allow clicks on dropdown items
  blurTimeout = setTimeout(() => {
    showProviderResults.value = false;
    providerDropdownPosition.value = null;
    blurTimeout = null;
  }, 300);
};

// Change selected language (single selection)
const changeLanguage = (lang: { code: string; name: string }) => {
  // If already selected, do nothing
  if (selectedLanguage.value?.code === lang.code) {
    return;
  }

  // Show confirmation modal
  pendingLanguageChange.value = {
    action: 'change',
    language: lang,
    newLanguages: [lang], // Keep as array for compatibility with modal
  };
  showLanguageChangeModal.value = true;
};

// Confirm language change and regenerate pool
const confirmLanguageChange = async () => {
  if (!pendingLanguageChange.value || isConfirmingLanguageChange.value) return;

  // Set loading state
  isConfirmingLanguageChange.value = true;

  // Store original state for potential rollback
  const originalLanguage = selectedLanguage.value;
  const originalPreference =
    contentPreferences.value.preferred_language || LanguageCode.SPANISH;

  try {
    // Update selected language
    const newLanguage = pendingLanguageChange.value.newLanguages[0];
    selectedLanguage.value = newLanguage;

    // Map to language code (single value)
    const languageCode = newLanguage?.code || 'es';

    contentPreferences.value.preferred_language = languageCode;

    // Save preferences - wait for it to complete
    const id = userId.value;
    if (!id) {
      throw new Error('User ID not found');
    }

    const {
      data: { session },
    } = await getSession();

    if (!session?.access_token) {
      throw new Error(t('profile.notAuthenticated'));
    }

    // Build preferences to save
    const preferencesToSave = {
      preferred_language: languageCode,
      favorite_genres:
        selectedGenres.value.length > 0
          ? selectedGenres.value.map((g) => g.id)
          : [],
      included_providers:
        selectedProviders.value.length > 0
          ? selectedProviders.value.map((p) => p.provider_id)
          : [],
      content_types: contentPreferences.value.content_types || [],
      region: contentPreferences.value.region || null,
    };

    // Save to Supabase
    const saveResponse = await $fetch<{
      success: boolean;
      preferences: unknown;
    }>('/api/users/preferences', {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
      body: preferencesToSave,
    });

    if (!saveResponse.success) {
      throw new Error('Failed to save preferences');
    }

    // Verify the save was successful by checking the response
    console.log(
      '[LanguageChange] Preferences saved successfully:',
      saveResponse
    );
    console.log(
      '[LanguageChange] Saved preferred_language:',
      saveResponse.preferences &&
        typeof saveResponse.preferences === 'object' &&
        'preferred_language' in saveResponse.preferences
        ? (saveResponse.preferences as { preferred_language?: string })
            .preferred_language
        : 'not found'
    );

    // Refresh preferences from server to ensure UI is in sync
    await fetchContentPreferences();

    // Recargar todas las listas de títulos con el nuevo idioma
    // Esto también actualizará los campos jsonb en la base de datos si falta el idioma
    await fetchAllLists();

    // Show success toast with message about language update and pool regeneration
    showSuccess(
      t('preferences.content.preferredLanguage.languageUpdatedAndRegenerating')
    );

    // Close modal after showing toast (use nextTick to ensure toast is rendered)
    await nextTick();
    showLanguageChangeModal.value = false;
    pendingLanguageChange.value = null;
    isConfirmingLanguageChange.value = false;

    // Regenerate recommendation pool in background (silently)
    // Set flag in sessionStorage to indicate regeneration is in progress
    sessionStorage.setItem('regeneratingPool', 'true');

    // Call regenerate-pool endpoint in background (don't await)
    $fetch<{
      success: boolean;
      message?: string;
    }>('/api/recommendations/regenerate-pool', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    })
      .then((poolResponse) => {
        if (poolResponse.success) {
          console.log('[LanguageChange] Pool regenerated successfully');
        } else {
          console.error(
            '[LanguageChange] Pool regeneration failed:',
            poolResponse
          );
        }
      })
      .catch((poolError) => {
        console.error('[LanguageChange] Error regenerating pool:', poolError);
      })
      .finally(() => {
        // Clear the flag after regeneration completes
        // Use a delay to allow for page navigation scenarios
        setTimeout(() => {
          sessionStorage.removeItem('regeneratingPool');
        }, 1000);
      });
  } catch (error) {
    console.error('Error confirming language change:', error);

    // Revert language change on error
    selectedLanguage.value = originalLanguage;
    contentPreferences.value.preferred_language = originalPreference;

    showError(t('preferences.content.errorSaving'));

    // Keep modal open so user can try again
    // Don't close it here - let user decide
    isConfirmingLanguageChange.value = false;
  }
};

// Filter genres based on search query
const filterGenres = () => {
  if (!genreSearchQuery.value.trim()) {
    filteredGenres.value = [];
    return;
  }

  const query = genreSearchQuery.value.toLowerCase().trim();
  filteredGenres.value = availableGenres.value
    .filter(
      (genre) =>
        genre.name &&
        genre.name.toLowerCase().includes(query) &&
        !selectedGenres.value.some((g) => g.id === genre.id)
    )
    .slice(0, 10); // Limit to 10 results
};

// Add genre to selected list
const addGenre = (genre: { id: number; name: string }) => {
  // Check if already selected
  if (selectedGenres.value.some((g) => g.id === genre.id)) {
    return;
  }

  selectedGenres.value.push(genre);
  contentPreferences.value.favorite_genres = selectedGenres.value.map(
    (g) => g.id
  );
  genreSearchQuery.value = '';
  showGenreResults.value = false;
  saveContentPreferences();
};

// Remove genre from selected list
const removeGenre = (genreId: number) => {
  selectedGenres.value = selectedGenres.value.filter((g) => g.id !== genreId);
  contentPreferences.value.favorite_genres = selectedGenres.value.map(
    (g) => g.id
  );
  saveContentPreferences();
};

// Calculate dropdown position for genres
const updateGenreDropdownPosition = () => {
  if (genreInputRef.value) {
    const rect = genreInputRef.value.getBoundingClientRect();
    genreDropdownPosition.value = {
      top: rect.bottom + 8, // 8px for mt-2, fixed position is relative to viewport
      left: rect.left,
      width: rect.width,
    };
  }
};

// Handle genre search focus
const handleGenreFocus = () => {
  showGenreResults.value = true;
  nextTick(() => {
    updateGenreDropdownPosition();
  });
};

// Handle genre search blur
const handleGenreBlur = () => {
  setTimeout(() => {
    showGenreResults.value = false;
    genreDropdownPosition.value = null;
  }, 200);
};

// Handle region change
const handleRegionChange = () => {
  saveContentPreferences();
};

// Save content preferences
const saveContentPreferences = async () => {
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
      preferred_languages: selectedLanguage.value
        ? selectedLanguage.value.code
        : ['es'], // Default to Spanish if no languages selected
      favorite_genres:
        selectedGenres.value.length > 0
          ? selectedGenres.value.map((g) => g.id)
          : [], // Empty = all genres
      included_providers:
        selectedProviders.value.length > 0
          ? selectedProviders.value.map((p) => p.provider_id)
          : [], // Empty = all providers
      content_types: contentPreferences.value.content_types || [],
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
      showSuccess(t('preferences.content.saved'));
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

watch(showGenreResults, (isVisible) => {
  if (isVisible) {
    nextTick(() => {
      updateGenreDropdownPosition();
    });
  }
});

watch(showProviderResults, (isVisible) => {
  if (isVisible) {
    nextTick(() => {
      updateProviderDropdownPosition();
    });
  }
});

// Update positions on scroll and resize
const updateAllDropdownPositions = () => {
  if (showGenreResults.value) {
    updateGenreDropdownPosition();
  }
  if (showProviderResults.value) {
    updateProviderDropdownPosition();
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
        selectedGenres.value = genres.filter((g) =>
          contentPreferences.value.favorite_genres?.includes(g.id)
        );
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
        selectedProviders.value = providers.filter((p) =>
          contentPreferences.value.included_providers?.includes(p.provider_id)
        );
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
        selectedGenres.value = availableGenres.value.filter((g) =>
          genreIds.includes(g.id)
        );
      }
    } else if (!genreIds || genreIds.length === 0) {
      selectedGenres.value = [];
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
        selectedProviders.value = availableProviders.value.filter((p) =>
          providerIds.includes(p.provider_id)
        );
      }
    } else if (!providerIds || providerIds.length === 0) {
      selectedProviders.value = [];
    }
  },
  { immediate: true }
);

// Watch for when preferred_language changes to map selected language
watch(
  () => contentPreferences.value.preferred_language,
  (languageCode) => {
    if (import.meta.dev) {
      console.log(
        '[Profile Watch] preferred_language changed to:',
        languageCode
      );
    }

    if (languageCode && availableLanguages.length > 0) {
      const languageToSelect = availableLanguages.find(
        (l: Language) => l.code === languageCode
      );

      if (languageToSelect) {
        // Only update if it's different to avoid unnecessary updates
        if (selectedLanguage.value?.code !== languageCode) {
          if (import.meta.dev) {
            console.log(
              '[Profile Watch] Setting selected language to:',
              languageToSelect
            );
          }
          selectedLanguage.value = languageToSelect;
        }
      } else if (import.meta.dev) {
        console.warn(
          '[Profile Watch] Could not find language for code:',
          languageCode,
          'Available languages:',
          availableLanguages.map((l: Language) => l.code)
        );
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
      if (import.meta.dev) {
        console.log('[Profile Watch] No language code, defaulting to Spanish');
      }
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
  window.addEventListener('scroll', updateAllDropdownPositions, true);
  window.addEventListener('resize', updateAllDropdownPositions);
});

onUnmounted(() => {
  window.removeEventListener('scroll', updateAllDropdownPositions, true);
  window.removeEventListener('resize', updateAllDropdownPositions);
});

// Page meta
definePageMeta({
  middleware: 'auth',
});

useHead({
  title: t('profile.title') + ' - UpNext',
});
</script>
