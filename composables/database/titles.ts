// useSupabaseClient is auto-imported by Nuxt
import { TABLES, TITLES_FIELDS } from './constants';
import { MediaTypeEnum } from '@/types/enums/MediaTypeEnum';

export interface InsertTitleData {
  tmdb_id: number;
  title: string;
  type: typeof MediaTypeEnum.movie | typeof MediaTypeEnum.tv;
  poster_path: string | null;
  backdrop_path?: string | null;
  overview?: string | null;
  release_date?: string | null;
  first_air_date?: string | null;
  genres?: number[] | null;
  vote_average?: number | null;
}

/**
 * Insert a new title into the database
 */
export async function insertTitle(data: InsertTitleData) {
  const supabase = useSupabaseClient();
  return await supabase
    .from(TABLES.TITLES)
    .insert({
      [TITLES_FIELDS.TMDB_ID]: data.tmdb_id,
      [TITLES_FIELDS.TITLE]: data.title,
      [TITLES_FIELDS.TYPE]: data.type,
      [TITLES_FIELDS.POSTER_PATH]: data.poster_path,
      [TITLES_FIELDS.BACKDROP_PATH]: data.backdrop_path || null,
      [TITLES_FIELDS.OVERVIEW]: data.overview || null,
      [TITLES_FIELDS.RELEASE_DATE]: data.release_date || null,
      [TITLES_FIELDS.FIRST_AIR_DATE]: data.first_air_date || null,
      [TITLES_FIELDS.GENRES]: data.genres || null,
      [TITLES_FIELDS.VOTE_AVERAGE]: data.vote_average || null,
    })
    .select('id')
    .single();
}

/**
 * Check if a title exists by tmdb_id and type
 */
export async function getTitleByTmdbId(
  tmdbId: number,
  type: typeof MediaTypeEnum.movie | typeof MediaTypeEnum.tv
) {
  const supabase = useSupabaseClient();
  return await supabase
    .from(TABLES.TITLES)
    .select('id')
    .eq(TITLES_FIELDS.TMDB_ID, tmdbId)
    .eq(TITLES_FIELDS.TYPE, type)
    .maybeSingle();
}

/**
 * Get titles by tmdb_ids
 */
export async function getTitlesByTmdbIds(tmdbIds: number[]) {
  const supabase = useSupabaseClient();
  return await supabase
    .from(TABLES.TITLES)
    .select('id, title, type, poster_path, tmdb_id')
    .in(TITLES_FIELDS.TMDB_ID, tmdbIds);
}
