export const getTMDBConfig = () => {
  const apiKey = process.env.NUXT_TMDB_API_KEY;
  if (!apiKey) {
    throw new Error('TMDB API key not found in environment variables');
  }

  return {
    apiKey,
    baseUrl: process.env.NUXT_TMDB_BASE_URL,
    language: 'es-ES',
    includeAdult: true,
  };
};
