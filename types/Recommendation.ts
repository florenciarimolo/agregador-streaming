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
  providers?: Provider[];
  in_watchlist?: boolean; // Indicates if title is in user's watchlist
};

export type Recommendations = {
  recommended: Recommendation[];
  easyToWatch: Recommendation[];
  basedOnLikes: Recommendation[];
};
