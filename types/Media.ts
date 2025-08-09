export type MediaTrending = {
    id: number;
    title?: string; //For movies
    name?: string; //For TV shows
    overview: string;
    poster_path: string | null;
    backdrop_path: string | null;
    release_date?: string; //For movies
    first_air_date?: string; //For TV shows
    vote_average: number;
    media_type: 'movie' | 'tv';
    original_language: string;
    imdb_id?: string; // Optional, as not all movies may have an IMDb ID
  };
  
  export type MediaTrendingResponse = {
    page: number;
    results: MediaTrending[];
    total_pages: number;
    total_results: number;
  };