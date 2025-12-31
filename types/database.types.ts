/**
 * Supabase Database Types
 *
 * This file contains TypeScript types for your Supabase database.
 *
 * To generate types automatically:
 * 1. Install Supabase CLI: npm install -g supabase
 * 2. Run: supabase gen types typescript --project-id YOUR_PROJECT_ID > types/database.types.ts
 *
 * For now, we're using a basic type definition. You can generate full types later.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string | null;
          created_at: string;
          updated_at: string;
          onboarding_completed: boolean;
        };
        Insert: {
          id: string;
          email?: string | null;
          created_at?: string;
          updated_at?: string;
          onboarding_completed?: boolean;
        };
        Update: {
          id?: string;
          email?: string | null;
          created_at?: string;
          updated_at?: string;
          onboarding_completed?: boolean;
        };
      };
      titles: {
        Row: {
          id: string;
          tmdb_id: number;
          title: string;
          type: 'movie' | 'tv';
          poster_path: string | null;
          backdrop_path: string | null;
          overview: string | null;
          release_date: string | null;
          first_air_date: string | null;
          genres: Json | null;
          vote_average: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tmdb_id: number;
          title: string;
          type: 'movie' | 'tv';
          poster_path?: string | null;
          backdrop_path?: string | null;
          overview?: string | null;
          release_date?: string | null;
          first_air_date?: string | null;
          genres?: Json | null;
          vote_average?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tmdb_id?: number;
          title?: string;
          type?: 'movie' | 'tv';
          poster_path?: string | null;
          backdrop_path?: string | null;
          overview?: string | null;
          release_date?: string | null;
          first_air_date?: string | null;
          genres?: Json | null;
          vote_average?: number | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      user_title_status: {
        Row: {
          id: string;
          user_id: string;
          tmdb_id: number;
          status: 'seen' | 'not_interested' | 'watch_later';
          liked: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          tmdb_id: number;
          status: 'seen' | 'not_interested' | 'watch_later';
          liked?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          tmdb_id?: number;
          status?: 'seen' | 'not_interested' | 'watch_later';
          liked?: boolean;
          created_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
  };
}
