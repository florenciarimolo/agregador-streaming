<template>
  <AppShell>
    <PageContainer>
      <div class="pt-6 pb-6 w-full">
        <!-- Undo Toast -->
        <Toast />

        <!-- Content Preferences -->
        <div class="space-y-6">
          <!-- Region -->
          <Card padding="lg">
            <h2
              class="mb-2 text-xl font-semibold text-gray-800 dark:text-gray-300"
            >
              {{ $t('preferences.content.region.title') }}
            </h2>
            <p class="mb-6 text-sm text-gray-600 dark:text-gray-400">
              {{ $t('preferences.content.region.description') }}
            </p>
            <RegionSelector
              v-model="contentPreferences.region"
              @update:model-value="handleRegionChange"
            />
          </Card>

          <!-- Included Providers -->
          <Card padding="lg">
            <h2
              class="mb-2 text-xl font-semibold text-gray-800 dark:text-gray-300"
            >
              {{ $t('preferences.content.includedProviders.title') }}
            </h2>
            <p class="mb-6 text-sm text-gray-600 dark:text-gray-400">
              {{ $t('preferences.content.includedProviders.description') }}
            </p>

            <!-- Provider Search -->
            <ProviderSelector
              v-model="selectedProviderForSelector"
              :available-providers="availableProviders"
              :selected-providers="selectedProviders"
              :placeholder="
                $t('preferences.content.includedProviders.searchPlaceholder')
              "
              :max-results="0"
              @select="(provider: any) => addProvider(provider)"
            />

            <!-- Selected Providers List -->
            <div v-if="selectedProviders.length > 0" class="my-4">
              <p
                class="mb-2 text-sm font-medium text-gray-800 dark:text-gray-300"
              >
                {{ $t('preferences.content.includedProviders.selected') }}
                ({{ selectedProviders.length }})
              </p>
              <div class="flex flex-wrap gap-2">
                <ProviderPill
                  v-for="provider in selectedProviders"
                  :key="provider.provider_id"
                  :provider="provider"
                  :aria-label="
                    $t('preferences.content.includedProviders.remove', {
                      name: provider.provider_name,
                    })
                  "
                  @remove="removeProvider(provider.provider_id)"
                />
              </div>
            </div>

            <!-- Info Message -->
            <p
              v-if="selectedProviders.length === 0"
              class="text-xs mt-2 italic text-gray-600 dark:text-gray-400"
            >
              {{ $t('preferences.content.includedProviders.allIncluded') }}
            </p>
          </Card>

          <!-- Favorite Genres -->
          <Card padding="lg">
            <h2
              class="mb-2 text-xl font-semibold text-gray-800 dark:text-gray-300"
            >
              {{ $t('preferences.content.favoriteGenres.title') }}
            </h2>
            <p class="mb-6 text-sm text-gray-600 dark:text-gray-400">
              {{ $t('preferences.content.favoriteGenres.description') }}
            </p>

            <!-- Genre Search -->
            <GenreSelector
              v-model="selectedGenreForSelector"
              :available-genres="availableGenres"
              :selected-genres="selectedGenres"
              @select="(genre: any) => addGenre(genre)"
            />

            <!-- Selected Genres List -->
            <div v-if="selectedGenres.length > 0" class="my-4">
              <p
                class="mb-2 text-sm font-medium text-gray-800 dark:text-gray-300"
              >
                {{ $t('preferences.content.favoriteGenres.selected') }}
                ({{ selectedGenres.length }})
              </p>
              <div class="flex flex-wrap gap-2">
                <GenrePill
                  v-for="genre in selectedGenres"
                  :key="genre.id"
                  :genre="genre"
                  :aria-label="
                    $t('preferences.content.favoriteGenres.remove', {
                      name: genre.name,
                    })
                  "
                  @remove="removeGenre(genre.id)"
                />
              </div>
            </div>

            <!-- Info Message -->
            <p
              v-if="selectedGenres.length === 0"
              class="text-xs mt-2 italic text-gray-600 dark:text-gray-400"
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

        <!-- Generating Recommendations Modal -->
        <Modal :is-open="showGeneratingModal" :close-on-overlay-click="false">
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
                "
              >
                {{ $t('common.leave') }}
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
import { onBeforeRouteLeave } from 'vue-router';
import Button from '@/components/ui/Button.vue';
import Modal from '@/components/ui/Modal.vue';
import AppShell from '@/components/layout/AppShell.vue';
import PageContainer from '@/components/layout/PageContainer.vue';
import Card from '@/components/ui/Card.vue';
import { MediaTypeEnum } from '@/types/enums/MediaTypeEnum';
import { getSession } from '@/composables/database/auth';
import Toast from '@/components/ui/Toast.vue';
import RegionSelector from '@/components/RegionSelector.vue';
import GenreSelector from '@/components/GenreSelector.vue';
import ProviderSelector from '@/components/ProviderSelector.vue';
import GenrePill from '@/components/GenrePill.vue';
import ProviderPill from '@/components/ProviderPill.vue';
import { useUndoToast } from '@/composables/useUndoToast';
import { DEFAULT_LANGUAGE, toTMDBLanguageCode } from '@/constants/languages';

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - Auto-imported
const currentUser = useSupabaseUser();
const { t } = useI18n();
const { showToast } = useUndoToast();

// Get app language for TMDB API calls
const getAppLanguage = () => {
  const { locale } = useI18n();
  return toTMDBLanguageCode(locale.value || DEFAULT_LANGUAGE);
};

// State
const hasUnsavedContentChanges = ref(false);
const showUnsavedChangesModal = ref(false);
const showSaveConfirmationModal = ref(false);
const showGeneratingModal = ref(false);
const pendingNavigation = ref<(() => void) | null>(null);
const savedContentPreferences = ref<{
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

const userId = computed(() => {
  return currentUser.value?.id || (currentUser.value as { sub?: string })?.sub;
});

// Helper functions
const showError = (message: string) => {
  showToast(message, null, 5000);
};

// Content Preferences State
const contentPreferences = ref<{
  favorite_genres?: number[];
  included_providers?: number[];
  region?: string;
}>({
  favorite_genres: [],
  included_providers: [],
  region: undefined,
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

// Selected genre for GenreSelector (temporary state for the selector)
const selectedGenreForSelector = ref<{
  id: number;
  name: string;
  type?: typeof MediaTypeEnum.movie | typeof MediaTypeEnum.tv;
} | null>(null);

// Preload providers using useAsyncData (runs during setup, before mount)
// Include credentials to ensure user session is sent for region detection
const { data: providersData } = useAsyncData(
  'watch-providers',
  async () => {
    // Get current region from contentPreferences or use undefined to use saved preference
    const region = contentPreferences.value.region;
    const language = getAppLanguage();

    const response = await $fetch<{
      results: Array<{
        provider_id: number;
        provider_name: string;
        logo_path: string | null;
      }>;
    }>('/api/tmdb/watch-providers', {
      credentials: 'include', // Include cookies for authentication
      query: {
        ...(region ? { region } : {}),
        ...(language ? { language } : {}),
      },
    });

    return response;
  },
  {
    server: false, // Only fetch on client
    default: () => ({ results: [] }),
  }
);

// Wrapper to refresh providers with current region and language
const refreshProviders = async () => {
  // Manually fetch with current region and language since useAsyncData doesn't react to contentPreferences changes
  const region = contentPreferences.value.region;
  const language = getAppLanguage();
  const response = await $fetch<{
    results: Array<{
      provider_id: number;
      provider_name: string;
      logo_path: string | null;
    }>;
  }>('/api/tmdb/watch-providers', {
    credentials: 'include',
    query: {
      ...(region ? { region } : {}),
      ...(language ? { language } : {}),
    },
  });

  // Update the data directly
  providersData.value = response;
};

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

// Selected provider for ProviderSelector (temporary state for the selector)
const selectedProviderForSelector = ref<{
  provider_id: number;
  provider_name: string;
  logo_path: string | null;
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
      contentPreferences.value = {
        favorite_genres: response.preferences.favorite_genres || [],
        included_providers: response.preferences.included_providers || [],
        region: response.preferences.region || undefined,
      };

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
      hasUnsavedContentChanges.value = false;
    } else {
      // No preferences found, reset to empty
      selectedGenres.value = [];
      selectedProviders.value = [];
      contentPreferences.value = {
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
const handleRegionChange = async () => {
  // Clear selected providers since they may not be available in the new region
  selectedProviders.value = [];
  contentPreferences.value.included_providers = [];

  // Refresh providers for the new region
  await refreshProviders();

  markContentPreferencesChanged();
};

// Mark content preferences as changed - compares current state with saved state
const markContentPreferencesChanged = () => {
  if (!savedContentPreferences.value) {
    // If no saved state, mark as changed if there are any preferences set
    hasUnsavedContentChanges.value =
      selectedGenres.value.length > 0 ||
      selectedProviders.value.length > 0 ||
      !!contentPreferences.value.region;
    return;
  }

  // Build current preferences object for comparison
  const currentPreferences = {
    favorite_genres: [...selectedGenres.value.map((g) => g.id)].sort(),
    included_providers: [
      ...selectedProviders.value.map((p) => p.provider_id),
    ].sort(),
    region: contentPreferences.value.region || null,
  };

  // Build saved preferences object for comparison
  const savedPrefs = {
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

    // If selection exists, include only selected items
    const preferencesToSave = {
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
        showToast(t('home.generateError'), null, 5000);
      } finally {
        showGeneratingModal.value = false;
      }

      hasUnsavedContentChanges.value = false;
      // Update saved state with the actual saved value from the response
      savedContentPreferences.value = {
        favorite_genres: [...selectedGenres.value.map((g) => g.id)],
        included_providers: [
          ...selectedProviders.value.map((p) => p.provider_id),
        ],
        region: contentPreferences.value.region || undefined,
      };
      // Update saved selected items for potential rollback
      savedSelectedGenres.value = [...selectedGenres.value];
      savedSelectedProviders.value = [...selectedProviders.value];
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

// Lifecycle
onMounted(async () => {
  // Fetch content preferences
  await fetchContentPreferences();
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
