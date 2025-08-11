<template>
    <!-- <div class="grid grid-cols-4 gap-4 md:grid-cols-6">
      <div v-for="tvShow in tvS" :key="tvShow.id"
        class="w-[200px] rounded border border-[#646cff] relative flex flex-col items-center justify-center text-sm text-white/80 overflow-hidden shadow-sm max-w-80">
        <div class="">
          <a href="#">
            <img v-if="tvShow.poster_path" :src="`https://image.tmdb.org/t/p/w200${tvShow.poster_path}`"
              :alt="tvShow.title" class="" />
          </a>
        </div>

        <div class="flex flex-col justify-around w-full h-full p-3 backdrop-blur-sm bg-white/10">
          <div class="flex items-center justify-between w-full pb-3">
            <p>{{ tvShow.title }}</p>
            <div class="bg-black/50 rounded px-2 py-1.5">{{ tvShow.vote_average }}</div>
          </div>
          <p class="text-xs text-gray-300">{{ tvShow.release_date }}</p>

        </div>

      </div>
    </div> -->
      <!-- Loading state -->
  <div v-if="isLoading" class="flex items-center justify-center min-h-screen">
    <div class="text-white text-xl">Cargando...</div>
  </div>

  <!-- Error state -->
  <div
    v-else-if="hasError"
    class="flex items-center justify-center min-h-screen"
  >
    <div class="text-red-500 text-xl">Error al cargar la serie</div>
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
    <div
      class="relative overflow-hidden transition-transform duration-200 ease-out border cursor-pointer border-secondary rounded-xl max-w-80"
      @mousemove="calculateTilt"
      @mouseleave="resetTilt"
    >
      <RatingBadge :rating="tvShowWithProviders.vote_average" />
      <img
        :src="
          `https://image.tmdb.org/t/p/w780` + tvShowWithProviders.poster_path
        "
        :alt="tvShowWithProviders.name"
        class="object-cover rounded w-80"
      />
    </div>

    <div
      class="z-10 flex flex-col content-start justify-between flex-1 gap-6 p-6 ml-8 rounded-lg"
    >
      <h1 class="text-2xl font-bold">{{ tvShowWithProviders.name }}</h1>
      <p class="text-gray-300">{{ tvShowWithProviders.overview }}</p>
      <p class="mt-2"
        >Fecha de lanzamiento:
        {{ formatDateToSpanish(tvShowWithProviders.first_air_date) }}</p
      >
      <p
        >Géneros:
        {{
          tvShowWithProviders?.genres
            ?.map((genre: Genre) => genre.name)
            .join(', ') || 'No disponible'
        }}</p
      >
      <!-- Displaying watch providers with their logos-->
      <section class="flex flex-col gap-6">
        <h2 class="font-semibold text-md">Plataformas</h2>
        <section v-if="hasAvailableProviders" class="flex flex-col gap-8">
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
            :media-provider-prop-list="tvShowWithProviders.providers?.rent || []"
            watch-type-prop="Alquiler:"
          />
        </section>
        <section v-else class="text-gray-400">
          <p>No disponible en ninguna plataforma</p>
        </section>
      </section>
    </div>
  </section>
</template>

<script setup lang="ts">
import { useRoute } from 'vue-router';
import { useFetch } from 'nuxt/app';
import { computed, onMounted, ref } from 'vue';
import { calculateTilt, getDefaultTilt } from '@/utils/functions';
import { TVShow } from '@/types/TVShow';
import { formatDateToSpanish } from '@/utils/formatDate';
import { Genre } from '@/types/Genre';
import { watch } from 'vue';
import { WatchProviderTypes } from '@/types/WatchProvider';

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

const isLoading = computed(() => tvShowPending.value || tvProvidersPending.value);
const hasError = computed(() => tvShowError.value || tvProvidersError.value);

const tvShow = computed<TVShow>(() => tvShowDetails.value as TVShow || {} as TVShow);
const tvShowProviders = computed(() => tvProviders.value as WatchProviderTypes || {} as WatchProviderTypes);

const tvShowWithProviders = computed<TVShow>(() => {
  return {
    ...tvShow.value,
    providers: tvShowProviders.value,
  };
});

let tilt = getDefaultTilt();

const resetTilt = () => {
  tilt = getDefaultTilt();
};

const backgroundImage = ref<string>('')

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

const transformStyle = computed(() => ({
  transform: `perspective(1000px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
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

<style scoped></style>
