export type TVShow = {
    id: number;
    name: string;
    overview: string;
    poster_path: string | null;
    release_date: string;
    vote_average: number;
    imdb_id?: string; // Optional, as not all movies may have an IMDb ID
  };
  
  export type TVSearchResponse = {
    page: number;
    results: TVShow[];
    total_pages: number;
    total_results: number;
  };