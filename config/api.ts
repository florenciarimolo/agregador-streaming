export const TMDB_BASE_URL =
  process.env.NUXT_TMDB_BASE_URL || 'https://api.themoviedb.org/3';
export const TMDB_API_KEY = process.env.NUXT_TMDB_API_KEY || '';

export const tmdbConfig = {
  baseURL: TMDB_BASE_URL,
  apiKey: TMDB_API_KEY,
  language: 'es-ES',
  includeAdult: true,
};

export async function tmdbFetch<T>(
  endpoint: string,
  params: Record<string, any> = {}
): Promise<T> {
  const searchParams = new URLSearchParams({
    api_key: tmdbConfig.apiKey,
    language: tmdbConfig.language,
    include_adult: tmdbConfig.includeAdult.toString(),
    ...params,
  });

  return await $fetch<T>(`${tmdbConfig.baseURL}${endpoint}?${searchParams}`);
}
