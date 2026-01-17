import { getTMDBConfig } from '@/server/utils/config';
import { getUserTMDBParams } from '@/server/utils/user-tmdb';
import { createError, defineEventHandler, getQuery, H3Event } from 'h3';
import type { MediaResponse } from '@/types/Media';
import { hasUnexpectedCharacters } from '@/utils/language-detection';
import { getPrimaryLanguageForRegion } from '@/utils/language-detection';
import type { TMDBSearchResult } from '@/types/tmdb/Search';
import { MEDIA_TYPE } from '@/constants/domain/mediaType';

export default defineEventHandler(async (event: H3Event) => {
  try {
    const query = getQuery(event);
    const searchQuery = query.query as string;

    // If language is provided in query, use it; otherwise get from user preferences
    let language: string;
    let region: string;

    if (query.language && typeof query.language === 'string') {
      // Use provided language, but still get region from user preferences
      const userParams = await getUserTMDBParams(event);
      language = query.language;
      region = userParams.region;
    } else {
      // Get both language and region from user preferences (or defaults)
      const userParams = await getUserTMDBParams(event);
      language = userParams.language;
      region = userParams.region;
    }

    const config = getTMDBConfig(language, region);

    if (!searchQuery || searchQuery.length < 4) {
      throw createError({
        statusCode: 400,
        statusMessage:
          'Query parameter is required and must be at least 4 characters long',
      });
    }

    const response = await $fetch<MediaResponse>(
      `${config.baseUrl}/search/multi`,
      {
        query: {
          api_key: config.apiKey,
          language: config.language,
          region: config.region,
          include_adult: config.includeAdult,
          query: searchQuery,
        },
      }
    );

    // Extract language code (e.g., 'es-ES' -> 'es')
    const {
      extractLanguageCode,
      LanguageIsoCode,
      SUPPORTED_LANGUAGE_ISO_CODES,
    } = await import('@/constants/languages');
    const languageCode =
      extractLanguageCode(language) || LanguageIsoCode.SPANISH;
    const primaryLanguage = getPrimaryLanguageForRegion(region);

    // Filter results to only movies and TV shows
    const filteredResults = (response.results || []).filter(
      (result: TMDBSearchResult) =>
        result.media_type === MEDIA_TYPE.MOVIE ||
        result.media_type === MEDIA_TYPE.TV
    ) as TMDBSearchResult[];

    // Detect titles with non-Latin alphabets and fetch titles in preferred language
    const resultsWithCorrectedTitles = await Promise.all(
      filteredResults.map(async (result: TMDBSearchResult) => {
        const title = result.title || result.name || '';

        // Check alphabet if the user's language is a Latin script language
        // (Spanish, Catalan, Basque, Galician, or English)
        const supportedLanguages = SUPPORTED_LANGUAGE_ISO_CODES.map(
          (code) => code
        );
        const shouldCheckAlphabet = supportedLanguages.includes(
          languageCode as LanguageIsoCode
        );

        if (shouldCheckAlphabet && title) {
          // For English, we need to check differently since hasUnexpectedCharacters
          // is designed for ES region languages. For English, we'll use a simpler check.
          let hasNonLatin = false;

          if (languageCode === LanguageIsoCode.ENGLISH) {
            // Simple check for non-Latin characters in English
            const nonLatinPatterns = [
              /[\u3040-\u309F]/, // Hiragana
              /[\u30A0-\u30FF]/, // Katakana
              /[\u4E00-\u9FAF]/, // CJK Unified Ideographs
              /[\u3400-\u4DBF]/, // CJK Extension A
              /[\u0900-\u097F]/, // Devanagari
              /[\u0600-\u06FF]/, // Arabic
              /[\u0590-\u05FF]/, // Hebrew
              /[\u0400-\u04FF]/, // Cyrillic
            ];

            // Count non-Latin characters
            let nonLatinCount = 0;
            let totalChars = 0;

            for (const char of title) {
              if (/[\s0-9.,;:!?\-_()[\]{}'"/\\]/.test(char)) {
                continue;
              }
              totalChars++;

              for (const pattern of nonLatinPatterns) {
                if (pattern.test(char)) {
                  nonLatinCount++;
                  break;
                }
              }
            }

            hasNonLatin = totalChars > 0 && nonLatinCount / totalChars > 0.5;
          } else {
            hasNonLatin = hasUnexpectedCharacters(title, languageCode);
          }

          if (hasNonLatin) {
            // Fetch title in preferred language from TMDB
            try {
              const endpoint =
                result.media_type === MEDIA_TYPE.MOVIE
                  ? `${config.baseUrl}/movie/${result.id}`
                  : `${config.baseUrl}/tv/${result.id}`;

              const titleResponse = await $fetch<{
                title?: string;
                name?: string;
              }>(endpoint, {
                query: {
                  api_key: config.apiKey,
                  language: config.language,
                  region: config.region,
                },
              });

              // Replace title if we got a valid one in preferred language
              const preferredTitle = titleResponse.title || titleResponse.name;
              if (preferredTitle && preferredTitle.trim() !== '') {
                // Check if the preferred title is also non-Latin
                const preferredHasNonLatin = hasUnexpectedCharacters(
                  preferredTitle,
                  languageCode
                );

                if (!preferredHasNonLatin) {
                  // Use preferred title
                  if (result.media_type === MEDIA_TYPE.MOVIE) {
                    result.title = preferredTitle;
                  } else {
                    result.name = preferredTitle;
                  }
                } else {
                  // If preferred language also has non-Latin, try primary language
                  const primaryLangCode = `${primaryLanguage}-${region?.toUpperCase() || 'ES'}`;
                  const primaryConfig = getTMDBConfig(primaryLangCode, region);

                  try {
                    const primaryResponse = await $fetch<{
                      title?: string;
                      name?: string;
                    }>(endpoint, {
                      query: {
                        api_key: primaryConfig.apiKey,
                        language: primaryConfig.language,
                        region: primaryConfig.region,
                      },
                    });

                    const primaryTitle =
                      primaryResponse.title || primaryResponse.name;
                    if (primaryTitle && primaryTitle.trim() !== '') {
                      const primaryHasNonLatin = hasUnexpectedCharacters(
                        primaryTitle,
                        primaryLanguage
                      );

                      if (!primaryHasNonLatin) {
                        if (result.media_type === MEDIA_TYPE.MOVIE) {
                          result.title = primaryTitle;
                        } else {
                          result.name = primaryTitle;
                        }
                      }
                    }
                  } catch (primaryError) {
                    // If primary language fetch fails, keep original title
                    const { logError } = await import('@/server/utils/logger');
                    logError(
                      '[Search] Failed to fetch primary language title',
                      primaryError as Error,
                      {
                        mediaType: result.media_type,
                        tmdbId: result.id,
                      }
                    );
                  }
                }
              }
            } catch (error) {
              // If fetch fails, keep original title
              const { logError } = await import('@/server/utils/logger');
              logError(
                '[Search] Failed to fetch preferred language title',
                error as Error,
                {
                  mediaType: result.media_type,
                  tmdbId: result.id,
                }
              );
            }
          }
        }

        return result;
      })
    );

    // Return results with corrected titles
    return {
      data: {
        ...response,
        results: resultsWithCorrectedTitles,
      } as MediaResponse,
    };
  } catch (error) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Error fetching search results',
      data: error,
    });
  }
});
