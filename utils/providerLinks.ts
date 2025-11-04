import { MediaTypeEnum } from '@/types/enums/MediaTypeEnum';

// Provider mapping with their base URLs and search patterns (only TMDB available providers for Spain)
export const PROVIDER_LINKS: Record<
  string,
  { baseUrl: string; searchUrl?: string; name: string }
> = {
  '3Cat': {
    baseUrl: 'https://www.ccma.cat/3cat',
    name: '3Cat',
  },
  'Amazon Prime Video': {
    baseUrl: 'https://www.primevideo.com/es',
    searchUrl: 'https://www.primevideo.com/es/search/ref=atv_nb_sr?phrase=',
    name: 'Amazon Prime Video',
  },
  'Amazon Prime Video with Ads': {
    baseUrl: 'https://www.primevideo.com/es',
    searchUrl: 'https://www.primevideo.com/es/search/ref=atv_nb_sr?phrase=',
    name: 'Amazon Prime Video con Anuncios',
  },
  'Amazon Video': {
    baseUrl: 'https://www.primevideo.com/es',
    searchUrl: 'https://www.primevideo.com/es/search/ref=atv_nb_sr?phrase=',
    name: 'Amazon Video',
  },
  'Apple TV': {
    baseUrl: 'https://tv.apple.com/es',
    searchUrl: 'https://tv.apple.com/es/search?term=',
    name: 'Apple TV',
  },
  'Apple TV+': {
    baseUrl: 'https://tv.apple.com/es',
    searchUrl: 'https://tv.apple.com/es/search?term=',
    name: 'Apple TV+',
  },
  'Atres Player': {
    baseUrl: 'https://www.atresplayer.com',
    searchUrl: 'https://www.atresplayer.com/buscar/?q=',
    name: 'Atres Player',
  },
  Crunchyroll: {
    baseUrl: 'https://www.crunchyroll.com/es',
    searchUrl: 'https://www.crunchyroll.com/es/search?q=',
    name: 'Crunchyroll',
  },
  'Disney Plus': {
    baseUrl: 'https://www.disneyplus.com/es',
    searchUrl: 'https://www.disneyplus.com/es/search?q=',
    name: 'Disney+',
  },
  Filmin: {
    baseUrl: 'https://www.filmin.es',
    searchUrl: 'https://www.filmin.es/search?q=',
    name: 'Filmin',
  },
  'Filmin Plus': {
    baseUrl: 'https://www.filmin.es',
    searchUrl: 'https://www.filmin.es/search?q=',
    name: 'Filmin Plus',
  },
  FlixOlé: {
    baseUrl: 'https://www.flixole.com',
    searchUrl: 'https://www.flixole.com/buscar?q=',
    name: 'FlixOlé',
  },
  'Google Play Movies': {
    baseUrl: 'https://play.google.com/store/movies',
    searchUrl: 'https://play.google.com/store/search?q=',
    name: 'Google Play Películas',
  },
  'HBO Max': {
    baseUrl: 'https://www.max.com/es',
    searchUrl: 'https://www.max.com/es/search?q=',
    name: 'HBO Max',
  },
  'HBO Max  Amazon Channel': {
    baseUrl: 'https://www.max.com/es',
    searchUrl: 'https://www.max.com/es/search?q=',
    name: 'HBO Max Canal Amazon',
  },
  MUBI: {
    baseUrl: 'https://mubi.com/es',
    searchUrl: 'https://mubi.com/es/search?query=',
    name: 'MUBI',
  },
  'Movistar Plus+': {
    baseUrl: 'https://www.movistarplus.es',
    searchUrl: 'https://www.movistarplus.es/buscar?q=',
    name: 'Movistar Plus+',
  },
  'Movistar Plus+ Ficción Total ': {
    baseUrl: 'https://www.movistarplus.es',
    searchUrl: 'https://www.movistarplus.es/buscar?q=',
    name: 'Movistar Plus+ Ficción Total',
  },
  Netflix: {
    baseUrl: 'https://www.netflix.com/es',
    searchUrl: 'https://www.netflix.com/es/search?q=',
    name: 'Netflix',
  },
  'Netflix Standard with Ads': {
    baseUrl: 'https://www.netflix.com/es',
    searchUrl: 'https://www.netflix.com/es/search?q=',
    name: 'Netflix Estándar con Anuncios',
  },
  Plex: {
    baseUrl: 'https://www.plex.tv',
    searchUrl: 'https://www.plex.tv/search/?query=',
    name: 'Plex',
  },
  'Pluto TV': {
    baseUrl: 'https://pluto.tv/es',
    searchUrl: 'https://pluto.tv/es/search?term=',
    name: 'Pluto TV',
  },
  'Rakuten TV': {
    baseUrl: 'https://rakuten.tv/es',
    searchUrl: 'https://rakuten.tv/es/search?q=',
    name: 'Rakuten TV',
  },
  'Rakuten Viki': {
    baseUrl: 'https://www.viki.com',
    searchUrl: 'https://www.viki.com/search?q=',
    name: 'Rakuten Viki',
  },
  SkyShowtime: {
    baseUrl: 'https://www.skyshowtime.com/es',
    searchUrl: 'https://www.skyshowtime.com/es/search?q=',
    name: 'SkyShowtime',
  },
  Tivify: {
    baseUrl: 'https://www.tivify.tv',
    name: 'Tivify',
  },
  'YouTube Premium': {
    baseUrl: 'https://www.youtube.com',
    searchUrl: 'https://www.youtube.com/results?search_query=',
    name: 'YouTube Premium',
  },
  fuboTV: {
    baseUrl: 'https://www.fubo.tv/es',
    name: 'fuboTV',
  },
  rtve: {
    baseUrl: 'https://www.rtve.es/play',
    searchUrl: 'https://www.rtve.es/play/buscador/?q=',
    name: 'rtve',
  },
};

/**
 * Get provider link information by provider name
 */
export function getProviderLink(
  providerName: string
): { baseUrl: string; searchUrl?: string; name: string } | null {
  return PROVIDER_LINKS[providerName] || null;
}

/**
 * Generate a search URL for a provider with the media title
 */
export function generateProviderSearchUrl(
  providerName: string,
  mediaTitle: string,
  originalTitle?: string,
  alternativeTitles?: Array<{ title: string; type: string }>,
  mediaType?: MediaTypeEnum
): string | null {
  const provider = getProviderLink(providerName);
  if (!provider) return null;

  if (provider.searchUrl) {
    // Use the best title based on provider preference and available alternatives
    let searchTitle = '';
    if (mediaType === MediaTypeEnum.movie) {
      searchTitle = getBestTitleForProvider(
        providerName,
        mediaTitle,
        originalTitle,
        alternativeTitles
      );
    } else {
      searchTitle = mediaTitle;
    }
    return provider.searchUrl + encodeURIComponent(searchTitle);
  }

  return provider.baseUrl;
}

/**
 * Get the best title to use for a specific provider
 */
export function getBestTitleForProvider(
  providerName: string,
  localizedTitle: string,
  originalTitle?: string,
  alternativeTitles?: Array<{ title: string; type: string }>
): string {
  // Providers that typically use original English titles (sorted alphabetically)
  const originalTitleProviders = [
    'Amazon Prime Video',
    'Amazon Prime Video with Ads',
    'Amazon Video',
    'Apple TV',
    'Apple TV+',
    'Crunchyroll',
    'Disney Plus',
    'Google Play Movies',
    'HBO Max',
    'HBO Max  Amazon Channel',
    'MUBI',
    'Netflix',
    'Netflix Standard with Ads',
    'Plex',
    'Pluto TV',
    'Rakuten TV',
    'Rakuten Viki',
    'SkyShowtime',
    'YouTube Premium',
  ];

  // Spanish providers that might use localized titles (sorted alphabetically)
  const localizedTitleProviders = [
    '3Cat',
    'Atres Player',
    'Filmin',
    'Filmin Plus',
    'FlixOlé',
    'Movistar Plus+',
    'Movistar Plus+ Ficción Total ',
    'Tivify',
    'fuboTV',
    'rtve',
  ];

  // Helper function to find title by type priority
  const findTitleByType = (types: string[]): string | null => {
    if (!alternativeTitles || alternativeTitles.length === 0) return null;

    for (const type of types) {
      const found = alternativeTitles.find((alt) => alt.type === type);
      if (found) return found.title;
    }
    return null;
  };

  // For international providers, prefer original titles, then reissue/modern alternative titles
  if (originalTitleProviders.includes(providerName)) {
    // First try original title if available
    if (originalTitle) {
      return originalTitle;
    }

    // Then try alternative titles by type priority
    const alternativeTitle = findTitleByType([
      'reissue title',
      'modern title',
      'alternative title',
      '',
    ]);
    if (alternativeTitle) {
      return alternativeTitle;
    }
  }

  // For Spanish providers, prefer reissue/modern titles, then localized title
  if (localizedTitleProviders.includes(providerName)) {
    // Try alternative titles by type priority (reissue title is most common)
    const alternativeTitle = findTitleByType([
      'reissue title',
      'modern title',
      'alternative title',
      '',
    ]);
    if (alternativeTitle) {
      return alternativeTitle;
    }
  }

  // Default fallback to localized title
  return localizedTitle;
}

/**
 * Generate multiple search URLs for better coverage
 */
export function generateMultipleSearchUrls(
  providerName: string,
  localizedTitle: string,
  originalTitle?: string
): string[] {
  const urls: string[] = [];
  const provider = getProviderLink(providerName);

  if (!provider?.searchUrl) {
    return [getFallbackSearchUrl(providerName, localizedTitle)];
  }

  // Add primary search (best title for provider)
  const primaryTitle = getBestTitleForProvider(
    providerName,
    localizedTitle,
    originalTitle
  );
  urls.push(provider.searchUrl + encodeURIComponent(primaryTitle));

  // Add alternative search if we have both titles and they're different
  if (originalTitle && originalTitle !== localizedTitle) {
    const alternativeTitle =
      primaryTitle === originalTitle ? localizedTitle : originalTitle;
    urls.push(provider.searchUrl + encodeURIComponent(alternativeTitle));
  }

  return urls;
}

/**
 * Get a fallback search URL using Google with site-specific search
 */
export function getFallbackSearchUrl(
  providerName: string,
  mediaTitle: string
): string {
  const provider = getProviderLink(providerName);
  const siteDomain =
    provider?.baseUrl.replace('https://', '').replace('http://', '') ||
    providerName.toLowerCase().replace(/\s+/g, '');

  return `https://www.google.com/search?q=site:${siteDomain} "${encodeURIComponent(mediaTitle)}"`;
}
