export const getTMDBConfig = (language?: string, region?: string) => {
  const apiKey = process.env.NUXT_TMDB_API_KEY;
  if (!apiKey) {
    throw new Error('TMDB API key not found in environment variables');
  }

  const baseUrl =
    process.env.NUXT_TMDB_BASE_URL || 'https://api.themoviedb.org/3';
  if (!baseUrl) {
    throw new Error('TMDB base URL not found in environment variables');
  }

  return {
    apiKey,
    baseUrl,
    language: language || 'es-ES',
    region: region || 'ES',
    includeAdult: false, // Changed to false as per requirements
  };
};
