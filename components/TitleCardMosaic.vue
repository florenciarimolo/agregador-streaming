<template>
  <TitleCard
    :title="title"
    :poster-path="posterPath"
    :link-to="linkTo"
    :link-aria-label="linkAriaLabel"
    :image-alt="imageAlt"
    :no-image-aria-label="noImageAriaLabel"
    :type="type"
    :show-content="true"
    :tag="tag"
    :is-discover-list="isDiscoverList"
    :aria-label="ariaLabel"
  >
    <!-- Top-left: Rating Badge -->
    <template #top-left-badges>
      <RatingBadge v-if="voteAverage" :rating="voteAverage" />
    </template>

    <!-- Top-right: Actions slot -->
    <template #top-right-actions>
      <slot name="actions" />
    </template>

    <!-- Content: Overview and Providers -->
    <template #content>
      <!-- Explanation slot (only for recommendations) -->
      <slot name="explanation" />

      <!-- Overview -->
      <p
        v-if="overview"
        class="mb-3 text-xs text-gray-800 dark:text-gray-300 line-clamp-3"
      >
        {{ overview }}
      </p>
      <p v-else class="mb-3 text-xs italic text-gray-700 dark:text-gray-300">
        {{ $t('media.noDescriptionAvailable') }}
      </p>

      <!-- Providers (logos only, no names) -->
      <div
        v-if="providers && providers.length > 0"
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
import { MEDIA_TYPE } from '@/constants/domain/mediaType';
import type { Provider } from '@/types/Recommendation';
import TitleCard from '@/components/TitleCard.vue';
import RatingBadge from '@/components/RatingBadge.vue';

interface Props {
  title: string;
  posterPath?: string | null;
  linkTo: string;
  linkAriaLabel?: string;
  imageAlt?: string;
  noImageAriaLabel?: string;
  type?: typeof MEDIA_TYPE.MOVIE | typeof MEDIA_TYPE.TV;
  voteAverage?: number | null;
  overview?: string | null;
  providers?: Provider[];
  tag?: string | null;
  isDiscoverList?: boolean;
  ariaLabel?: string;
}

const props = withDefaults(defineProps<Props>(), {
  posterPath: null,
  linkAriaLabel: undefined,
  imageAlt: undefined,
  noImageAriaLabel: undefined,
  type: undefined,
  voteAverage: null,
  overview: null,
  providers: undefined,
  tag: null,
  isDiscoverList: false,
  ariaLabel: undefined,
});

// Filter providers that have logos
const providersWithLogos = computed(() => {
  if (!props.providers) return [];
  return props.providers.filter((provider) => provider.logo_path).slice(0, 6);
});
</script>
