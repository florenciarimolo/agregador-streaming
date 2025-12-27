<template>
  <section v-if="recommendations.length > 0" class="mb-12">
    <h2
      class="text-2xl font-bold dark:text-white text-gray-900 mb-6 font-heading"
    >
      {{ title }}
    </h2>
    <div
      class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4"
    >
      <RecommendationCard
        v-for="recommendation in recommendations"
        :key="recommendation.id"
        :title="recommendation"
        @save-for-later="handleSaveForLater"
      />
    </div>
  </section>
</template>

<script setup lang="ts">
interface Provider {
  provider_id: number;
  provider_name: string;
  logo_path: string | null;
}

interface Recommendation {
  id: string;
  tmdb_id: number;
  title: string;
  type: 'movie' | 'tv';
  poster_path: string | null;
  overview: string | null;
  vote_average: number | null;
  genres: number[] | null;
  release_date: string | null;
  first_air_date: string | null;
  explanation: string;
  providers?: Provider[];
}

interface Props {
  title: string;
  recommendations: Recommendation[];
}

const props = defineProps<Props>();

const handleSaveForLater = (title: Recommendation) => {
  // TODO: Implement save for later functionality
  console.log('Save for later:', title);
  // Could add to a "watchlist" table or show a toast notification
};
</script>
