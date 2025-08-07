import { tmdb } from '@/config/api';
import type { ExternalIDs } from '@/types/ExternalIDs';
import type { TVSearchResponse } from '@/types/TVShow';
import type { MediaTrendingResponse } from '@/types/Media';
import type { CountryWatchProvider } from '@/types/WatchProvider';

export async function searchTVShows(query: string): Promise<TVSearchResponse> {
  return (
    await tmdb.get('/search/tv', {
      params: {
        query,
      },
    })
  ).data;
}

export async function getTVShowProviders(
  tv_show_id: number
): Promise<CountryWatchProvider> {
  return (
    (await tmdb.get(`/movie/${tv_show_id}/watch/providers`)).data.results?.ES ||
    []
  );
}

export async function getTrendingTVShows(): Promise<MediaTrendingResponse> {
  return (await tmdb.get('/trending/tv/week')).data;
}

export async function getExternalTVIds(tv_id: number): Promise<ExternalIDs> {
  return (await tmdb.get(`/tv/${tv_id}/external_ids`)).data;
}
