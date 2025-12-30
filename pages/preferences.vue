<template>
  <div class="container mx-auto max-w-7xl px-4 py-12">
    <div class="mb-8">
      <h1
        class="text-3xl md:text-4xl font-bold dark:text-gray-300 text-gray-800 mb-2 font-heading"
      >
        Editar preferencias
      </h1>
      <p class="text-gray-800 dark:text-gray-300">
        Gestiona tus películas y series favoritas. Puedes tener hasta 10
        títulos.
      </p>
    </div>

    <!-- Alert Messages -->
    <AlertMessage v-if="errorMessage" :message="errorMessage" type="error" />
    <AlertMessage
      v-if="successMessage"
      :message="successMessage"
      type="success"
    />

    <!-- Confirmation Dialog -->
    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="transform scale-95 opacity-0"
      enter-to-class="transform scale-100 opacity-100"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="transform scale-100 opacity-100"
      leave-to-class="transform scale-95 opacity-0"
    >
      <div
        v-if="titleToDelete"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
        @click="titleToDelete = null"
      >
        <div
          class="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 max-w-md mx-4"
          @click.stop
        >
          <h3
            class="text-lg font-semibold dark:text-gray-300 text-gray-800 mb-2"
          >
            Confirmar eliminación
          </h3>
          <p class="text-gray-800 dark:text-gray-300 mb-4">
            ¿Estás seguro de que quieres eliminar "{{ titleToDelete.title }}" de
            tus preferencias?
          </p>
          <div class="flex gap-3 justify-end">
            <button
              type="button"
              class="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              @click="titleToDelete = null"
            >
              Cancelar
            </button>
            <button
              type="button"
              class="px-4 py-2 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors"
              @click="confirmRemoveTitle"
            >
              Eliminar
            </button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- Add New Title Section -->
    <div class="mb-8">
      <h2
        class="text-xl font-semibold dark:text-gray-300 text-gray-800 mb-4 font-heading"
      >
        Agregar título
      </h2>
      <div class="max-w-2xl">
        <SearchBar
          :emit-on-select="true"
          @title-selected="handleTitleSelected"
        />
      </div>
      <p
        v-if="likedTitles.length >= 10"
        class="mt-2 text-sm text-amber-600 dark:text-amber-400"
      >
        Has alcanzado el límite de 10 títulos. Elimina uno para agregar otro.
      </p>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="text-center py-12">
      <div
        class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"
      ></div>
      <p class="text-gray-800 dark:text-gray-300">Cargando preferencias...</p>
    </div>

    <!-- Liked Titles Grid -->
    <div v-else-if="likedTitles.length > 0" class="mb-8">
      <h2
        class="text-xl font-semibold dark:text-gray-300 text-gray-800 mb-4 font-heading"
      >
        Tus títulos ({{ likedTitles.length }}/10)
      </h2>
      <div
        class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4"
      >
        <div
          v-for="title in likedTitles"
          :key="title.id"
          class="group relative dark:bg-gray-900/40 bg-gray-100/80 backdrop-blur-xl rounded-lg border border-gray-300/50 dark:border-white/10 hover:border-gray-400/50 dark:hover:border-white/20 transition-all duration-300 hover:shadow-lg hover:shadow-gray-900/20"
        >
          <!-- Poster -->
          <nuxt-link
            :to="`/${title.type === 'movie' ? 'pelicula' : 'serie'}/${title.tmdb_id}`"
            :aria-label="`Ver detalles de ${title.title}`"
            class="block aspect-[2/3] relative bg-gray-800 rounded-t-lg focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
          >
            <div
              v-if="title.poster_path"
              class="w-full h-full overflow-hidden rounded-t-lg"
            >
              <img
                :src="`https://image.tmdb.org/t/p/w500${title.poster_path}`"
                :alt="`Poster de ${title.title}`"
                class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                loading="lazy"
                decoding="async"
              />
            </div>
            <div
              v-else
              class="w-full h-full flex items-center justify-center text-gray-400 overflow-hidden rounded-t-lg"
              role="img"
              :aria-label="`Sin poster disponible para ${title.title}`"
            >
              <svg
                class="w-12 h-12"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </div>

            <!-- Remove Button -->
            <button
              type="button"
              class="tooltip-container absolute top-2 right-2 z-20 p-2 rounded-full bg-black/50 hover:bg-red-600/80 backdrop-blur-sm transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-black/50 pointer-events-auto"
              :aria-label="`Eliminar ${title.title}`"
              title="Eliminar de preferencias"
              :disabled="isRemoving"
              @click.stop.prevent="handleRemoveTitle(title)"
              @mousedown.stop.prevent
            >
              <svg
                class="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
              <span class="tooltip">Eliminar de preferencias</span>
            </button>
          </nuxt-link>

          <!-- Title -->
          <div class="p-4">
            <h3
              class="text-sm font-semibold dark:text-gray-300 text-gray-800 truncate mb-1"
            >
              {{ title.title }}
            </h3>
            <p class="text-xs dark:text-gray-300 text-gray-500 mb-2">
              {{ title.type === 'movie' ? 'Película' : 'Serie' }}
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div
      v-else
      class="text-center py-12 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg"
    >
      <svg
        class="w-16 h-16 mx-auto mb-4 text-gray-400"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
        />
      </svg>
      <p class="text-gray-800 dark:text-gray-300">
        Aún no has agregado ningún título. Usa el buscador arriba para agregar
        tus favoritos.
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
// These are auto-imported in Nuxt 3
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - Auto-imported
const supabase = useSupabaseClient();
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - Auto-imported
const user = useSupabaseUser();
import { useUserStore } from '@/stores/user';
import SearchBar from '@/components/SearchBar.vue';
import AlertMessage from '@/components/AlertMessage.vue';
import type { TMDBSearchResult } from '@/types/TMDBSearch';

// Auth
const userStore = useUserStore();

// State
const likedTitles = ref<
  Array<{
    id: string;
    title: string;
    type: 'movie' | 'tv';
    poster_path: string | null;
    tmdb_id: number;
  }>
>([]);
const isLoading = ref(true);
const isRemoving = ref(false);
const errorMessage = ref<string | null>(null);
const successMessage = ref<string | null>(null);
const titleToDelete = ref<{ id: string; title: string } | null>(null);

// Helper to show messages
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

// Helper to get user ID
const getUserId = () => {
  return user.value?.id || (user.value as { sub?: string })?.sub;
};

// Fetch user's liked titles
const fetchLikedTitles = async () => {
  const userId = getUserId();
  if (!userId) return;

  isLoading.value = true;
  try {
    const { data, error } = await supabase
      .from('user_likes')
      .select('id, titles(id, title, type, poster_path, tmdb_id)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    likedTitles.value =
      data?.map(
        (like: {
          id: string;
          titles: {
            id: string;
            title: string;
            type: 'movie' | 'tv';
            poster_path: string | null;
            tmdb_id: number;
          };
        }) => ({
          id: like.id,
          title: like.titles.title,
          type: like.titles.type,
          poster_path: like.titles.poster_path,
          tmdb_id: like.titles.tmdb_id,
        })
      ) || [];
  } catch (error) {
    console.error('Error fetching liked titles:', error);
  } finally {
    isLoading.value = false;
  }
};

// Remove a title - show confirmation
const handleRemoveTitle = (title: { id: string; title: string }) => {
  if (isRemoving.value) return;
  titleToDelete.value = title;
};

// Confirm and remove title
const confirmRemoveTitle = async () => {
  if (!titleToDelete.value || isRemoving.value) return;

  const title = titleToDelete.value;
  titleToDelete.value = null;

  isRemoving.value = true;
  try {
    const { error } = await supabase
      .from('user_likes')
      .delete()
      .eq('id', title.id);

    if (error) throw error;

    // Optimistic UI update
    likedTitles.value = likedTitles.value.filter((t) => t.id !== title.id);

    // Update user store
    await userStore.fetchProfile();
    showSuccess('Título eliminado exitosamente.');
  } catch (error) {
    console.error('Error removing title:', error);
    showError('Error al eliminar el título. Por favor, intenta de nuevo.');
    // Refetch on error
    await fetchLikedTitles();
  } finally {
    isRemoving.value = false;
  }
};

// Add a new title
const handleTitleSelected = async (result: TMDBSearchResult) => {
  const userId = getUserId();
  if (!userId) return;

  // Check limit
  if (likedTitles.value.length >= 10) {
    showError(
      'Has alcanzado el límite de 10 títulos. Elimina uno para agregar otro.'
    );
    return;
  }

  // Check if already liked in local state
  const alreadyLiked = likedTitles.value.some(
    (t) => t.tmdb_id === result.id && t.type === result.media_type
  );
  if (alreadyLiked) {
    showError('Este título ya está en tus preferencias.');
    return;
  }

  try {
    // Check if title exists in database
    const { data: existingTitle, error: titleCheckError } = await supabase
      .from('titles')
      .select('id')
      .eq('tmdb_id', result.id)
      .eq('type', result.media_type)
      .maybeSingle();

    if (titleCheckError && titleCheckError.code !== 'PGRST116') {
      // PGRST116 is "not found" which is fine
      throw titleCheckError;
    }

    // If title exists, check if user already liked it
    if (existingTitle) {
      const { data: existingLike } = await supabase
        .from('user_likes')
        .select('id')
        .eq('user_id', userId)
        .eq('title_id', existingTitle.id)
        .maybeSingle();

      if (existingLike) {
        showError('Este título ya está en tus preferencias.');
        // Refetch to sync UI
        await fetchLikedTitles();
        return;
      }
    }

    let titleId: string;

    if (existingTitle) {
      titleId = existingTitle.id;
    } else {
      // Insert new title
      const { data: newTitle, error: insertError } = await supabase
        .from('titles')
        .insert({
          tmdb_id: result.id,
          title: result.title || result.name || 'Unknown',
          type: result.media_type,
          poster_path: result.poster_path,
          backdrop_path: result.backdrop_path,
          overview: result.overview,
          release_date: result.release_date || null,
          first_air_date: result.first_air_date || null,
          genres: [], // Genre IDs not available in search result, will be fetched later if needed
          vote_average: result.vote_average || null,
        })
        .select('id')
        .single();

      if (insertError) throw insertError;
      titleId = newTitle.id;
    }

    // Insert user like
    const { data: newLike, error: likeError } = await supabase
      .from('user_likes')
      .insert({
        user_id: userId,
        title_id: titleId,
      })
      .select('id, titles(id, title, type, poster_path, tmdb_id)')
      .single();

    if (likeError) {
      if (likeError.code === '23505') {
        // Unique violation - already liked
        showError('Este título ya está en tus preferencias.');
        // Refetch to sync UI
        await fetchLikedTitles();
        return;
      }
      throw likeError;
    }

    // Optimistic UI update
    likedTitles.value.unshift({
      id: newLike.id,
      title: newLike.titles.title,
      type: newLike.titles.type,
      poster_path: newLike.titles.poster_path,
      tmdb_id: newLike.titles.tmdb_id,
    });

    // Update user store
    await userStore.fetchProfile();
    showSuccess('Título agregado exitosamente.');
  } catch (error) {
    console.error('Error adding title:', error);
    showError('Error al agregar el título. Por favor, intenta de nuevo.');
  }
};

// Fetch on mount
onMounted(() => {
  fetchLikedTitles();
});

// Page meta
definePageMeta({
  middleware: 'auth',
});

useHead({
  title: 'Editar preferencias - UpNext',
});
</script>

<style scoped>
/* Ensure tooltips can escape overflow containers */
.tooltip-container:hover,
.tooltip-container:focus {
  z-index: 10000;
}

.tooltip {
  position: absolute;
  top: calc(100% + 8px);
  left: 50%;
  transform: translateX(-50%) translateY(4px);
  background-color: rgba(0, 0, 0, 0.95);
  color: white;
  padding: 6px 10px;
  border-radius: 6px;
  font-size: 12px;
  white-space: nowrap;
  pointer-events: none;
  opacity: 0;
  transition:
    opacity 0.2s ease-in-out,
    transform 0.2s ease-in-out;
  z-index: 9999;
  margin-top: 0;
}

.tooltip::after {
  content: '';
  position: absolute;
  bottom: 100%;
  left: 50%;
  transform: translateX(-50%);
  border: 4px solid transparent;
  border-bottom-color: rgba(0, 0, 0, 0.95);
}

.tooltip-container:hover .tooltip,
.tooltip-container:focus .tooltip {
  opacity: 1;
  transform: translateX(-50%) translateY(0);
}

/* Ensure tooltip is visible on focus for keyboard navigation */
.tooltip-container:focus-visible .tooltip {
  opacity: 1;
  transform: translateX(-50%) translateY(0);
}

/* Ensure article allows tooltip overflow while maintaining rounded corners */
div[class*='group relative'] {
  overflow: visible;
}

/* Poster link doesn't need overflow-hidden anymore - handled by inner div */
div[class*='group relative'] > a {
  border-radius: 0.5rem 0.5rem 0 0;
}

/* Ensure content area also has proper overflow and rounded corners */
div[class*='group relative'] > div:last-child {
  overflow: hidden;
  border-radius: 0 0 0.5rem 0.5rem;
}
</style>
