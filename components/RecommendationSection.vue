<template>
  <div
    v-if="recommendations.length > 0 || isFilterLoading"
    class="relative space-y-4 md:space-y-8"
  >
    <SectionTitle :description="description">{{ title }}</SectionTitle>

    <!-- Show skeletons when filter is loading -->
    <div v-if="isFilterLoading" class="space-y-4 md:space-y-8">
      <!-- First row: full row -->
      <div
        class="grid grid-cols-2 gap-4 md:grid-cols-5 lg:grid-cols-6 overflow-visible"
      >
        <SkeletonMediaCard
          v-for="i in 6"
          :key="`skeleton-filter-${i}`"
          :show-rating="i % 3 !== 0"
          :show-watchlist="i % 4 === 0"
        />
      </div>
      <!-- Second row: only 2 cards -->
      <div
        class="grid grid-cols-2 gap-4 md:grid-cols-5 lg:grid-cols-6 overflow-visible"
      >
        <SkeletonMediaCard
          v-for="i in 2"
          :key="`skeleton-filter-${i + 6}`"
          :show-rating="(i + 6) % 3 !== 0"
          :show-watchlist="(i + 6) % 4 === 0"
        />
      </div>
    </div>

    <!-- Show real content when not loading filters -->
    <div
      v-else
      class="grid grid-cols-2 gap-4 md:grid-cols-5 lg:grid-cols-6 overflow-visible"
    >
      <RecommendationCard
        v-for="recommendation in recommendations"
        :key="recommendation.id"
        :title="recommendation"
        @mark-seen="$emit('mark-seen', $event)"
        @mark-not-interested="$emit('mark-not-interested', $event)"
        @mark-liked="
          console.log(
            '[UNLIKE DEBUG] RecommendationSection received mark-liked',
            $event
          );
          $emit('mark-liked', $event);
        "
        @remove-liked="$emit('remove-liked', $event)"
        @mark-watchlist="$emit('mark-watchlist', $event)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { Recommendation } from '@/types/Recommendation';
import SectionTitle from '@/components/layout/SectionTitle.vue';
import SkeletonMediaCard from '@/components/SkeletonMediaCard.vue';
import RecommendationCard from '@/components/RecommendationCard.vue';

const props = defineProps<{
  title: string;
  description?: string;
  recommendations: Recommendation[];
  loadingTitles?: Set<number>; // Still passed but not used for UI loading state
  isLoading?: boolean; // For filter changes
}>();

// Check if filter is loading (for showing skeletons)
const isFilterLoading = computed(() => {
  return props.isLoading || false;
});

// Calculate skeleton count based on recommendations length or default to 8
const skeletonCount = computed(() => {
  return props.recommendations.length > 0 ? props.recommendations.length : 8;
});

defineEmits<{
  'mark-seen': [title: Recommendation];
  'mark-not-interested': [title: Recommendation];
  'mark-liked': [title: Recommendation];
  'remove-liked': [title: Recommendation];
  'mark-watchlist': [title: Recommendation];
}>();
</script>

<style scoped>
/* Styles moved to SkeletonMediaCard component */
</style>
