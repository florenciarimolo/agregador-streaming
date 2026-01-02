<template>
  <section v-if="recommendations.length > 0">
    <div class="mb-6">
      <h2
        class="mb-2 text-2xl font-bold text-gray-800 dark:text-gray-300 font-heading"
      >
        {{ title }}
      </h2>
      <p
        v-if="description"
        class="text-sm text-gray-800 dark:text-gray-300 md:text-base"
      >
        {{ description }}
      </p>
    </div>
    <div class="grid grid-cols-2 gap-4 md:grid-cols-4">
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
  </section>
</template>

<script setup lang="ts">
import type { Recommendation } from '@/types/Recommendation';

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
