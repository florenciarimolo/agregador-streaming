<template lang="">
  <div
    v-if="mediaProviderPropList.length > 0"
    class="flex flex-row flex-wrap items-center justify-start gap-4"
  >
    <p class="font-semibold dark:text-white text-gray-900">
      {{ watchTypeProp }}</p
    >
    <a
      v-for="provider in mediaProviderPropList"
      :key="provider.provider_id"
      :href="_getProviderUrl(provider.provider_name)"
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
import { watch, PropType, ref, onMounted } from 'vue';
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

// Store provider URLs (for async providers like Atres Player)
const providerUrls = ref<Record<string, string>>({});

// Generate provider URL with search functionality
const _getProviderUrl = (providerName: string): string => {
  // Check if we have a pre-computed URL (for async providers)
  if (providerUrls.value[providerName]) {
    return providerUrls.value[providerName];
  }

  if (props.mediaTitle) {
    // For non-async providers, we'll generate synchronously
    // Note: This won't work for Atres Player, but we handle that in onMounted
    // Fallback to Google site-specific search for now
  }

  // Fallback to Google site-specific search
  return getFallbackSearchUrl(
    providerName,
    props.mediaTitle || 'movies tv shows'
  );
};

// Pre-fetch URLs for async providers
onMounted(async () => {
  if (!props.mediaTitle) return;

  for (const provider of props.mediaProviderPropList) {
    const providerName = provider.provider_name;

    // Check if it's Atres Player (needs async API call)
    if (providerName === 'Atres Player' || providerName === 'atresplayer') {
      try {
        const url = await generateProviderSearchUrl(
          providerName,
          props.mediaTitle,
          props.originalTitle || undefined,
          props.alternativeTitles.length > 0
            ? props.alternativeTitles
            : undefined,
          props.mediaType
        );
        if (url) {
          providerUrls.value[providerName] = url;
        }
      } catch (error) {
        console.error(`Error generating URL for ${providerName}:`, error);
      }
    } else {
      // For other providers, generate synchronously (they're not async)
      try {
        const url = await generateProviderSearchUrl(
          providerName,
          props.mediaTitle,
          props.originalTitle || undefined,
          props.alternativeTitles.length > 0
            ? props.alternativeTitles
            : undefined,
          props.mediaType
        );
        if (url) {
          providerUrls.value[providerName] = url;
        }
      } catch (error) {
        // Fallback handled in _getProviderUrl
      }
    }
  }
});

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
