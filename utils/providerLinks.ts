import { MEDIA_TYPE, type MediaType } from '@/constants/domain/mediaType';

// Provider mapping with their base URLs and search patterns (only TMDB available providers for Spain)
export const PROVIDER_LINKS: Record<
  string,
  { baseUrl: string; searchUrl?: string; name: string }
> = {
  '3Cat': {
    baseUrl: 'https://www.ccma.cat/3cat',
    searchUrl: '/cercador/?cerca=',
    name: '3Cat',
  },
  'Amazon Prime Video': {
    baseUrl: 'https://www.primevideo.com/-/es',
    searchUrl: '/search/ref=atv_nb_sr?phrase=',
    name: 'Amazon Prime Video',
  },
  'Amazon Prime Video with Ads': {
    baseUrl: 'https://www.primevideo.com/-/es',
    searchUrl: '/search/ref=atv_nb_sr?phrase=',
    name: 'Amazon Prime Video con Anuncios',
  },
  'Amazon Video': {
    baseUrl: 'https://www.primevideo.com/-/es',
    searchUrl: '/search/ref=atv_nb_sr?phrase=',
    name: 'Amazon Video',
  },
  'Apple TV': {
    baseUrl: 'https://tv.apple.com/es',
    searchUrl:
      '/collection/resultados-principales/uts.col.search.TR?searchTerm=',
    name: 'Apple TV',
  },
  'Apple TV+': {
    baseUrl: 'https://tv.apple.com/es',
    searchUrl:
      '/collection/resultados-principales/uts.col.search.TR?searchTerm=',
    name: 'Apple TV+',
  },
  'Atres Player': {
    baseUrl: 'https://www.atresplayer.com',
    searchUrl: '/buscar/?q=',
    name: 'atresplayer',
  },
  Crunchyroll: {
    baseUrl: 'https://www.crunchyroll.com/es',
    searchUrl: '/search?q=',
    name: 'Crunchyroll',
  },
  'Disney Plus': {
    baseUrl: 'https://www.disneyplus.com/es',
    searchUrl: '/es-es/browse/search?query=',
    name: 'Disney+',
  },
  Filmin: {
    baseUrl: 'https://www.filmin.es',
    searchUrl: '/search?q=',
    name: 'Filmin',
  },
  'Filmin Plus': {
    baseUrl: 'https://www.filmin.es',
    searchUrl: '/search?q=',
    name: 'Filmin Plus',
  },
  FlixOlé: {
    baseUrl: 'https://www.flixole.com',
    searchUrl: '/buscar?q=',
    name: 'FlixOlé',
  },
  'Google Play Movies': {
    baseUrl: 'https://play.google.com/store/movies',
    searchUrl: '/store/search?q=',
    name: 'Google Play Películas',
  },
  'HBO Max': {
    baseUrl: 'https://play.hbomax.com',
    searchUrl: '/search/result?q=',
    name: 'HBO Max',
  },
  'HBO Max  Amazon Channel': {
    baseUrl: 'https://play.hbomax.com',
    searchUrl: '/search/result?q=',
    name: 'HBO Max Canal Amazon',
  },
  MUBI: {
    baseUrl: 'https://mubi.com/es',
    searchUrl: '/es/search?query=',
    name: 'MUBI',
  },
  'Movistar Plus+': {
    baseUrl: 'https://ver.movistarplus.es',
    searchUrl: '/busqueda?term=',
    name: 'Movistar Plus+',
  },
  'Movistar Plus+ Ficción Total ': {
    baseUrl: 'https://ver.movistarplus.es',
    searchUrl: '/busqueda?term=',
    name: 'Movistar Plus+ Ficción Total',
  },
  Netflix: {
    baseUrl: 'https://www.netflix.com',
    searchUrl: '/search?q=',
    name: 'Netflix',
  },
  'Netflix Standard with Ads': {
    baseUrl: 'https://www.netflix.com',
    searchUrl: '/search?q=',
    name: 'Netflix Estándar con Anuncios',
  },
  Plex: {
    baseUrl: 'https://www.plex.TV',
    searchUrl: '/search/?query=',
    name: 'Plex',
  },
  'Pluto TV': {
    baseUrl: 'https://pluto.TV/es',
    searchUrl: '/es/search?term=',
    name: 'Pluto TV',
  },
  'Rakuten TV': {
    baseUrl: 'https://rakuten.TV/es',
    searchUrl: '/es/search?q=',
    name: 'Rakuten TV',
  },
  'Rakuten Viki': {
    baseUrl: 'https://www.viki.com',
    searchUrl: '/search?q=',
    name: 'Rakuten Viki',
  },
  SkyShowtime: {
    baseUrl: 'https://www.skyshowtime.com/es',
    searchUrl: '/es/search?q=',
    name: 'SkyShowtime',
  },
  Tivify: {
    baseUrl: 'https://www.tivify.TV',
    name: 'Tivify',
  },
  'YouTube Premium': {
    baseUrl: 'https://www.youtube.com',
    searchUrl: '/results?search_query=',
    name: 'YouTube Premium',
  },
  fuboTV: {
    baseUrl: 'https://www.fubo.TV/es',
    name: 'fuboTV',
  },
  rtve: {
    baseUrl: 'https://www.rtve.es/play',
    searchUrl: '/buscador/?q=',
    name: 'rtve',
  },
};

/**
 * Format title for URL: remove special characters, keep spaces, format for URL
 */
export function formatTitleForUrl(title: string): string {
  if (!title) return '';

  // Remove special characters but keep alphanumeric, spaces, and common punctuation
  // Replace special characters with spaces, then normalize spaces
  const formatted = title
    // Replace special characters (except alphanumeric and spaces) with spaces
    .replace(/[^a-zA-Z0-9\s]/g, ' ')
    // Replace multiple spaces with single space
    .replace(/\s+/g, ' ')
    // Trim leading and trailing spaces
    .trim();

  // Format spaces for URL (replace with + for URL encoding)
  return formatted.replace(/\s/g, '+');
}

/**
 * Get provider link information by provider name
 */
export function getProviderLink(
  providerName: string
): { baseUrl: string; searchUrl?: string; name: string } | null {
  return PROVIDER_LINKS[providerName] || null;
}

/**
 * Fetch Atres Player URL from their API
 */
async function fetchAtresPlayerUrl(query: string): Promise<string | null> {
  try {
    // Query is already formatted (spaces replaced with +), use it directly
    const apiUrl = `https://api.atresplayer.com/client/v1/row/search?entityType=ATPFormat&text=${query}`;
    const response = await fetch(apiUrl);

    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as {
      itemRows?: Array<{
        link?: {
          url?: string;
        };
      }>;
    };

    // Get the first item from itemRows
    if (
      data.itemRows &&
      Array.isArray(data.itemRows) &&
      data.itemRows.length > 0
    ) {
      const firstItem = data.itemRows[0];
      if (firstItem.link && firstItem.link.url) {
        return firstItem.link.url;
      }
    }

    return null;
  } catch (error) {
    console.error('Error fetching Atres Player URL:', error);
    return null;
  }
}

/**
 * Generate a search URL for a provider with the media title
 * @param providerName Name of the provider
 * @param mediaTitle Localized media title (user's preferred language)
 * @param originalTitle Original title (usually English)
 * @param alternativeTitles Alternative titles array
 * @param mediaType Type of media (movie or tv)
 * @param region User's region (e.g., 'ES', 'US'). If 'ES', will use Spanish title for providers
 * @param spanishTitle Optional pre-fetched Spanish title (to avoid duplicate API calls)
 */
export async function generateProviderSearchUrl(
  providerName: string,
  mediaTitle: string,
  originalTitle?: string,
  alternativeTitles?: Array<{ title: string; type: string }>,
  mediaType?: MediaType,
  region?: string,
  spanishTitle?: string | null
): Promise<string | null> {
  const provider = getProviderLink(providerName);
  if (!provider) return null;

  // If region is ES, use Spanish title (pre-fetched and passed as parameter)
  // This avoids duplicate API calls when generating URLs for multiple providers
  let titleToUse = mediaTitle;
  if (region === 'ES' && spanishTitle !== undefined) {
    // Use pre-fetched Spanish title if available
    if (spanishTitle) {
      titleToUse = spanishTitle;
    }
    // If spanishTitle is null, it means it was fetched but not found, so keep mediaTitle
  }

  // Special handling for Atres Player
  if (providerName === 'Atres Player' || providerName === 'atresplayer') {
    // Use the best title based on provider preference and available alternatives
    let searchTitle = '';
    if (mediaType === MEDIA_TYPE.MOVIE) {
      searchTitle = getBestTitleForProvider(
        providerName,
        titleToUse,
        originalTitle,
        alternativeTitles
      );
    } else {
      searchTitle = titleToUse;
    }
    // Format title for URL (remove special characters, format spaces)
    const formattedTitle = formatTitleForUrl(searchTitle);

    // Fetch URL from API
    const apiUrl = await fetchAtresPlayerUrl(formattedTitle);
    if (apiUrl) {
      // Concatenate with baseUrl
      return provider.baseUrl + apiUrl;
    }
    // Fallback to regular search URL if API fails
    return provider.baseUrl + provider.searchUrl + formattedTitle;
  }

  if (provider.searchUrl) {
    // Use the best title based on provider preference and available alternatives
    let searchTitle = '';
    if (mediaType === MEDIA_TYPE.MOVIE) {
      searchTitle = getBestTitleForProvider(
        providerName,
        titleToUse,
        originalTitle,
        alternativeTitles
      );
    } else {
      searchTitle = titleToUse;
    }
    // Format title for URL (remove special characters, format spaces)
    const formattedTitle = formatTitleForUrl(searchTitle);
    return provider.baseUrl + provider.searchUrl + formattedTitle;
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
  const formattedPrimaryTitle = formatTitleForUrl(primaryTitle);
  urls.push(provider.baseUrl + provider.searchUrl + formattedPrimaryTitle);

  // Add alternative search if we have both titles and they're different
  if (originalTitle && originalTitle !== localizedTitle) {
    const alternativeTitle =
      primaryTitle === originalTitle ? localizedTitle : originalTitle;
    const formattedAlternativeTitle = formatTitleForUrl(alternativeTitle);
    urls.push(
      provider.baseUrl + provider.searchUrl + formattedAlternativeTitle
    );
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

  const formattedTitle = formatTitleForUrl(mediaTitle);
  return `https://www.google.com/search?q=site:${siteDomain} "${formattedTitle}"`;
}
