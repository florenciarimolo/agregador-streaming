export interface TMDBSearchResult {
    id: number;
    title?: string; // películas
    name?: string; // series
    overview: string;
    poster_path: string | null;
    backdrop_path: string | null;
    release_date?: string; // películas
    first_air_date?: string; // series
    vote_average: number;
    media_type?: 'movie' | 'tv';
  }
  
  export interface TMDBSearchResponse {
    page: number;
    results: TMDBSearchResult[];
    total_pages: number;
    total_results: number;
  }