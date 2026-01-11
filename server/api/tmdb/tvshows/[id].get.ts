import { getTMDBConfig } from '@/server/utils/config';
import { getUserTMDBParams } from '@/server/utils/user-tmdb';
import { createError, defineEventHandler } from 'h3';
import { createClient } from '@supabase/supabase-js';
import { TITLES_COLUMNS, SEASONS_COLUMNS } from '@/constants/db/columns';
import { TABLES } from '@/constants/db/tables';
import { type MultiLanguageText } from '@/services/titles';
import { MEDIA_TYPE } from '@/constants/domain/mediaType';
import type { TVShow, Season } from '@/types/TVShow';
import type { TmdbStatusType } from '@/types/enums/TmdbStatus';
import { LanguageIsoCode, extractLanguageCode } from '@/constants/languages';

export default defineEventHandler(async (event) => {
  try {
    const config = useRuntimeConfig();
    const { id } = event.context.params as { id: string };
    const tmdbId = parseInt(id, 10);

    if (isNaN(tmdbId)) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid TV show ID',
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
    // IMPORTANT: userLanguage is already in ISO format (e.g., 'ca-ES', 'es-ES')
    // Extract base language code (e.g., 'es-ES' -> 'es') only for display purposes
    const userLangCode =
      extractLanguageCode(userLanguage) || LanguageIsoCode.SPANISH;
    // IMPORTANT: Use SUPPORTED_LANGUAGE_CODES (ISO format) not ISO_CODES (legacy format)
    const { SUPPORTED_LANGUAGE_CODES } = await import('@/constants/languages');
    const supportedLanguages = SUPPORTED_LANGUAGE_CODES.map((code) => code);

    const { data: titleFromDb, error: dbError } = await supabase
      .from(TABLES.TITLES)
      .select('*')
      .eq(TITLES_COLUMNS.TMDB_ID, tmdbId)
      .eq(TITLES_COLUMNS.TYPE, MEDIA_TYPE.TV)
      .maybeSingle();

    // If found in DB, check if we have the required language
    if (titleFromDb && !dbError) {
      let titleJsonb = titleFromDb.title as MultiLanguageText;
      let overviewJsonb = titleFromDb.overview as MultiLanguageText | null;
      let posterPathJsonb = titleFromDb.poster_path as MultiLanguageText | null;
      let taglineJsonb = titleFromDb.tagline as MultiLanguageText | null;

      // Check which languages we already have
      const existingLanguages = new Set<string>();
      if (titleJsonb && typeof titleJsonb === 'object') {
        Object.keys(titleJsonb).forEach((lang) => existingLanguages.add(lang));
      }

      // Check if we need to fetch missing languages
      // IMPORTANT: Use SUPPORTED_LANGUAGE_CODES (ISO format: 'es-ES', 'ca-ES') not ISO_CODES (legacy: 'es', 'ca')
      // This ensures all data is stored in ISO format (xx-XX) consistently
      const { SUPPORTED_LANGUAGE_CODES } =
        await import('@/constants/languages');
      const supportedLanguagesList = SUPPORTED_LANGUAGE_CODES.map(
        (code) => code
      );
      const missingLanguages = supportedLanguagesList.filter(
        (lang) => !existingLanguages.has(lang)
      );

      // If we're missing languages, fetch all missing ones from TMDB
      if (missingLanguages.length > 0) {
        const tmdbConfig = getTMDBConfig(userLanguage, region);

        // Fetch all missing languages in parallel
        // IMPORTANT: lang is already in ISO format (e.g., 'ca-ES'), use it directly
        const languagePromises = missingLanguages.map(async (lang) => {
          try {
            const response = await $fetch<{
              name?: string;
              overview?: string;
              tagline?: string;
              poster_path?: string | null;
            }>(`${tmdbConfig.baseUrl}/tv/${tmdbId}`, {
              query: {
                api_key: tmdbConfig.apiKey,
                language: lang, // lang is already in ISO format (e.g., 'ca-ES')
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
        // IMPORTANT: Use lang (ISO format) as key, not legacy format
        const updatedTitle = { ...(titleJsonb || {}) };
        const updatedOverview = { ...(overviewJsonb || {}) };
        const updatedPosterPath = { ...(posterPathJsonb || {}) };
        const updatedTagline = { ...(taglineJsonb || {}) };

        languageResults.forEach(({ lang, data }) => {
          if (data) {
            // lang is in ISO format (e.g., 'ca-ES'), use it directly as key
            if (data.name) updatedTitle[lang] = data.name;
            if (data.overview) updatedOverview[lang] = data.overview || '';
            if (data.poster_path) updatedPosterPath[lang] = data.poster_path;
            if (data.tagline) updatedTagline[lang] = data.tagline;
          }
        });

        // Update database with all languages
        await supabase
          .from(TABLES.TITLES)
          .update({
            title: updatedTitle,
            overview: updatedOverview,
            poster_path:
              Object.keys(updatedPosterPath).length > 0
                ? updatedPosterPath
                : null,
            tagline:
              Object.keys(updatedTagline).length > 0 ? updatedTagline : null,
          })
          .eq(TITLES_COLUMNS.TMDB_ID, tmdbId)
          .eq(TITLES_COLUMNS.TYPE, MEDIA_TYPE.TV);

        // Update local references to use the updated JSONB
        titleJsonb = updatedTitle;
        overviewJsonb = updatedOverview;
        posterPathJsonb = updatedPosterPath;
        taglineJsonb = updatedTagline;
      }

      // Get user preferences for seasons, genres, providers and alternative titles
      const tmdbConfig = getTMDBConfig(userLanguage, region);

      // Fetch full TV show data, providers and alternative titles from TMDB
      const [fullTvShowResponse, providersResponse, alternativeTitlesResponse] =
        await Promise.all([
          $fetch<{
            name?: string;
            original_name?: string;
            overview?: string;
            tagline?: string;
            poster_path?: string | null;
            backdrop_path?: string | null;
            first_air_date?: string;
            vote_average?: number;
            vote_count?: number;
            genres?: Array<{ id: number; name: string }>;
            genre_ids?: number[];
            seasons?: Array<{
              id: number;
              name: string;
              season_number: number;
              overview: string;
              air_date: string;
              poster_path: string | null;
              vote_average: number;
              vote_count?: number;
              episode_count?: number;
            }>;
            number_of_seasons?: number;
            number_of_episodes?: number;
            in_production?: boolean;
            status?: string;
          }>(`${tmdbConfig.baseUrl}/tv/${tmdbId}`, {
            query: {
              api_key: tmdbConfig.apiKey,
              language: tmdbConfig.language,
              region: tmdbConfig.region,
            },
          }).catch(() => null),
          $fetch<{
            results?: Record<string, unknown>;
          }>(`${tmdbConfig.baseUrl}/tv/${tmdbId}/watch/providers`, {
            query: {
              api_key: tmdbConfig.apiKey,
              language: tmdbConfig.language,
              region: tmdbConfig.region,
            },
          }).catch(() => null),
          $fetch<{
            results?: Array<{
              iso_3166_1: string;
              title: string;
              type: string;
            }>;
          }>(`${tmdbConfig.baseUrl}/tv/${tmdbId}/alternative/titles`, {
            query: {
              api_key: tmdbConfig.apiKey,
            },
          }).catch(() => null),
        ]);

      // Use unified extraction function with TMDB fallback
      const { extractTitleDataWithFallback } =
        await import('../../../utils/title-extraction');

      const extracted = await extractTitleDataWithFallback({
        tmdbId,
        type: MEDIA_TYPE.TV,
        language: userLanguage,
        region,
        supabase,
        config,
      });

      // Get tagline from DB or TMDB
      const { getTitleInLanguage } = await import('@/services/titles');
      let taglineFromDb = taglineJsonb
        ? getTitleInLanguage(taglineJsonb, userLanguage, region)
        : null;

      // If tagline or status is missing in DB but exists in TMDB response, save it
      const needsUpdate: Record<string, unknown> = {};
      let savedStatus: string | undefined = undefined;
      if (!taglineFromDb && fullTvShowResponse?.tagline) {
        const updatedTagline: MultiLanguageText = { ...(taglineJsonb || {}) };
        updatedTagline[userLanguage] = fullTvShowResponse.tagline;
        needsUpdate.tagline = updatedTagline;
        taglineJsonb = updatedTagline;
        // Recalculate taglineFromDb after updating taglineJsonb
        taglineFromDb = getTitleInLanguage(taglineJsonb, userLanguage, region);
      }
      if (!titleFromDb.status && fullTvShowResponse?.status) {
        needsUpdate[TITLES_COLUMNS.STATUS] = fullTvShowResponse.status;
        savedStatus = fullTvShowResponse.status; // Store the value we're saving
      }
      if (Object.keys(needsUpdate).length > 0) {
        await supabase
          .from(TABLES.TITLES)
          .update(needsUpdate)
          .eq(TITLES_COLUMNS.TMDB_ID, tmdbId)
          .eq(TITLES_COLUMNS.TYPE, MEDIA_TYPE.TV);
      }

      // Map DB title to TVShow format
      // IMPORTANT: Use extracted data (from titles table or TMDB) - it already handles language correctly
      // Don't use fullTvShowResponse as fallback since extractTitleDataWithFallback already fetches from TMDB if needed
      const tvShow: Partial<TVShow> & {
        id: number;
        name: string;
        overview: string;
        poster_path: string | null;
        backdrop_path: string;
        first_air_date: string;
        vote_average: number;
        number_of_seasons: number;
        in_production: boolean;
        tagline?: string | MultiLanguageText;
        genre_ids?: number[];
      } = {
        id: titleFromDb.tmdb_id,
        name: extracted.title || '',
        original_name: fullTvShowResponse?.original_name,
        overview: extracted.overview || '',
        poster_path: extracted.poster_path || null,
        backdrop_path: (titleFromDb.backdrop_path || '') as string,
        first_air_date: titleFromDb.first_air_date || '',
        vote_average: titleFromDb.vote_average || 0,
        vote_count: fullTvShowResponse?.vote_count,
        genres: fullTvShowResponse?.genres || titleFromDb.genres || [],
        genre_ids: fullTvShowResponse?.genre_ids || [],
        seasons: fullTvShowResponse?.seasons || [], // Will be updated after sync
        number_of_seasons: fullTvShowResponse?.number_of_seasons || 0,
        number_of_episodes: fullTvShowResponse?.number_of_episodes,
        in_production: fullTvShowResponse?.in_production || false,
        status:
          ((titleFromDb.status || savedStatus) as TmdbStatusType | undefined) ||
          undefined, // Use saved value if we just saved it
        // CRITICAL: Return MultiLanguageText object, not extracted string
        // The component will extract the correct language using getTitleInLanguage
        tagline: taglineJsonb || undefined,
      };

      // Add providers if available
      if (providersResponse?.results) {
        const regionProviders =
          providersResponse.results[region] || providersResponse.results.ES;
        if (regionProviders) {
          tvShow.providers = regionProviders;
        }
      }

      // Add alternative titles if available
      if (alternativeTitlesResponse?.results) {
        // Note: alternative_titles is not part of TVShow type, but we can add it if needed
        // tvShow.alternative_titles = alternativeTitlesResponse.results;
      }

      // Sync seasons from TMDB response to database
      if (
        fullTvShowResponse?.seasons &&
        fullTvShowResponse.seasons.length > 0
      ) {
        const { syncSeasonsFromTVShow } =
          await import('@/server/utils/season-sync');
        await syncSeasonsFromTVShow(
          tmdbId,
          fullTvShowResponse.seasons.map((s) => ({
            id: s.id || 0,
            name: s.name || '',
            season_number: s.season_number || 0,
            overview: s.overview || '',
            air_date: s.air_date || '',
            poster_path: s.poster_path || null,
            vote_average: s.vote_average || 0,
            episode_count: s.episode_count,
          })),
          supabase,
          tmdbConfig // Pass TMDB config to enable fetching air_date from first episode
        );
      }

      // Get seasons from database (after sync, to ensure we have the latest data including air_date from first episode)
      const { getSeasonsByTvTmdbId } = await import('@/services/seasons');
      const seasonsFromDb = await getSeasonsByTvTmdbId(
        tmdbId,
        supabase,
        userLanguage,
        region
      );

      // Check if we need to fetch missing season names in user's language or episode_count
      // Reuse fullTvShowResponse.seasons if available (already fetched with user's language)
      if (seasonsFromDb.length > 0 && fullTvShowResponse?.seasons) {
        // Check which seasons need updates (missing language names or episode_count)
        const seasonsNeedingNameUpdate: Array<{
          season: Season;
          tmdbSeason: { season_number: number; name: string };
        }> = [];
        const seasonsNeedingEpisodeCountUpdate: Array<{
          season: Season;
          episodeCount: number;
        }> = [];

        for (const season of seasonsFromDb) {
          // Check if episode_count is missing in DB
          if (
            (season.episode_count === null ||
              season.episode_count === undefined) &&
            fullTvShowResponse.seasons
          ) {
            const tmdbSeason = fullTvShowResponse.seasons.find(
              (s) => s.season_number === season.season_number
            );
            if (
              tmdbSeason?.episode_count !== null &&
              tmdbSeason?.episode_count !== undefined
            ) {
              seasonsNeedingEpisodeCountUpdate.push({
                season,
                episodeCount: tmdbSeason.episode_count,
              });
            }
          }

          // Check if name language is missing
          const { data: seasonData } = await supabase
            .from(TABLES.SEASONS)
            .select(SEASONS_COLUMNS.NAME)
            .eq(SEASONS_COLUMNS.TV_TMDB_ID, tmdbId)
            .eq(SEASONS_COLUMNS.SEASON_NUMBER, season.season_number)
            .maybeSingle();

          const nameJsonb = seasonData?.name as MultiLanguageText | null;
          const hasExactLanguage =
            nameJsonb &&
            typeof nameJsonb === 'object' &&
            nameJsonb[userLanguage] !== undefined;

          if (!hasExactLanguage) {
            const tmdbSeason = fullTvShowResponse.seasons.find(
              (s) => s.season_number === season.season_number
            );
            if (tmdbSeason?.name) {
              seasonsNeedingNameUpdate.push({ season, tmdbSeason });
            }
          }
        }

        // Update seasons with missing episode_count in DB
        if (seasonsNeedingEpisodeCountUpdate.length > 0) {
          const { upsertSeason } = await import('@/services/seasons');
          for (const {
            season,
            episodeCount,
          } of seasonsNeedingEpisodeCountUpdate) {
            await upsertSeason(
              {
                tv_tmdb_id: tmdbId,
                season_number: season.season_number,
                tmdb_season_id: season.id,
                episode_count: episodeCount,
              },
              supabase
            );
          }
        }

        // Update seasons with missing language names
        if (seasonsNeedingNameUpdate.length > 0) {
          const { upsertSeason } = await import('@/services/seasons');
          for (const { season, tmdbSeason } of seasonsNeedingNameUpdate) {
            // Get current name JSONB
            const { data: currentSeasonData } = await supabase
              .from(TABLES.SEASONS)
              .select(SEASONS_COLUMNS.NAME)
              .eq(SEASONS_COLUMNS.TV_TMDB_ID, tmdbId)
              .eq(SEASONS_COLUMNS.SEASON_NUMBER, season.season_number)
              .maybeSingle();

            const currentNameJsonb =
              (currentSeasonData?.name as MultiLanguageText) || {};
            const updatedNameJsonb: MultiLanguageText = {
              ...currentNameJsonb,
              [userLanguage]: tmdbSeason.name,
            };

            await upsertSeason(
              {
                tv_tmdb_id: tmdbId,
                season_number: season.season_number,
                tmdb_season_id: season.id,
                name: updatedNameJsonb,
              },
              supabase
            );
          }
        }

        // Re-fetch seasons from DB (source of truth) after updates
        if (
          seasonsNeedingEpisodeCountUpdate.length > 0 ||
          seasonsNeedingNameUpdate.length > 0
        ) {
          const updatedSeasons = await getSeasonsByTvTmdbId(
            tmdbId,
            supabase,
            userLanguage,
            region
          );
          tvShow.seasons =
            updatedSeasons.length > 0
              ? updatedSeasons
              : fullTvShowResponse?.seasons || [];
        } else {
          // All seasons are up to date, use seasons from DB
          tvShow.seasons = seasonsFromDb;
        }
      } else {
        // Use seasons from DB or fallback to TMDB response
        tvShow.seasons =
          seasonsFromDb.length > 0
            ? seasonsFromDb
            : fullTvShowResponse?.seasons || [];
      }

      return tvShow;
    }

    // If not in DB, fetch from TMDB for all supported languages and save
    const tmdbConfig = getTMDBConfig(userLanguage, region);

    // Fetch TV show data for all supported languages
    // IMPORTANT: lang is already in ISO format (e.g., 'ca-ES'), use it directly
    const languagePromises = supportedLanguages.map(async (lang) => {
      try {
        const response = await $fetch<{
          name?: string;
          overview?: string;
          tagline?: string;
          poster_path?: string | null;
          backdrop_path?: string | null;
          first_air_date?: string;
          vote_average?: number;
          status?: string;
          genres?: Array<{ id: number; name: string }>;
        }>(`${tmdbConfig.baseUrl}/tv/${tmdbId}`, {
          query: {
            api_key: tmdbConfig.apiKey,
            language: lang, // lang is already in ISO format (e.g., 'ca-ES')
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
    // IMPORTANT: Use lang (ISO format) as key, not legacy format
    const titleMultiLang: MultiLanguageText = {};
    const overviewMultiLang: MultiLanguageText = {};
    const posterPathMultiLang: MultiLanguageText = {};
    const taglineMultiLang: MultiLanguageText = {};
    let backdropPath: string | null = null;
    let firstAirDate: string | null = null;
    let voteAverage: number | null = null;
    let status: string | null = null;
    let genres: Array<{ id: number; name: string }> = [];

    languageResults.forEach(({ lang, data }) => {
      if (data) {
        // lang is in ISO format (e.g., 'ca-ES'), use it directly as key
        if (data.name) titleMultiLang[lang] = data.name;
        if (data.overview) overviewMultiLang[lang] = data.overview;
        if (data.poster_path) posterPathMultiLang[lang] = data.poster_path;
        if (data.tagline) taglineMultiLang[lang] = data.tagline;
        // Use first successful response for non-language fields
        if (!backdropPath && data.backdrop_path)
          backdropPath = data.backdrop_path;
        if (!firstAirDate && data.first_air_date)
          firstAirDate = data.first_air_date;
        if (!voteAverage && data.vote_average) voteAverage = data.vote_average;
        if (!status && data.status) status = data.status;
        if (genres.length === 0 && data.genres) genres = data.genres;
      }
    });

    // Save to database if we got at least one language
    if (Object.keys(titleMultiLang).length > 0) {
      await supabase.from(TABLES.TITLES).upsert(
        {
          tmdb_id: tmdbId,
          type: MEDIA_TYPE.TV,
          title: titleMultiLang,
          overview: overviewMultiLang,
          poster_path:
            Object.keys(posterPathMultiLang).length > 0
              ? posterPathMultiLang
              : null,
          tagline:
            Object.keys(taglineMultiLang).length > 0 ? taglineMultiLang : null,
          backdrop_path: backdropPath,
          first_air_date: firstAirDate,
          vote_average: voteAverage,
          status: status,
          genres: genres,
        },
        {
          onConflict: 'tmdb_id',
        }
      );
    }

    // Return response in user's language (or first available)
    const userLangData =
      languageResults.find((r) => r.lang === userLangCode)?.data ||
      languageResults.find((r) => r.data)?.data;

    if (!userLangData) {
      throw createError({
        statusCode: 404,
        statusMessage: 'TV Show not found',
      });
    }

    // Sync seasons from TMDB response to database
    // Fetch full TV show data to get seasons array
    // Reuse tmdbConfig already declared above
    try {
      const fullTvShowResponse = await $fetch<{
        seasons?: Array<{
          id: number;
          name: string;
          season_number: number;
          overview: string;
          air_date: string;
          poster_path: string | null;
          vote_average: number;
          episode_count?: number;
        }>;
      }>(`${tmdbConfig.baseUrl}/tv/${tmdbId}`, {
        query: {
          api_key: tmdbConfig.apiKey,
          language: tmdbConfig.language,
          region: tmdbConfig.region,
        },
      });

      if (
        fullTvShowResponse?.seasons &&
        fullTvShowResponse.seasons.length > 0
      ) {
        const { syncSeasonsFromTVShow } =
          await import('@/server/utils/season-sync');
        await syncSeasonsFromTVShow(
          tmdbId,
          fullTvShowResponse.seasons.map((s) => ({
            id: s.id || 0,
            name: s.name || '',
            season_number: s.season_number || 0,
            overview: s.overview || '',
            air_date: s.air_date || '',
            poster_path: s.poster_path || null,
            vote_average: s.vote_average || 0,
            episode_count: s.episode_count,
          })),
          supabase,
          tmdbConfig // Pass TMDB config to enable fetching air_date from first episode
        );
      }

      // Get seasons from database (after sync, to ensure we have the latest data including air_date from first episode)
      const { getSeasonsByTvTmdbId } = await import('@/services/seasons');
      const seasonsFromDb = await getSeasonsByTvTmdbId(
        tmdbId,
        supabase,
        userLanguage,
        region
      );

      // Check if we need to fetch missing season names in user's language or episode_count
      // Reuse fullTvShowResponse.seasons if available (already fetched with user's language)
      let finalSeasons = seasonsFromDb;
      if (seasonsFromDb.length > 0 && fullTvShowResponse?.seasons) {
        // Check which seasons need updates (missing language names or episode_count)
        const seasonsNeedingNameUpdate: Array<{
          season: Season;
          tmdbSeason: { season_number: number; name: string };
        }> = [];
        const seasonsNeedingEpisodeCountUpdate: Array<{
          season: Season;
          episodeCount: number;
        }> = [];

        for (const season of seasonsFromDb) {
          // Check if episode_count is missing in DB
          if (
            (season.episode_count === null ||
              season.episode_count === undefined) &&
            fullTvShowResponse.seasons
          ) {
            const tmdbSeason = fullTvShowResponse.seasons.find(
              (s) => s.season_number === season.season_number
            );
            if (
              tmdbSeason?.episode_count !== null &&
              tmdbSeason?.episode_count !== undefined
            ) {
              seasonsNeedingEpisodeCountUpdate.push({
                season,
                episodeCount: tmdbSeason.episode_count,
              });
            }
          }

          // Check if name language is missing
          const { data: seasonData } = await supabase
            .from(TABLES.SEASONS)
            .select(SEASONS_COLUMNS.NAME)
            .eq(SEASONS_COLUMNS.TV_TMDB_ID, tmdbId)
            .eq(SEASONS_COLUMNS.SEASON_NUMBER, season.season_number)
            .maybeSingle();

          const nameJsonb = seasonData?.name as MultiLanguageText | null;
          const hasExactLanguage =
            nameJsonb &&
            typeof nameJsonb === 'object' &&
            nameJsonb[userLanguage] !== undefined;

          if (!hasExactLanguage) {
            const tmdbSeason = fullTvShowResponse.seasons.find(
              (s) => s.season_number === season.season_number
            );
            if (tmdbSeason?.name) {
              seasonsNeedingNameUpdate.push({ season, tmdbSeason });
            }
          }
        }

        // Update seasons with missing episode_count in DB
        if (seasonsNeedingEpisodeCountUpdate.length > 0) {
          const { upsertSeason } = await import('@/services/seasons');
          for (const {
            season,
            episodeCount,
          } of seasonsNeedingEpisodeCountUpdate) {
            await upsertSeason(
              {
                tv_tmdb_id: tmdbId,
                season_number: season.season_number,
                tmdb_season_id: season.id,
                episode_count: episodeCount,
              },
              supabase
            );
          }
        }

        // Update seasons with missing language names
        if (seasonsNeedingNameUpdate.length > 0) {
          const { upsertSeason } = await import('@/services/seasons');
          for (const { season, tmdbSeason } of seasonsNeedingNameUpdate) {
            // Get current name JSONB
            const { data: currentSeasonData } = await supabase
              .from(TABLES.SEASONS)
              .select(SEASONS_COLUMNS.NAME)
              .eq(SEASONS_COLUMNS.TV_TMDB_ID, tmdbId)
              .eq(SEASONS_COLUMNS.SEASON_NUMBER, season.season_number)
              .maybeSingle();

            const currentNameJsonb =
              (currentSeasonData?.name as MultiLanguageText) || {};
            const updatedNameJsonb: MultiLanguageText = {
              ...currentNameJsonb,
              [userLanguage]: tmdbSeason.name,
            };

            await upsertSeason(
              {
                tv_tmdb_id: tmdbId,
                season_number: season.season_number,
                tmdb_season_id: season.id,
                name: updatedNameJsonb,
              },
              supabase
            );
          }
        }

        // Re-fetch seasons from DB (source of truth) after updates
        if (
          seasonsNeedingEpisodeCountUpdate.length > 0 ||
          seasonsNeedingNameUpdate.length > 0
        ) {
          finalSeasons = await getSeasonsByTvTmdbId(
            tmdbId,
            supabase,
            userLanguage,
            region
          );
        }
      }

      // Include tagline in response (as MultiLanguageText object)
      const response: Partial<TVShow> & {
        tagline?: string | MultiLanguageText;
        seasons?: Season[];
      } = {
        ...userLangData,
        backdrop_path: (userLangData.backdrop_path || '') as string,
        status:
          (userLangData.status as TmdbStatusType | undefined) || undefined,
        // CRITICAL: Return MultiLanguageText object, not extracted string
        // The component will extract the correct language using getTitleInLanguage
        tagline:
          Object.keys(taglineMultiLang).length > 0
            ? taglineMultiLang
            : userLangData.tagline || undefined,
        seasons:
          finalSeasons.length > 0
            ? finalSeasons
            : fullTvShowResponse?.seasons || [],
      };

      return response;
    } catch (syncError) {
      // Log but don't fail the request if season sync fails
      if (import.meta.dev) {
        console.error('[TV Show] Error syncing seasons:', syncError);
      }

      // Still return response even if season sync failed
      const response: Partial<TVShow> & {
        tagline?: string | MultiLanguageText;
      } = {
        ...userLangData,
        backdrop_path: (userLangData.backdrop_path || '') as string,
        status:
          (userLangData.status as TmdbStatusType | undefined) || undefined,
        // CRITICAL: Return MultiLanguageText object, not extracted string
        // The component will extract the correct language using getTitleInLanguage
        tagline:
          Object.keys(taglineMultiLang).length > 0
            ? taglineMultiLang
            : userLangData.tagline || undefined,
      };

      return response;
    }
  } catch (error) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Error fetching TV Show details',
      data: error,
    });
  }
});
