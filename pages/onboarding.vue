<script setup lang="ts">
import { TitleStatus } from '@/types/TitleStatus';
import { MediaTypeEnum } from '@/types/enums/MediaTypeEnum';
import { getTitleByTmdbId } from '@/composables/database/titles';
import { upsertUserTitleStatus } from '@/composables/database/userTitleStatus';
import { getSession } from '@/composables/database/auth';
import { isUniqueViolationError } from '@/composables/database/errorCodes';
import { AVAILABLE_LANGUAGES } from '@/constants/languages';
import type { Language } from '@/constants/languages';
import RegionSelector from '@/components/RegionSelector.vue';
import CloseButton from '@/components/ui/CloseButton.vue';
import Card from '@/components/ui/Card.vue';
import Spinner from '@/components/Spinner.vue';
import Button from '@/components/ui/Button.vue';

definePageMeta({
  middleware: 'auth',
});

const { t } = useI18n();

useHead({
  title: 'Onboarding - UpNext',
});

useSeoMeta({
  title: 'Onboarding - UpNext',
  description: t('onboarding.description'),
});

interface TitleResult {
  id: number;
  title?: string;
  name?: string;
  poster_path: string | null;
  backdrop_path: string | null;
  overview: string;
  release_date?: string;
  first_air_date?: string;
  media_type: typeof MediaTypeEnum.movie | typeof MediaTypeEnum.tv;
  genre_ids?: number[];
  vote_average?: number;
  popularity?: number;
}

const supabase = useSupabaseClient();
const userStore = useUserStore();
const router = useRouter();
const user = useSupabaseUser();

// Onboarding steps
const currentStep = ref<'preferences' | 'titles'>('preferences');
const preferencesSaved = ref(false);

// Preferences state
const selectedLanguage = ref<Language | null>(null);
const selectedRegion = ref<string | null>(null);
const savingPreferences = ref(false);

// Titles state
const searchQuery = ref('');
const searchResults = ref<TitleResult[]>([]);
const selectedTitles = ref<TitleResult[]>([]);
const loading = ref(false);
const saving = ref(false);
const error = ref<string | null>(null);
const success = ref<string | null>(null);
let searchTimeout: ReturnType<typeof setTimeout> | null = null;

const handleSearch = () => {
  if (searchTimeout) {
    clearTimeout(searchTimeout);
  }

  if (searchQuery.value.length < 4) {
    searchResults.value = [];
    return;
  }

  loading.value = true;
  searchTimeout = setTimeout(async () => {
    try {
      const response = await $fetch<{ data: { results: TitleResult[] } }>(
        `/api/tmdb/search/multi`,
        {
          query: { query: searchQuery.value },
        }
      );

      // Filter to only movies and TV shows, sort by popularity (descending), limit to 20
      searchResults.value = response.data.results
        .filter(
          (r) =>
            r.media_type === MediaTypeEnum.movie ||
            r.media_type === MediaTypeEnum.tv
        )
        .sort((a, b) => (b.popularity || 0) - (a.popularity || 0))
        .slice(0, 20);
    } catch (error) {
      console.error('Search error:', error);
      searchResults.value = [];
    } finally {
      loading.value = false;
    }
  }, 300);
};

const isSelected = (id: number) => {
  return selectedTitles.value.some((t) => t.id === id);
};

const toggleTitle = (title: TitleResult) => {
  if (isSelected(title.id)) {
    removeTitle(title.id);
    error.value = null; // Clear any previous errors
  } else {
    if (selectedTitles.value.length >= 10) {
      error.value = t('onboarding.maxTitles');
      setTimeout(() => {
        error.value = null;
      }, 5000);
      return;
    }
    selectedTitles.value.push(title);
    error.value = null; // Clear any previous errors
  }
};

const removeTitle = (id: number) => {
  selectedTitles.value = selectedTitles.value.filter((t) => t.id !== id);
};

// Save preferences (language and region) first
const savePreferences = async () => {
  if (!selectedLanguage.value) {
    error.value = t('onboarding.languageRequired');
    return;
  }

  savingPreferences.value = true;
  error.value = null;

  try {
    const currentUser = userStore.user || user.value;

    if (!currentUser || !currentUser.id) {
      const {
        data: { session },
      } = await getSession();
      if (!session?.user) {
        error.value = t('onboarding.authRequired');
        savingPreferences.value = false;
        return;
      }
      userStore.setUser(session.user);
      await userStore.fetchProfile();
    }

    const {
      data: { session },
    } = await getSession();

    if (!session?.access_token) {
      error.value = t('onboarding.authRequired');
      savingPreferences.value = false;
      return;
    }

    // Save preferences with language and region
    const preferencesToSave = {
      preferred_language: selectedLanguage.value.code,
      region: selectedRegion.value || null,
      favorite_genres: [],
      included_providers: [],
    };

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

    preferencesSaved.value = true;
    currentStep.value = 'titles';
  } catch (err: unknown) {
    console.error('Error saving preferences:', err);
    const errorMessage =
      err instanceof Error ? err.message : t('onboarding.savePreferencesError');
    error.value = errorMessage;
  } finally {
    savingPreferences.value = false;
  }
};

const saveSelections = async () => {
  if (selectedTitles.value.length === 0) return;

  saving.value = true;
  error.value = null; // Clear any previous errors

  try {
    // Get user from store (already initialized by middleware) or from useSupabaseUser
    const currentUser = userStore.user || user.value;

    if (!currentUser || !currentUser.id) {
      // If user is not in store, try to get it from Supabase
      const {
        data: { session },
      } = await getSession();
      if (!session?.user) {
        error.value = t('onboarding.authRequired');
        saving.value = false;
        return;
      }
      // Set user in store
      userStore.setUser(session.user);
      await userStore.fetchProfile();
    }

    const userId = (userStore.user || user.value)!.id;

    // Ensure preferences are saved before proceeding
    if (!preferencesSaved.value) {
      error.value = t('onboarding.preferencesRequired');
      saving.value = false;
      return;
    }

    // First, ensure all titles exist in the database, then insert likes
    // The TMDB endpoints will automatically use the saved preferences (language and region)
    for (const title of selectedTitles.value) {
      // Check if title exists
      const { data: existingTitle } = await getTitleByTmdbId(
        title.id,
        title.media_type
      );

      if (!existingTitle) {
        // Fetch title from TMDB - this will automatically use saved preferences
        // and insert the title with correct language in JSONB fields
        try {
          const endpoint = title.media_type === 'movie' ? 'movies' : 'tvshows';
          await $fetch(`/api/tmdb/${endpoint}/${title.id}`);
        } catch (tmdbError) {
          console.error(
            `[saveSelections] Error fetching title ${title.id} from TMDB:`,
            tmdbError
          );
          // If TMDB fetch fails, we can't proceed without proper title data
          throw new Error(
            `Failed to fetch title ${title.id} from TMDB. Please try again.`
          );
        }
      }

      // Insert user title status as seen with liked=true (will fail silently if duplicate due to UNIQUE constraint)
      if (!title.media_type) {
        throw new Error('Media type is required');
      }
      const { error: likeError } = await upsertUserTitleStatus({
        user_id: userId,
        tmdb_id: title.id,
        type: title.media_type,
        status: TitleStatus.SEEN,
        liked: true,
      });

      if (likeError && !isUniqueViolationError(likeError)) {
        // Unique violation is expected for duplicates
        throw likeError;
      }
    }

    // Mark onboarding as complete in profile
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ onboarding_completed: true })
      .eq('id', userId);

    if (updateError) {
      console.error('Error updating onboarding status:', updateError);
    }

    // Ensure profile is fully loaded before redirecting
    // This will update likesCount and onboarding_completed
    await userStore.fetchProfile();

    // Populate recommendation pool after onboarding completion
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
          credentials: 'include',
        });
      }
    } catch (poolError) {
      // Don't fail onboarding if pool population fails
      console.error('Error populating recommendation pool:', poolError);
    }

    // Redirect to home
    await router.push('/');
  } catch (err: unknown) {
    console.error('Error saving selections:', err);
    const errorMessage =
      err instanceof Error ? err.message : t('onboarding.saveError');
    error.value = errorMessage;
  } finally {
    saving.value = false;
  }
};
</script>
<template>
  <div class="pt-6 pb-6 md:pt-12 md:pb-12 w-[80%] mx-auto">
    <div class="w-full px-4 md:px-0">
      <!-- Header -->
      <div class="text-center mb-6">
        <h1 class="text-3xl font-bold dark:text-gray-300 text-gray-800 mb-2">
          {{ $t('onboarding.title') }}
        </h1>
        <p class="text-gray-800 dark:text-gray-300">
          {{
            currentStep === 'preferences'
              ? $t('onboarding.preferencesDescription')
              : $t('onboarding.description')
          }}
        </p>
        <div v-if="currentStep === 'titles'" class="mt-4">
          <span
            class="inline-block px-4 py-2 bg-primary/10 dark:bg-primary-500/20 text-primary dark:text-primary-400 rounded-full text-sm font-medium"
          >
            {{ $t('onboarding.selected', { count: selectedTitles.length }) }}
          </span>
        </div>
      </div>

      <!-- Alert Messages -->
      <AlertMessage v-if="error" :message="error" type="error" />
      <AlertMessage v-if="success" :message="success" type="success" />

      <!-- Step 1: Preferences -->
      <div v-if="currentStep === 'preferences'" class="space-y-6">
        <!-- Preferred Language -->
        <Card padding="lg">
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
              v-for="lang in AVAILABLE_LANGUAGES"
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
                @change="selectedLanguage = lang"
              />
              <span class="text-sm dark:text-gray-300 text-gray-800 flex-1">
                {{ `${lang.name} (${lang.code})` }}
              </span>
            </label>
          </div>
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
          <RegionSelector v-model="selectedRegion" />
        </Card>

        <!-- Continue Button -->
        <div class="mt-6 flex justify-center">
          <Button
            size="medium"
            variant="primary"
            :disabled="
              !selectedLanguage || !selectedRegion || savingPreferences
            "
            @click="savePreferences"
          >
            {{
              savingPreferences
                ? $t('onboarding.saving')
                : $t('onboarding.continue')
            }}
          </Button>
        </div>
      </div>

      <!-- Step 2: Titles Selection -->
      <div v-if="currentStep === 'titles'">
        <!-- Search -->
        <div class="mb-6">
          <div class="relative">
            <input
              v-model="searchQuery"
              type="text"
              :placeholder="$t('onboarding.searchPlaceholder')"
              class="w-full px-4 py-3 pl-12 dark:bg-gray-800/70 bg-gray-100/90 dark:text-gray-300 text-gray-800 border border-primary/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary backdrop-blur-xs"
              @input="handleSearch"
            />
            <svg
              class="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400"
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

        <!-- Selected Titles -->
        <div v-if="selectedTitles.length > 0" class="mb-6">
          <h2
            class="text-lg font-semibold dark:text-gray-300 text-gray-800 mb-3"
          >
            {{ $t('onboarding.yourSelections') }}
          </h2>
          <div class="flex flex-wrap gap-3">
            <div
              v-for="title in selectedTitles"
              :key="title.id"
              class="relative group"
            >
              <div
                class="relative w-24 h-36 rounded-lg overflow-hidden shadow-lg"
              >
                <img
                  v-if="title.poster_path"
                  :src="`https://image.tmdb.org/t/p/w300${title.poster_path}`"
                  :alt="title.title || title.name"
                  class="w-full h-full object-cover"
                />
                <div
                  v-else
                  class="w-full h-full bg-gray-700 flex items-center justify-center text-gray-400"
                >
                  {{ $t('onboarding.noImage') }}
                </div>
                <CloseButton
                  size="large"
                  custom-class="absolute top-1 right-1 z-10 cursor-pointer"
                  :aria-label="
                    $t('onboarding.removeTitle', {
                      title: title.title || title.name,
                    })
                  "
                  @click.stop="removeTitle(title.id)"
                />
              </div>
              <p
                class="mt-1 text-xs text-center dark:text-gray-300 text-gray-800 max-w-[96px] truncate"
              >
                {{ title.title || title.name }}
              </p>
            </div>
          </div>
        </div>

        <!-- Search Results -->
        <div v-if="searchResults.length > 0" class="mb-6">
          <h2
            class="text-lg font-semibold dark:text-gray-300 text-gray-800 mb-3"
          >
            {{ $t('onboarding.searchResults') }}
          </h2>
          <div
            class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4"
          >
            <div
              v-for="result in searchResults"
              :key="result.id"
              class="group cursor-pointer"
              @click="toggleTitle(result)"
            >
              <div
                :class="[
                  'relative rounded-lg overflow-hidden shadow-lg transition-transform',
                  isSelected(result.id)
                    ? 'ring-2 ring-primary scale-105'
                    : 'hover:scale-105',
                ]"
              >
                <div class="relative aspect-[2/3]">
                  <img
                    v-if="result.poster_path"
                    :src="`https://image.tmdb.org/t/p/w300${result.poster_path}`"
                    :alt="result.title || result.name"
                    class="w-full h-full object-cover"
                  />
                  <div
                    v-else
                    class="w-full h-full bg-gray-700 flex items-center justify-center text-gray-400"
                  >
                    {{ $t('onboarding.noImage') }}
                  </div>
                  <div
                    v-if="isSelected(result.id)"
                    class="absolute inset-0 bg-primary/20 flex items-center justify-center"
                  >
                    <svg
                      class="w-12 h-12 text-primary"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fill-rule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clip-rule="evenodd"
                      />
                    </svg>
                  </div>
                </div>
              </div>
              <p
                class="mt-2 text-sm text-center dark:text-gray-300 text-gray-800 line-clamp-2"
              >
                {{ result.title || result.name }}
              </p>
              <p class="text-xs text-center text-gray-500">
                {{
                  result.media_type === MediaTypeEnum.movie
                    ? $t('media.movie')
                    : $t('media.series')
                }}
              </p>
            </div>
          </div>
        </div>

        <!-- Empty state -->
        <div
          v-if="searchQuery && searchResults.length === 0 && !loading"
          class="text-center py-12"
        >
          <p class="text-gray-500 dark:text-gray-400">
            {{ $t('onboarding.noResults') }}
          </p>
        </div>

        <!-- Loading -->
        <div v-if="loading" class="text-center py-12">
          <div
            class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"
          ></div>
        </div>

        <!-- Continue Button -->
        <div class="mt-6 flex justify-center">
          <Button
            size="medium"
            variant="primary"
            :disabled="selectedTitles.length === 0 || saving"
            @click="saveSelections"
          >
            {{ saving ? $t('onboarding.saving') : $t('onboarding.continue') }}
          </Button>
        </div>
      </div>

      <!-- Saving Loading Overlay -->
      <Spinner
        v-if="saving || savingPreferences"
        full-screen
        size="md"
        :message="
          savingPreferences
            ? $t('onboarding.savingPreferences')
            : $t('onboarding.savingSelection')
        "
      />
    </div>
  </div>
</template>
