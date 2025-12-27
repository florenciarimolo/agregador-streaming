<template>
  <div class="container mx-auto max-w-7xl px-4 py-12">
    <div class="mb-8">
      <h1
        class="text-3xl md:text-4xl font-bold dark:text-white text-gray-900 mb-2 font-heading"
      >
        Historial
      </h1>
      <p class="text-gray-600 dark:text-gray-300">
        Revisa las películas y series que has marcado como vistas o que no te
        interesan.
      </p>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="text-center py-12">
      <div
        class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"
      ></div>
      <p class="text-gray-600 dark:text-gray-400">Cargando historial...</p>
    </div>

    <!-- Content -->
    <div v-else class="space-y-12">
      <!-- Seen Section -->
      <section>
        <div class="mb-6">
          <h2
            class="text-2xl font-bold dark:text-white text-gray-900 mb-2 font-heading"
          >
            Vistas
          </h2>
          <p class="text-gray-600 dark:text-gray-400 text-sm">
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
          <nuxt-link
            v-for="title in seenTitles"
            :key="`seen-${title.tmdb_id}`"
            :to="`/${title.type === 'movie' ? 'pelicula' : 'serie'}/${title.tmdb_id}`"
            class="group relative dark:bg-gray-800/50 bg-white rounded-lg overflow-hidden border border-primary/20 hover:border-primary/40 transition-all duration-300 hover:shadow-lg hover:shadow-primary/10"
          >
            <div class="aspect-[2/3] relative overflow-hidden bg-gray-800">
              <img
                v-if="title.poster_path"
                :src="`https://image.tmdb.org/t/p/w500${title.poster_path}`"
                :alt="title.title"
                class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                loading="lazy"
                decoding="async"
              />
              <div
                v-else
                class="w-full h-full flex items-center justify-center text-gray-400"
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
            </div>
            <div class="p-3">
              <h3
                class="text-sm font-semibold dark:text-white text-gray-900 truncate mb-1"
              >
                {{ title.title }}
              </h3>
              <p class="text-xs dark:text-gray-400 text-gray-500">
                {{ title.type === 'movie' ? 'Película' : 'Serie' }}
              </p>
            </div>
          </nuxt-link>
        </div>
      </section>

      <!-- Not Interested Section -->
      <section>
        <div class="mb-6">
          <h2
            class="text-2xl font-bold dark:text-white text-gray-900 mb-2 font-heading"
          >
            No me interesan
          </h2>
          <p class="text-gray-600 dark:text-gray-400 text-sm">
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
          <nuxt-link
            v-for="title in notInterestedTitles"
            :key="`not-interested-${title.tmdb_id}`"
            :to="`/${title.type === 'movie' ? 'pelicula' : 'serie'}/${title.tmdb_id}`"
            class="group relative dark:bg-gray-800/50 bg-white rounded-lg overflow-hidden border border-primary/20 hover:border-primary/40 transition-all duration-300 hover:shadow-lg hover:shadow-primary/10"
          >
            <div class="aspect-[2/3] relative overflow-hidden bg-gray-800">
              <img
                v-if="title.poster_path"
                :src="`https://image.tmdb.org/t/p/w500${title.poster_path}`"
                :alt="title.title"
                class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                loading="lazy"
                decoding="async"
              />
              <div
                v-else
                class="w-full h-full flex items-center justify-center text-gray-400"
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
            </div>
            <div class="p-3">
              <h3
                class="text-sm font-semibold dark:text-white text-gray-900 truncate mb-1"
              >
                {{ title.title }}
              </h3>
              <p class="text-xs dark:text-gray-400 text-gray-500">
                {{ title.type === 'movie' ? 'Película' : 'Serie' }}
              </p>
            </div>
          </nuxt-link>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
// These are auto-imported in Nuxt 3
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - Auto-imported
const supabase = useSupabaseClient();
const isLoading = ref(true);
const seenTitles = ref<any[]>([]);
const notInterestedTitles = ref<any[]>([]);

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

onMounted(() => {
  fetchHistory();
});
</script>
