import { tmdbFetch } from '@/config/api';
import type { Movie, MovieSearchResponse } from '@/types/Movie';
import type { ExternalID } from '@/types/ExternalID';
import type { MediaTrendingResponse } from '@/types/Media';
import type { WatchProviderTypes } from '@/types/WatchProvider';

export async function searchMovies(
  query: string
): Promise<MovieSearchResponse> {
  return await tmdbFetch<MovieSearchResponse>('/search/movie', { query });
}

export async function getMovieDetails(movie_id: number): Promise<Movie> {
  return await tmdbFetch<Movie>(`/movie/${movie_id}`, {
    append_to_response: 'movie-watch-providers',
  });
}

export async function getMovieProviders(
  movie_id: number
): Promise<WatchProviderTypes> {
  const response = await tmdbFetch<{ results: { ES: WatchProviderTypes } }>(
    `/movie/${movie_id}/watch/providers`
  );
  return response.results?.ES || ({} as WatchProviderTypes);
}

export async function getTrendingMovies(): Promise<MediaTrendingResponse> {
  return await tmdbFetch<MediaTrendingResponse>('/trending/movie/week');
}

export async function getExternalMovieIds(
  movie_id: number
): Promise<ExternalID> {
  return await tmdbFetch<ExternalID>(`/movie/${movie_id}/external_ids`);
}
