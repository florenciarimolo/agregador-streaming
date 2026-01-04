<template>
  <div v-if="recommendations.length > 0" class="relative">
    <!-- Loading Overlay for the entire recommendations container -->
    <div
      v-if="isLoading"
      class="flex absolute inset-0 z-50 justify-center items-center bg-black/50 backdrop-blur-sm rounded-lg"
    >
      <Spinner size="md" />
    </div>

    <SectionTitle>{{ title }}</SectionTitle>
    <p
      v-if="description"
      class="text-sm text-gray-800 dark:text-gray-300 md:text-base"
    >
      {{ description }}
    </p>
    <div
      class="grid grid-cols-2 gap-4 md:grid-cols-4 overflow-visible"
      :class="{ 'opacity-75 pointer-events-none': isLoading }"
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
        @mark-watchlist="$emit('mark-watchlist', $event)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { Recommendation } from '@/types/Recommendation';
import SectionTitle from '@/components/layout/SectionTitle.vue';
import Spinner from '@/components/Spinner.vue';

const props = defineProps<{
  title: string;
  description?: string;
  recommendations: Recommendation[];
  loadingTitles?: Set<number>;
}>();

// Check if any title is loading
const isLoading = computed(() => {
  return props.loadingTitles && props.loadingTitles.size > 0;
});

defineEmits<{
  'mark-seen': [title: Recommendation];
  'mark-not-interested': [title: Recommendation];
  'mark-liked': [title: Recommendation];
  'mark-watchlist': [title: Recommendation];
}>();
</script>
