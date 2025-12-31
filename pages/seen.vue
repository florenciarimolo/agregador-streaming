<template>
  <div class="container mx-auto max-w-7xl px-4 py-12">
    <div class="mb-8">
      <h1
        class="text-3xl md:text-4xl font-bold dark:text-gray-300 text-gray-800 mb-2 font-heading"
      >
        Visto
      </h1>
      <p class="text-gray-800 dark:text-gray-300">
        Películas y series que has marcado como vistas.
      </p>
    </div>

    <!-- Alert Messages -->
    <AlertMessage v-if="errorMessage" :message="errorMessage" type="error" />
    <AlertMessage
      v-if="successMessage"
      :message="successMessage"
      type="success"
    />

    <!-- Loading State -->
    <div v-if="isLoading" class="text-center py-12">
      <div
        class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"
      ></div>
      <p class="text-gray-800 dark:text-gray-300">Cargando títulos vistos...</p>
    </div>

    <!-- Content -->
    <div v-else>
      <div v-if="seenTitles.length === 0" class="text-center py-12">
        <p class="text-gray-500 dark:text-gray-400">
          No has marcado ningún título como visto todavía.
        </p>
      </div>

      <div
        v-else
        class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4"
      >
        <div
          v-for="title in seenTitles"
          :key="`seen-${title.tmdb_id}`"
          class="group relative dark:bg-gray-900/40 bg-gray-100/80 backdrop-blur-xl rounded-lg border border-gray-300/50 dark:border-white/10 hover:border-gray-400/50 dark:hover:border-white/20 transition-all duration-300 hover:shadow-lg hover:shadow-gray-900/20"
        >
          <!-- Poster -->
          <nuxt-link
            :to="`/${title.type === MediaTypeEnum.movie ? 'pelicula' : 'serie'}/${title.tmdb_id}`"
            :aria-label="`Ver detalles de ${title.title}`"
            class="block aspect-[2/3] relative bg-gray-800 rounded-t-lg focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 overflow-visible"
          >
            <div
              v-if="title.poster_path"
              class="w-full h-full overflow-hidden rounded-t-lg"
            >
              <img
                :src="`https://image.tmdb.org/t/p/w500${title.poster_path}`"
                :alt="title.title"
                class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                loading="lazy"
                decoding="async"
              />
            </div>
            <div
              v-else
              class="w-full h-full flex items-center justify-center text-gray-400 overflow-hidden rounded-t-lg"
            >
              <svg
                class="w-12 h-12"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </div>

            <!-- Actions Menu (if can mark as liked) -->
            <div
              v-if="!title.liked && canMarkAsLiked"
              class="absolute top-2 left-2 z-20"
            >
              <button
                type="button"
                class="tooltip-container p-2 rounded-full bg-black/50 hover:bg-primary/80 backdrop-blur-sm transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-black/50 pointer-events-auto"
                :aria-label="`Marcar ${title.title} como me gusta`"
                title="Me gusta"
                @click.stop.prevent="handleMarkAsLiked(title)"
                @mousedown.stop.prevent
              >
                <svg
                  class="w-4 h-4 text-white"
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
                <span class="tooltip">Me gusta</span>
              </button>
            </div>

            <!-- Liked Badge -->
            <div
              v-if="title.liked"
              class="absolute top-2 left-2 z-10 p-2 rounded-full bg-primary/80 backdrop-blur-sm"
              title="Me gusta"
            >
              <svg
                class="w-4 h-4 text-white"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                />
              </svg>
            </div>

            <!-- Remove Button -->
            <button
              type="button"
              class="tooltip-container absolute top-2 right-2 z-20 p-2 rounded-full bg-black/50 hover:bg-red-600/80 backdrop-blur-sm transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-black/50 pointer-events-auto"
              :aria-label="`Eliminar ${title.title} de la lista de vistas`"
              title="Eliminar de la lista"
              @click.stop.prevent="handleRemoveTitle(title)"
              @mousedown.stop.prevent
            >
              <svg
                class="w-4 h-4 text-white"
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
              <span class="tooltip">Eliminar de la lista</span>
            </button>
          </nuxt-link>

          <!-- Content -->
          <div class="p-4">
            <h3
              class="text-sm font-semibold dark:text-gray-300 text-gray-800 truncate mb-1"
            >
              {{ title.title }}
            </h3>
            <p class="text-xs dark:text-gray-300 text-gray-500 mb-2">
              {{ title.type === MediaTypeEnum.movie ? 'Película' : 'Serie' }}
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { TitleStatus } from '@/types/TitleStatus';
import { MediaTypeEnum } from '@/types/enums/MediaTypeEnum';
import { getSession } from '@/composables/database/auth';
import { getUserLikedTitles } from '@/composables/database/userTitleStatus';
import AlertMessage from '@/components/AlertMessage.vue';

useHead({
  title: 'Visto - UpNext',
});

useSeoMeta({
  title: 'Visto - UpNext',
  description: 'Revisa las películas y series que has marcado como vistas',
});

type SeenTitle = {
  tmdb_id: number;
  title: string;
  type: typeof MediaTypeEnum.movie | typeof MediaTypeEnum.tv;
  poster_path: string | null;
  liked: boolean;
  created_at: string;
};

type HistoryResponseItem = {
  tmdb_id: number;
  title?: string;
  name?: string;
  type: string;
  poster_path: string | null;
  liked?: boolean;
  created_at: string;
};

const isLoading = ref(true);
const seenTitles = ref<SeenTitle[]>([]);
const errorMessage = ref<string | null>(null);
const successMessage = ref<string | null>(null);
const isRemoving = ref(false);
const isMarkingLiked = ref(false);

// Check if user can mark more titles as liked (max 10)
const canMarkAsLiked = ref(true);

const checkCanMarkAsLiked = async () => {
  try {
    const {
      data: { session },
    } = await getSession();
    if (!session?.access_token) {
      canMarkAsLiked.value = false;
      return;
    }

    const userId = session.user.id;
    const { data: likedTitles } = await getUserLikedTitles(userId);
    canMarkAsLiked.value = (likedTitles?.length || 0) < 10;
  } catch {
    canMarkAsLiked.value = false;
  }
};

const fetchSeenTitles = async () => {
  try {
    isLoading.value = true;

    const {
      data: { session },
    } = await getSession();

    if (!session?.access_token) {
      isLoading.value = false;
      return;
    }

    const response = await $fetch('/api/users/history', {
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    });

    seenTitles.value = (response.seen || []).map(
      (item: HistoryResponseItem) => ({
        tmdb_id: item.tmdb_id,
        title: item.title || item.name || 'Sin título',
        type: item.type as typeof MediaTypeEnum.movie | typeof MediaTypeEnum.tv,
        poster_path: item.poster_path,
        liked: item.liked || false,
        created_at: item.created_at,
      })
    );
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Error fetching seen titles:', error);
    }
    showError('Error al cargar los títulos vistos.');
  } finally {
    isLoading.value = false;
  }
};

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

const handleRemoveTitle = async (title: SeenTitle) => {
  if (isRemoving.value) return;

  isRemoving.value = true;
  try {
    const {
      data: { session },
    } = await getSession();

    if (!session?.access_token) {
      showError('No estás autenticado. Por favor, inicia sesión.');
      isRemoving.value = false;
      return;
    }

    // Delete title status
    await $fetch('/api/users/title-status', {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
      query: {
        tmdb_id: title.tmdb_id,
      },
    });

    // Optimistic UI update
    seenTitles.value = seenTitles.value.filter(
      (t) => t.tmdb_id !== title.tmdb_id
    );

    showSuccess('Título eliminado exitosamente.');
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Error removing title:', error);
    }
    showError('Error al eliminar el título. Por favor, intenta de nuevo.');
    await fetchSeenTitles();
  } finally {
    isRemoving.value = false;
  }
};

const handleMarkAsLiked = async (title: SeenTitle) => {
  if (isMarkingLiked.value) return;

  isMarkingLiked.value = true;
  try {
    const {
      data: { session },
    } = await getSession();

    if (!session?.access_token) {
      showError('No estás autenticado. Por favor, inicia sesión.');
      isMarkingLiked.value = false;
      return;
    }

    // Update title status to set liked=true
    await $fetch('/api/users/title-status', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
      body: {
        tmdb_id: title.tmdb_id,
        type: title.type,
        status: TitleStatus.SEEN,
        liked: true,
      },
    });

    // Optimistic UI update
    const index = seenTitles.value.findIndex(
      (t) => t.tmdb_id === title.tmdb_id
    );
    if (index !== -1) {
      seenTitles.value[index].liked = true;
    }

    showSuccess('Título marcado como me gusta.');
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Error marking as liked:', error);
    }
    showError('Error al marcar como me gusta. Por favor, intenta de nuevo.');
    await fetchSeenTitles();
  } finally {
    isMarkingLiked.value = false;
  }
};

onMounted(async () => {
  await Promise.all([fetchSeenTitles(), checkCanMarkAsLiked()]);
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

.tooltip-container:focus-visible .tooltip {
  opacity: 1;
  transform: translateX(-50%) translateY(0);
}
</style>
