<template>
  <!-- Loading state -->
  <div v-if="isLoading" class="flex items-center justify-center min-h-screen">
    <div class="text-xl text-white">Cargando...</div>
  </div>

  <!-- Error state -->
  <div
    v-else-if="hasError"
    class="flex items-center justify-center min-h-screen"
  >
    <div class="text-xl text-red-500">Error al cargar la serie</div>
  </div>

  <!-- Content -->
  <section
    v-else
    class="relative flex flex-row items-center justify-between p-8 text-white bg-gray-800 border gap-7 rounded-xl border-primary"
    :style="sectionStyle"
  >
    <div
      class="absolute inset-0 z-0 overflow-hidden rounded-xl bg-gradient-to-b from-black/70 to-black/90"
    ></div>
    <article
      class="relative overflow-hidden transition-transform duration-200 ease-out border cursor-pointer border-secondary rounded-xl max-w-80"
    >
      <RatingBadge :rating="tvShowWithProviders.vote_average" />
      <img
        :src="
          `https://image.tmdb.org/t/p/w780` + tvShowWithProviders.poster_path
        "
        :alt="tvShowWithProviders.name"
        class="object-cover rounded w-80"
      />
    </article>

    <article
      class="z-10 flex flex-col content-start justify-between flex-1 gap-6 p-6 ml-8 rounded-lg"
    >
      <h1 class="text-2xl font-bold">{{ tvShowWithProviders.name }}</h1>
      <p class="text-gray-300">{{ tvShowWithProviders.overview }}</p>
      <p class="mt-2"
        >Fecha de lanzamiento:
        {{ formatDateToSpanish(tvShowWithProviders.first_air_date) }}</p
      >
      <MediaStatusBagde :in-production="tvShowWithProviders.in_production" />
      <p
        >Géneros:
        {{
          tvShowWithProviders?.genres
            ?.map((genre: Genre) => genre.name)
            .join(', ') || 'No disponible'
        }}</p
      >
      <!-- Displaying watch providers with their logos-->
      <article class="flex flex-col gap-6">
        <h2 class="font-semibold text-md">Plataformas</h2>
        <article v-if="hasAvailableProviders" class="flex flex-col gap-8">
          <ProviderList
            :media-provider-prop-list="
              tvShowWithProviders.providers?.flatrate || []
            "
            watch-type-prop="Ver en:"
          />

          <ProviderList
            :media-provider-prop-list="tvShowWithProviders.providers?.buy || []"
            watch-type-prop="Compra:"
          />

          <ProviderList
            :media-provider-prop-list="
              tvShowWithProviders.providers?.rent || []
            "
            watch-type-prop="Alquiler:"
          />
        </article>
        <article v-else class="text-gray-400">
          <p>No disponible en ninguna plataforma</p>
        </article>
      </article>
    </article>
  </section>
  <section>
    <h2 class="col-span-4 text-2xl font-semibold my-11">Temporadas</h2>
    <div class="grid grid-cols-2 gap-4 md:grid-cols-4 justify-between relative">
      <article
        v-for="season in tvShowWithProviders.seasons"
        :key="season.id"
        class="rounded relative flex flex-col text-sm overflow-hidden shadow-primary/5 shadow-sm w-[300px] cursor-pointer hover:shadow-xl group hover:scale-105 transition-all duration-300"
      >
          <div class="aspect-[2/3] overflow-hidden relative">
            <img
              v-if="season.poster_path"
              :src="`https://image.tmdb.org/t/p/w780${season.poster_path}`"
              :alt="season.name"
              class="w-full h-full object-cover"
            />
            <div
            class="absolute bottom-0 left-0 flex flex-col items-center justify-center w-full h-full px-4 transition-all duration-300 rounded opacity-0 group-hover:opacity-100 backdrop-blur-md w-inherit bg-black/20"
          >
              <nuxt-link :to="`/serie/${tvShowId}/temporada/${season.season_number}`">
                <button class="text-white bg-primary hover:bg-secondary">
                    Ver episodios
                </button>
              </nuxt-link>

          </div>
          </div>

          <div
            class="flex flex-col justify-around py-5 px-6 bg-gray-800 min-h-[120px]"
          >
            <div class="flex items-center justify-between pb-3">
              <p class="text-lg font-semibold uppercase">{{ season.name }}</p>
              <div class="bg-black/50 rounded px-2 py-1.5"
                >⭐️ {{ season.vote_average }}</div
              >
            </div>
            <p
              >Fecha de lanzamiento:
              {{ formatDateToSpanish(season.air_date) }}</p
            >
            <p> {{ season.episode_count || 0 }} episodios </p>
          </div>
      </article>
    </div>
  </section>
</template>

<script setup lang="ts">
import { useRoute } from 'vue-router';
import { useFetch } from 'nuxt/app';
import { computed, onMounted, ref } from 'vue';

import { TVShow } from '@/types/TVShow';
import { formatDateToSpanish } from '@/utils/formatDate';
import { Genre } from '@/types/Genre';
import { watch } from 'vue';
import { WatchProviderTypes } from '@/types/WatchProvider';
import MediaStatusBagde from '@/components/MediaStatusBagde.vue';

const route = useRoute();

const tvShowId = route.params.id;

const {
  data: tvShowDetails,
  pending: tvShowPending,
  error: tvShowError,
} = await useFetch(`/api/tmdb/tvshows/${tvShowId}`);

const {
  data: tvProviders,
  pending: tvProvidersPending,
  error: tvProvidersError,
} = await useFetch(`/api/tmdb/tvshows/${tvShowId}/providers`);

const isLoading = computed(
  () => tvShowPending.value || tvProvidersPending.value
);
const hasError = computed(() => tvShowError.value || tvProvidersError.value);

const tvShow = computed<TVShow>(
  () => (tvShowDetails.value as TVShow) || ({} as TVShow)
);
const tvShowProviders = computed(
  () => (tvProviders.value as WatchProviderTypes) || ({} as WatchProviderTypes)
);

const tvShowWithProviders = computed<TVShow>(() => {
  return {
    ...tvShow.value,
    providers: tvShowProviders.value,
  };
});

const backgroundImage = ref<string>('');

function setBackgroundImage() {
  if (tvShow.value.backdrop_path) {
    backgroundImage.value = `https://image.tmdb.org/t/p/original${tvShow.value.backdrop_path}`;
  } else {
    backgroundImage.value = '';
  }
}

const sectionStyle = computed(() => ({
  backgroundImage: `url(${backgroundImage.value})`,
  backgroundSize: 'cover',
  backgroundPosition: 'center',
}));

const hasAvailableProviders = computed(() => {
  return (
    tvShowWithProviders.value.providers?.flatrate?.length ||
    tvShowWithProviders.value.providers?.buy?.length ||
    tvShowWithProviders.value.providers?.rent?.length
  );
});

onMounted(() => {
  setBackgroundImage();
});

watch(
  () => route.params.id,
  async (newId) => {
    if (newId && newId !== tvShowId) {
      setBackgroundImage();
    }
  }
);
</script>

<style scoped>
.line-clamp-1 {
  overflow: hidden;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 1;
  line-clamp: 1;
}

.line-clamp-3 {
  overflow: hidden;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
  line-clamp: 3;
}
</style>
