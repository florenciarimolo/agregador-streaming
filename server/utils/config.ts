export const getTMDBConfig = () => {
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
    language: 'es-ES',
    includeAdult: false, // Changed to false as per requirements
  };
};
