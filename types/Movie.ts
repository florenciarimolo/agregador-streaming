import type { WatchProviderTypes } from './WatchProvider';
import type { Genre } from './Genre';
import type { AlternativeTitlesResponse } from './AlternativeTitle';
import type { TmdbStatusType } from './enums/TmdbStatus';

export type Movie = {
  id: number;
  title: string;
  original_title?: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date: string;
  vote_average: number;
  vote_count?: number;
  genres: Genre[];
  original_language: string;
  status?: TmdbStatusType; // Production/release status from TMDB
  providers?: WatchProviderTypes; // Optional, as not all movies may have providers
  imdb_id?: string; // Optional, as not all movies may have an IMDb ID
  alternative_titles?: AlternativeTitlesResponse; // Alternative titles from TMDB
};

export type MovieSearchResponse = {
  page: number;
  results: Movie[];
  total_pages: number;
  total_results: number;
};
