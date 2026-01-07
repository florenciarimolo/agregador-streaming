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

    <!-- Top-right: Actions Menu (always open) -->
    <template #top-right-actions>
      <div class="overflow-visible">
        <!-- Custom menu that's always open -->
        <div class="relative">
          <div
            class="absolute z-[10000] mt-2 right-0 w-48 dark:bg-gray-900/95 bg-gray-100/95 rounded-3xl border border-gray-300/50 dark:border-white/10 shadow-xl overflow-hidden"
          >
            <div class="p-4">
              <Button
                type="button"
                variant="ghost"
                size="small"
                custom-class="justify-start mb-2 w-full text-left"
              >
                <template #icon>
                  <IconCheck icon-class="w-4 h-4" />
                </template>
                {{ $t('media.seen') }}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="small"
                custom-class="justify-start mb-2 w-full text-left"
              >
                <template #icon>
                  <IconHeart icon-class="w-4 h-4" />
                </template>
                {{ $t('media.liked') }}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="small"
                custom-class="justify-start mb-2 w-full text-left"
              >
                <template #icon>
                  <IconX icon-class="w-4 h-4" />
                </template>
                {{ $t('media.notInterested') }}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="small"
                custom-class="justify-start w-full text-left"
              >
                <template #icon>
                  <IconClock icon-class="w-4 h-4" />
                </template>
                {{ $t('media.watchLater') }}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </template>

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
import Button from '@/components/ui/Button.vue';
import IconCheck from '@/components/icons/IconCheck.vue';
import IconHeart from '@/components/icons/IconHeart.vue';
import IconX from '@/components/icons/IconX.vue';
import IconClock from '@/components/icons/IconClock.vue';
import type { Recommendation } from '@/types/Recommendation';
import { MEDIA_TYPE } from '@/constants/domain/mediaType';
import { useRouteWithLang } from '@/composables/useRouteWithLang';

const { routeWithLang } = useRouteWithLang();

// Mock title with tmdb_id 724097
const mockTitle: Recommendation = {
  id: 'mock-724097',
  tmdb_id: 724097,
  title: 'The Outfit',
  type: 'movie',
  poster_path: '/lZa5EB6PVJBT5mxhgZS5ftqdAm6.jpg',
  overview: 'Un sastre de lujo en Chicago que hace trajes para una familia de gánsteres debe usar sus habilidades para sobrevivir cuando se encuentra en medio de una guerra entre bandas.',
  vote_average: 7.2,
  genres: [28, 53, 80],
  release_date: '2022-03-18',
  explanation: 'Perfecto para tu estado de ánimo',
  explanation_code: 'MOOD_MATCH',
  providers: [
    {
      provider_id: 8,
      provider_name: 'Netflix',
      logo_path: '/t2yyOv40HZeVlLjYsCsPHnWLk4W.jpg',
    },
  ],
};

const mediaType = computed(() =>
  mockTitle.type === MEDIA_TYPE.MOVIE ? 'movie' : 'tv-show'
);


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

