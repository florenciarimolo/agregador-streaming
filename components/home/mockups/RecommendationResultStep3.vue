<template>
  <TitleCard
    :title="mockTitle.title"
    :poster-path="mockTitle.poster_path"
    :link-to="'#'"
    :link-aria-label="$t('media.viewDetailsOf', { title: mockTitle.title })"
    :image-alt="$t('media.posterOf', { title: mockTitle.title })"
    :no-image-aria-label="
      $t('media.noPosterAvailableFor', { title: mockTitle.title })
    "
    :type="mockTitle.type"
    :show-content="true"
    :aria-label="$t('media.recommendationLabel', { title: mockTitle.title })"
    :custom-class="'pointer-events-none'"
  >
    <!-- Top-left: Rating Badge -->
    <template #top-left-badges>
      <RatingBadge
        v-if="mockTitle.vote_average"
        :rating="mockTitle.vote_average"
      />
    </template>

    <!-- No actions menu for mock -->

    <!-- Content: Custom content with overview and providers -->
    <template #content>
      <!-- EXPLANATION -->
      <p
        v-if="explanationText"
        class="mb-2 text-xs text-gray-500 dark:text-gray-400"
      >
        {{ explanationText }}
      </p>

      <!-- Overview -->
      <p
        v-if="mockTitle.overview"
        class="mb-3 text-xs text-gray-800 dark:text-gray-300 line-clamp-3"
      >
        {{ mockTitle.overview }}
      </p>
      <p v-else class="mb-3 text-xs italic text-gray-700 dark:text-gray-300">
        {{ $t('media.noDescriptionAvailable') }}
      </p>

      <!-- Providers (logos only, no names) -->
      <div
        v-if="mockTitle.providers && mockTitle.providers.length > 0"
        class="flex flex-wrap gap-2"
      >
        <img
          v-for="provider in providersWithLogos"
          :key="provider.provider_id"
          :src="`https://image.tmdb.org/t/p/w45${provider.logo_path}`"
          :alt="provider.provider_name"
          class="object-contain w-4 h-4 md:w-8 md:h-8 rounded"
          :title="provider.provider_name"
        />
      </div>
      <div v-else class="text-xs italic text-gray-700 dark:text-gray-300">
        {{ $t('media.noPlatforms') }}
      </div>
    </template>
  </TitleCard>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import TitleCard from '@/components/TitleCard.vue';
import RatingBadge from '@/components/RatingBadge.vue';
import type { Recommendation } from '@/types/Recommendation';

// Mock title with tmdb_id 1399
const mockTitle: Recommendation = {
  id: 'mock-1399',
  tmdb_id: 1399,
  title: 'Game of Thrones',
  type: 'tv',
  poster_path: '/u3bZgnGQ9T01sWNhyveQz0wH0Hl.jpg',
  overview: 'En un mundo fantástico y en un contexto medieval varias familias, relativas a la nobleza, se disputan el control del Trono de Hierro en un continente llamado Poniente.',
  vote_average: 8.5,
  genres: [18, 10759],
  first_air_date: '2011-04-17',
  explanation: 'Perfecto para tu estado de ánimo',
  explanation_code: 'MOOD_MATCH',
  providers: [
    {
      provider_id: 8,
      provider_name: 'Netflix',
      logo_path: '/t2yyOv40HZeVlLjYsCsPHnWLk4W.jpg',
    },
    {
      provider_id: 9,
      provider_name: 'Amazon Prime Video',
      logo_path: '/emthp39XA2YScoYL1p0sdbAH2WA.jpg',
    },
  ],
};

// Map explanation_code to user-friendly text
const explanationText = computed(() => {
  if (!mockTitle.explanation_code) return null;

  const map: Record<string, string> = {
    BASED_ON_LIKE: 'Porque te gustó algo parecido',
    TRENDING: 'Tendencia esta semana',
    DISCOVER: 'Selección editorial',
    EASY_TO_WATCH: 'Fácil de ver, ideal para relajarse',
    MOOD_MATCH: 'Perfecto para tu estado de ánimo',
  };

  return map[mockTitle.explanation_code] ?? null;
});

// Filter providers that have logos
const providersWithLogos = computed(() => {
  if (!mockTitle.providers) return [];
  return mockTitle.providers
    .filter((provider) => provider.logo_path)
    .slice(0, 6);
});
</script>

<style scoped>
/* Disable all hover effects and interactions */
:deep(.pointer-events-none) {
  pointer-events: none !important;
}

:deep(.pointer-events-none a) {
  pointer-events: none !important;
  cursor: default !important;
}

:deep(.pointer-events-none:hover) {
  border-color: inherit !important;
  box-shadow: none !important;
}

:deep(.pointer-events-none .group:hover img) {
  transform: none !important;
}

:deep(.pointer-events-none .group:hover .opacity-0) {
  opacity: 0 !important;
}
</style>

