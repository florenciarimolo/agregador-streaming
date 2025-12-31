export type Provider = {
  provider_id: number;
  provider_name: string;
  logo_path: string | null;
};

export type Recommendation = {
  id: string;
  tmdb_id: number;
  title: string;
  type: 'movie' | 'tv';
  poster_path: string | null;
  overview: string | null;
  vote_average: number | null;
  genres: number[] | null;
  release_date: string | null;
  first_air_date: string | null;
  explanation: string;
  explanation_code?: string | null; // BASED_ON_LIKE, TRENDING, DISCOVER, EASY_TO_WATCH, MOOD_MATCH
  providers?: Provider[];
  in_watchlist?: boolean; // Indicates if title is in user's watchlist
};

// Single array of recommendations - no more separate lists
export type Recommendations = Recommendation[];
