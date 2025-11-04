<template lang="">
  <div
    v-if="mediaProviderPropList.length > 0"
    class="flex flex-row flex-wrap items-center justify-start gap-4"
  >
    <p class="font-semibold"> {{ watchTypeProp }}</p>
    <a
      v-for="provider in mediaProviderPropList"
      :key="provider.provider_id"
      :href="getProviderUrl(provider.provider_name)"
      target="_blank"
      rel="noopener noreferrer"
      class="inline-block mr-2 transition-transform duration-200 hover:scale-110 hover:shadow-lg"
      :title="provider.provider_name"
    >
      <img
        :src="`https://image.tmdb.org/t/p/w300${provider.logo_path}`"
        :alt="provider.provider_name"
        class="inline-block object-cover w-10 h-10 rounded shadow-md md:w-12 md:h-12 shadow-secondary/20 cursor-pointer"
      />
    </a>
  </div>
</template>
<script setup lang="ts">
import type { WatchProvider } from '@/types/WatchProvider';
import { watch, PropType } from 'vue';
import {
  generateProviderSearchUrl,
  getFallbackSearchUrl,
} from '@/utils/providerLinks';
import { MediaTypeEnum } from '@/types/enums/MediaTypeEnum';

const props = defineProps({
  mediaProviderPropList: {
    type: Array as () => WatchProvider[],
    required: true,
  },
  watchTypeProp: {
    type: String,
    required: true,
  },
  mediaTitle: {
    type: String,
    default: '',
  },
  originalTitle: {
    type: String,
    default: '',
  },
  alternativeTitles: {
    type: Array as () => Array<{ title: string; type: string }>,
    default: () => [],
  },
  mediaType: {
    type: String as PropType<MediaTypeEnum>,
    required: true,
  },
});

// Generate provider URL with search functionality
const getProviderUrl = (providerName: string): string => {
  if (props.mediaTitle) {
    // Try to get a direct search URL with original title and alternative titles support
    const searchUrl = generateProviderSearchUrl(
      providerName,
      props.mediaTitle,
      props.originalTitle || undefined,
      props.alternativeTitles.length > 0 ? props.alternativeTitles : undefined,
      props.mediaType
    );
    if (searchUrl) {
      return searchUrl;
    }
  }

  // Fallback to Google site-specific search
  return getFallbackSearchUrl(
    providerName,
    props.mediaTitle || 'movies tv shows'
  );
};

watch(
  () => props.mediaProviderPropList,
  (newValue) => {
    if (newValue.length === 0) {
      console.warn('No providers available for this media.');
    }
  },
  { immediate: true }
);

watch(
  () => props.watchTypeProp,
  (newValue) => {
    if (!newValue) {
      console.warn('Watch type is not defined.');
    }
  },
  { immediate: true }
);
</script>
<style scoped></style>
