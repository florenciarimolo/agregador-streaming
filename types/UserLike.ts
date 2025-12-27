export type UserLike = {
    title_id: string;
    titles?: {
      tmdb_id?: number;
      type?: 'movie' | 'tv';
      genres?: number[] | Array<{ id?: number }>;
    };
};