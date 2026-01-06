<template>
  <div v-if="videos && videos.length > 0" class="flex flex-col gap-4">
    <h3 class="text-xl font-bold dark:text-gray-300 text-gray-800 uppercase font-heading">
      {{ title }}
    </h3>
    <div
      class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-2"
    >
      <VideoCard
        v-for="video in videos"
        :key="video.key"
        :video="video"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Video } from '@/types/Video';
import VideoCard from './VideoCard.vue';

defineProps<{
  videos: Video[];
  title: string;
}>();
</script>

