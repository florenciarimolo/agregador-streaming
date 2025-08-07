import { tmdb } from '@/config/api';
import type { Movie, MovieSearchResponse } from '@/types/Movie';
import type { ExternalIDs } from '@/types/ExternalIDs';
import type { MediaTrendingResponse } from '@/types/Media';
import type { WatchProviderTypes } from '@/types/WatchProvider';

export async function searchMovies(
  query: string
): Promise<MovieSearchResponse> {
  return (
    await tmdb.get('/search/movie', {
      params: {
        query,
      },
    })
  ).data;
}

export async function getMovieDetails(movie_id: number): Promise<Movie> {
  return (
    await tmdb.get(`/movie/${movie_id}`, {
      params: {
        append_to_response: 'movie-watch-providers',
      },
    })
  ).data;
}

export async function getMovieProviders(
  movie_id: number
): Promise<WatchProviderTypes> {
  return (
    (await tmdb.get(`/movie/${movie_id}/watch/providers`)).data.results?.ES ||
    ({} as WatchProviderTypes)
  );
}

export async function getTrendingMovies(): Promise<MediaTrendingResponse> {
  return (await tmdb.get('/trending/movie/week')).data;
}

export async function getExternalMovieIds(
  movie_id: number
): Promise<ExternalIDs> {
  return (await tmdb.get(`/movie/${movie_id}/external_ids`)).data;
}
