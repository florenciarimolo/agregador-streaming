<script setup lang="ts">
import { onMounted } from 'vue';
import { TITLE_STATUS } from '@/constants/domain/titleStatus';
import { MEDIA_TYPE } from '@/constants/domain/mediaType';
import { getTitleByTmdbId } from '@/services/titles';
import { upsertUserTitleStatus } from '@/services/userTitleStatus';
import { getSession } from '@/services/auth';
import { isUniqueViolationError } from '@/constants/db/errorCodes';
import RegionSelector from '@/components/RegionSelector.vue';
import CloseButton from '@/components/ui/CloseButton.vue';
import Card from '@/components/ui/Card.vue';
import Button from '@/components/ui/Button.vue';
import Modal from '@/components/ui/Modal.vue';
import AppShell from '@/components/layout/AppShell.vue';
import Badge from '@/components/Badge.vue';
import GenreSelector from '@/components/GenreSelector.vue';
import ProviderSelector from '@/components/ProviderSelector.vue';
import FilterPill from '@/components/ui/FilterPill.vue';
import Alert from '@/components/ui/Alert.vue';
import IconTv from '@/components/icons/IconTv.vue';
import { useRegions } from '@/composables/useRegions';

definePageMeta({
  middleware: 'auth',
});

const { t } = useI18n();

// SEO: Private page - noindex, nofollow
useHead({
  title: 'Onboarding',
  meta: [
    {
      name: 'robots',
      content: 'noindex, nofollow',
    },
  ],
});

useSeoMeta({
  title: 'Onboarding',
  description: t('onboarding.description'),
  robots: 'noindex, nofollow',
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
  media_type: typeof MEDIA_TYPE.MOVIE | typeof MEDIA_TYPE.TV;
  genre_ids?: number[];
  vote_average?: number;
  popularity?: number;
}

const supabase = useSupabaseClient();
const router = useRouter();
const user = useSupabaseUser();

// Safely get userStore - it may not be available immediately after Pinia initialization
// Use a computed to lazy-load the store, but only on client side
const userStore = computed(() => {
  // Only try to get store on client side
  if (import.meta.server) {
    return {
      profile: null,
      authInitialized: false,
      hasCompletedOnboarding: false,
      user: null,
      setUser: () => {},
      setProfile: () => {},
      fetchProfile: async () => {},
    };
  }
  
  try {
    return useUserStore();
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[pages/onboarding.vue] useUserStore not available:', error);
    }
    return {
      profile: null,
      authInitialized: false,
      hasCompletedOnboarding: false,
      user: null,
      setUser: () => {},
      setProfile: () => {},
      fetchProfile: async () => {},
    };
  }
});

// IMPORTANT: Content preferences (region, providers, genres) can only be modified:
// - Here during initial onboarding (before onboarding_completed = true)
// - From /preferences page after onboarding is completed
// The middleware prevents access to /onboarding after completion, but we add an extra check here
onMounted(() => {
  // If onboarding is already completed, redirect to home
  // (This is a safety check; middleware should already prevent this)
  if (userStore.value?.profile?.onboarding_completed) {
    const { routeWithLang } = useRouteWithLang();
    router.replace(routeWithLang('/'));
  }
});

// Onboarding steps
const currentStep = ref<'preferences' | 'titles'>('preferences');
const preferencesSaved = ref(false);

// Preferences state
const selectedRegion = ref<string | null>(null);
const selectedGenres = ref<Array<{ id: number; name: string }>>([]);

// Selected genre for GenreSelector (temporary state for the selector)
const selectedGenreForSelector = ref<{
  id: number;
  name: string;
  type?: typeof MEDIA_TYPE.MOVIE | typeof MEDIA_TYPE.TV;
} | null>(null);

// Selected providers
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

const savingPreferences = ref(false);

// Preload regions using useAsyncData - must load before content renders
const { pending: regionsPending } = useAsyncData(
  'onboarding-regions',
  async () => {
    const { loadRegions } = useRegions();
    await loadRegions();
    return true; // Just ensure regions are loaded
  },
  {
    server: false, // Only fetch on client
    default: () => true,
  }
);

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
            r.media_type === MEDIA_TYPE.MOVIE || r.media_type === MEDIA_TYPE.TV
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

// Go back to preferences step
const goBackToPreferences = () => {
  currentStep.value = 'preferences';
  // Preferences are already saved in state, so they will be maintained
};

// Preload genres using useAsyncData
const { data: genresData } = useAsyncData(
  'onboarding-genres',
  async () => {
    // Fetch both movie and TV genres
    const [movieResponse, tvResponse] = await Promise.all([
      $fetch<{ genres: Array<{ id: number; name: string }> }>(
        `/api/tmdb/genres?type=${MEDIA_TYPE.MOVIE}`
      ),
      $fetch<{ genres: Array<{ id: number; name: string }> }>(
        `/api/tmdb/genres?type=${MEDIA_TYPE.TV}`
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
    type: typeof MEDIA_TYPE.MOVIE | typeof MEDIA_TYPE.TV;
  }> = [];

  // Add movie genres
  const movieGenres = genresData.value.movie?.genres || [];
  movieGenres.forEach((g: { id: number; name: string }) => {
    if (g.name) {
      allGenres.push({ id: g.id, name: g.name, type: MEDIA_TYPE.MOVIE });
    }
  });

  // Add TV genres
  const tvGenres = genresData.value.tv?.genres || [];
  tvGenres.forEach((g: { id: number; name: string }) => {
    if (g.name) {
      allGenres.push({ id: g.id, name: g.name, type: MEDIA_TYPE.TV });
    }
  });

  // Sort: first by type (movie first, then tv), then alphabetically by name
  return allGenres
    .filter((genre) => genre.name) // Filter out any genres without a name
    .sort((a, b) => {
      // First sort by type: movie comes before tv
      if (a.type !== b.type) {
        return a.type === MEDIA_TYPE.MOVIE ? -1 : 1;
      }
      // Then sort alphabetically by name
      return (a.name || '').localeCompare(b.name || '');
    });
});

// Preload providers using useAsyncData
const { data: providersData } = useAsyncData(
  'onboarding-providers',
  async () => {
    const response = await $fetch<{
      results: Array<{
        provider_id: number;
        provider_name: string;
        logo_path: string | null;
      }>;
    }>('/api/tmdb/watch-providers', {
      credentials: 'include',
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

  return providersData.value.results.map((p) => ({
    provider_id: p.provider_id,
    provider_name: p.provider_name,
    logo_path: p.logo_path,
  }));
});

// Add genre to selected list
const addGenre = (genre: {
  id: number;
  name: string;
  type?: typeof MEDIA_TYPE.MOVIE | typeof MEDIA_TYPE.TV;
}) => {
  // Check if already selected
  if (selectedGenres.value.some((g) => g.id === genre.id)) {
    return;
  }

  // Add genre (only store id and name, not type)
  selectedGenres.value.push({ id: genre.id, name: genre.name });
};

// Remove genre from selected list
const removeGenre = (genreId: number) => {
  selectedGenres.value = selectedGenres.value.filter((g) => g.id !== genreId);
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

  // Add provider
  selectedProviders.value.push(provider);
};

// Remove provider from selected list
const removeProvider = (providerId: number) => {
  selectedProviders.value = selectedProviders.value.filter(
    (p) => p.provider_id !== providerId
  );
};

// Save preferences (region) first
const savePreferences = async () => {
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
      userStore.value.setUser(session.user);
      await userStore.value.fetchProfile();
    }

    const {
      data: { session },
    } = await getSession();

    if (!session?.access_token) {
      error.value = t('onboarding.authRequired');
      savingPreferences.value = false;
      return;
    }

    // Save preferences with region and optional genres and providers
    const preferencesToSave = {
      region: selectedRegion.value || null,
      favorite_genres: selectedGenres.value.map((g) => g.id),
      included_providers: selectedProviders.value.map((p) => p.provider_id),
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
        status: TITLE_STATUS.SEEN,
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
    const { routeWithLang } = useRouteWithLang();
    await router.push(routeWithLang('/'));
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
  <AppShell>
    <div class="pt-6 pb-6 md:pt-12 md:pb-12">
      <!-- Header -->
      <div class="text-center mb-6">
        <h1 class="text-3xl font-bold dark:text-gray-300 text-gray-800 mb-2">
          {{ $t('onboarding.title') }}
        </h1>
        <p class="text-gray-800 dark:text-gray-300">
          {{
            currentStep === 'preferences'
              ? $t('onboarding.preferencesDescription')
              : $t('onboarding.titlesDescription')
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
      <Alert
        v-if="error"
        :message="error"
        variant="error"
        :with-transition="true"
        custom-class="mb-4"
        :show-icon="false"
      />
      <Alert
        v-if="success"
        :message="success"
        variant="success"
        :with-transition="true"
        custom-class="mb-4"
        :show-icon="false"
      />

      <!-- Step 1: Preferences -->
      <div v-if="currentStep === 'preferences'" class="space-y-6">
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
          <div
            v-if="regionsPending"
            class="flex items-center justify-center py-8"
          >
            <div
              class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"
            ></div>
          </div>
          <RegionSelector v-else v-model="selectedRegion" />
        </Card>

        <!-- Favorite Genres (Optional) -->
        <Card padding="lg">
          <h2
            class="text-xl font-semibold dark:text-gray-300 text-gray-800 mb-2"
          >
            {{ $t('preferences.content.favoriteGenres.title') }}
            <span class="text-sm font-normal text-gray-500 dark:text-gray-400">
              ({{ $t('common.optional') }})
            </span>
          </h2>
          <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">
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
          <div v-if="selectedGenres.length > 0" class="mt-4">
            <p
              class="mb-2 text-sm font-medium text-gray-800 dark:text-gray-300"
            >
              {{ $t('preferences.content.favoriteGenres.selected') }}
              ({{ selectedGenres.length }})
            </p>
            <div class="flex flex-wrap gap-2">
              <FilterPill
                v-for="genre in selectedGenres"
                :key="genre.id"
                :label="genre.name"
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

        <!-- Included Providers (Optional) -->
        <Card padding="lg">
          <h2
            class="text-xl font-semibold dark:text-gray-300 text-gray-800 mb-2"
          >
            {{ $t('preferences.content.includedProviders.title') }}
            <span class="text-sm font-normal text-gray-500 dark:text-gray-400">
              ({{ $t('common.optional') }})
            </span>
          </h2>
          <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">
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
          <div v-if="selectedProviders.length > 0" class="mt-4">
            <p
              class="mb-2 text-sm font-medium text-gray-800 dark:text-gray-300"
            >
              {{ $t('preferences.content.includedProviders.selected') }}
              ({{ selectedProviders.length }})
            </p>
            <div class="flex flex-wrap gap-2">
              <FilterPill
                v-for="provider in selectedProviders"
                :key="provider.provider_id"
                :label="provider.provider_name"
                :icon="
                  provider.logo_path
                    ? `https://image.tmdb.org/t/p/w45${provider.logo_path}`
                    : undefined
                "
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

        <!-- Continue Button -->
        <div class="mt-6 flex justify-center">
          <Button
            size="medium"
            variant="primary"
            :disabled="!selectedRegion || savingPreferences"
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
                  <IconTv icon-class="w-12 h-12" />
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
                class="mt-2 text-xs text-center dark:text-gray-300 text-gray-800 max-w-[96px] truncate"
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
                    ? 'ring-2 ring-primary dark:ring-primary-400'
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
                    <IconTv icon-class="w-12 h-12" />
                  </div>
                  <!-- Media Type Badge - Top Left -->
                  <div class="absolute top-2 left-2 z-10">
                    <Badge :type="result.media_type" />
                  </div>
                  <div
                    v-if="isSelected(result.id)"
                    class="absolute inset-0 bg-primary/20 dark:bg-primary-400/20 flex items-center justify-center"
                  >
                    <svg
                      class="w-12 h-12 text-primary dark:text-primary-400"
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

        <!-- Action Buttons -->
        <div class="mt-6 flex gap-3 justify-center">
          <Button size="small" variant="outline" @click="goBackToPreferences">
            {{ $t('common.back') }}
          </Button>
          <Button
            size="small"
            variant="primary"
            :disabled="selectedTitles.length === 0 || saving"
            @click="saveSelections"
          >
            {{ saving ? $t('onboarding.saving') : $t('onboarding.continue') }}
          </Button>
        </div>
      </div>

      <!-- Blocking Modal for Saving -->
      <Modal
        :is-open="saving || savingPreferences"
        :close-on-overlay-click="false"
      >
        <div class="flex flex-col gap-4 items-center text-center">
          <div
            class="w-12 h-12 rounded-full border-b-2 animate-spin border-primary-600"
          ></div>
          <h2 class="text-xl font-semibold text-gray-800 dark:text-gray-300">
            {{
              savingPreferences
                ? $t('onboarding.savingPreferences')
                : $t('home.generatingRecommendations')
            }}
          </h2>
        </div>
      </Modal>
    </div>
  </AppShell>
</template>
