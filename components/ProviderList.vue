<template lang="">
  <div v-if="mediaProviderPropList.length > 0" class="flex flex-col gap-3">
    <h3
      class="text-xl font-bold dark:text-gray-300 text-gray-800 uppercase font-heading"
      >{{ watchTypeProp }}</h3
    >
    <div class="flex flex-row flex-wrap items-center justify-start gap-4">
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
  </div>
</template>
<script setup lang="ts">
import type { WatchProvider } from '@/types/WatchProvider';
import { PropType, ref, onMounted } from 'vue';
import {
  generateProviderSearchUrl,
  getFallbackSearchUrl,
} from '@/utils/providerLinks';
import { MEDIA_TYPE, type MediaType } from '@/constants/domain/mediaType';
import { useUserRegion } from '@/composables/useUserRegion';

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
    type: String as PropType<MediaType>,
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

// Use composable for user region (cache included)
const { getUserRegion } = useUserRegion();

// Cache for Spanish title (key: "tmdbId-type")
const spanishTitleCache = useState<Record<string, string | null>>(
  'spanish-title-cache',
  () => ({})
);

// Loading promises to prevent concurrent API calls (key: "tmdbId-type")
const spanishTitleLoadingPromises = useState<
  Record<string, Promise<string | null>>
>('spanish-title-loading-promises', () => ({}));

// Pre-fetch URLs for async providers
onMounted(async () => {
  if (!props.mediaTitle) return;

  // Get user region from composable (uses cache)
  const userRegion = (await getUserRegion()) || 'ES';

  // Convert MEDIA_TYPE to 'movie' | 'tv' for database
  const mediaTypeForDb: 'movie' | 'tv' =
    props.mediaType === MEDIA_TYPE.MOVIE ? 'movie' : 'tv';

  // Fetch Spanish title ONCE before the loop (if needed and not cached)
  let spanishTitle: string | null = null;
  const cacheKey = `${props.tmdbId}-${mediaTypeForDb}`;

  if (userRegion === 'ES' && props.tmdbId && mediaTypeForDb) {
    // Check cache first
    if (spanishTitleCache.value[cacheKey] !== undefined) {
      spanishTitle = spanishTitleCache.value[cacheKey];
    } else if (cacheKey in spanishTitleLoadingPromises.value) {
      // If already loading, wait for existing promise
      spanishTitle = await spanishTitleLoadingPromises.value[cacheKey];
    } else {
      // Create new promise for this fetch
      const fetchPromise = (async () => {
        try {
          const response = await $fetch<{ title: string | null }>(
            `/api/titles/spanish-title?tmdb_id=${props.tmdbId}&type=${mediaTypeForDb}`
          );
          const title = response.title || null;
          spanishTitleCache.value[cacheKey] = title;
          // Clear loading promise after completion
          delete spanishTitleLoadingPromises.value[cacheKey];
          return title;
        } catch (error) {
          console.error(
            'Error fetching Spanish title for provider link:',
            error
          );
          const title = null;
          spanishTitleCache.value[cacheKey] = title;
          // Clear loading promise after completion
          delete spanishTitleLoadingPromises.value[cacheKey];
          return title;
        }
      })();

      // Store promise so other concurrent calls can wait for it
      spanishTitleLoadingPromises.value[cacheKey] = fetchPromise;
      spanishTitle = await fetchPromise;
    }
  }

  // Generate URLs for all providers (using cached Spanish title)
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
          userRegion,
          props.tmdbId,
          mediaTypeForDb,
          spanishTitle // Pass cached Spanish title
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
          userRegion,
          props.tmdbId,
          mediaTypeForDb,
          spanishTitle // Pass cached Spanish title
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
