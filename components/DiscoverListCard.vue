<template>
  <nuxt-link
    :to="`/discover/list/${list.slug}`"
    class="block overflow-hidden rounded-2xl border backdrop-blur-xl transition-all duration-300 dark:bg-gray-900/40 bg-gray-100/80 border-gray-300/50 dark:border-white/10 hover:border-gray-400/50 dark:hover:border-white/20 hover:shadow-lg hover:shadow-gray-900/20"
    :aria-label="$t('discover.viewList', { title: list.title })"
  >
    <div class="p-6">
      <div class="flex items-start justify-between gap-4 mb-3">
        <h3 class="text-xl font-semibold text-gray-800 dark:text-gray-300">
          {{ list.title }}
        </h3>
        <Badge
          v-if="list.type"
          :type="getMediaTypeFromListType(list.type)"
          size="sm"
        />
      </div>
      <p
        v-if="list.description"
        class="text-sm text-gray-600 dark:text-gray-400 line-clamp-2"
      >
        {{ list.description }}
      </p>
    </div>
  </nuxt-link>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { MEDIA_TYPE } from '@/constants/domain/mediaType';
import type { DiscoverList } from '@/composables/database/discoverLists';
import Badge from './Badge.vue';

interface Props {
  list: DiscoverList;
}

const props = defineProps<Props>();

function getMediaTypeFromListType(
  type: 'movie' | 'tv' | 'mixed'
): typeof MEDIA_TYPE.MOVIE | typeof MEDIA_TYPE.TV | undefined {
  if (type === 'movie') return MEDIA_TYPE.MOVIE;
  if (type === 'tv') return MEDIA_TYPE.TV;
  return undefined; // mixed doesn't show badge
}
</script>

