/**
 * Types for episode/season status feature
 */

export interface EpisodeStatus {
  id: string;
  user_id: string;
  tmdb_series_id: number;
  season_number: number;
  episode_number: number;
  seen: boolean;
  created_at: string;
}

export interface EpisodeStatusResponse {
  episodes: Array<{
    season_number: number;
    episode_number: number;
  }>;
}

export interface SeasonSeenStatus {
  season_number: number;
  isFullySeen: boolean;
  seenEpisodes: number;
  totalEpisodes: number;
}
