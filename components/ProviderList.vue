<template lang="">
  <div
    v-if="mediaProviderPropList.length > 0"
    class="flex flex-row flex-wrap items-center justify-start gap-4"
  >
    <div class="flex items-center gap-2 dark:text-gray-300 text-gray-800">
      <IconPlay icon-class="w-5 h-5" />
      <span>{{ watchTypeProp }}</span>
    </div>
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
import { PropType, ref, onMounted } from 'vue';
import {
  generateProviderSearchUrl,
  getFallbackSearchUrl,
} from '@/utils/providerLinks';
import { MediaTypeEnum } from '@/types/enums/MediaTypeEnum';
import { getSession } from '@/composables/database/auth';
// @ts-expect-error - Used in template, linter doesn't detect template usage
import IconPlay from '@/components/icons/IconPlay.vue';

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
  tmdbId: {
    type: Number,
    default: undefined,
  },
});

// Store provider URLs (for async providers like Atres Player)
const providerUrls = ref<Record<string, string>>({});

// Generate provider URL with search functionality
// @ts-expect-error - Used in template, linter doesn't detect template usage
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

// Get user region preference
const userRegion = ref<string>('ES'); // Default to ES

// Pre-fetch URLs for async providers
onMounted(async () => {
  if (!props.mediaTitle) return;

  // Get user region preference
  try {
    const { data: { session } } = await getSession();
    if (session?.access_token) {
      const prefsResponse = await $fetch<{
        success: boolean;
        preferences: { region?: string } | null;
      }>('/api/users/preferences', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });
      if (prefsResponse.success && prefsResponse.preferences?.region) {
        userRegion.value = prefsResponse.preferences.region;
      }
    }
  } catch (error) {
    console.error('Error fetching user region:', error);
    // Keep default 'ES'
  }

  // Convert MediaTypeEnum to 'movie' | 'tv' for database
  const mediaTypeForDb: 'movie' | 'tv' =
    props.mediaType === MediaTypeEnum.movie ? 'movie' : 'tv';

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
          props.mediaType,
          userRegion.value,
          props.tmdbId,
          mediaTypeForDb
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
          props.mediaType,
          userRegion.value,
          props.tmdbId,
          mediaTypeForDb
        );
        if (url) {
          providerUrls.value[providerName] = url;
        }
      } catch {
        // Fallback handled in _getProviderUrl
      }
    }
  }
});

// Removed console.warn statements - these were causing unnecessary warnings
// The template already handles empty states with v-if conditions
</script>
<style scoped></style>
