<template>
  <div class="container mx-auto max-w-7xl px-4 py-12">
    <div class="mb-8">
      <h1
        class="text-3xl md:text-4xl font-bold dark:text-gray-300 text-gray-800 mb-2 font-heading"
      >
        Historial
      </h1>
      <p class="text-gray-800 dark:text-gray-300">
        Revisa las películas y series que has marcado como vistas o que no te
        interesan.
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
        v-if="titleToRemove"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
        @click="titleToRemove = null"
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
            ¿Estás seguro de que quieres eliminar "{{ titleToRemove.title }}" de
            tu historial?
          </p>
          <div class="flex gap-3 justify-end">
            <button
              type="button"
              class="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              @click="titleToRemove = null"
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

    <!-- Loading State -->
    <div v-if="isLoading" class="text-center py-12">
      <div
        class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"
      ></div>
      <p class="text-gray-800 dark:text-gray-300">Cargando historial...</p>
    </div>

    <!-- Content -->
    <div v-else class="space-y-12">
      <!-- Seen Section -->
      <section>
        <div class="mb-6">
          <h2
            class="text-2xl font-bold dark:text-gray-300 text-gray-800 mb-2 font-heading"
          >
            Vistas
          </h2>
          <p class="text-gray-800 dark:text-gray-300 text-sm">
            Películas y series que has marcado como vistas
          </p>
        </div>

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

              <!-- Remove Button -->
              <button
                type="button"
                class="tooltip-container absolute top-2 right-2 z-20 p-2 rounded-full bg-black/50 hover:bg-red-600/80 backdrop-blur-sm transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-black/50 pointer-events-auto"
                :aria-label="`Eliminar ${title.title} de la lista de vistas`"
                title="Eliminar de vistas"
                @click.stop.prevent="handleRemoveTitle(title, 'seen')"
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
                <span class="tooltip">Eliminar de vistas</span>
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
                {{ title.type === 'movie' ? 'Película' : 'Serie' }}
              </p>
            </div>
          </div>
        </div>
      </section>

      <!-- Not Interested Section -->
      <section>
        <div class="mb-6">
          <h2
            class="text-2xl font-bold dark:text-gray-300 text-gray-800 mb-2 font-heading"
          >
            No me interesan
          </h2>
          <p class="text-gray-800 dark:text-gray-300 text-sm">
            Películas y series que has marcado como no te interesan
          </p>
        </div>

        <div v-if="notInterestedTitles.length === 0" class="text-center py-12">
          <p class="text-gray-500 dark:text-gray-400">
            No has marcado ningún título como no te interesa todavía.
          </p>
        </div>

        <div
          v-else
          class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4"
        >
          <div
            v-for="title in notInterestedTitles"
            :key="`not-interested-${title.tmdb_id}`"
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

              <!-- Remove Button -->
              <button
                type="button"
                class="tooltip-container absolute top-2 right-2 z-20 p-2 rounded-full bg-black/50 hover:bg-red-600/80 backdrop-blur-sm transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-black/50 pointer-events-auto"
                :aria-label="`Eliminar ${title.title} de la lista de no me interesan`"
                title="Eliminar de no me interesan"
                @click.stop.prevent="handleRemoveTitle(title, 'not_interested')"
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
                <span class="tooltip">Eliminar de no me interesan</span>
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
                {{ title.type === 'movie' ? 'Película' : 'Serie' }}
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import AlertMessage from '@/components/AlertMessage.vue';
// These are auto-imported in Nuxt 3
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - Auto-imported
const supabase = useSupabaseClient();
const isLoading = ref(true);

useHead({
  title: 'Historial - UpNext',
});

useSeoMeta({
  title: 'Historial - UpNext',
  description:
    'Revisa las películas y series que has marcado como vistas o que no te interesan',
});

type HistoryTitle = {
  tmdb_id: number;
  title: string;
  type: 'movie' | 'tv';
  poster_path: string | null;
  status: string;
  created_at: string;
};

const seenTitles = ref<HistoryTitle[]>([]);
const notInterestedTitles = ref<HistoryTitle[]>([]);
const errorMessage = ref<string | null>(null);
const successMessage = ref<string | null>(null);
const titleToRemove = ref<{
  title: string;
  tmdb_id: number;
  type: 'seen' | 'not_interested';
} | null>(null);
const isRemoving = ref(false);

const fetchHistory = async () => {
  try {
    isLoading.value = true;

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      isLoading.value = false;
      return;
    }

    const response = await $fetch('/api/user-history', {
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    });

    seenTitles.value = response.seen || [];
    notInterestedTitles.value = response.not_interested || [];
  } catch (error) {
    console.error('Error fetching history:', error);
  } finally {
    isLoading.value = false;
  }
};

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

// Handle remove title - show confirmation
const handleRemoveTitle = (
  title: { title: string; tmdb_id: number },
  type: 'seen' | 'not_interested'
) => {
  if (isRemoving.value) return;
  titleToRemove.value = {
    title: title.title,
    tmdb_id: title.tmdb_id,
    type,
  };
};

// Confirm and remove title
const confirmRemoveTitle = async () => {
  if (!titleToRemove.value || isRemoving.value) return;

  const title = titleToRemove.value;
  titleToRemove.value = null;

  isRemoving.value = true;
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      showError('No estás autenticado. Por favor, inicia sesión.');
      isRemoving.value = false;
      return;
    }

    // Delete title status
    await $fetch('/api/user-title-status', {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
      query: {
        tmdb_id: title.tmdb_id,
      },
    });

    // Optimistic UI update
    if (title.type === 'seen') {
      seenTitles.value = seenTitles.value.filter(
        (t) => t.tmdb_id !== title.tmdb_id
      );
    } else {
      notInterestedTitles.value = notInterestedTitles.value.filter(
        (t) => t.tmdb_id !== title.tmdb_id
      );
    }

    showSuccess('Título eliminado del historial exitosamente.');
  } catch (error) {
    console.error('Error removing title:', error);
    showError('Error al eliminar el título. Por favor, intenta de nuevo.');
    // Refetch on error
    await fetchHistory();
  } finally {
    isRemoving.value = false;
  }
};

onMounted(() => {
  fetchHistory();
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
</style>
