import { tmdbFetch } from '@/config/api';
import type { ExternalID } from '@/types/ExternalID';
import type { TVSearchResponse } from '@/types/TVShow';
import type { MediaTrendingResponse } from '@/types/Media';
import type { CountryWatchProvider } from '@/types/WatchProvider';

export async function searchTVShows(query: string): Promise<TVSearchResponse> {
  return await tmdbFetch<TVSearchResponse>('/search/tv', { query });
}

export async function getTVShowProviders(
  tv_show_id: number
): Promise<CountryWatchProvider['ES']> {
  const response = await tmdbFetch<{
    results: { ES: CountryWatchProvider['ES'] };
  }>(`/tv/${tv_show_id}/watch/providers`);
  return response.results?.ES || [];
}

export async function getTrendingTVShows(): Promise<MediaTrendingResponse> {
  return await tmdbFetch<MediaTrendingResponse>('/trending/tv/week');
}

export async function getExternalTVIds(tv_id: number): Promise<ExternalID> {
  return await tmdbFetch<ExternalID>(`/tv/${tv_id}/external_ids`);
}
