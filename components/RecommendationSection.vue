<template>
  <div v-if="recommendations.length > 0">
    <SectionTitle>{{ title }}</SectionTitle>
    <p
      v-if="description"
      class="text-sm text-gray-800 dark:text-gray-300 md:text-base"
    >
      {{ description }}
    </p>
    <div class="grid grid-cols-2 gap-4 md:grid-cols-4 overflow-visible">
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
import type { Recommendation } from '@/types/Recommendation';
import SectionTitle from '@/components/layout/SectionTitle.vue';

defineProps<{
  title: string;
  description?: string;
  recommendations: Recommendation[];
}>();

defineEmits<{
  'mark-seen': [title: Recommendation];
  'mark-not-interested': [title: Recommendation];
  'mark-liked': [title: Recommendation];
  'mark-watchlist': [title: Recommendation];
}>();
</script>
