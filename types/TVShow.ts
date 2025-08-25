import type { Genre } from './Genre';
import type { WatchProviderTypes } from './WatchProvider';

export type Episode = {
  id: number;
  name: string;
  overview: string;
  air_date: string;
  season_number: number;
  vote_average: number;
  still_path: string | null;
  runtime: number;
}

export type Season = {
  id: number;
  name: string;
  season_number: number;
  overview: string;
  air_date: string;
  poster_path: string | null;
  vote_average: number;
  episodes?: Episode[];
  episode_count?: number;
};

export type TVShow = {
  id: number;
  name: string;
  overview: string;
  poster_path: string | null;
  first_air_date: string;
  vote_average: number;
  imdb_id?: string; // Optional, as not all movies may have an IMDb ID
  backdrop_path: string;
  number_of_seasons: number;
  genres: Genre[];
  seasons: Season[];
  in_production: boolean;
  providers?: WatchProviderTypes; // Optional, as not all shows may have providers
};

export type TVSearchResponse = {
  page: number;
  results: TVShow[];
  total_pages: number;
  total_results: number;
};
