/**
 * TMDB API response types
 */

export type TMDBResult = {
  id: number;
  title?: string; // movies
  name?: string; // tv shows
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date?: string; // movies
  first_air_date?: string; // tv shows
  vote_average: number;
  vote_count: number;
  genre_ids: number[];
  popularity: number;
  runtime?: number; // movies
  episode_run_time?: number[]; // tv shows
};

export type TMDBResponse = {
  page: number;
  results: TMDBResult[];
  total_pages: number;
  total_results: number;
};

export type TMDBTitleDetails = {
  title?: string;
  name?: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  vote_average: number | null;
  genres: Array<{ id: number; name: string }>;
  release_date?: string | null;
  first_air_date?: string | null;
};

export type TMDBWatchProvidersResponse = {
  results?: {
    [region: string]: {
      flatrate?: Array<{ provider_id: number }>;
      buy?: Array<{ provider_id: number }>;
      rent?: Array<{ provider_id: number }>;
    };
  };
};

