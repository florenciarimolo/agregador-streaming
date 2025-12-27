<template>
  <section v-if="recommendations.length > 0" class="mb-12">
    <div class="mb-6">
      <h2
        class="text-2xl font-bold dark:text-white text-gray-900 mb-2 font-heading"
      >
        {{ title }}
      </h2>
      <p
        v-if="description"
        class="text-gray-600 dark:text-gray-400 text-sm md:text-base"
      >
        {{ description }}
      </p>
    </div>
    <div
      class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4"
    >
      <RecommendationCard
        v-for="recommendation in recommendations"
        :key="recommendation.id"
        :title="recommendation"
        @mark-seen="$emit('mark-seen', $event)"
        @mark-not-interested="$emit('mark-not-interested', $event)"
      />
    </div>
  </section>
</template>

<script setup lang="ts">
import type { Recommendation } from '@/types/Recommendation';

interface Props {
  title: string;
  description?: string;
  recommendations: Recommendation[];
}

const props = defineProps<Props>();

defineEmits<{
  'mark-seen': [title: Recommendation];
  'mark-not-interested': [title: Recommendation];
}>();
</script>
