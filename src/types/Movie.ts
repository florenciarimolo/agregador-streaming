import type { WatchProvider } from './WatchProvider';

export type Genre = {
  name: string;
};

export type Movie = {
  id: number;
  title: string;
  overview: string;
  poster_path: string | null;
  release_date: string;
  vote_average: number;
  genres: Genre[];
  original_language: string;
  providers?: WatchProvider[]; // Optional, as not all movies may have providers
  imdb_id?: string; // Optional, as not all movies may have an IMDb ID
};

export type MovieSearchResponse = {
  page: number;
  results: Movie[];
  total_pages: number;
  total_results: number;
};
