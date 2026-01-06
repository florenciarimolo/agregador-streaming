<template>
  <div
    class="relative rounded-lg overflow-hidden bg-gray-900 aspect-video group"
  >
    <iframe
      :src="`https://www.youtube.com/embed/${video.key}`"
      :title="video.type"
      class="w-full h-full"
      frameborder="0"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      allowfullscreen
    ></iframe>
    <div
      v-if="!video.official"
      class="absolute top-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded backdrop-blur-sm"
    >
      {{ $t('media.videoUnofficial') }}
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Video } from '@/types/Video';

defineProps<{
  video: Video;
}>();
</script>

