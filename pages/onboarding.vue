<script setup lang="ts">
definePageMeta({
  middleware: 'auth',
});

useHead({
  title: 'Onboarding - UpNext',
});

useSeoMeta({
  title: 'Onboarding - UpNext',
  description:
    'Selecciona tus películas y series favoritas para recibir recomendaciones personalizadas',
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
  media_type: 'movie' | 'tv';
  genre_ids?: number[];
  vote_average?: number;
}

const supabase = useSupabaseClient();
const userStore = useUserStore();
const router = useRouter();
const user = useSupabaseUser();

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

      // Filter to only movies and TV shows, limit to 20
      searchResults.value = response.data.results
        .filter((r) => r.media_type === 'movie' || r.media_type === 'tv')
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
      error.value = 'Solo puedes seleccionar hasta 10 títulos';
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
      } = await supabase.auth.getSession();
      if (!session?.user) {
        error.value = 'Debes estar autenticado para guardar tus selecciones.';
        saving.value = false;
        return;
      }
      // Set user in store
      userStore.setUser(session.user);
      await userStore.fetchProfile();
    }

    const userId = (userStore.user || user.value)!.id;

    // First, ensure all titles exist in the database
    for (const title of selectedTitles.value) {
      // Check if title exists
      const { data: existingTitle } = await supabase
        .from('titles')
        .select('id')
        .eq('tmdb_id', title.id)
        .eq('type', title.media_type)
        .single();

      let titleId: string;

      if (existingTitle) {
        titleId = existingTitle.id;
      } else {
        // Insert new title
        const { data: newTitle, error: insertError } = await supabase
          .from('titles')
          .insert({
            tmdb_id: title.id,
            title: title.title || title.name || 'Unknown',
            type: title.media_type,
            poster_path: title.poster_path,
            backdrop_path: title.backdrop_path,
            overview: title.overview,
            release_date: title.release_date || null,
            first_air_date: title.first_air_date || null,
            genres: title.genre_ids || [],
            vote_average: title.vote_average || null,
          })
          .select('id')
          .single();

        if (insertError) throw insertError;
        titleId = newTitle.id;
      }

      // Insert user like (will fail silently if duplicate due to UNIQUE constraint)
      const { error: likeError } = await supabase.from('user_likes').insert({
        user_id: userId,
        title_id: titleId,
      });

      if (likeError && likeError.code !== '23505') {
        // 23505 is unique_violation, which is expected for duplicates
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

    // Redirect to home
    await router.push('/');
  } catch (err: unknown) {
    console.error('Error saving selections:', err);
    const errorMessage =
      err instanceof Error
        ? err.message
        : 'Error al guardar las selecciones. Por favor, inténtalo de nuevo.';
    error.value = errorMessage;
  } finally {
    saving.value = false;
  }
};
</script>
<template>
  <div class="min-h-screen py-8 px-4">
    <div class="max-w-4xl mx-auto">
      <!-- Header -->
      <div class="text-center mb-8">
        <h1 class="text-3xl font-bold dark:text-white text-gray-900 mb-2">
          ¿Qué te gusta ver?
        </h1>
        <p class="text-gray-600 dark:text-gray-400">
          Selecciona hasta 10 películas o series que disfrutes. Esto nos ayuda a
          recomendarte contenido que te encantará.
        </p>
        <div class="mt-4">
          <span
            class="inline-block px-4 py-2 bg-primary/10 text-primary rounded-full text-sm font-medium"
          >
            {{ selectedTitles.length }} / 10 seleccionados
          </span>
        </div>
      </div>

      <!-- Alert Messages -->
      <AlertMessage v-if="error" :message="error" type="error" />
      <AlertMessage v-if="success" :message="success" type="success" />

      <!-- Search -->
      <div class="mb-6">
        <div class="relative">
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Buscar películas o series..."
            class="w-full px-4 py-3 pl-12 dark:bg-gray-800/70 bg-gray-100/90 dark:text-white text-gray-900 border border-primary/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary backdrop-blur-xs"
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
        <h2 class="text-lg font-semibold dark:text-white text-gray-900 mb-3">
          Tus selecciones
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
                Sin imagen
              </div>
              <button
                type="button"
                :aria-label="`Eliminar ${title.title || title.name}`"
                data-icon-only="true"
                class="absolute top-1 right-1 w-7 h-7 !bg-red-500 hover:!bg-red-600 rounded-full flex items-center justify-center text-white shadow-lg transition-all duration-200 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-transparent z-10 !p-0 cursor-pointer"
                @click.stop="removeTitle(title.id)"
              >
                <svg
                  class="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
            <p
              class="mt-1 text-xs text-center dark:text-gray-300 text-gray-700 max-w-[96px] truncate"
            >
              {{ title.title || title.name }}
            </p>
          </div>
        </div>
      </div>

      <!-- Search Results -->
      <div v-if="searchResults.length > 0" class="mb-6">
        <h2 class="text-lg font-semibold dark:text-white text-gray-900 mb-3">
          Resultados de búsqueda
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
                  Sin imagen
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
              class="mt-2 text-sm text-center dark:text-gray-300 text-gray-700 line-clamp-2"
            >
              {{ result.title || result.name }}
            </p>
            <p class="text-xs text-center text-gray-500">
              {{ result.media_type === 'movie' ? 'Película' : 'Serie' }}
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
          No se encontraron resultados. Prueba con otro término de búsqueda.
        </p>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="text-center py-12">
        <div
          class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"
        ></div>
      </div>

      <!-- Continue Button -->
      <div class="mt-8 text-center">
        <button
          :disabled="selectedTitles.length === 0 || saving"
          class="px-8 py-3 bg-gradient-to-r from-primary via-accent to-secondary hover:from-secondary hover:via-pink-500 hover:to-primary text-white rounded-lg font-medium transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
          @click="saveSelections"
        >
          {{ saving ? 'Guardando...' : 'Continuar' }}
        </button>
      </div>
    </div>
  </div>
</template>
