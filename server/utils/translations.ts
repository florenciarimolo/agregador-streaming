/**
 * Server-side translation utilities
 * Provides translations for recommendation explanations based on language
 */

import type { H3Event } from 'h3';
import { getQuery, getRouterParams } from 'h3';

/**
 * Translation map for recommendation explanations
 * Maps explanation_code to translations in all supported languages
 */
const EXPLANATION_TRANSLATIONS: Record<string, Record<string, string>> = {
  es: {
    BASED_ON_LIKE: 'Porque te gustó algo parecido',
    TRENDING: 'Tendencia esta semana',
    DISCOVER: 'Selección editorial',
    EASY_TO_WATCH: 'Fácil de ver, ideal para relajarse',
    MOOD_MATCH: 'Perfecto para tu estado de ánimo',
    default: 'Recomendado para ti',
  },
  en: {
    BASED_ON_LIKE: 'Because you liked something similar',
    TRENDING: 'Trending this week',
    DISCOVER: 'Editorial selection',
    EASY_TO_WATCH: 'Easy to watch, perfect for relaxing',
    MOOD_MATCH: 'Perfect for your mood',
    default: 'Recommended for you',
  },
  ca: {
    BASED_ON_LIKE: "Perquè t'agradà alguna cosa similar",
    TRENDING: 'Tendència aquesta setmana',
    DISCOVER: 'Selecció editorial',
    EASY_TO_WATCH: 'Fàcil de veure, ideal per relaxar-se',
    MOOD_MATCH: "Perfecte per al teu estat d'ànim",
    default: 'Recomanat per a tu',
  },
  eu: {
    BASED_ON_LIKE: 'Antzeko zerbait gustatu zitzaizulako',
    TRENDING: 'Aste honetako joera',
    DISCOVER: 'Editorial hautaketa',
    EASY_TO_WATCH: 'Ikusteko erraza, erlaxatzeko egokia',
    MOOD_MATCH: 'Zure egoera emozionalerako perfektua',
    default: 'Zuretzat gomendatua',
  },
  gl: {
    BASED_ON_LIKE: 'Porque che gustou algo similar',
    TRENDING: 'Tendencia esta semana',
    DISCOVER: 'Selección editorial',
    EASY_TO_WATCH: 'Fácil de ver, ideal para relaxarse',
    MOOD_MATCH: 'Perfecto para o teu estado de ánimo',
    default: 'Recomendado para ti',
  },
};

/**
 * Get language code from event (URL parameter or query)
 * Returns 2-letter language code (es, en, ca, eu, gl)
 */
function getLanguageFromEvent(event: H3Event): string {
  const params = getRouterParams(event);
  const query = getQuery(event);

  // Priority 1: URL parameter (route.params.lang)
  const langFromUrl = params.lang as string | undefined;
  if (langFromUrl) {
    const normalized = langFromUrl.toLowerCase();
    // Normalize en-gb to en
    return normalized === 'en-gb' ? 'en' : normalized;
  }

  // Priority 2: Query parameter
  if (query.lang && typeof query.lang === 'string') {
    const normalized = query.lang.toLowerCase();
    return normalized === 'en-gb' ? 'en' : normalized;
  }

  // Default to Spanish
  return 'es';
}

/**
 * Get translated explanation text for a recommendation
 * @param event - H3 event to extract language from
 * @param explanationCode - Explanation code (BASED_ON_LIKE, TRENDING, etc.)
 * @returns Translated explanation text
 */
export function getExplanationTranslation(
  event: H3Event,
  explanationCode: string | null | undefined
): string {
  if (!explanationCode) {
    const lang = getLanguageFromEvent(event);
    return (
      EXPLANATION_TRANSLATIONS[lang]?.default ||
      EXPLANATION_TRANSLATIONS.es.default
    );
  }

  const lang = getLanguageFromEvent(event);
  const translations =
    EXPLANATION_TRANSLATIONS[lang] || EXPLANATION_TRANSLATIONS.es;

  return translations[explanationCode] || translations.default;
}
