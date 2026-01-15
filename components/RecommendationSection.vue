<template>
  <div
    v-if="recommendations.length > 0 || isFilterLoading || fetchingReplacement"
    class="relative space-y-4 md:space-y-8"
  >
    <SectionTitle v-if="title" :description="description">{{
      title
    }}</SectionTitle>

    <!-- Show skeletons when filter is loading -->
    <div v-if="isFilterLoading" class="space-y-4 md:space-y-8">
      <!-- Mosaic view skeletons -->
      <template v-if="viewMode === VIEW_MODE.MOSAIC">
        <!-- First row: full row -->
        <div
          class="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-6 overflow-visible"
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
          class="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-6 overflow-visible"
        >
          <SkeletonMediaCard
            v-for="i in 2"
            :key="`skeleton-filter-${i + 6}`"
            :show-rating="(i + 6) % 3 !== 0"
            :show-watchlist="(i + 6) % 4 === 0"
          />
        </div>
      </template>
      <!-- List view skeletons -->
      <template v-else>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SkeletonListItem
            v-for="i in 8"
            :key="`skeleton-list-${i}`"
            :show-rating="i % 3 !== 0"
          />
        </div>
      </template>
    </div>

    <!-- Show real content when not loading filters -->
    <template v-else>
      <!-- Mosaic view -->
      <div
        v-if="viewMode === VIEW_MODE.MOSAIC"
        class="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-6 overflow-visible"
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
        <!-- Show skeleton while fetching replacement -->
        <SkeletonMediaCard
          v-if="fetchingReplacement"
          :key="'skeleton-replacement'"
          :show-rating="true"
          :show-watchlist="false"
        />
      </div>
      <!-- List view -->
      <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <RecommendationListItem
          v-for="recommendation in recommendations"
          :key="recommendation.id"
          :title="recommendation"
          @mark-seen="$emit('mark-seen', $event)"
          @mark-not-interested="$emit('mark-not-interested', $event)"
          @mark-liked="$emit('mark-liked', $event)"
          @remove-liked="$emit('remove-liked', $event)"
          @mark-watchlist="$emit('mark-watchlist', $event)"
        />
        <!-- Show skeleton while fetching replacement -->
        <SkeletonListItem
          v-if="fetchingReplacement"
          :key="'skeleton-replacement-list'"
          :show-rating="true"
        />
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { Recommendation } from '@/types/Recommendation';
import type { ViewMode } from '@/constants/domain/viewMode';
import { VIEW_MODE } from '@/constants/domain/viewMode';
import SectionTitle from '@/components/layout/SectionTitle.vue';
import SkeletonMediaCard from '@/components/SkeletonMediaCard.vue';
import SkeletonListItem from '@/components/SkeletonListItem.vue';
import RecommendationCard from '@/components/RecommendationCard.vue';
import RecommendationListItem from '@/components/RecommendationListItem.vue';

const props = withDefaults(
  defineProps<{
    title: string;
    description?: string;
    recommendations: Recommendation[];
    loadingTitles?: Set<number>; // Still passed but not used for UI loading state
    isLoading?: boolean; // For filter changes
    fetchingReplacement?: boolean; // When fetching a replacement title
    viewMode?: ViewMode;
  }>(),
  {
    description: undefined,
    loadingTitles: undefined,
    viewMode: VIEW_MODE.LIST,
  }
);

// Check if filter is loading (for showing skeletons)
const isFilterLoading = computed(() => {
  return props.isLoading || false;
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
