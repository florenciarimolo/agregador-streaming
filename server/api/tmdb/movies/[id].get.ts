import { getTMDBConfig } from '../../../utils/config';
import { getUserTMDBParams, getUserTMDBParamsByUserId } from '../../../utils/user-preferences';
import { createError, getRouterParams } from 'h3';
import { createClient } from '@supabase/supabase-js';
import { TABLES, TITLES_FIELDS } from '@/composables/database/constants';
import { getTitleInLanguage, type MultiLanguageText } from '@/composables/database/titles';

export default defineEventHandler(async (event) => {
  try {
    const config = useRuntimeConfig();
    const { id } = getRouterParams(event) as { id: string };
    const tmdbId = parseInt(id, 10);

    if (isNaN(tmdbId)) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid movie ID',
      });
    }

    // First, try to get from database
    const supabaseKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY || config.public.supabaseAnonKey;
    const supabase = createClient(config.public.supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });

    // Get user preferences for language
    const { language: userLanguage, region } = await getUserTMDBParams(event);
    // Extract base language code (e.g., 'es-ES' -> 'es')
    const userLangCode = userLanguage.split('-')[0] || 'es';
    const supportedLanguages = ['es', 'ca', 'eu', 'gl', 'en'];

    const { data: titleFromDb, error: dbError } = await supabase
      .from(TABLES.TITLES)
      .select('*')
      .eq(TITLES_FIELDS.TMDB_ID, tmdbId)
      .eq(TITLES_FIELDS.TYPE, 'movie')
      .maybeSingle();

    // If found in DB, check if we have the required language
    if (titleFromDb && !dbError) {
      let titleJsonb = titleFromDb.title as MultiLanguageText;
      let overviewJsonb = titleFromDb.overview as MultiLanguageText | null;
      let posterPathJsonb = titleFromDb.poster_path as MultiLanguageText | null;

      // Check which languages we already have
      const existingLanguages = new Set<string>();
      if (titleJsonb && typeof titleJsonb === 'object') {
        Object.keys(titleJsonb).forEach((lang) => existingLanguages.add(lang));
      }
      
      // Check if we need to fetch missing languages
      // If title only has Spanish (or very few languages), fetch all supported languages
      const supportedLanguages = ['es', 'ca', 'eu', 'gl', 'en'];
      const missingLanguages = supportedLanguages.filter((lang) => !existingLanguages.has(lang));
      
      // If we're missing languages, fetch all missing ones from TMDB
      if (missingLanguages.length > 0) {
        const tmdbConfig = getTMDBConfig(userLanguage, region);
        
        // Fetch all missing languages in parallel
        const languagePromises = missingLanguages.map(async (lang) => {
          const langCode = lang === 'es' ? 'es-ES' : lang === 'en' ? 'en-US' : `${lang}-ES`;
          try {
            const response = await $fetch(`${tmdbConfig.baseUrl}/movie/${tmdbId}`, {
              query: {
                api_key: tmdbConfig.apiKey,
                language: langCode,
                region: tmdbConfig.region,
              },
            });
            return { lang, data: response };
          } catch {
            return { lang, data: null };
          }
        });
        
        const languageResults = await Promise.all(languagePromises);
        
        // Build updated multi-language JSONB objects
        const updatedTitle = { ...(titleJsonb || {}) };
        const updatedOverview = { ...(overviewJsonb || {}) };
        const updatedPosterPath = { ...(posterPathJsonb || {}) };
        
        languageResults.forEach(({ lang, data }) => {
          if (data) {
            if (data.title) updatedTitle[lang] = data.title;
            if (data.overview) updatedOverview[lang] = data.overview || '';
            if (data.poster_path) updatedPosterPath[lang] = data.poster_path;
          }
        });
        
        // Update database with all languages
        await supabase
          .from(TABLES.TITLES)
          .update({
            title: updatedTitle,
            overview: updatedOverview,
            poster_path: Object.keys(updatedPosterPath).length > 0 ? updatedPosterPath : null,
          })
          .eq(TITLES_FIELDS.TMDB_ID, tmdbId)
          .eq(TITLES_FIELDS.TYPE, 'movie');
        
        // Update local references to use the updated JSONB
        titleJsonb = updatedTitle;
        overviewJsonb = updatedOverview;
        posterPathJsonb = updatedPosterPath;
      }

      // Get user preferences for genres, providers and alternative titles
      const tmdbConfig = getTMDBConfig(userLanguage, region);

      // Fetch genres, providers and alternative titles from TMDB
      const [fullMovieResponse, providersResponse, alternativeTitlesResponse] =
        await Promise.all([
          $fetch(`${tmdbConfig.baseUrl}/movie/${tmdbId}`, {
            query: {
              api_key: tmdbConfig.apiKey,
              language: tmdbConfig.language,
              region: tmdbConfig.region,
            },
          }).catch(() => null),
          $fetch(`${tmdbConfig.baseUrl}/movie/${tmdbId}/watch/providers`, {
            query: {
              api_key: tmdbConfig.apiKey,
              language: tmdbConfig.language,
              region: tmdbConfig.region,
            },
          }).catch(() => null),
          $fetch(`${tmdbConfig.baseUrl}/movie/${tmdbId}/alternative/titles`, {
            query: {
              api_key: tmdbConfig.apiKey,
            },
          }).catch(() => null),
        ]);

      // Extract language-specific text from JSONB (now with all languages)
      const titleText = getTitleInLanguage(titleJsonb, userLangCode, region);
      const overviewText = getTitleInLanguage(overviewJsonb, userLangCode, region);
      const posterPathText = getTitleInLanguage(posterPathJsonb, userLangCode, region, true);

      // Map DB title to Movie format
      const movie: any = {
        id: titleFromDb.tmdb_id,
        title: titleText || fullMovieResponse?.title,
        overview: overviewText || fullMovieResponse?.overview,
        poster_path: posterPathText || fullMovieResponse?.poster_path,
        backdrop_path: titleFromDb.backdrop_path,
        release_date: titleFromDb.release_date,
        vote_average: titleFromDb.vote_average,
        genres: fullMovieResponse?.genres || titleFromDb.genres || [],
        genre_ids: fullMovieResponse?.genre_ids || [],
      };

      // Add providers if available
      if (providersResponse?.results) {
        const regionProviders =
          providersResponse.results[region] || providersResponse.results.ES;
        if (regionProviders) {
          movie.providers = regionProviders;
        }
      }

      // Add alternative titles if available
      if (alternativeTitlesResponse?.titles) {
        movie.alternative_titles = alternativeTitlesResponse;
      }

      return movie;
    }

    // If not in DB, fetch from TMDB for all supported languages and save
    const tmdbConfig = getTMDBConfig(userLanguage, region);

    // Fetch movie data for all supported languages
    const languagePromises = supportedLanguages.map(async (lang) => {
      const langCode = lang === 'es' ? 'es-ES' : lang === 'en' ? 'en-US' : `${lang}-ES`;
      try {
        const response = await $fetch(`${tmdbConfig.baseUrl}/movie/${tmdbId}`, {
          query: {
            api_key: tmdbConfig.apiKey,
            language: langCode,
            region: tmdbConfig.region,
          },
        });
        return { lang, data: response };
      } catch {
        return { lang, data: null };
      }
    });

    const languageResults = await Promise.all(languagePromises);

    // Build multi-language JSONB objects
    const titleMultiLang: MultiLanguageText = {};
    const overviewMultiLang: MultiLanguageText = {};
    const posterPathMultiLang: MultiLanguageText = {};
    let backdropPath: string | null = null;
    let releaseDate: string | null = null;
    let voteAverage: number | null = null;
    let genres: Array<{ id: number; name: string }> = [];

    languageResults.forEach(({ lang, data }) => {
      if (data) {
        if (data.title) titleMultiLang[lang] = data.title;
        if (data.overview) overviewMultiLang[lang] = data.overview;
        if (data.poster_path) posterPathMultiLang[lang] = data.poster_path;
        // Use first successful response for non-language fields
        if (!backdropPath && data.backdrop_path) backdropPath = data.backdrop_path;
        if (!releaseDate && data.release_date) releaseDate = data.release_date;
        if (!voteAverage && data.vote_average) voteAverage = data.vote_average;
        if (genres.length === 0 && data.genres) genres = data.genres;
      }
    });

    // Save to database if we got at least one language
    if (Object.keys(titleMultiLang).length > 0) {
      await supabase
        .from(TABLES.TITLES)
        .upsert({
          tmdb_id: tmdbId,
          type: 'movie',
          title: titleMultiLang,
          overview: overviewMultiLang,
          poster_path: Object.keys(posterPathMultiLang).length > 0 ? posterPathMultiLang : null,
          backdrop_path: backdropPath,
          release_date: releaseDate,
          vote_average: voteAverage,
          genres: genres,
        }, {
          onConflict: 'tmdb_id',
        });
    }

    // Return response in user's language (or first available)
    const userLangData = languageResults.find((r) => r.lang === userLangCode)?.data ||
      languageResults.find((r) => r.data)?.data;

    if (!userLangData) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Movie not found',
      });
    }

    return userLangData;
  } catch (error) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Error fetching movie details',
      data: error,
    });
  }
});
