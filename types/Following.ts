/**
 * Types for following feature
 */

export interface FollowingSeries {
  tmdb_id: number;
  type: 'tv';
  created_at: string;
}

export interface FollowingResponse {
  following: Array<{
    tmdb_id: number;
    title: string;
    type: 'tv';
    poster_path: string | null;
    overview?: string | null;
    tagline?: string | null;
    vote_average?: number | null;
    providers?: Array<{
      provider_id: number;
      provider_name: string;
      logo_path: string | null;
    }>;
    created_at: string;
  }>;
}
